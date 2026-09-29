"""LLM abstraction.

Every lesson calls `get_llm().complete(...)`. The provider (GroqCloud) and the
model are chosen by configuration in `.env`, never hard-coded in a lesson.
The API key is read server-side only; the browser never sees it.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from . import config


class LLMUnavailable(RuntimeError):
    """Raised when no API key is configured or the provider call failed."""


@dataclass
class LLMResult:
    text: str
    model: str
    provider: str
    latency_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    extra: dict = field(default_factory=dict)


class BaseLLM:
    provider = "base"

    def complete(self, messages: list[dict], *, model: str | None = None, temperature: float = 0.1,
                 max_tokens: int = 700, json_mode: bool = False) -> LLMResult:
        raise NotImplementedError

    def json(self, messages: list[dict], **kw) -> dict:
        res = self.complete(messages, json_mode=True, **kw)
        try:
            return json.loads(res.text)
        except json.JSONDecodeError as e:
            raise LLMUnavailable(f"model returned invalid JSON: {e}") from e


class GroqLLM(BaseLLM):
    provider = "groq"

    def __init__(self):
        from groq import Groq

        self.client = Groq(api_key=config.groq_api_key())

    def complete(self, messages, *, model=None, temperature=0.1, max_tokens=700, json_mode=False):
        model = model or config.default_model()
        kwargs = dict(model=model, messages=messages, temperature=temperature, max_tokens=max_tokens)
        if model.startswith("openai/gpt-oss"):
            kwargs["reasoning_effort"] = "low"  # reasoning models spend tokens thinking; keep it small for RAG
            kwargs["max_tokens"] = max_tokens + 600
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        t0 = time.perf_counter()
        try:
            r = self.client.chat.completions.create(**kwargs)
        except Exception as e:  # network, auth, rate-limit, bad model name ...
            raise LLMUnavailable(f"{type(e).__name__}: {str(e)[:300]}") from e
        ms = (time.perf_counter() - t0) * 1000
        u = r.usage
        return LLMResult(
            text=r.choices[0].message.content or "",
            model=model,
            provider=self.provider,
            latency_ms=ms,
            prompt_tokens=getattr(u, "prompt_tokens", 0),
            completion_tokens=getattr(u, "completion_tokens", 0),
        )


_PROVIDERS = {"groq": GroqLLM}
_instance: BaseLLM | None = None


def is_configured() -> bool:
    return bool(config.groq_api_key())


def get_llm() -> BaseLLM:
    global _instance
    if not is_configured():
        raise LLMUnavailable("GROQ_API_KEY is not set. Add it to the .env file in the project root.")
    if _instance is None:
        _instance = _PROVIDERS[config.llm_provider()]()
    return _instance


def status() -> dict:
    return {
        "provider": config.llm_provider(),
        "configured": is_configured(),
        "model": config.default_model(),
        "fast_model": config.fast_model(),
    }
