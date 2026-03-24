"""
API views for the Cow-puter Vision backend.

Endpoints implemented:
    GET/POST   /api/setup      – First-time setup & initialization check
    POST       /api/auth       – Login (JWT)
    POST       /api/tracks     – Query tracking data via JsonLogic
    GET/POST   /api/alerts     – List / create alert rules
    GET/PUT/DELETE /api/alerts/<id>  – Alert rule detail
    GET/POST/DELETE /api/settings    – Application settings CRUD
    GET        /api/playback   – List video segments for a time range
    GET        /api/reports    – List / retrieve reports
    GET        /hls/<filename> – Serve HLS files (.m3u8 / .ts)
    GET        /rec/<filename> – Serve archived recording files (.ts)
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from django.conf import settings as django_settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import FileResponse, HttpResponse
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    inline_serializer,
)
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .jsonlogic_to_q import jsonlogic_to_q
from .models import (
    AlertEvent,
    AlertRule,
    AppConfig,
    Report,
    Setting,
    TrackingData,
    VideoSegment,
)
from .serializers import (
    AlertEventSerializer,
    AlertRuleSerializer,
    AlertRuleWriteSerializer,
    AuthSerializer,
    ReportDetailSerializer,
    ReportListSerializer,
    SettingSerializer,
    SetupSerializer,
    TrackingDataSerializer,
    VideoSegmentSerializer,
)

# Hard cap on tracking data results to prevent memory issues.
TRACKS_MAX_RESULTS = 10_000

# Reusable inline serializers for Swagger docs
_TokenResponseSerializer = inline_serializer(
    name="TokenResponse",
    fields={
        "token": drf_serializers.CharField(help_text="JWT access token"),
        "refresh": drf_serializers.CharField(help_text="JWT refresh token"),
    },
)
_DetailResponseSerializer = inline_serializer(
    name="DetailResponse",
    fields={"detail": drf_serializers.CharField()},
)


# ═══════════════════════════════════════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════════════════════════════════════


def _jwt_pair_for_user(user: User) -> dict:
    """Generate an access / refresh token pair for *user*."""
    refresh = RefreshToken.for_user(user)
    return {
        "token": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ═══════════════════════════════════════════════════════════════════════════
# GET/POST  /api/setup
# ═══════════════════════════════════════════════════════════════════════════


class SetupView(APIView):
    """Check initialization status and perform first-time setup."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Check initialization status",
        description="Returns whether the application has been initialized.",
        responses={
            200: inline_serializer(
                "InitStatus", {"initialized": drf_serializers.BooleanField()}
            )
        },
        tags=["Setup"],
    )
    def get(self, request: Request) -> Response:
        """Return whether the application has been initialized."""
        initialized = AppConfig.objects.exists()
        return Response({"initialized": initialized})

    @extend_schema(
        summary="First-time setup",
        description="Creates the initial AppConfig, admin user, and returns a JWT token pair. Returns 403 if already initialized.",
        request=SetupSerializer,
        responses={
            201: _TokenResponseSerializer,
            403: _DetailResponseSerializer,
        },
        tags=["Setup"],
    )
    def post(self, request: Request) -> Response:
        """Perform first-time setup.

        Creates the ``AppConfig`` record, the admin ``User``, and returns
        a JWT token pair.  Returns **403** if the app is already set up.
        """
        if AppConfig.objects.exists():
            return Response(
                {"detail": "Application is already initialized."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Persist setup config.
        AppConfig.objects.create(
            is_initialized=True,
            rtsp_url=data["rtsp_url"],
        )

        # Create the first (admin) user.
        user = User.objects.create_user(
            username=data["username"],
            email=data["email"],
            password=data["password"],
        )

        return Response(_jwt_pair_for_user(user), status=status.HTTP_201_CREATED)


# ═══════════════════════════════════════════════════════════════════════════
# POST  /api/auth
# ═══════════════════════════════════════════════════════════════════════════


class AuthView(APIView):
    """Authenticate a user and return a JWT token pair."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Login",
        description="Authenticate with username and password. Returns a JWT access/refresh token pair.",
        request=AuthSerializer,
        responses={
            200: _TokenResponseSerializer,
            401: _DetailResponseSerializer,
        },
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = AuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = authenticate(
            request,
            username=data["username"],
            password=data["password"],
        )

        if user is None:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(_jwt_pair_for_user(user))


# ═══════════════════════════════════════════════════════════════════════════
# POST  /api/tracks
# ═══════════════════════════════════════════════════════════════════════════


class TracksView(APIView):
    """Query tracking data using a JsonLogic rule set."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Query tracking data",
        description=(
            "Query tracking data using a JsonLogic rule set. Supported variables: "
            "`behavior`, `timestamp`, `cow_id`. Supported operators: "
            "`and`, `or`, `!`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`.\n\n"
            "Example body:\n```json\n"
            '{"and": [{"==": [{"var": "behavior"}, "feeding"]}, '
            '{">>=": [{"var": "timestamp"}, 1769124135]}]}\n```'
        ),
        request={
            "application/json": {
                "type": "object",
                "example": {
                    "and": [
                        {"==": [{"var": "behavior"}, "feeding"]},
                        {">=": [{"var": "timestamp"}, 1769124135]},
                        {"<=": [{"var": "timestamp"}, 1769124155]},
                    ]
                },
            }
        },
        responses={200: TrackingDataSerializer(many=True)},
        tags=["Tracks"],
    )
    def post(self, request: Request) -> Response:
        logic = request.data
        if not isinstance(logic, dict):
            return Response(
                {
                    "detail": "Request body must be a JSON object containing a JsonLogic rule."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        q = jsonlogic_to_q(logic)
        qs = TrackingData.objects.filter(q).order_by("timestamp")[:TRACKS_MAX_RESULTS]
        serializer = TrackingDataSerializer(qs, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
# GET/POST  /api/alerts        — list & create
# GET/PUT/DELETE  /api/alerts/<id>  — detail
# ═══════════════════════════════════════════════════════════════════════════


class AlertRuleListView(APIView):
    """List all alert rules or create a new one."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List alert rules",
        description="Retrieve all alert rules. Pass `?include_events=true` to include triggered events.",
        parameters=[
            OpenApiParameter(
                "include_events",
                str,
                OpenApiParameter.QUERY,
                description="Include triggered events",
                enum=["true", "false"],
            ),
        ],
        responses={200: AlertRuleSerializer(many=True)},
        tags=["Alerts"],
    )
    def get(self, request: Request) -> Response:
        rules = AlertRule.objects.all().order_by("-id")
        include_events = (
            request.query_params.get("include_events", "").lower() == "true"
        )
        if include_events:
            rules = rules.prefetch_related("events")
            serializer = AlertRuleSerializer(rules, many=True)
        else:
            serializer = AlertRuleWriteSerializer(rules, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create alert rule",
        description="Create a new alert rule with JsonLogic conditions.",
        request=AlertRuleWriteSerializer,
        responses={201: AlertRuleWriteSerializer},
        tags=["Alerts"],
    )
    def post(self, request: Request) -> Response:
        serializer = AlertRuleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AlertRuleDetailView(APIView):
    """Retrieve, update, or delete a single alert rule."""

    permission_classes = [IsAuthenticated]

    @staticmethod
    def _get_rule(pk: int) -> AlertRule | None:
        try:
            return AlertRule.objects.get(pk=pk)
        except AlertRule.DoesNotExist:
            return None

    @extend_schema(
        summary="Get alert rule",
        description="Retrieve a single alert rule with its triggered events.",
        responses={200: AlertRuleSerializer, 404: _DetailResponseSerializer},
        tags=["Alerts"],
    )
    def get(self, request: Request, pk: int) -> Response:
        rule = self._get_rule(pk)
        if rule is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlertRuleSerializer(rule)
        return Response(serializer.data)

    @extend_schema(
        summary="Update alert rule",
        description="Partially update an existing alert rule.",
        request=AlertRuleWriteSerializer,
        responses={200: AlertRuleWriteSerializer, 404: _DetailResponseSerializer},
        tags=["Alerts"],
    )
    def put(self, request: Request, pk: int) -> Response:
        rule = self._get_rule(pk)
        if rule is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlertRuleWriteSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        summary="Delete alert rule",
        description="Delete an alert rule and its related events.",
        responses={204: None, 404: _DetailResponseSerializer},
        tags=["Alerts"],
    )
    def delete(self, request: Request, pk: int) -> Response:
        rule = self._get_rule(pk)
        if rule is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# GET/POST/DELETE  /api/settings
# ═══════════════════════════════════════════════════════════════════════════


class SettingsView(APIView):
    """Manage application key-value settings."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get all settings",
        description="Return all application settings as a JSON object `{key: value, ...}`.",
        responses={
            200: inline_serializer(
                "SettingsMap",
                {"key": drf_serializers.CharField(help_text="Example key-value pair")},
            )
        },
        tags=["Settings"],
    )
    def get(self, request: Request) -> Response:
        """Return all settings as ``{key: value, …}``."""
        settings_qs = Setting.objects.all().order_by("key")
        data = {s.key: s.value for s in settings_qs}
        return Response(data)

    @extend_schema(
        summary="Update settings",
        description="Create or update settings from a `{key: value, ...}` payload.",
        request={
            "application/json": {
                "type": "object",
                "additionalProperties": {"type": "string"},
                "example": {"retention_days": "30", "report_hour": "0"},
            }
        },
        responses={200: _DetailResponseSerializer},
        tags=["Settings"],
    )
    def post(self, request: Request) -> Response:
        """Create or update settings from ``{key: value, …}`` payload."""
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object with key-value pairs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for key, value in request.data.items():
            Setting.objects.update_or_create(
                key=key,
                defaults={"value": str(value)},
            )

        return Response({"detail": "Settings updated."})

    @extend_schema(
        summary="Reset settings",
        description="Delete all settings, resetting to defaults.",
        responses={204: None},
        tags=["Settings"],
    )
    def delete(self, request: Request) -> Response:
        """Reset all settings to defaults (delete all rows)."""
        Setting.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# GET  /api/playback
# ═══════════════════════════════════════════════════════════════════════════


class PlaybackView(APIView):
    """List video segments overlapping a given time range."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List playback segments",
        description="List video segments overlapping the given time range.",
        parameters=[
            OpenApiParameter(
                "start",
                int,
                OpenApiParameter.QUERY,
                required=True,
                description="Start Unix timestamp",
            ),
            OpenApiParameter(
                "end",
                int,
                OpenApiParameter.QUERY,
                required=True,
                description="End Unix timestamp",
            ),
        ],
        responses={
            200: VideoSegmentSerializer(many=True),
            400: _DetailResponseSerializer,
        },
        tags=["Playback"],
    )
    def get(self, request: Request) -> Response:
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        if start is None or end is None:
            return Response(
                {"detail": "Both 'start' and 'end' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_ts = int(start)
            end_ts = int(end)
        except (ValueError, TypeError):
            return Response(
                {"detail": "'start' and 'end' must be integer Unix timestamps."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        segments = VideoSegment.objects.filter(
            start_ts__lte=end_ts, end_ts__gte=start_ts
        ).order_by("start_ts")
        serializer = VideoSegmentSerializer(
            segments, many=True, context={"request": request}
        )
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
# GET  /api/reports
# ═══════════════════════════════════════════════════════════════════════════


class ReportListView(APIView):
    """List available reports or retrieve a single report by ID."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List or retrieve reports",
        description="Without parameters: list all reports (lightweight). With `?report_id=<uuid>`: retrieve a full report including data.",
        parameters=[
            OpenApiParameter(
                "report_id",
                str,
                OpenApiParameter.QUERY,
                required=False,
                description="UUID of the report to retrieve in full",
            ),
        ],
        responses={200: ReportDetailSerializer},
        tags=["Reports"],
    )
    def get(self, request: Request) -> Response:
        report_id = request.query_params.get("report_id")

        if report_id:
            try:
                report = Report.objects.get(report_id=report_id)
            except Report.DoesNotExist:
                return Response(
                    {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
                )
            serializer = ReportDetailSerializer(report)
            return Response(serializer.data)

        reports = Report.objects.all().order_by("-generated_at")
        serializer = ReportListSerializer(reports, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
# GET  /hls/<path:filename>
# ═══════════════════════════════════════════════════════════════════════════

# Custom MIME types for HLS segments.
_HLS_MIME: dict[str, str] = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
    ".m4s": "video/mp4",
    ".mp4": "video/mp4",
}


class HLSView(APIView):
    """Serve HLS playlist and segment files from disk.

    When ``settings.USE_X_SENDFILE`` is enabled the response contains an
    ``X-Sendfile`` header and the reverse proxy (nginx / Apache) handles
    the actual file transfer.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Serve HLS file",
        description="Serve an HLS `.m3u8` playlist or `.ts` segment from the storage directory.",
        responses={
            200: OpenApiResponse(
                description="HLS playlist (.m3u8) or transport stream segment (.ts)"
            ),
            404: _DetailResponseSerializer,
        },
        tags=["HLS"],
    )
    def get(self, request: Request, filename: str) -> HttpResponse:
        hls_dir = Path(django_settings.HLS_DIR)
        file_path = (hls_dir / filename).resolve()

        # Prevent directory-traversal attacks.
        if not str(file_path).startswith(str(hls_dir.resolve())):
            return Response(
                {"detail": "Invalid path."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not file_path.is_file():
            return Response(
                {"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND
            )

        suffix = file_path.suffix.lower()
        content_type = _HLS_MIME.get(
            suffix,
            mimetypes.guess_type(str(file_path))[0] or "application/octet-stream",
        )

        if getattr(django_settings, "USE_X_SENDFILE", False):
            response = HttpResponse(content_type=content_type)
            response["X-Sendfile"] = str(file_path)
            return response

        return FileResponse(
            open(file_path, "rb"),  # noqa: SIM115 – FileResponse closes the handle
            content_type=content_type,
        )


class RecView(APIView):
    """Serve archived recording segment files from disk."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Serve recorded segment",
        description="Serve an archived `.m4s` recording segment from the recordings directory.",
        responses={
            200: OpenApiResponse(
                description="fMP4 segment (.m4s) or init segment (.mp4)"
            ),
            404: _DetailResponseSerializer,
        },
        tags=["Playback"],
    )
    def get(self, request: Request, filename: str) -> HttpResponse:
        rec_dir = Path(django_settings.REC_DIR)
        file_path = (rec_dir / filename).resolve()

        # Prevent directory-traversal attacks.
        if not str(file_path).startswith(str(rec_dir.resolve())):
            return Response(
                {"detail": "Invalid path."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not file_path.is_file():
            return Response(
                {"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND
            )

        suffix = file_path.suffix.lower()
        content_type = _HLS_MIME.get(
            suffix,
            mimetypes.guess_type(str(file_path))[0] or "application/octet-stream",
        )

        if getattr(django_settings, "USE_X_SENDFILE", False):
            response = HttpResponse(content_type=content_type)
            response["X-Sendfile"] = str(file_path)
            return response

        return FileResponse(
            open(file_path, "rb"),  # noqa: SIM115 – FileResponse closes the handle
            content_type=content_type,
        )
