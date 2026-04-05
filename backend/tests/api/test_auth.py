"""
Unit tests for POST /api/auth  (AuthView).

V&V Coverage:
  - Authorization Test: no JWT needed, AllowAny
  - Input Validation Test: missing fields
  - Response Schema Test: 200 response contains token + refresh keys
  - Behavioral Test: valid creds → 200; wrong password → 401; missing username → 400
"""

import pytest


AUTH_URL = "/api/auth"


# ---------------------------------------------------------------------------
# POST /api/auth
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_login_success(api_client, admin_user):
    """Valid credentials return 200 with token and refresh keys."""
    response = api_client.post(
        AUTH_URL,
        {"username": "testadmin", "password": "testpassword123"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "refresh" in data


@pytest.mark.django_db
def test_login_invalid_password(api_client, admin_user):
    """Wrong password returns 401."""
    response = api_client.post(
        AUTH_URL,
        {"username": "testadmin", "password": "wrongpassword"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_login_nonexistent_user(api_client):
    """Non-existent username returns 401."""
    response = api_client.post(
        AUTH_URL,
        {"username": "ghost", "password": "somepass"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_login_missing_username(api_client):
    """Missing username field returns 400."""
    response = api_client.post(
        AUTH_URL,
        {"password": "testpassword123"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_missing_password(api_client):
    """Missing password field returns 400."""
    response = api_client.post(
        AUTH_URL,
        {"username": "testadmin"},
        format="json",
    )
    assert response.status_code == 400
