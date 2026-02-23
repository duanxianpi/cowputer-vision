"""
Entry-point for the Inference Engine daemon.

Usage::

    python -m daemon.inference_engine
"""

import logging
import sys

from daemon import config
from daemon.django_setup import setup as django_setup


def main() -> None:
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL, logging.INFO),
        format="%(asctime)s [%(name)s] %(levelname)s  %(message)s",
    )

    # Bootstrap Django ORM before importing models
    django_setup()

    from daemon.inference_engine.engine import InferenceEngine

    engine = InferenceEngine()
    engine.run()


if __name__ == "__main__":
    main()
