"""
URL routing for the ``api`` application.

All paths are included into the project root via ``core_app/urls.py``.
"""

from django.urls import path

from .views import (
    AlertRuleDetailView,
    AlertRuleListView,
    AuthView,
    HLSView,
    PlaybackView,
    ReportListView,
    SettingsView,
    SetupView,
    TracksView,
)

urlpatterns = [
    # First-time setup & status check
    path("api/setup", SetupView.as_view(), name="setup"),

    # Authentication (JWT login)
    path("api/auth", AuthView.as_view(), name="auth"),

    # Tracking data query (JsonLogic)
    path("api/tracks", TracksView.as_view(), name="tracks"),

    # Alert rules CRUD
    path("api/alerts", AlertRuleListView.as_view(), name="alert-list"),
    path("api/alerts/<int:pk>", AlertRuleDetailView.as_view(), name="alert-detail"),

    # Application settings
    path("api/settings", SettingsView.as_view(), name="settings"),

    # Playback – list video segments for a time range
    path("api/playback", PlaybackView.as_view(), name="playback"),

    # Reports
    path("api/reports", ReportListView.as_view(), name="reports"),

    # HLS file serving (live stream segments)
    path("hls/<path:filename>", HLSView.as_view(), name="hls"),
]
