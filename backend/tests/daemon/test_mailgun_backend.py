"""
Unit tests for core_app.mailgun_backend.MailgunBackend.

Covers:
  - Successful send via Mailgun API
  - Multiple recipients
  - API error handling (fail_silently=True and False)
  - No messages is a no-op
"""

from __future__ import annotations

import json
import urllib.error
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.mail import EmailMessage

from core_app.mailgun_backend import MailgunBackend


@pytest.fixture
def backend():
    with patch.multiple(
        "django.conf.settings",
        MAILGUN_API_KEY="key-test123",
        MAILGUN_SENDER_DOMAIN="mg.example.com",
        MAILGUN_API_URL="https://api.mailgun.net",
        DEFAULT_FROM_EMAIL="alerts@cowputer-vision.local",
    ):
        yield MailgunBackend(fail_silently=True)


def _mock_response(body: dict, status: int = 200):
    """Create a mock urllib response context manager."""
    resp = MagicMock()
    resp.read.return_value = json.dumps(body).encode()
    resp.status = status
    resp.__enter__ = MagicMock(return_value=resp)
    resp.__exit__ = MagicMock(return_value=False)
    return resp


class TestMailgunBackend:
    """Tests for MailgunBackend."""

    @patch("core_app.mailgun_backend.urllib.request.urlopen")
    def test_send_single_email(self, mock_urlopen, backend):
        """Sends one email and returns count of 1."""
        mock_urlopen.return_value = _mock_response({"message": "Queued"})

        msg = EmailMessage(
            subject="Test Alert",
            body="Cow detected",
            from_email="alerts@farm.com",
            to=["farmer@farm.com"],
        )
        sent = backend.send_messages([msg])

        assert sent == 1
        mock_urlopen.assert_called_once()

        req = mock_urlopen.call_args[0][0]
        assert req.method == "POST"
        assert "mg.example.com" in req.full_url
        assert "Basic" in req.get_header("Authorization")

    @patch("core_app.mailgun_backend.urllib.request.urlopen")
    def test_send_multiple_recipients(self, mock_urlopen, backend):
        """All recipients appear in the POST data."""
        mock_urlopen.return_value = _mock_response({"message": "Queued"})

        msg = EmailMessage(
            subject="Alert",
            body="body",
            from_email="alerts@farm.com",
            to=["a@farm.com", "b@farm.com"],
        )
        backend.send_messages([msg])

        req = mock_urlopen.call_args[0][0]
        body = req.data.decode()
        assert "a%40farm.com" in body or "a@farm.com" in body
        assert "b%40farm.com" in body or "b@farm.com" in body

    @patch("core_app.mailgun_backend.urllib.request.urlopen")
    def test_empty_messages_returns_zero(self, mock_urlopen, backend):
        """send_messages([]) returns 0 without calling the API."""
        assert backend.send_messages([]) == 0
        mock_urlopen.assert_not_called()

    @patch(
        "core_app.mailgun_backend.urllib.request.urlopen",
        side_effect=urllib.error.URLError("connection refused"),
    )
    def test_fail_silently_returns_zero(self, mock_urlopen, backend):
        """With fail_silently=True, API errors return False per message."""
        msg = EmailMessage(
            subject="Alert", body="body", from_email="a@b.com", to=["c@d.com"]
        )
        sent = backend.send_messages([msg])
        assert sent == 0

    @patch(
        "core_app.mailgun_backend.urllib.request.urlopen",
        side_effect=urllib.error.URLError("connection refused"),
    )
    def test_fail_loudly_raises(self, mock_urlopen):
        """With fail_silently=False, API errors propagate."""
        with patch.multiple(
            "django.conf.settings",
            MAILGUN_API_KEY="key-test",
            MAILGUN_SENDER_DOMAIN="mg.example.com",
            MAILGUN_API_URL="https://api.mailgun.net",
            DEFAULT_FROM_EMAIL="a@b.com",
        ):
            loud_backend = MailgunBackend(fail_silently=False)

        msg = EmailMessage(
            subject="Alert", body="body", from_email="a@b.com", to=["c@d.com"]
        )
        with pytest.raises(urllib.error.URLError):
            loud_backend.send_messages([msg])

    @patch("core_app.mailgun_backend.urllib.request.urlopen")
    def test_no_recipients_skips_send(self, mock_urlopen, backend):
        """A message with no recipients is skipped."""
        msg = EmailMessage(subject="Alert", body="body", from_email="a@b.com", to=[])
        sent = backend.send_messages([msg])
        assert sent == 0
        mock_urlopen.assert_not_called()
