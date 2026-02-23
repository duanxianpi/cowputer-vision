"""
DRF serializers for the Cow-puter Vision API.
"""

from rest_framework import serializers

from .models import AlertEvent, AlertRule, AppConfig, Report, Setting, TrackingData, VideoSegment


# ---------------------------------------------------------------------------
# Setup & Auth
# ---------------------------------------------------------------------------

class SetupSerializer(serializers.Serializer):
    """Validates first-time setup payload."""

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
    email = serializers.EmailField()
    rtsp_url = serializers.CharField(max_length=255)


class AuthSerializer(serializers.Serializer):
    """Validates login credentials."""

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)


# ---------------------------------------------------------------------------
# Tracking Data
# ---------------------------------------------------------------------------

class TrackingDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackingData
        fields = ["id", "cow_id", "timestamp", "behavior", "bbox"]


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertEvent
        fields = ["id", "rule", "triggered_at", "details"]
        read_only_fields = ["id", "triggered_at"]


class AlertRuleSerializer(serializers.ModelSerializer):
    events = AlertEventSerializer(many=True, read_only=True)

    class Meta:
        model = AlertRule
        fields = ["id", "name", "conditions", "actions", "is_active", "events"]
        read_only_fields = ["id"]


class AlertRuleWriteSerializer(serializers.ModelSerializer):
    """Serializer used for creating / updating alert rules (no nested events)."""

    class Meta:
        model = AlertRule
        fields = ["id", "name", "conditions", "actions", "is_active"]
        read_only_fields = ["id"]


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class SettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setting
        fields = ["key", "value"]


# ---------------------------------------------------------------------------
# Playback / Video Segments
# ---------------------------------------------------------------------------

class VideoSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoSegment
        fields = ["id", "filename", "start_ts", "end_ts", "file_path"]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportListSerializer(serializers.ModelSerializer):
    """Lightweight serializer that excludes the heavy ``data`` blob."""

    class Meta:
        model = Report
        fields = ["report_id", "report_type", "generated_at"]


class ReportDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["report_id", "report_type", "data", "generated_at"]
