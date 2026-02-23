"""
Entry-point for the Playback Manager daemon.

Usage::

    python -m daemon.playback_manager
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

    from daemon.playback_manager.manager import PlaybackManager

    manager = PlaybackManager()
    manager.run()


if __name__ == "__main__":
    main()
