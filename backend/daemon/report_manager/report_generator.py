"""
ReportGenerator — aggregates ``TrackingData`` to produce daily metrics.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timezone, timedelta
from typing import Any, Dict, List

from django.db.models import Count, Min, Max

logger = logging.getLogger(__name__)

_TrackingData = None


def _get_model():
    global _TrackingData
    if _TrackingData is None:
        from api.models import TrackingData
        _TrackingData = TrackingData
    return _TrackingData


class ReportGenerator:
    """Aggregate tracking data into summary metrics.

    The generator queries ``TrackingData`` for a given date range and
    computes:

    * Total distinct cows detected
    * Per-behavior total time (estimated from record intervals)
    * Per-cow behavior breakdown
    * Average behavior durations
    """

    def generate_daily_report(self, report_date: date | None = None) -> Dict[str, Any]:
        """Generate a report for *report_date* (defaults to yesterday).

        Returns a JSON-serialisable dict with the aggregated metrics.
        """
        if report_date is None:
            report_date = date.today() - timedelta(days=1)

        start_ms = int(
            datetime.combine(report_date, datetime.min.time(), tzinfo=timezone.utc)
            .timestamp()
            * 1000
        )
        end_ms = start_ms + 86_400_000  # +24 h

        TrackingData = _get_model()
        qs = TrackingData.objects.filter(
            timestamp__gte=start_ms, timestamp__lt=end_ms
        )

        total_records = qs.count()
        if total_records == 0:
            logger.info("No tracking data for %s — empty report", report_date)
            return self._empty_report(report_date)

        # --- Distinct cows ---
        cow_ids = list(
            qs.values_list("cow_id", flat=True).distinct()
        )

        # --- Per-behavior totals ---
        behavior_stats = self._compute_behavior_stats(qs)

        # --- Per-cow breakdown ---
        per_cow = self._compute_per_cow(qs, cow_ids)

        report = {
            "date": report_date.isoformat(),
            "total_cows": len(cow_ids),
            "total_records": total_records,
            "behavior_summary": behavior_stats,
            "per_cow": per_cow,
        }

        logger.info(
            "Generated daily report for %s — %d cows, %d records",
            report_date,
            len(cow_ids),
            total_records,
        )
        return report

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_behavior_stats(qs) -> Dict[str, Any]:
        """Count records and estimate duration per behavior.

        Duration is estimated by counting the number of records for each
        behavior and multiplying by the average inter-record interval
        (derived from the overall time-span of the query-set).
        """
        agg = qs.aggregate(ts_min=Min("timestamp"), ts_max=Max("timestamp"))
        ts_range_s = max((agg["ts_max"] - agg["ts_min"]) / 1000.0, 1.0)

        total_count = qs.count()
        avg_interval_s = ts_range_s / max(total_count - 1, 1)

        rows = (
            qs.values("behavior")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        stats = {}
        for row in rows:
            b = row["behavior"]
            c = row["count"]
            stats[b] = {
                "record_count": c,
                "estimated_duration_seconds": round(c * avg_interval_s, 2),
                "percentage": round(c / total_count * 100, 2),
            }
        return stats

    @staticmethod
    def _compute_per_cow(qs, cow_ids: List[str]) -> Dict[str, Any]:
        """Compute a behavior breakdown for each cow."""
        per_cow: Dict[str, Any] = {}
        for cow_id in cow_ids:
            cow_qs = qs.filter(cow_id=cow_id)
            rows = (
                cow_qs.values("behavior")
                .annotate(count=Count("id"))
                .order_by("-count")
            )
            per_cow[cow_id] = {
                "total_records": cow_qs.count(),
                "behaviors": {
                    row["behavior"]: row["count"] for row in rows
                },
            }
        return per_cow

    @staticmethod
    def _empty_report(report_date: date) -> Dict[str, Any]:
        return {
            "date": report_date.isoformat(),
            "total_cows": 0,
            "total_records": 0,
            "behavior_summary": {},
            "per_cow": {},
        }
