"""Helpers for reading daemon runtime settings from the Setting table.

Values are read from the DB first and fall back to env-backed daemon config.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_Setting = None


def _get_setting_model():
    global _Setting
    if _Setting is None:
        from api.models import Setting

        _Setting = Setting
    return _Setting


def get_setting_raw(key: str) -> Optional[str]:
    """Return raw setting value from DB, or None when missing/unavailable."""
    try:
        Setting = _get_setting_model()
        row = Setting.objects.filter(key=key).first()
        if row is None:
            return None
        return row.value
    except Exception as exc:
        logger.warning("Could not read setting '%s' from DB: %s", key, exc)
        return None


def get_int_setting(
    key: str,
    default: int,
    *,
    min_value: int | None = None,
    max_value: int | None = None,
) -> int:
    """Read an integer setting from DB with validation and fallback."""
    raw = get_setting_raw(key)
    if raw is None:
        return default

    try:
        value = int(raw)
    except (TypeError, ValueError):
        logger.warning("Invalid int setting for '%s': %r", key, raw)
        return default

    if min_value is not None and value < min_value:
        logger.warning("Setting '%s' (%d) is below min %d", key, value, min_value)
        return default
    if max_value is not None and value > max_value:
        logger.warning("Setting '%s' (%d) is above max %d", key, value, max_value)
        return default
    return value


def get_float_setting(
    key: str,
    default: float,
    *,
    min_value: float | None = None,
    max_value: float | None = None,
) -> float:
    """Read a float setting from DB with validation and fallback."""
    raw = get_setting_raw(key)
    if raw is None:
        return default

    try:
        value = float(raw)
    except (TypeError, ValueError):
        logger.warning("Invalid float setting for '%s': %r", key, raw)
        return default

    if min_value is not None and value < min_value:
        logger.warning("Setting '%s' (%.3f) is below min %.3f", key, value, min_value)
        return default
    if max_value is not None and value > max_value:
        logger.warning("Setting '%s' (%.3f) is above max %.3f", key, value, max_value)
        return default
    return value


def get_int_list_setting(key: str, default: list[int]) -> list[int]:
    """Read a comma-separated int list from DB with fallback."""
    raw = get_setting_raw(key)
    if raw is None:
        return default

    try:
        values = [int(part.strip()) for part in raw.split(",") if part.strip()]
    except (TypeError, ValueError):
        logger.warning("Invalid integer list for '%s': %r", key, raw)
        return default

    if not values:
        return default
    return values
