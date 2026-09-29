"""Central configuration. Secrets come from the project-root `.env` file only."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

load_dotenv(ROOT_DIR / ".env")


def groq_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "").strip()
    return "" if key.startswith("your_") else key


def llm_provider() -> str:
    return os.getenv("LLM_PROVIDER", "groq").lower()


def default_model() -> str:
    """Change the model in .env (GROQ_MODEL) - no code changes needed."""
    return os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


def fast_model() -> str:
    """Small/fast model used for cheap helper calls (query rewriting, routing, judging)."""
    return os.getenv("GROQ_FAST_MODEL", "openai/gpt-oss-20b")
