"""
Unit tests for NotificationService external dispatch (email + webhook).

Covers:
  - Email dispatch via django.core.mail.send_mail
  - Webhook dispatch via urllib.request
  - Graceful error handling for both channels
  - No-op when actions is empty or missing keys
"""

from __future__ import annotations

import json
import time
from unittest.mock import MagicMock, patch

import pytest

from api.models import AlertRule
from daemon.event_monitor.notification_service import (
    NotificationService,
    _send_email_alert,
    _send_webhook_alert,
)


def _make_rule(actions: dict | None = None, name: str = "Test Rule"):
    """Create an in-memory AlertRule-like object (no DB required)."""
    rule = MagicMock(spec=AlertRule)
    rule.name = name
    rule.actions = actions or {}
    return rule


def _sample_details() -> dict:
    return {
        "cow_id": "cow_1",
        "behavior": "feeding",
        "duration_seconds": 90.0,
        "timestamp": time.time(),
    }


# ---------------------------------------------------------------------------
# _send_email_alert tests
# ---------------------------------------------------------------------------


class TestSendEmailAlert:
    """Tests for the _send_email_alert helper."""

    @patch("daemon.event_monitor.notification_service.send_mail")
    def test_sends_email_with_correct_args(self, mock_send):
        """send_mail is called with subject, body, sender, and recipient."""
        details = _sample_details()
        _send_email_alert("farmer@farm.com", "Long Feeding", details)

        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        subject, body, from_email, recipients = args

        assert "Long Feeding" in subject
        assert "cow_1" in body
        assert "feeding" in body
        assert recipients == ["farmer@farm.com"]

    @patch(
        "daemon.event_monitor.notification_service.send_mail",
        side_effect=Exception("SMTP down"),
    )
    def test_logs_warning_on_failure(self, mock_send, caplog):
        """A failed email does not raise; a warning is logged."""
        import logging

        with caplog.at_level(logging.WARNING):
            _send_email_alert("farmer@farm.com", "Rule", _sample_details())

        assert "Failed to send email" in caplog.text


# ---------------------------------------------------------------------------
# _send_webhook_alert tests
# ---------------------------------------------------------------------------


class TestSendWebhookAlert:
    """Tests for the _send_webhook_alert helper."""

    @patch("daemon.event_monitor.notification_service.urllib.request.urlopen")
    def test_posts_json_payload(self, mock_urlopen):
        """urlopen is called with a POST request containing JSON."""
        mock_urlopen.return_value.__enter__ = MagicMock()
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        details = _sample_details()
        _send_webhook_alert("https://hooks.example.com/alert", "Long Feeding", details)

        mock_urlopen.assert_called_once()
        req = mock_urlopen.call_args[0][0]
        assert req.method == "POST"
        assert req.get_header("Content-type") == "application/json"

        payload = json.loads(req.data)
        assert payload["rule"] == "Long Feeding"
        assert payload["cow_id"] == "cow_1"

    @patch(
        "daemon.event_monitor.notification_service.urllib.request.urlopen",
        side_effect=OSError("Connection refused"),
    )
    def test_logs_warning_on_failure(self, mock_urlopen, caplog):
        """A failed webhook does not raise; a warning is logged."""
        import logging

        with caplog.at_level(logging.WARNING):
            _send_webhook_alert(
                "https://hooks.example.com/alert", "Rule", _sample_details()
            )

        assert "Failed to send webhook" in caplog.text


# ---------------------------------------------------------------------------
# NotificationService._dispatch_external integration tests
# ---------------------------------------------------------------------------


class TestDispatchExternal:
    """Tests for _dispatch_external routing to email/webhook channels."""

    @patch("daemon.event_monitor.notification_service._send_webhook_alert")
    @patch("daemon.event_monitor.notification_service._send_email_alert")
    def test_dispatches_email_when_configured(self, mock_email, mock_webhook):
        """Email channel is invoked when actions contains 'email'."""
        rule = _make_rule(actions={"email": "farmer@farm.com"})
        details = _sample_details()

        NotificationService._dispatch_external(rule, details)

        mock_email.assert_called_once_with("farmer@farm.com", rule.name, details)
        mock_webhook.assert_not_called()

    @patch("daemon.event_monitor.notification_service._send_webhook_alert")
    @patch("daemon.event_monitor.notification_service._send_email_alert")
    def test_dispatches_webhook_when_configured(self, mock_email, mock_webhook):
        """Webhook channel is invoked when actions contains 'webhook'."""
        rule = _make_rule(actions={"webhook": "https://hooks.example.com/alert"})
        details = _sample_details()

        NotificationService._dispatch_external(rule, details)

        mock_webhook.assert_called_once_with(
            "https://hooks.example.com/alert", rule.name, details
        )
        mock_email.assert_not_called()

    @patch("daemon.event_monitor.notification_service._send_webhook_alert")
    @patch("daemon.event_monitor.notification_service._send_email_alert")
    def test_dispatches_both_channels(self, mock_email, mock_webhook):
        """Both channels fire when both keys are present."""
        rule = _make_rule(
            actions={
                "email": "farmer@farm.com",
                "webhook": "https://hooks.example.com/alert",
            }
        )
        details = _sample_details()

        NotificationService._dispatch_external(rule, details)

        mock_email.assert_called_once()
        mock_webhook.assert_called_once()

    @patch("daemon.event_monitor.notification_service._send_webhook_alert")
    @patch("daemon.event_monitor.notification_service._send_email_alert")
    def test_noop_when_actions_empty(self, mock_email, mock_webhook):
        """No channels are invoked when actions is an empty dict."""
        rule = _make_rule(actions={})
        NotificationService._dispatch_external(rule, _sample_details())

        mock_email.assert_not_called()
        mock_webhook.assert_not_called()

    @patch("daemon.event_monitor.notification_service._send_webhook_alert")
    @patch("daemon.event_monitor.notification_service._send_email_alert")
    def test_noop_when_actions_none(self, mock_email, mock_webhook):
        """No channels are invoked when actions is None."""
        rule = _make_rule(actions=None)
        NotificationService._dispatch_external(rule, _sample_details())

        mock_email.assert_not_called()
        mock_webhook.assert_not_called()
