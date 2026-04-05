"""
Unit tests for GET/POST/PUT/DELETE /api/alerts  (AlertRuleListView + AlertRuleDetailView).

V&V Coverage:
  - Authorization Test: valid JWT → 2xx; missing JWT → 401
  - Input Validation Test: missing required fields → 400
  - Response Schema Test: expected fields present
  - Database State Test: POST creates DB row; DELETE removes it
  - Behavioral Test: 404 on missing resource
"""

import pytest

from api.models import AlertRule


ALERTS_URL = "/api/alerts"

VALID_RULE_PAYLOAD = {
    "name": "Long Feeding Alert",
    "description": "Trigger when a cow feeds for over 60 seconds.",
    "conditions": {
        "and": [
            {"==": [{"var": "behavior"}, "feeding"]},
            {">": [{"var": "duration"}, 60]},
        ]
    },
    "actions": {"notify": True},
    "is_active": True,
}


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_alerts_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.get(ALERTS_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_alert_no_auth(api_client):
    """Missing Authorization header for POST returns 401."""
    response = api_client.post(ALERTS_URL, VALID_RULE_PAYLOAD, format="json")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/alerts — list
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_alerts_empty(authenticated_client):
    """Returns 200 with empty list when no rules exist."""
    response = authenticated_client.get(ALERTS_URL)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_list_alerts_returns_rules(authenticated_client, make_alert_rule):
    """Returns 200 with list containing the created rules."""
    make_alert_rule(name="Rule A")
    make_alert_rule(name="Rule B")
    response = authenticated_client.get(ALERTS_URL)
    assert response.status_code == 200
    names = [r["name"] for r in response.json()]
    assert "Rule A" in names
    assert "Rule B" in names


# ---------------------------------------------------------------------------
# POST /api/alerts — create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_alert_success(authenticated_client):
    """Valid payload returns 201 and creates a DB row."""
    response = authenticated_client.post(ALERTS_URL, VALID_RULE_PAYLOAD, format="json")
    assert response.status_code == 201
    assert AlertRule.objects.filter(name="Long Feeding Alert").exists()


@pytest.mark.django_db
def test_create_alert_response_schema(authenticated_client):
    """Created alert response includes expected fields."""
    response = authenticated_client.post(ALERTS_URL, VALID_RULE_PAYLOAD, format="json")
    data = response.json()
    for field in (
        "id",
        "name",
        "description",
        "conditions",
        "actions",
        "is_active",
        "last_modified_at",
    ):
        assert field in data, f"Missing field: {field}"


@pytest.mark.django_db
def test_create_alert_missing_name(authenticated_client):
    """Missing 'name' field returns 400."""
    payload = {k: v for k, v in VALID_RULE_PAYLOAD.items() if k != "name"}
    response = authenticated_client.post(ALERTS_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_alert_missing_conditions(authenticated_client):
    """Missing 'conditions' field returns 400."""
    payload = {k: v for k, v in VALID_RULE_PAYLOAD.items() if k != "conditions"}
    response = authenticated_client.post(ALERTS_URL, payload, format="json")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/alerts/<id> — detail
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_alert_detail(authenticated_client, make_alert_rule):
    """Returns 200 with the requested alert rule including events."""
    rule = make_alert_rule()
    response = authenticated_client.get(f"{ALERTS_URL}/{rule.pk}")
    assert response.status_code == 200
    assert response.json()["id"] == rule.pk
    assert "events" in response.json()


@pytest.mark.django_db
def test_get_alert_not_found(authenticated_client):
    """Returns 404 when alert rule does not exist."""
    response = authenticated_client.get(f"{ALERTS_URL}/99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/alerts/<id> — update
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_update_alert_success(authenticated_client, make_alert_rule):
    """PUT with valid data returns 200 and persists the change."""
    rule = make_alert_rule(name="Original Name")
    response = authenticated_client.put(
        f"{ALERTS_URL}/{rule.pk}",
        {"name": "Updated Name"},
        format="json",
    )
    assert response.status_code == 200
    rule.refresh_from_db()
    assert rule.name == "Updated Name"


@pytest.mark.django_db
def test_update_alert_not_found(authenticated_client):
    """Returns 404 when updating a non-existent rule."""
    response = authenticated_client.put(
        f"{ALERTS_URL}/99999",
        {"name": "Whatever"},
        format="json",
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/alerts/<id>
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_delete_alert_success(authenticated_client, make_alert_rule):
    """DELETE returns 204 and removes the DB row."""
    rule = make_alert_rule()
    pk = rule.pk
    response = authenticated_client.delete(f"{ALERTS_URL}/{pk}")
    assert response.status_code == 204
    assert not AlertRule.objects.filter(pk=pk).exists()


@pytest.mark.django_db
def test_delete_alert_not_found(authenticated_client):
    """Returns 404 when deleting a non-existent rule."""
    response = authenticated_client.delete(f"{ALERTS_URL}/99999")
    assert response.status_code == 404
