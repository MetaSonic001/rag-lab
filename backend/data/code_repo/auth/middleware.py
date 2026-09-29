"""Authentication middleware: protects routes with a Bearer token."""
from functools import wraps

from flask import g, jsonify, request

from auth.tokens import verify_token


def require_auth(view):
    """Decorator: rejects the request with 401 unless a valid token is sent."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "missing token"}), 401
        user_id = verify_token(header[7:])
        if user_id is None:
            return jsonify({"error": "invalid or expired token"}), 401
        g.user_id = user_id
        return view(*args, **kwargs)

    return wrapper
