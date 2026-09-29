"""Database connection helpers (SQLite)."""
import sqlite3
from contextlib import contextmanager

_DB_PATH = None


def init_db(database_url: str) -> None:
    """Create tables if they do not exist. Called once at startup."""
    global _DB_PATH
    _DB_PATH = database_url.replace("sqlite:///", "")
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                owner_id INTEGER NOT NULL REFERENCES users(id),
                title TEXT NOT NULL,
                done INTEGER DEFAULT 0
            );
            """
        )


@contextmanager
def get_connection():
    """Yield a SQLite connection and commit/close it afterwards."""
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
