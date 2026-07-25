"""
Lightweight SQLite analytics for Professor Pepe.

Tracks user interactions (commands, messages, feedback) without relying on
third-party services. Designed to be easy to swap for PostgreSQL later.
"""

import hashlib
import json
import sqlite3
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

DB_PATH = Path(__file__).resolve().parent / "data" / "analytics.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    """Return a thread-local SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


def init_db() -> None:
    """Create the analytics tables if they do not exist."""
    conn = _get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            session_hash TEXT NOT NULL,
            event_type TEXT NOT NULL,
            command TEXT,
            message TEXT,
            language TEXT,
            country TEXT,
            metadata TEXT,
            created_at INTEGER NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)
        """
    )
    conn.commit()


def _hash_ip(ip: Optional[str]) -> str:
    """Create a stable, anonymised session identifier from an IP address."""
    if not ip:
        return "unknown"
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:16]


def track_event(
    client_ip: Optional[str],
    event_type: str,
    command: Optional[str] = None,
    message: Optional[str] = None,
    language: Optional[str] = None,
    country: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """Persist a single analytics event."""
    conn = _get_conn()
    now = datetime.utcnow()
    conn.execute(
        """
        INSERT INTO events
        (timestamp, session_hash, event_type, command, message, language, country, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now.isoformat(),
            _hash_ip(client_ip),
            event_type,
            command,
            message,
            language,
            country,
            json.dumps(metadata) if metadata else None,
            int(time.time()),
        ),
    )
    conn.commit()


def get_summary(days: int = 7) -> dict[str, Any]:
    """Return aggregated analytics for the last N days."""
    conn = _get_conn()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()

    total_events = conn.execute(
        "SELECT COUNT(*) FROM events WHERE timestamp >= ?", (since,)
    ).fetchone()[0]

    unique_sessions = conn.execute(
        "SELECT COUNT(DISTINCT session_hash) FROM events WHERE timestamp >= ?", (since,)
    ).fetchone()[0]

    command_counts = {
        row["command"]: row["count"]
        for row in conn.execute(
            """
            SELECT command, COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND event_type = 'command_click' AND command IS NOT NULL
            GROUP BY command
            ORDER BY count DESC
            """,
            (since,),
        )
    }

    language_counts = {
        row["language"] or "unknown": row["count"]
        for row in conn.execute(
            """
            SELECT language, COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND language IS NOT NULL
            GROUP BY language
            ORDER BY count DESC
            """,
            (since,),
        )
    }

    country_counts = {
        row["country"] or "unknown": row["count"]
        for row in conn.execute(
            """
            SELECT country, COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND country IS NOT NULL
            GROUP BY country
            ORDER BY count DESC
            """,
            (since,),
        )
    }

    daily_events = [
        {"date": row["date"], "count": row["count"]}
        for row in conn.execute(
            """
            SELECT date(timestamp) as date, COUNT(*) as count
            FROM events
            WHERE timestamp >= ?
            GROUP BY date(timestamp)
            ORDER BY date DESC
            """,
            (since,),
        )
    ]

    return {
        "days": days,
        "total_events": total_events,
        "unique_sessions": unique_sessions,
        "command_counts": command_counts,
        "language_counts": language_counts,
        "country_counts": country_counts,
        "daily_events": daily_events,
    }


# Initialise the database on import.
init_db()
