"""
Unit tests for POST /api/tracks  (TracksView).

V&V Coverage:
  - Authorization Test: valid JWT → 200; missing/tampered JWT → 401
  - Input Validation Test: malformed JsonLogic → 400; non-dict body → 400
  - Response Schema Test: each item has id, cow_id, behavior, timestamp, bbox
  - Behavioral Test: valid query returns matching records; empty result returns []
"""

import pytest

from api.models import TrackingData


TRACKS_URL = "/api/tracks"

# A valid JsonLogic rule that matches behavior == "feeding"
FEEDING_RULE = {"==": [{"var": "behavior"}, "feeding"]}

# A rule matching a specific time range
TIME_RANGE_RULE = {
    "and": [
        {">=": [{"var": "timestamp"}, 1769124000000]},
        {"<=": [{"var": "timestamp"}, 1769124999000]},
    ]
}


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_post_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.post(TRACKS_URL, FEEDING_RULE, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_post_tampered_jwt(api_client, initialized_app):
    """Tampered / invalid JWT returns 401."""
    api_client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken.abc.xyz")
    response = api_client.post(TRACKS_URL, FEEDING_RULE, format="json")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Behavioral tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_post_valid_query_returns_list(authenticated_client, make_tracking_data):
    """Valid JsonLogic rule returns matching TrackingData records."""
    make_tracking_data(behavior="feeding", timestamp=1769124140000)
    make_tracking_data(behavior="standing", timestamp=1769124150000)

    response = authenticated_client.post(TRACKS_URL, FEEDING_RULE, format="json")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["behavior"] == "feeding"


@pytest.mark.django_db
def test_post_empty_result(authenticated_client):
    """Valid rule with no matching records returns empty list."""
    response = authenticated_client.post(TRACKS_URL, FEEDING_RULE, format="json")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_post_response_schema(authenticated_client, make_tracking_data):
    """Response items contain id, cow_id, behavior, timestamp, bbox."""
    make_tracking_data(
        cow_id="cow_5",
        behavior="feeding",
        timestamp=1769124140000,
        bbox=[10.0, 20.0, 50.0, 60.0],
    )
    response = authenticated_client.post(TRACKS_URL, FEEDING_RULE, format="json")
    assert response.status_code == 200
    item = response.json()[0]
    assert "id" in item
    assert item["cow_id"] == "cow_5"
    assert item["behavior"] == "feeding"
    assert item["timestamp"] == 1769124140000
    assert item["bbox"] == [10.0, 20.0, 50.0, 60.0]


@pytest.mark.django_db
def test_post_time_range_filter(authenticated_client, make_tracking_data):
    """Time-range JsonLogic rule returns only records within the range."""
    make_tracking_data(timestamp=1769124100000, behavior="standing")  # inside range
    make_tracking_data(timestamp=1769125000000, behavior="feeding")  # outside range

    response = authenticated_client.post(TRACKS_URL, TIME_RANGE_RULE, format="json")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["behavior"] == "standing"


# ---------------------------------------------------------------------------
# Input validation tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_post_non_dict_body(authenticated_client):
    """Non-object body (e.g. list) returns 400."""
    response = authenticated_client.post(
        TRACKS_URL,
        [{"==": [{"var": "behavior"}, "feeding"]}],
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_unsupported_operator(authenticated_client):
    """Unknown JsonLogic operator returns 400."""
    response = authenticated_client.post(
        TRACKS_URL,
        {"unsupported_op": [{"var": "behavior"}, "feeding"]},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_post_unknown_variable(authenticated_client):
    """Reference to an unknown variable returns 400."""
    response = authenticated_client.post(
        TRACKS_URL,
        {"==": [{"var": "unknown_field"}, "feeding"]},
        format="json",
    )
    assert response.status_code == 400
