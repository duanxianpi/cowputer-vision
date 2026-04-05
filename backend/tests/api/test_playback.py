"""
Unit tests for GET /api/playback  (PlaybackView).

V&V Coverage:
  - Authorization Test: valid JWT → 200; missing JWT → 401
  - Input Validation Test: missing params → 400; non-integer params → 400
  - Response Schema Test: each item has filename, start_ts, end_ts
  - Behavioral Test: returns segments overlapping the requested range
"""

import pytest

from api.models import VideoSegment


PLAYBACK_URL = "/api/playback"


# ---------------------------------------------------------------------------
# Authorization tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.get(PLAYBACK_URL, {"start": "1000", "end": "2000"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Input validation tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_missing_start_param(authenticated_client):
    """Missing 'start' query param returns 400."""
    response = authenticated_client.get(PLAYBACK_URL, {"end": "2000"})
    assert response.status_code == 400


@pytest.mark.django_db
def test_missing_end_param(authenticated_client):
    """Missing 'end' query param returns 400."""
    response = authenticated_client.get(PLAYBACK_URL, {"start": "1000"})
    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_start_type(authenticated_client):
    """Non-integer 'start' param returns 400."""
    response = authenticated_client.get(PLAYBACK_URL, {"start": "abc", "end": "2000"})
    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_end_type(authenticated_client):
    """Non-integer 'end' param returns 400."""
    response = authenticated_client.get(PLAYBACK_URL, {"start": "1000", "end": "xyz"})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Behavioral tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_segments_valid_range(authenticated_client, make_video_segment):
    """Returns 200 with list of VideoSegments overlapping the range."""
    # Segment overlaps [1769124000000, 1769124600000]
    make_video_segment(
        filename="seg_001.mp4",
        start_ts=1769124000000,
        end_ts=1769124600000,
    )
    response = authenticated_client.get(
        PLAYBACK_URL,
        {"start": "1769124100000", "end": "1769124500000"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "seg_001.mp4"


@pytest.mark.django_db
def test_list_segments_empty_range(authenticated_client, make_video_segment):
    """Returns 200 with empty list when no segments overlap the range."""
    make_video_segment(start_ts=1769124000000, end_ts=1769124600000)
    # Query a non-overlapping range
    response = authenticated_client.get(
        PLAYBACK_URL,
        {"start": "1769200000000", "end": "1769201000000"},
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_response_schema(authenticated_client, make_video_segment):
    """Response items contain filename, start_ts, end_ts fields."""
    make_video_segment(
        filename="seg_001.mp4",
        start_ts=1769124000000,
        end_ts=1769124600000,
    )
    response = authenticated_client.get(
        PLAYBACK_URL,
        {"start": "1769124100000", "end": "1769124500000"},
    )
    item = response.json()[0]
    assert "filename" in item
    assert "start_ts" in item
    assert "end_ts" in item
