"""Password hashing helpers."""
import hashlib
import hmac
import os

from config import Settings


def hash_password(password: str) -> str:
    """Salted PBKDF2 hash, stored as salt$hash."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 2 ** Settings.PASSWORD_HASH_ROUNDS)
    return salt.hex() + "$" + digest.hex()


def verify_password(password: str, stored: str) -> bool:
    """Constant-time comparison of a password against a stored salt$hash."""
    salt_hex, digest_hex = stored.split("$")
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), 2 ** Settings.PASSWORD_HASH_ROUNDS
    )
    return hmac.compare_digest(digest.hex(), digest_hex)
