"""Infra/database helpers (placeholder).

Session persistence is handled by DatabaseSessionService in services/runner.py,
which manages its own SQLAlchemy async engine. This file remains as a hook for
any future non-session database needs.
"""

def get_connection():
    # Replace with actual DB connection logic (SQLAlchemy, async engine, etc.)
    return None
