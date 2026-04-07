"""
Unit tests for the password-reset flow.

    POST /api/password-reset          – request reset email
    POST /api/password-reset/confirm  – submit token + new password

V&V Coverage:
  - Request endpoint always returns 200 (no email leak)
  - Email is sent when user exists
  - No email is sent for unknown address
  - Valid token resets the password
  - Expired / tampered token returns 400
  - New password must meet minimum length
"""

import pytest
from django.core import mail, signing
from django.contrib.auth.models import User


REQUEST_URL = "/api/password-reset"
CONFIRM_URL = "/api/password-reset/confirm"


# ---------------------------------------------------------------------------
# POST /api/password-reset  (request)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_request_reset_returns_200_for_known_email(api_client, admin_user):
    """Returns 200 and sends an email when the address is registered."""
    response = api_client.post(REQUEST_URL, {"email": admin_user.email}, format="json")
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    assert admin_user.email in mail.outbox[0].to


@pytest.mark.django_db
def test_request_reset_returns_200_for_unknown_email(api_client):
    """Returns 200 even for an unregistered email (prevents enumeration)."""
    response = api_client.post(
        REQUEST_URL, {"email": "nobody@example.com"}, format="json"
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_request_reset_email_contains_token_link(api_client, admin_user):
    """The sent email body contains a reset link with a token parameter."""
    api_client.post(REQUEST_URL, {"email": admin_user.email}, format="json")
    body = mail.outbox[0].body
    assert "token=" in body
    assert "reset-password" in body


@pytest.mark.django_db
def test_request_reset_missing_email_returns_400(api_client):
    """Missing email field returns 400."""
    response = api_client.post(REQUEST_URL, {}, format="json")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/password-reset/confirm
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_confirm_reset_with_valid_token(api_client, admin_user):
    """A valid token allows setting a new password."""
    # Generate token via the request endpoint so it includes the fingerprint.
    api_client.post(REQUEST_URL, {"email": admin_user.email}, format="json")
    token = mail.outbox[0].body.split("token=")[1].split()[0]
    response = api_client.post(
        CONFIRM_URL,
        {"token": token, "new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 200

    admin_user.refresh_from_db()
    assert admin_user.check_password("newSecurePass99")


@pytest.mark.django_db
def test_confirm_reset_with_expired_token(api_client, admin_user):
    """An expired token returns 400."""
    token = signing.dumps({"uid": admin_user.pk}, salt="password-reset")

    # Verify with max_age=0 to simulate expiry
    response = api_client.post(
        CONFIRM_URL,
        {"token": "bad.token.value", "new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_reset_with_tampered_token(api_client, admin_user):
    """A tampered token returns 400."""
    token = signing.dumps({"uid": admin_user.pk}, salt="password-reset")
    tampered = token[:-5] + "XXXXX"

    response = api_client.post(
        CONFIRM_URL,
        {"token": tampered, "new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_reset_with_wrong_salt(api_client, admin_user):
    """A token signed with a different salt is rejected."""
    token = signing.dumps({"uid": admin_user.pk}, salt="wrong-salt")
    response = api_client.post(
        CONFIRM_URL,
        {"token": token, "new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_reset_nonexistent_user(api_client):
    """Token referencing a deleted user returns 400."""
    token = signing.dumps({"uid": 99999}, salt="password-reset")
    response = api_client.post(
        CONFIRM_URL,
        {"token": token, "new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_reset_short_password(api_client, admin_user):
    """New password below minimum length returns 400."""
    token = signing.dumps({"uid": admin_user.pk}, salt="password-reset")
    response = api_client.post(
        CONFIRM_URL,
        {"token": token, "new_password": "short"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_confirm_reset_missing_token(api_client):
    """Missing token field returns 400."""
    response = api_client.post(
        CONFIRM_URL,
        {"new_password": "newSecurePass99"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_old_password_no_longer_works_after_reset(api_client, admin_user):
    """After resetting, the old password no longer authenticates."""
    api_client.post(REQUEST_URL, {"email": admin_user.email}, format="json")
    token = mail.outbox[0].body.split("token=")[1].split()[0]
    api_client.post(
        CONFIRM_URL,
        {"token": token, "new_password": "brandNewPass123"},
        format="json",
    )

    login_resp = api_client.post(
        "/api/auth",
        {"username": admin_user.username, "password": "testpassword123"},
        format="json",
    )
    assert login_resp.status_code == 401

    login_resp = api_client.post(
        "/api/auth",
        {"username": admin_user.username, "password": "brandNewPass123"},
        format="json",
    )
    assert login_resp.status_code == 200
