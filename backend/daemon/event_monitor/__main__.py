"""
Entry-point for the Event Monitor daemon.

Usage::

    python -m daemon.event_monitor
"""

import logging

from daemon import config
from daemon.django_setup import setup as django_setup


def main() -> None:
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL, logging.INFO),
        format="%(asctime)s [%(name)s] %(levelname)s  %(message)s",
    )

    django_setup()

    from daemon.event_monitor.monitor import EventMonitor

    monitor = EventMonitor()
    monitor.run()


if __name__ == "__main__":
    main()
