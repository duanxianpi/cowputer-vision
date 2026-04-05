"""
Unit tests for daemon/report_manager components:
  ReportGenerator, ReportStorage.

V&V Coverage (per V&V plan):
  - ReportGenerator:
    * Aggregates behavior record counts correctly
    * Computes estimated duration per behavior
    * Empty data produces valid report structure
  - ReportStorage:
    * save() creates a Report DB row
    * Report has correct metadata: report_id, report_type, generated_at
"""

from __future__ import annotations

from datetime import date, timedelta
import pytest

from api.models import Report, TrackingData


# ---------------------------------------------------------------------------
# ReportGenerator tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReportGenerator:
    """Tests for daemon.report_manager.report_generator.ReportGenerator."""

    def _make_generator(self):
        from daemon.report_manager.report_generator import ReportGenerator

        return ReportGenerator()

    def _insert_records(self, report_date: date, rows: list[tuple[str, str]]):
        """Insert TrackingData rows for the given date.

        rows: list of (cow_id, behavior)
        """
        from datetime import datetime, timezone as tz

        base_ms = int(
            datetime.combine(
                report_date, datetime.min.time(), tzinfo=tz.utc
            ).timestamp()
            * 1000
        )
        interval_ms = 60_000  # 1-minute intervals

        for i, (cow_id, behavior) in enumerate(rows):
            TrackingData.objects.create(
                cow_id=cow_id,
                timestamp=base_ms + i * interval_ms,
                behavior=behavior,
                bbox=[0.0, 0.0, 50.0, 50.0],
            )

    def test_aggregates_behavior_counts_correctly(self):
        """generate_daily_report() counts records per behavior correctly."""
        target_date = date(2026, 1, 22)
        gen = self._make_generator()

        self._insert_records(
            target_date,
            [
                ("cow_1", "feeding"),
                ("cow_1", "feeding"),
                ("cow_1", "standing"),
            ],
        )

        report = gen.generate_daily_report(report_date=target_date)

        assert report["behavior_summary"]["feeding"]["record_count"] == 2
        assert report["behavior_summary"]["standing"]["record_count"] == 1

    def test_computes_total_duration_per_behavior(self):
        """behavior_summary includes estimated_duration_seconds for each behavior."""
        target_date = date(2026, 1, 22)
        gen = self._make_generator()

        self._insert_records(
            target_date,
            [
                ("cow_1", "feeding"),
                ("cow_1", "feeding"),
            ],
        )

        report = gen.generate_daily_report(report_date=target_date)

        assert "estimated_duration_seconds" in report["behavior_summary"]["feeding"]
        assert report["behavior_summary"]["feeding"]["estimated_duration_seconds"] >= 0

    def test_empty_data_produces_valid_report_structure(self):
        """generate_daily_report() returns valid structure when no data exists."""
        gen = self._make_generator()
        report = gen.generate_daily_report(report_date=date(2025, 1, 1))

        assert "date" in report
        assert "total_cows" in report
        assert "total_records" in report
        assert "behavior_summary" in report
        assert "per_cow" in report
        assert report["total_cows"] == 0
        assert report["total_records"] == 0

    def test_report_includes_all_cows(self):
        """per_cow breakdown includes each detected cow."""
        target_date = date(2026, 1, 22)
        gen = self._make_generator()

        self._insert_records(
            target_date,
            [
                ("cow_1", "feeding"),
                ("cow_2", "standing"),
                ("cow_3", "lying"),
            ],
        )

        report = gen.generate_daily_report(report_date=target_date)

        assert "cow_1" in report["per_cow"]
        assert "cow_2" in report["per_cow"]
        assert "cow_3" in report["per_cow"]
        assert report["total_cows"] == 3

    def test_report_date_field_matches_requested_date(self):
        """The 'date' field in the report matches the requested report_date."""
        target_date = date(2026, 1, 22)
        gen = self._make_generator()
        self._insert_records(target_date, [("cow_1", "feeding")])

        report = gen.generate_daily_report(report_date=target_date)

        assert report["date"] == target_date.isoformat()

    def test_behavior_percentages_sum_to_100(self):
        """Percentage values across all behaviors sum to approximately 100%."""
        target_date = date(2026, 1, 22)
        gen = self._make_generator()

        self._insert_records(
            target_date,
            [
                ("cow_1", "feeding"),
                ("cow_1", "standing"),
                ("cow_1", "lying"),
                ("cow_1", "feeding"),
            ],
        )

        report = gen.generate_daily_report(report_date=target_date)
        total_pct = sum(b["percentage"] for b in report["behavior_summary"].values())
        assert total_pct == pytest.approx(100.0, abs=0.5)


# ---------------------------------------------------------------------------
# ReportStorage tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReportStorage:
    """Tests for daemon.report_manager.report_storage.ReportStorage."""

    def _make_storage(self):
        from daemon.report_manager.report_storage import ReportStorage

        return ReportStorage()

    def test_saves_report_creates_db_row(self):
        """save() creates a Report record in the database."""
        storage = self._make_storage()
        data = {"date": "2026-01-22", "total_cows": 3}

        storage.save(report_type="daily", data=data)

        assert Report.objects.filter(report_type="daily").count() == 1

    def test_report_has_correct_metadata_fields(self):
        """Saved Report has report_id, report_type, data, and generated_at."""
        storage = self._make_storage()
        data = {"date": "2026-01-22", "total_cows": 5}

        report_obj = storage.save(report_type="daily", data=data)

        assert report_obj.report_id is not None
        assert report_obj.report_type == "daily"
        assert report_obj.data == data
        assert report_obj.generated_at is not None

    def test_saves_correct_data_payload(self):
        """The stored report data matches the input dict exactly."""
        storage = self._make_storage()
        data = {
            "date": "2026-01-22",
            "total_cows": 10,
            "behavior_summary": {"feeding": {"record_count": 5}},
        }

        storage.save(report_type="daily", data=data)

        saved = Report.objects.get(report_type="daily")
        assert saved.data == data

    def test_multiple_reports_stored_independently(self):
        """Multiple save() calls create independent DB rows."""
        storage = self._make_storage()

        storage.save(report_type="daily", data={"date": "2026-01-22"})
        storage.save(report_type="daily", data={"date": "2026-01-23"})

        assert Report.objects.count() == 2
