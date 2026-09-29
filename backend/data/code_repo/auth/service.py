"""Business logic for users: registration and credential checks."""
from db import get_connection
from utils.security import hash_password, verify_password


def register_user(email: str, password: str) -> dict:
    """Create a user with a hashed password. Raises if the email exists."""
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email.lower(), hash_password(password)),
        )
        return {"id": cur.lastrowid, "email": email.lower()}


def authenticate_user(email: str, password: str):
    """Return the user row if the password matches, otherwise None."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (email.lower(),),
        ).fetchone()
    if row and verify_password(password, row["password_hash"]):
        return dict(row)
    return None


# TODO: OAuth login (Google/GitHub) is not implemented. To add it you would
# add an `oauth_identities` table, a /auth/oauth/<provider>/callback route and
# a function here that links or creates a user from the provider profile.
