"""
Test settings — uses SQLite in-memory so tests require no live PostgreSQL.
"""

from core_app.settings import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Silence password validators for faster test user creation.
AUTH_PASSWORD_VALIDATORS = []

# Disable X-Sendfile; tests serve files directly.
USE_X_SENDFILE = False

# Use in-memory email backend so django.core.mail.outbox works in tests.
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
