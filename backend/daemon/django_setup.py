"""
Bootstrap Django ORM so daemon processes can import and use api.models.

Call ``setup()`` at the top of every daemon entry-point *before* importing
any Django model.
"""

import os
import sys


def setup() -> None:
    """Configure Django settings and initialize the ORM."""
    # Add the core_app directory to sys.path so Django can find the project
    # and the ``api`` app.
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    core_app_dir = os.path.join(project_root, "core_app")
    if core_app_dir not in sys.path:
        sys.path.insert(0, core_app_dir)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core_app.settings")

    import django  # noqa: E402
    django.setup()
