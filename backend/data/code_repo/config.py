"""Configuration loaded from environment variables."""
import os


class Settings:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///taskboard.db")
    TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "3600"))
    PASSWORD_HASH_ROUNDS = 12
    # OAuth providers are not implemented yet; see auth/service.py
    OAUTH_ENABLED = False
