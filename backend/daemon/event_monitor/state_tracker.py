"""
StateTracker — in-memory state machine that tracks per-cow behavior duration.

Each cow's current behavior and its start time are maintained so the
``AlertRuleEngine`` can evaluate duration-based alert conditions.

.. warning::

   State is held **in-memory only**.  If the process crashes, all
   accumulated state is lost (this is a known trade-off documented in
   the design doc).
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class CowState:
    """Snapshot of a single cow's behavioral state."""

    cow_id: str
    current_behavior: str = "unknown"
    behavior_start_ts: float = 0.0          # epoch seconds
    last_seen_ts: float = 0.0               # epoch seconds

    @property
    def duration_seconds(self) -> float:
        """Seconds the cow has been in ``current_behavior``."""
        if self.behavior_start_ts <= 0:
            return 0.0
        return self.last_seen_ts - self.behavior_start_ts


class StateTracker:
    """Maintains an in-memory ``{cow_id: CowState}`` dictionary.

    Call ``update()`` with each new tracking record.  The tracker
    detects behavior transitions and resets the duration timer.
    """

    def __init__(self) -> None:
        self._states: Dict[str, CowState] = {}

    def update(
        self,
        cow_id: str,
        behavior: str,
        timestamp_ms: int,
    ) -> None:
        """Ingest a single tracking record.

        Parameters
        ----------
        cow_id : str
            Unique cow identifier (e.g. ``"cow_1"``).
        behavior : str
            Current behavior label (e.g. ``"feeding"``).
        timestamp_ms : int
            Millisecond Unix epoch from ``TrackingData.timestamp``.
        """
        ts = timestamp_ms / 1000.0  # convert to seconds

        state = self._states.get(cow_id)
        if state is None:
            # First time seeing this cow
            self._states[cow_id] = CowState(
                cow_id=cow_id,
                current_behavior=behavior,
                behavior_start_ts=ts,
                last_seen_ts=ts,
            )
            return

        if state.current_behavior != behavior:
            # Behavior changed — reset timer
            logger.debug(
                "%s transitioned %s → %s (was %.1fs)",
                cow_id,
                state.current_behavior,
                behavior,
                state.duration_seconds,
            )
            state.current_behavior = behavior
            state.behavior_start_ts = ts

        state.last_seen_ts = ts

    def get_states(self) -> Dict[str, CowState]:
        """Return a *shallow copy* of all cow states."""
        return dict(self._states)

    def get_state(self, cow_id: str) -> Optional[CowState]:
        return self._states.get(cow_id)

    def remove_stale(self, max_age_seconds: float = 300) -> int:
        """Remove cows not seen for longer than *max_age_seconds*.

        Returns the number of removed entries.
        """
        now = time.time()
        stale = [
            cid
            for cid, s in self._states.items()
            if (now - s.last_seen_ts) > max_age_seconds
        ]
        for cid in stale:
            del self._states[cid]
        if stale:
            logger.info("Removed %d stale cow states", len(stale))
        return len(stale)
