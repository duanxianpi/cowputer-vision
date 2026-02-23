"""
ReportStorage — persists generated reports via the ``Report`` model.
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

_Report = None


def _get_model():
    global _Report
    if _Report is None:
        from api.models import Report
        _Report = Report
    return _Report


class ReportStorage:
    """Write report dicts to the database."""

    @staticmethod
    def save(report_type: str, data: Dict[str, Any]) -> object:
        """Create and return a ``Report`` record.

        Parameters
        ----------
        report_type : str
            e.g. ``"daily"``, ``"weekly"``.
        data : dict
            JSON-serialisable report payload.
        """
        Report = _get_model()
        report = Report.objects.create(report_type=report_type, data=data)
        logger.info(
            "Saved report %s (type=%s)", report.report_id, report_type
        )
        return report
