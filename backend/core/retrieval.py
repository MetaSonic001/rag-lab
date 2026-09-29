"""Retrieval building blocks: vector search, BM25, fusion, cross-encoder reranking."""
from __future__ import annotations

import math
import re
import time
from collections import OrderedDict

import numpy as np
from rank_bm25 import BM25Okapi

from .docs import Chunk
from .embeddings import cross_scores, embed

STOPWORDS = set("a an the of to in on for and or is are was were be been it its this that with as at by from "
                "i my me we our you your do does did can could should would what when why how which who".split())


def tokenize(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS]


class Index:
    """One searchable index over a list of chunks (vectors + BM25)."""

    def __init__(self, chunks: list[Chunk], model: str):
        self.chunks, self.model = chunks, model
        t0 = time.perf_counter()
        self.vecs = embed([c.text for c in chunks], model)
        self.embed_ms = (time.perf_counter() - t0) * 1000
        self.bm25 = BM25Okapi([tokenize(c.text) or ["_"] for c in chunks])

    def allowed(self, filters: dict | None) -> np.ndarray:
        ok = np.ones(len(self.chunks), dtype=bool)
        for key, val in (filters or {}).items():
            if val:
                ok &= np.array([str(c.meta.get(key, "")) == str(val) for c in self.chunks])
        return ok

    def vector(self, query: str, k: int, allowed=None) -> list[tuple[int, float]]:
        q = embed([query], self.model, is_query=True)[0]
        sims = self.vecs @ q
        if allowed is not None:
            sims = np.where(allowed, sims, -9.0)
        order = np.argsort(-sims)[:k]
        return [(int(i), float(sims[i])) for i in order if sims[i] > -9.0]

    def keyword(self, query: str, k: int, allowed=None) -> list[tuple[int, float]]:
        scores = np.array(self.bm25.get_scores(tokenize(query)))
        if allowed is not None:
            scores = np.where(allowed, scores, -1.0)
        order = np.argsort(-scores)[:k]
        return [(int(i), float(scores[i])) for i in order if scores[i] > 0]


def rrf(rank_lists: list[list[tuple[int, float]]], k: int = 60) -> list[tuple[int, float]]:
    """Reciprocal Rank Fusion: score = sum(1 / (k + rank)). Ignores raw score scales."""
    fused: dict[int, float] = {}
    for lst in rank_lists:
        for rank, (i, _) in enumerate(lst, start=1):
            fused[i] = fused.get(i, 0.0) + 1.0 / (k + rank)
    return sorted(fused.items(), key=lambda x: -x[1])


def rerank(query: str, chunks: list[Chunk], idxs: list[int]) -> list[tuple[int, float]]:
    scores = cross_scores(query, [chunks[i].text for i in idxs])
    return sorted(zip(idxs, scores), key=lambda x: -x[1])


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


_CACHE: "OrderedDict[tuple, Index]" = OrderedDict()


def get_index(key: tuple, chunks: list[Chunk], model: str) -> tuple[Index, bool]:
    """Return (index, was_cached). Keyed so identical settings never re-embed."""
    k = key + (model,)
    if k in _CACHE:
        _CACHE.move_to_end(k)
        return _CACHE[k], True
    idx = Index(chunks, model)
    _CACHE[k] = idx
    while len(_CACHE) > 16:
        _CACHE.popitem(last=False)
    return idx, False


def strip_entities(q: str) -> str:
    """Amounts and ids help humans but add noise to semantic search, so they are removed from the SEARCH query
    (they are still kept as entities and shown to the model)."""
    q = re.sub(r"(₹|Rs\.?|INR)\s?[\d,\.]+", " ", q)
    q = re.sub(r"\b(pay|order|rfnd|setl)_\w+\b", " ", q)
    return re.sub(r"\s+", " ", q).strip()
