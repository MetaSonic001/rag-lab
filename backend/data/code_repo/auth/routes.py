"""HTTP routes for authentication: /auth/register and /auth/login."""
from flask import Blueprint, jsonify, request

from auth.service import authenticate_user, register_user
from auth.tokens import issue_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json(force=True)
    user = register_user(data["email"], data["password"])
    return jsonify({"id": user["id"], "email": user["email"]}), 201


@auth_bp.post("/login")
def login():
    """Handle POST /auth/login: verify credentials and return a session token."""
    data = request.get_json(force=True)
    user = authenticate_user(data.get("email", ""), data.get("password", ""))
    if user is None:
        return jsonify({"error": "invalid credentials"}), 401
    token = issue_token(user["id"])
    return jsonify({"token": token, "token_type": "Bearer"})
