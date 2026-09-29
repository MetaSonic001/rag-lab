"""Embedding models (Sentence Transformers) behind one tiny function."""
from __future__ import annotations

import re
import zlib
from functools import lru_cache

import numpy as np

MODELS = {
    "minilm": {
        "hf": "sentence-transformers/all-MiniLM-L6-v2", "label": "all-MiniLM-L6-v2", "dim": 384,
        "note": "Small, fast general-purpose model. A great default.",
    },
    "bge-small": {
        "hf": "BAAI/bge-small-en-v1.5", "label": "bge-small-en-v1.5", "dim": 384,
        "note": "Retrieval-tuned model; uses a query instruction prefix.",
    },
    "hashing": {
        "hf": None, "label": "Hashing bag-of-words (baseline)", "dim": 512,
        "note": "Not a neural model: counts words. Shows what happens when 'embeddings' do not understand meaning.",
    },
}
BGE_PREFIX = "Represent this sentence for searching relevant passages: "


@lru_cache(maxsize=4)
def _load(hf_name: str):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(hf_name)


def _hash_embed(texts: list[str], dim: int = 512) -> np.ndarray:
    out = np.zeros((len(texts), dim), dtype=np.float32)
    for i, t in enumerate(texts):
        for w in re.findall(r"[a-z0-9]+", t.lower()):
            h = zlib.crc32(w.encode())
            out[i, h % dim] += 1.0 if (h >> 16) & 1 else -1.0
    norms = np.linalg.norm(out, axis=1, keepdims=True)
    return out / np.maximum(norms, 1e-9)


def embed(texts: list[str], model: str = "minilm", is_query: bool = False) -> np.ndarray:
    """Return L2-normalised vectors, so dot product == cosine similarity."""
    if model not in MODELS:
        raise ValueError(f"unknown embedding model '{model}'")
    if model == "hashing":
        return _hash_embed(texts)
    if model == "bge-small" and is_query:
        texts = [BGE_PREFIX + t for t in texts]
    m = _load(MODELS[model]["hf"])
    return np.asarray(m.encode(texts, normalize_embeddings=True, show_progress_bar=False), dtype=np.float32)


@lru_cache(maxsize=1)
def _cross_encoder():
    from sentence_transformers import CrossEncoder

    return CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def cross_scores(query: str, passages: list[str]) -> list[float]:
    """Cross-encoder relevance logits (higher = more relevant)."""
    if not passages:
        return []
    return [float(s) for s in _cross_encoder().predict([(query, p) for p in passages])]
