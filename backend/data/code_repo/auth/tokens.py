"""Signed session tokens (HMAC-based, JWT-like)."""
import base64
import hashlib
import hmac
import json
import time

from config import Settings


def _sign(payload: bytes) -> str:
    sig = hmac.new(Settings.SECRET_KEY.encode(), payload, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode()


def issue_token(user_id: int) -> str:
    """Create a token containing the user id and an expiry timestamp."""
    body = json.dumps({"sub": user_id, "exp": time.time() + Settings.TOKEN_TTL_SECONDS})
    payload = base64.urlsafe_b64encode(body.encode())
    return payload.decode() + "." + _sign(payload)


def verify_token(token: str):
    """Return the user id if the signature is valid and the token not expired."""
    try:
        payload, signature = token.split(".")
    except ValueError:
        return None
    if not hmac.compare_digest(signature, _sign(payload.encode())):
        return None
    data = json.loads(base64.urlsafe_b64decode(payload))
    if data["exp"] < time.time():
        return None
    return data["sub"]
