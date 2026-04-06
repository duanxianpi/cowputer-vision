"""
EventMonitor — orchestrator that polls ``TrackingData``, updates the
``StateTracker``, evaluates alert rules, and dispatches notifications.
"""

import logging
import signal
import time
from datetime import timedelta

from django.utils import timezone

from daemon import config
from daemon.settings_store import get_float_setting, get_int_setting
from daemon.event_monitor.state_tracker import StateTracker
from daemon.event_monitor.alert_rule_engine import AlertRuleEngine
from daemon.event_monitor.notification_service import NotificationService

logger = logging.getLogger(__name__)

# Lazy model import
_TrackingData = None
_AlertEvent = None


def _get_tracking_model():
    global _TrackingData
    if _TrackingData is None:
        from api.models import TrackingData

        _TrackingData = TrackingData
    return _TrackingData


def _get_alert_event_model():
    global _AlertEvent
    if _AlertEvent is None:
        from api.models import AlertEvent

        _AlertEvent = AlertEvent
    return _AlertEvent


class EventMonitor:
    """Polling-based event monitor.

    The monitor runs an infinite loop:

    1. Query recent ``TrackingData`` records (look-back window).
    2. Feed each record into the ``StateTracker``.
    3. Evaluate all active ``AlertRule`` conditions.
    4. Dispatch ``AlertEvent`` records for matches.
    5. Sleep until the next poll interval.
    """

    def __init__(self) -> None:
        self._poll_interval = config.EVENT_POLL_INTERVAL
        self._lookback_ms = config.EVENT_LOOKBACK_SECONDS * 1000
        self._running = False

        self._state_tracker = StateTracker()
        self._rule_engine = AlertRuleEngine()
        self._notifier = NotificationService()

        # Track the latest timestamp we've already processed to avoid
        # re-processing the same records on each poll.
        self._cursor_ts: int = 0

        # Alert event retention: run cleanup once per hour
        self._retention_hours = config.ALERT_EVENT_RETENTION_HOURS
        self._last_cleanup_time: float = 0

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Blocking main loop."""
        self._running = True
        self._install_signal_handlers()
        self._refresh_runtime_settings()
        logger.info(
            "EventMonitor running (poll=%.1fs, lookback=%ds)",
            self._poll_interval,
            int(self._lookback_ms / 1000),
        )

        while self._running:
            self._refresh_runtime_settings()
            try:
                self._tick()
            except Exception as exc:
                logger.exception("EventMonitor tick error: %s", exc)
            time.sleep(self._poll_interval)

        logger.info("EventMonitor stopped")

    def stop(self) -> None:
        logger.info("Stop requested")
        self._running = False

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _refresh_runtime_settings(self) -> None:
        """Pull runtime-tunable monitor settings from DB-backed Setting."""
        self._poll_interval = get_float_setting(
            "event_poll_interval",
            config.EVENT_POLL_INTERVAL,
            min_value=0.05,
        )
        lookback_seconds = get_int_setting(
            "event_lookback_seconds",
            config.EVENT_LOOKBACK_SECONDS,
            min_value=1,
        )
        self._lookback_ms = lookback_seconds * 1000
        self._retention_hours = get_int_setting(
            "alert_event_retention_hours",
            config.ALERT_EVENT_RETENTION_HOURS,
            min_value=0,
        )

    def _tick(self) -> None:
        TrackingData = _get_tracking_model()

        # Determine the lower bound for the query
        now_ms = int(time.time() * 1000)
        lower_bound = max(self._cursor_ts, now_ms - self._lookback_ms)

        records = (
            TrackingData.objects.filter(timestamp__gt=lower_bound)
            .order_by("timestamp")
            .values_list("cow_id", "behavior", "timestamp")
        )

        max_ts = self._cursor_ts
        for cow_id, behavior, ts in records:
            self._state_tracker.update(cow_id, behavior, ts)
            if ts > max_ts:
                max_ts = ts

        self._cursor_ts = max_ts

        # Remove cows not seen recently
        self._state_tracker.remove_stale(max_age_seconds=300)

        # Evaluate rules
        states = self._state_tracker.get_states()
        if not states:
            return

        matches = self._rule_engine.evaluate(states)
        for rule, cow_id, state in matches:
            self._notifier.dispatch(rule, cow_id, state)

        # Periodically purge old alert events
        self._maybe_purge_old_events()

    def _maybe_purge_old_events(self) -> None:
        """Delete alert events older than the retention window (once per hour)."""
        if self._retention_hours <= 0:
            return
        now = time.monotonic()
        if now - self._last_cleanup_time < 3600:
            return
        self._last_cleanup_time = now

        cutoff = timezone.now() - timedelta(hours=self._retention_hours)
        AlertEvent = _get_alert_event_model()
        deleted, _ = AlertEvent.objects.filter(triggered_at__lt=cutoff).delete()
        if deleted:
            logger.info(
                "Purged %d alert event(s) older than %dh",
                deleted,
                self._retention_hours,
            )

    def _install_signal_handlers(self) -> None:
        def _handler(signum, _frame):
            logger.info("Received signal %d — shutting down", signum)
            self.stop()

        signal.signal(signal.SIGTERM, _handler)
        signal.signal(signal.SIGINT, _handler)
