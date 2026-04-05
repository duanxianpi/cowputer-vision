"""
Unit tests for GET/POST /api/setup  (SetupView).

V&V Coverage:
  - Authorization Test: setup is public (no JWT required)
  - Input Validation Test: missing fields, malformed JSON
  - Response Schema Test: 201 response contains token + refresh keys
  - Database State Test: AppConfig row created after successful POST
  - Behavioral Test: already-initialized returns 403
"""

import pytest
from django.contrib.auth.models import User

from api.models import AppConfig


SETUP_URL = "/api/setup"

VALID_SETUP_PAYLOAD = {
    "username": "farmadmin",
    "password": "s3cur3pass",
    "email": "admin@farm.com",
    "rtsp_url": "rtsp://192.168.1.100/stream",
}


# ---------------------------------------------------------------------------
# GET /api/setup
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_uninitialized(api_client):
    """Returns 200 with initialized=false when AppConfig table is empty."""
    response = api_client.get(SETUP_URL)
    assert response.status_code == 200
    assert response.json() == {"initialized": False}


@pytest.mark.django_db
def test_get_initialized(api_client, initialized_app):
    """Returns 200 with initialized=true when AppConfig row exists."""
    response = api_client.get(SETUP_URL)
    assert response.status_code == 200
    assert response.json() == {"initialized": True}


# ---------------------------------------------------------------------------
# POST /api/setup
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_post_success(api_client):
    """First-time setup returns 201 with token and refresh keys."""
    response = api_client.post(SETUP_URL, VALID_SETUP_PAYLOAD, format="json")
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert "refresh" in data


@pytest.mark.django_db
def test_post_creates_app_config(api_client):
    """POST /api/setup creates an AppConfig DB row."""
    api_client.post(SETUP_URL, VALID_SETUP_PAYLOAD, format="json")
    assert AppConfig.objects.count() == 1
    config = AppConfig.objects.first()
    assert config.is_initialized is True
    assert config.rtsp_url == VALID_SETUP_PAYLOAD["rtsp_url"]


@pytest.mark.django_db
def test_post_creates_user(api_client):
    """POST /api/setup creates a Django User."""
    api_client.post(SETUP_URL, VALID_SETUP_PAYLOAD, format="json")
    assert User.objects.filter(username=VALID_SETUP_PAYLOAD["username"]).exists()


@pytest.mark.django_db
def test_post_already_initialized(api_client, initialized_app):
    """Returns 403 when app is already initialized."""
    response = api_client.post(SETUP_URL, VALID_SETUP_PAYLOAD, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_post_missing_rtsp_url(api_client):
    """Returns 400 when rtsp_url is missing."""
    payload = {k: v for k, v in VALID_SETUP_PAYLOAD.items() if k != "rtsp_url"}
    response = api_client.post(SETUP_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_missing_password(api_client):
    """Returns 400 when password is missing."""
    payload = {k: v for k, v in VALID_SETUP_PAYLOAD.items() if k != "password"}
    response = api_client.post(SETUP_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_missing_email(api_client):
    """Returns 400 when email is missing."""
    payload = {k: v for k, v in VALID_SETUP_PAYLOAD.items() if k != "email"}
    response = api_client.post(SETUP_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_invalid_email_format(api_client):
    """Returns 400 for a malformed email address."""
    payload = {**VALID_SETUP_PAYLOAD, "email": "not-an-email"}
    response = api_client.post(SETUP_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_no_auth_required(api_client):
    """Setup endpoint is public — no Authorization header needed."""
    response = api_client.post(SETUP_URL, VALID_SETUP_PAYLOAD, format="json")
    # Should succeed (not 401)
    assert response.status_code != 401
