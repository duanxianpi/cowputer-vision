"""
Unit tests for GET/POST/DELETE /api/settings  (SettingsView).

V&V Coverage:
  - Authorization Test: valid JWT → 2xx; missing JWT → 401
  - Input Validation Test: non-dict body → 400
  - Database State Test: POST persists Setting rows; DELETE removes them
  - Behavioral Test: GET returns current key-value dict
"""

import pytest

from api.models import Setting


SETTINGS_URL = "/api/settings"


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_settings_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.get(SETTINGS_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_post_settings_no_auth(api_client):
    """Missing Authorization header for POST returns 401."""
    response = api_client.post(SETTINGS_URL, {"retention_days": "30"}, format="json")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/settings
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_settings_empty(authenticated_client):
    """Returns 200 with empty dict when no settings exist."""
    response = authenticated_client.get(SETTINGS_URL)
    assert response.status_code == 200
    assert response.json() == {}


@pytest.mark.django_db
def test_get_settings_returns_dict(authenticated_client):
    """Returns 200 with all settings as key-value pairs."""
    Setting.objects.create(key="retention_days", value="30")
    Setting.objects.create(key="report_hour", value="0")

    response = authenticated_client.get(SETTINGS_URL)
    assert response.status_code == 200
    data = response.json()
    assert data["retention_days"] == "30"
    assert data["report_hour"] == "0"


# ---------------------------------------------------------------------------
# POST /api/settings
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_update_settings_success(authenticated_client):
    """Valid dict payload returns 200."""
    response = authenticated_client.post(
        SETTINGS_URL,
        {"retention_days": "45"},
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_update_settings_persisted(authenticated_client):
    """POSTed settings are written to the Setting DB rows."""
    authenticated_client.post(
        SETTINGS_URL,
        {"retention_days": "45", "report_hour": "6"},
        format="json",
    )
    assert Setting.objects.get(key="retention_days").value == "45"
    assert Setting.objects.get(key="report_hour").value == "6"


@pytest.mark.django_db
def test_update_settings_upserts(authenticated_client):
    """POST updates an existing setting without creating a duplicate."""
    Setting.objects.create(key="retention_days", value="30")
    authenticated_client.post(
        SETTINGS_URL,
        {"retention_days": "60"},
        format="json",
    )
    assert Setting.objects.filter(key="retention_days").count() == 1
    assert Setting.objects.get(key="retention_days").value == "60"


@pytest.mark.django_db
def test_update_settings_invalid_body(authenticated_client):
    """Non-dict body returns 400."""
    response = authenticated_client.post(
        SETTINGS_URL,
        ["retention_days", "30"],
        format="json",
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# DELETE /api/settings
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_reset_settings(authenticated_client):
    """DELETE returns 204 and removes all Setting rows."""
    Setting.objects.create(key="retention_days", value="30")
    Setting.objects.create(key="report_hour", value="0")

    response = authenticated_client.delete(SETTINGS_URL)
    assert response.status_code == 204
    assert Setting.objects.count() == 0
