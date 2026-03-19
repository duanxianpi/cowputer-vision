"""
NotificationService — creates ``AlertEvent`` records when alert rules
are triggered and provides a deduplication window to avoid alert spam.
"""

import logging
from datetime import timedelta

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

        # Future: send email, webhook, push notification, etc.
        self._dispatch_external(rule, details)
        return True

    @staticmethod
    def _dispatch_external(rule, details: dict) -> None:
        """Stub for external notification channels.

        The ``rule.actions`` JSON can specify channels (e.g.
        ``{"email": "farmer@example.com"}``).  This method is a
        placeholder for future implementation.
        """
        # TODO: Implement email / webhook dispatch based on rule.actions
        pass
