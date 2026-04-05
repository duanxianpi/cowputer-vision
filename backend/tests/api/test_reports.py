"""
Unit tests for GET /api/reports  (ReportListView).

V&V Coverage:
  - Authorization Test: valid JWT → 200; missing JWT → 401
  - Response Schema Test: items have report_id, report_type, data, generated_at
  - Behavioral Test: list all; retrieve by report_id; 404 on missing
"""

import uuid
import pytest

from api.models import Report


REPORTS_URL = "/api/reports"


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.get(REPORTS_URL)
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/reports — list
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_reports_empty(authenticated_client):
    """Returns 200 with empty list when no reports exist."""
    response = authenticated_client.get(REPORTS_URL)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_list_reports(authenticated_client, make_report):
    """Returns 200 with all available reports."""
    make_report(report_type="daily", data={"date": "2026-01-22"})
    make_report(report_type="daily", data={"date": "2026-01-23"})

    response = authenticated_client.get(REPORTS_URL)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.django_db
def test_list_reports_schema(authenticated_client, make_report):
    """List response items contain report_id, report_type, generated_at."""
    make_report()
    response = authenticated_client.get(REPORTS_URL)
    item = response.json()[0]
    assert "report_id" in item
    assert "report_type" in item
    assert "generated_at" in item


# ---------------------------------------------------------------------------
# GET /api/reports?report_id=<uuid>  — single report
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_report_by_id(authenticated_client, make_report):
    """Returns 200 with full report data when querying by report_id."""
    report = make_report()
    response = authenticated_client.get(
        REPORTS_URL, {"report_id": str(report.report_id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert str(data["report_id"]) == str(report.report_id)
    assert "data" in data


@pytest.mark.django_db
def test_get_report_full_schema(authenticated_client, make_report):
    """Single-report response includes report_id, report_type, data, generated_at."""
    report = make_report()
    response = authenticated_client.get(
        REPORTS_URL, {"report_id": str(report.report_id)}
    )
    item = response.json()
    for field in ("report_id", "report_type", "data", "generated_at"):
        assert field in item, f"Missing field: {field}"


@pytest.mark.django_db
def test_get_report_not_found(authenticated_client):
    """Returns 404 when report_id does not exist."""
    response = authenticated_client.get(REPORTS_URL, {"report_id": str(uuid.uuid4())})
    assert response.status_code == 404
