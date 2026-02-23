"""
AlertRuleEngine — loads ``AlertRule`` records from the database and
evaluates their json-logic conditions against cow states.
"""

import logging
import time
from typing import List, Tuple

from daemon import config
from daemon.event_monitor.state_tracker import CowState

logger = logging.getLogger(__name__)

# panzi-json-logic — pure-Python JsonLogic implementation
try:
    from json_logic import jsonLogic
except ImportError:  # pragma: no cover
    logger.warning(
        "panzi-json-logic is not installed — AlertRuleEngine will not "
        "evaluate rules.  Install it with:  pip install panzi-json-logic"
    )
    jsonLogic = None  # type: ignore[assignment]

# Lazy model import (available after django.setup())
_AlertRule = None


def _get_model():
    global _AlertRule
    if _AlertRule is None:
        from api.models import AlertRule
        _AlertRule = AlertRule
    return _AlertRule


class AlertRuleEngine:
    """Periodically loads active alert rules and evaluates them.

    The rules are refreshed from the database every
    ``config.ALERT_RULE_REFRESH_SECONDS`` seconds so that changes
    made through the API take effect without restarting the daemon.
    """

    def __init__(self) -> None:
        self._rules: list = []
        self._last_refresh: float = 0.0
        self._refresh_interval = config.ALERT_RULE_REFRESH_SECONDS

    def evaluate(
        self,
        states: dict[str, CowState],
    ) -> List[Tuple[object, str, CowState]]:
        """Evaluate all active rules against all cow states.

        Returns
        -------
        list[tuple[AlertRule, cow_id, CowState]]
            Tuples of (rule, cow_id, state) for every match.
        """
        self._maybe_refresh()

        if jsonLogic is None:
            return []

        matches: List[Tuple[object, str, CowState]] = []
        for rule in self._rules:
            for cow_id, state in states.items():
                data = {
                    "behavior": state.current_behavior,
                    "duration": state.duration_seconds,
                    "cow_id": cow_id,
                    "timestamp": state.last_seen_ts,
                }
                try:
                    result = jsonLogic(rule.conditions, data)
                    if result:
                        matches.append((rule, cow_id, state))
                except Exception as exc:
                    logger.warning(
                        "Error evaluating rule %s: %s", rule.name, exc
                    )
        return matches

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _maybe_refresh(self) -> None:
        now = time.time()
        if (now - self._last_refresh) < self._refresh_interval:
            return
        self._refresh()
        self._last_refresh = now

    def _refresh(self) -> None:
        AlertRule = _get_model()
        try:
            self._rules = list(AlertRule.objects.filter(is_active=True))
            logger.debug("Loaded %d active alert rules", len(self._rules))
        except Exception as exc:
            logger.error("Failed to load alert rules: %s", exc)
