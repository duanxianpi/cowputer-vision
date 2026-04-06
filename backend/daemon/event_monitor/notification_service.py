"""
NotificationService — creates ``AlertEvent`` records when alert rules
are triggered and provides a deduplication window to avoid alert spam.
"""

import json
import logging
import urllib.request
import urllib.error
from datetime import timedelta

from django.core.mail import send_mail
from django.utils import timezone

from daemon import config
from daemon.settings_store import get_int_setting
from daemon.event_monitor.state_tracker import CowState

logger = logging.getLogger(__name__)

_AlertEvent = None


def _get_model():
    global _AlertEvent
    if _AlertEvent is None:
        from api.models import AlertEvent

        _AlertEvent = AlertEvent
    return _AlertEvent


class NotificationService:
    """Dispatch alert events to the database (and future channels).

    Deduplication
    -------------
    An alert will **not** fire again for the same ``(rule, cow_id)``
    pair within ``ALERT_DEDUP_MINUTES`` minutes (read from DB Setting
    on each call, falling back to env-var config).
    """

    def _get_dedup_minutes(self) -> int:
        """Read alert_dedup_minutes from DB Setting, falling back to env-var config."""
        return get_int_setting(
            "alert_dedup_minutes",
            config.ALERT_DEDUP_MINUTES,
            min_value=0,
        )

    def dispatch(
        self,
        rule,  # AlertRule model instance
        cow_id: str,
        state: CowState,
    ) -> bool:
        """Create an ``AlertEvent`` record if not recently triggered.

        Returns *True* if an event was actually created.
        """
        AlertEvent = _get_model()

        # --- Deduplication check ---
        cutoff = timezone.now() - timedelta(minutes=self._get_dedup_minutes())
        recent = AlertEvent.objects.filter(
            rule=rule,
            triggered_at__gte=cutoff,
            details__cow_id=cow_id,
        ).exists()

        if recent:
            logger.debug(
                "Skipping duplicate alert for rule=%s cow=%s",
                rule.name,
                cow_id,
            )
            return False

        # --- Create event ---
        details = {
            "cow_id": cow_id,
            "behavior": state.current_behavior,
            "duration_seconds": round(state.duration_seconds, 2),
            "timestamp": state.last_seen_ts,
        }

        AlertEvent.objects.create(rule=rule, details=details)
        logger.info(
            "Alert triggered: rule=%s cow=%s behavior=%s duration=%.1fs",
            rule.name,
            cow_id,
            state.current_behavior,
            state.duration_seconds,
        )

        self._dispatch_external(rule, details)
        return True

    @staticmethod
    def _dispatch_external(rule, details: dict) -> None:
        """Send notifications to external channels defined in ``rule.actions``.

        Supported keys in ``rule.actions``:

        * ``"email"`` — recipient address; sends a plain-text alert email.
        * ``"webhook"`` — HTTPS URL; receives a JSON POST with alert details.

        Each channel is dispatched independently; a failure in one channel
        does not block the others and is logged as a warning.
        """
        actions = rule.actions
        if not actions or not isinstance(actions, dict):
            return

        if "email" in actions:
            _send_email_alert(actions["email"], rule.name, details)

        if "webhook" in actions:
            _send_webhook_alert(actions["webhook"], rule.name, details)


def _send_email_alert(recipient: str, rule_name: str, details: dict) -> None:
    """Send an alert email to *recipient*."""
    subject = f"Cow-puter Vision Alert: {rule_name}"
    body = (
        f'Alert rule "{rule_name}" triggered.\n\n'
        f"Cow ID:    {details.get('cow_id', 'N/A')}\n"
        f"Behavior:  {details.get('behavior', 'N/A')}\n"
        f"Duration:  {details.get('duration_seconds', 0):.1f}s\n"
        f"Timestamp: {details.get('timestamp', 'N/A')}\n"
    )
    try:
        send_mail(
            subject,
            body,
            config.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )
        logger.info("Email alert sent to %s for rule=%s", recipient, rule_name)
    except Exception:
        logger.warning(
            "Failed to send email alert to %s for rule=%s",
            recipient,
            rule_name,
            exc_info=True,
        )


def _send_webhook_alert(url: str, rule_name: str, details: dict) -> None:
    """POST alert details as JSON to *url*."""
    payload = json.dumps({"rule": rule_name, **details}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=config.WEBHOOK_TIMEOUT):
            pass
        logger.info("Webhook alert sent to %s for rule=%s", url, rule_name)
    except (urllib.error.URLError, OSError):
        logger.warning(
            "Failed to send webhook alert to %s for rule=%s",
            url,
            rule_name,
            exc_info=True,
        )
