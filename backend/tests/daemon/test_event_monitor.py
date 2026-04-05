"""
Unit tests for daemon/event_monitor components:
  StateTracker, AlertRuleEngine, NotificationService.

V&V Coverage (per V&V plan):
  - AlertRuleEngine + StateTracker combined:
    * Alert fires when duration threshold is met
    * No alert below threshold
    * Multiple rules evaluated independently
    * Dedup window prevents duplicate alerts
  - StateTracker:
    * Updates behavior on new detection
    * Tracks cumulative duration
    * Resets duration on behavior change
  - NotificationService:
    * dispatch() creates AlertEvent in DB
    * dispatch() called with correct parameters
"""

from __future__ import annotations

import time
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from api.models import AlertEvent, AlertRule


# ---------------------------------------------------------------------------
# StateTracker tests
# ---------------------------------------------------------------------------


class TestStateTracker:
    """Tests for daemon.event_monitor.state_tracker.StateTracker."""

    def _make_tracker(self):
        from daemon.event_monitor.state_tracker import StateTracker

        return StateTracker()

    def test_updates_behavior_on_new_detection(self):
        """update() stores the cow's current behavior."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)

        state = tracker.get_state("cow_1")
        assert state is not None
        assert state.current_behavior == "feeding"

    def test_first_update_sets_start_timestamp(self):
        """First update() sets behavior_start_ts to the received timestamp."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)

        state = tracker.get_state("cow_1")
        assert state.behavior_start_ts == pytest.approx(1769124140.0, rel=1e-6)

    def test_tracks_cumulative_duration(self):
        """duration_seconds reflects time between first and last update."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)
        tracker.update("cow_1", "feeding", 1769124200000)  # +60 s

        state = tracker.get_state("cow_1")
        assert state.duration_seconds == pytest.approx(60.0, abs=0.1)

    def test_resets_duration_on_behavior_change(self):
        """duration_seconds resets to ~0 when behavior transitions."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)
        tracker.update("cow_1", "feeding", 1769124200000)  # 60 s of feeding

        # Behavior changes
        tracker.update("cow_1", "standing", 1769124200000)

        state = tracker.get_state("cow_1")
        assert state.current_behavior == "standing"
        assert state.duration_seconds == pytest.approx(0.0, abs=0.1)

    def test_tracks_multiple_cows_independently(self):
        """update() tracks each cow's state independently."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)
        tracker.update("cow_2", "standing", 1769124150000)

        assert tracker.get_state("cow_1").current_behavior == "feeding"
        assert tracker.get_state("cow_2").current_behavior == "standing"

    def test_get_states_returns_all_cows(self):
        """get_states() returns shallow copy of all cow states."""
        tracker = self._make_tracker()
        tracker.update("cow_1", "feeding", 1769124140000)
        tracker.update("cow_2", "standing", 1769124150000)

        states = tracker.get_states()
        assert "cow_1" in states
        assert "cow_2" in states
        assert len(states) == 2

    def test_get_state_unknown_cow_returns_none(self):
        """get_state() returns None for an unknown cow_id."""
        tracker = self._make_tracker()
        assert tracker.get_state("cow_999") is None


# ---------------------------------------------------------------------------
# AlertRuleEngine + StateTracker combined tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAlertRuleEngine:
    """Combined tests for AlertRuleEngine and StateTracker per V&V plan."""

    def _make_engine(self):
        from daemon.event_monitor.alert_rule_engine import AlertRuleEngine

        engine = AlertRuleEngine()
        engine._last_refresh = 0.0  # force a refresh on next evaluate()
        return engine

    def _make_state(self, behavior: str, duration_s: float, cow_id: str = "cow_1"):
        from daemon.event_monitor.state_tracker import CowState

        now = time.time()
        return CowState(
            cow_id=cow_id,
            current_behavior=behavior,
            behavior_start_ts=now - duration_s,
            last_seen_ts=now,
        )

    def test_triggers_alert_when_duration_threshold_met(self):
        """Alert fires when behavior duration exceeds the configured threshold."""
        rule = AlertRule.objects.create(
            name="Long Feeding",
            conditions={
                "and": [
                    {"==": [{"var": "behavior"}, "feeding"]},
                    {">": [{"var": "duration"}, 30]},
                ]
            },
            actions={"notify": True},
            is_active=True,
        )

        engine = self._make_engine()
        state = self._make_state("feeding", duration_s=60.0)

        matches = engine.evaluate({"cow_1": state})

        assert len(matches) == 1
        assert matches[0][0].pk == rule.pk
        assert matches[0][1] == "cow_1"

    def test_no_alert_when_duration_below_threshold(self):
        """Alert does not fire when duration is below the threshold."""
        AlertRule.objects.create(
            name="Long Feeding",
            conditions={
                "and": [
                    {"==": [{"var": "behavior"}, "feeding"]},
                    {">": [{"var": "duration"}, 120]},  # 2-minute threshold
                ]
            },
            actions={"notify": True},
            is_active=True,
        )

        engine = self._make_engine()
        state = self._make_state("feeding", duration_s=30.0)  # only 30 s

        matches = engine.evaluate({"cow_1": state})

        assert matches == []

    def test_evaluates_multiple_rules_independently(self):
        """Each active rule is evaluated separately against each cow state."""
        AlertRule.objects.create(
            name="Feeding Rule",
            conditions={"==": [{"var": "behavior"}, "feeding"]},
            actions={},
            is_active=True,
        )
        AlertRule.objects.create(
            name="Lying Rule",
            conditions={"==": [{"var": "behavior"}, "lying"]},
            actions={},
            is_active=True,
        )

        engine = self._make_engine()
        states = {
            "cow_1": self._make_state("feeding", duration_s=10.0),
            "cow_2": self._make_state("lying", duration_s=10.0),
        }

        matches = engine.evaluate(states)

        matched_rules = {m[0].name for m in matches}
        assert "Feeding Rule" in matched_rules
        assert "Lying Rule" in matched_rules
        assert len(matches) == 2

    def test_inactive_rule_not_evaluated(self):
        """Inactive rules (is_active=False) are not loaded or evaluated."""
        AlertRule.objects.create(
            name="Inactive Rule",
            conditions={"==": [{"var": "behavior"}, "feeding"]},
            actions={},
            is_active=False,
        )

        engine = self._make_engine()
        state = self._make_state("feeding", duration_s=60.0)
        matches = engine.evaluate({"cow_1": state})
        assert matches == []


# ---------------------------------------------------------------------------
# NotificationService tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotificationService:
    """Tests for daemon.event_monitor.notification_service.NotificationService."""

    def _make_service(self, dedup_minutes: int = 0):
        from daemon.event_monitor.notification_service import NotificationService

        svc = NotificationService()
        svc._get_dedup_minutes = lambda: dedup_minutes
        return svc

    def _make_rule(self, name: str = "Test Rule"):
        return AlertRule.objects.create(
            name=name,
            conditions={"==": [{"var": "behavior"}, "feeding"]},
            actions={},
            is_active=True,
        )

    def _make_cow_state(
        self, cow_id: str = "cow_1", behavior: str = "feeding", duration: float = 60.0
    ):
        from daemon.event_monitor.state_tracker import CowState

        now = time.time()
        return CowState(
            cow_id=cow_id,
            current_behavior=behavior,
            behavior_start_ts=now - duration,
            last_seen_ts=now,
        )

    def test_dispatch_creates_alert_event_in_db(self):
        """dispatch() creates an AlertEvent record."""
        rule = self._make_rule()
        state = self._make_cow_state()
        svc = self._make_service(dedup_minutes=0)

        with patch.object(svc, "_dispatch_external"):
            result = svc.dispatch(rule, "cow_1", state)

        assert result is True
        assert AlertEvent.objects.filter(rule=rule).count() == 1

    def test_dispatch_stores_correct_cow_id_in_details(self):
        """dispatch() stores cow_id in AlertEvent.details."""
        rule = self._make_rule()
        state = self._make_cow_state(cow_id="cow_5")
        svc = self._make_service(dedup_minutes=0)

        with patch.object(svc, "_dispatch_external"):
            svc.dispatch(rule, "cow_5", state)

        event = AlertEvent.objects.get(rule=rule)
        assert event.details["cow_id"] == "cow_5"

    def test_dispatch_stores_behavior_and_duration(self):
        """dispatch() stores behavior and duration in AlertEvent.details."""
        rule = self._make_rule()
        state = self._make_cow_state(behavior="lying", duration=90.0)
        svc = self._make_service(dedup_minutes=0)

        with patch.object(svc, "_dispatch_external"):
            svc.dispatch(rule, "cow_1", state)

        event = AlertEvent.objects.get(rule=rule)
        assert event.details["behavior"] == "lying"
        assert event.details["duration_seconds"] == pytest.approx(90.0, abs=1.0)

    def test_dispatch_respects_dedup_window(self):
        """dispatch() does not fire again within the dedup window."""
        rule = self._make_rule()
        state = self._make_cow_state()
        svc = self._make_service(dedup_minutes=60)

        # Create a recent AlertEvent to simulate a prior trigger
        AlertEvent.objects.create(
            rule=rule,
            details={
                "cow_id": "cow_1",
                "behavior": "feeding",
                "duration_seconds": 60.0,
                "timestamp": 0,
            },
        )

        with patch.object(svc, "_dispatch_external"):
            result = svc.dispatch(rule, "cow_1", state)

        assert result is False
        assert AlertEvent.objects.filter(rule=rule).count() == 1  # no new event

    def test_dispatch_fires_after_dedup_window_expires(self):
        """dispatch() fires again after the dedup window has passed."""
        rule = self._make_rule()
        state = self._make_cow_state()
        svc = self._make_service(dedup_minutes=1)

        # Create an old AlertEvent (2 minutes ago — outside the window)
        old_event = AlertEvent.objects.create(
            rule=rule,
            details={
                "cow_id": "cow_1",
                "behavior": "feeding",
                "duration_seconds": 60.0,
                "timestamp": 0,
            },
        )
        # Backdating triggered_at to 2 minutes ago
        AlertEvent.objects.filter(pk=old_event.pk).update(
            triggered_at=timezone.now() - timedelta(minutes=2)
        )

        with patch.object(svc, "_dispatch_external"):
            result = svc.dispatch(rule, "cow_1", state)

        assert result is True
        assert AlertEvent.objects.filter(rule=rule).count() == 2
