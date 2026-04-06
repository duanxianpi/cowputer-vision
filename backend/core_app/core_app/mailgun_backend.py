"""
Mailgun HTTP API email backend for Django.

Uses Mailgun's REST API (``/v3/<domain>/messages``) so no SMTP server
is required.  Configure via environment variables::

    EMAIL_BACKEND=core_app.mailgun_backend.MailgunBackend
    MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    MAILGUN_SENDER_DOMAIN=mg.example.com
    MAILGUN_API_URL=https://api.mailgun.net  (optional, default shown)
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from base64 import b64encode

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

_DEFAULT_API_URL = "https://api.mailgun.net"
_TIMEOUT = 10  # seconds


class MailgunBackend(BaseEmailBackend):
    """Django email backend that sends via the Mailgun HTTP API."""

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, "MAILGUN_API_KEY", "")
        self.sender_domain = getattr(settings, "MAILGUN_SENDER_DOMAIN", "")
        self.api_url = getattr(settings, "MAILGUN_API_URL", _DEFAULT_API_URL)

    def send_messages(self, email_messages):
        """Send one or more ``EmailMessage`` instances; return the count sent."""
        if not email_messages:
            return 0

        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _send(self, message) -> bool:
        """Send a single ``EmailMessage`` via the Mailgun API."""
        from_email = message.from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        recipients = message.recipients()
        if not recipients:
            return False

        url = f"{self.api_url}/v3/{self.sender_domain}/messages"

        form_data = urllib.parse.urlencode(
            [
                ("from", from_email),
                *[("to", addr) for addr in recipients],
                ("subject", message.subject),
                ("text", message.body),
            ]
        ).encode()

        credentials = b64encode(f"api:{self.api_key}".encode()).decode()
        req = urllib.request.Request(
            url,
            data=form_data,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
                body = json.loads(resp.read())
                logger.info(
                    "Mailgun accepted message to %s: %s",
                    ", ".join(recipients),
                    body.get("message", ""),
                )
            return True
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
            logger.warning(
                "Mailgun send failed for %s: %s",
                ", ".join(recipients),
                exc,
                exc_info=True,
            )
            if not self.fail_silently:
                raise
            return False
