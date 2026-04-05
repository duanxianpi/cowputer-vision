"""
Unit tests for HLS/media file serving endpoints:
  GET /hls/<filename>      (HLSView  — AllowAny)
  GET /rec/<filename>      (RecView  — AllowAny with manual auth)
  GET /api/media-token     (MediaTokenView — IsAuthenticated)

V&V Coverage:
  - Authorization Test: HLS is public; /rec requires JWT or signed token; media-token requires JWT
  - Response Schema: media-token response has token, url, expires_in
  - Behavioral Test: 200 on existing file; 404 on missing file; 206 on Range request
"""

import pytest
from django.conf import settings as django_settings
from django.test import override_settings

from api.models import VideoSegment


HLS_URL = "/hls/"
REC_URL = "/rec/"
MEDIA_TOKEN_URL = "/api/media-token"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_test_file(
    directory: "Path", name: str, content: bytes = b"fake-ts-data"
) -> "Path":
    path = directory / name
    path.write_bytes(content)
    return path


# ---------------------------------------------------------------------------
# HLSView — AllowAny (no auth required)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_serve_m3u8(api_client, tmp_path):
    """GET /hls/<file>.m3u8 returns 200 with correct content type."""
    m3u8_file = _create_test_file(tmp_path, "live.m3u8", b"#EXTM3U\n")

    with override_settings(HLS_DIR=tmp_path):
        response = api_client.get(f"{HLS_URL}live.m3u8")

    assert response.status_code == 200
    assert "mpegurl" in response["Content-Type"].lower()


@pytest.mark.django_db
def test_serve_ts_segment(api_client, tmp_path):
    """GET /hls/<file>.ts returns 200."""
    _create_test_file(tmp_path, "seq_001.ts")

    with override_settings(HLS_DIR=tmp_path):
        response = api_client.get(f"{HLS_URL}seq_001.ts")

    assert response.status_code == 200


@pytest.mark.django_db
def test_serve_hls_no_auth_allowed(api_client, tmp_path):
    """HLS endpoint is AllowAny — no Authorization header needed."""
    _create_test_file(tmp_path, "live.m3u8", b"#EXTM3U\n")

    with override_settings(HLS_DIR=tmp_path):
        response = api_client.get(f"{HLS_URL}live.m3u8")

    assert response.status_code != 401


@pytest.mark.django_db
def test_serve_hls_file_not_found(api_client, tmp_path):
    """Returns 404 when requested HLS file does not exist."""
    with override_settings(HLS_DIR=tmp_path):
        response = api_client.get(f"{HLS_URL}nonexistent.ts")

    assert response.status_code == 404


@pytest.mark.django_db
def test_serve_hls_path_traversal(api_client, tmp_path):
    """Directory traversal path returns 400."""
    with override_settings(HLS_DIR=tmp_path):
        response = api_client.get(f"{HLS_URL}../etc/passwd")

    assert response.status_code in (400, 404)


# ---------------------------------------------------------------------------
# MediaTokenView — requires JWT
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_media_token_no_auth(api_client):
    """Missing Authorization header returns 401."""
    response = api_client.get(MEDIA_TOKEN_URL, {"filename": "seg_001.mp4"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_media_token_generation(authenticated_client):
    """Valid request returns 200 with token, url, and expires_in."""
    response = authenticated_client.get(MEDIA_TOKEN_URL, {"filename": "seg_001.mp4"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "url" in data
    assert "expires_in" in data


@pytest.mark.django_db
def test_media_token_missing_filename(authenticated_client):
    """Missing filename query param returns 400."""
    response = authenticated_client.get(MEDIA_TOKEN_URL)
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# RecView — AllowAny with manual auth check
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_rec_view_no_auth(api_client, tmp_path):
    """GET /rec/<file> without credentials returns 401."""
    _create_test_file(tmp_path, "seg_001.mp4")

    with override_settings(REC_DIR=tmp_path):
        response = api_client.get(f"{REC_URL}seg_001.mp4")

    assert response.status_code == 401


@pytest.mark.django_db
def test_rec_view_with_jwt(authenticated_client, tmp_path):
    """GET /rec/<file> with valid JWT returns 200."""
    _create_test_file(tmp_path, "seg_001.mp4")

    with override_settings(REC_DIR=tmp_path):
        response = authenticated_client.get(f"{REC_URL}seg_001.mp4")

    assert response.status_code == 200


@pytest.mark.django_db
def test_rec_view_file_not_found(authenticated_client, tmp_path):
    """Returns 404 when requested recording file does not exist."""
    with override_settings(REC_DIR=tmp_path):
        response = authenticated_client.get(f"{REC_URL}missing.mp4")

    assert response.status_code == 404


@pytest.mark.django_db
def test_rec_view_with_signed_token(api_client, admin_user, tmp_path):
    """GET /rec/<file>?token=<signed> returns 200 without Authorization header."""
    from django.core import signing

    filename = "seg_001.mp4"
    _create_test_file(tmp_path, filename)

    # Generate a valid signed token as the view does
    token = signing.dumps(
        {"uid": admin_user.id, "fn": filename},
        salt="media-token",
    )

    with override_settings(REC_DIR=tmp_path):
        response = api_client.get(f"{REC_URL}{filename}?token={token}")

    assert response.status_code == 200


@pytest.mark.django_db
def test_rec_view_invalid_signed_token(api_client, tmp_path):
    """GET /rec/<file>?token=<invalid> returns 403."""
    filename = "seg_001.mp4"
    _create_test_file(tmp_path, filename)

    with override_settings(REC_DIR=tmp_path):
        response = api_client.get(f"{REC_URL}{filename}?token=badtoken")

    assert response.status_code == 403


@pytest.mark.django_db
def test_rec_view_range_request(authenticated_client, tmp_path):
    """HTTP Range request returns 206 Partial Content."""
    content = b"A" * 4096
    _create_test_file(tmp_path, "seg_001.mp4", content)

    with override_settings(REC_DIR=tmp_path):
        response = authenticated_client.get(
            f"{REC_URL}seg_001.mp4",
            HTTP_RANGE="bytes=0-1023",
        )

    assert response.status_code == 206
