"""
Shared pytest fixtures for the Cowputer Vision backend test suite.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import AlertRule, AppConfig, Report, TrackingData, VideoSegment


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Users & auth
# ---------------------------------------------------------------------------


@pytest.fixture
def admin_user(db):
    """Create and return a test admin user."""
    return User.objects.create_user(
        username="testadmin",
        email="admin@test.com",
        password="testpassword123",
    )


@pytest.fixture
def auth_headers(admin_user):
    """Return an Authorization header dict with a valid JWT access token."""
    refresh = RefreshToken.for_user(admin_user)
    return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """APIClient pre-configured with a valid Authorization header."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


# ---------------------------------------------------------------------------
# App state
# ---------------------------------------------------------------------------


@pytest.fixture
def initialized_app(db):
    """Create an AppConfig row to simulate an already-initialized application."""
    return AppConfig.objects.create(is_initialized=True, rtsp_url="rtsp://fake/stream")


# ---------------------------------------------------------------------------
# Model factories
# ---------------------------------------------------------------------------


@pytest.fixture
def make_tracking_data(db):
    """Return a factory that creates TrackingData rows."""

    def _factory(
        cow_id="cow_1",
        timestamp=1769124140000,
        behavior="feeding",
        bbox=None,
    ):
        return TrackingData.objects.create(
            cow_id=cow_id,
            timestamp=timestamp,
            behavior=behavior,
            bbox=bbox or [100.0, 200.0, 50.0, 80.0],
        )

    return _factory


@pytest.fixture
def make_alert_rule(db):
    """Return a factory that creates AlertRule rows."""

    def _factory(
        name="Test Rule",
        description="",
        conditions=None,
        actions=None,
        is_active=True,
    ):
        return AlertRule.objects.create(
            name=name,
            description=description,
            conditions=conditions or {"==": [{"var": "behavior"}, "feeding"]},
            actions=actions or {"notify": True},
            is_active=is_active,
        )

    return _factory


@pytest.fixture
def make_video_segment(db):
    """Return a factory that creates VideoSegment rows."""

    def _factory(
        filename="seg_001.mp4",
        start_ts=1769124000000,
        end_ts=1769124600000,
        file_path="/storage/rec/seg_001.mp4",
    ):
        return VideoSegment.objects.create(
            filename=filename,
            start_ts=start_ts,
            end_ts=end_ts,
            file_path=file_path,
        )

    return _factory


@pytest.fixture
def make_report(db):
    """Return a factory that creates Report rows."""

    def _factory(
        report_type="daily",
        data=None,
    ):
        return Report.objects.create(
            report_type=report_type,
            data=data or {"date": "2026-01-22", "total_cows": 5},
        )

    return _factory


# ---------------------------------------------------------------------------
# HLS fixtures
# ---------------------------------------------------------------------------


SAMPLE_M3U8 = (
    "#EXTM3U\n"
    "#EXT-X-VERSION:3\n"
    "#EXT-X-TARGETDURATION:600\n"
    "#EXTINF:600.0,\n"
    "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:36:52.000Z\n"
    "#EXTINF:600.0,\n"
    "video_20260122_133652_000.ts\n"
)


@pytest.fixture
def sample_m3u8_content():
    return SAMPLE_M3U8
