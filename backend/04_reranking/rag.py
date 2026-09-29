"""04 - RERANKING with a cross-encoder, over Qdrant (in-process) with metadata filtering.

Problem solved: the first retrieval step is fast but coarse (a bi-encoder compares two *pre-computed* vectors).
A cross-encoder reads (question, chunk) TOGETHER, which is slower but far more precise.
So: retrieve MANY cheaply (top-15), rerank carefully, keep FEW (top-5).
"""
from __future__ import annotations

from qdrant_client import QdrantClient, models

from core import docs as D
from core.embeddings import embed
from core.generate import generate
from core.retrieval import sigmoid
from core.embeddings import cross_scores

_STATE: dict = {}


def build(corpus: str):
    if corpus not in _STATE:
        chunks = D.chunk_documents(D.get_corpus(corpus), "heading", 600, 0)
        vecs = embed([c.text for c in chunks], "minilm")
        client = QdrantClient(":memory:")  # local mode: no server, no Docker
        client.create_collection("docs", vectors_config=models.VectorParams(size=vecs.shape[1], distance=models.Distance.COSINE))
        client.upsert("docs", points=[
            models.PointStruct(id=i, vector=v.tolist(), payload={"doc": c.doc_id, "section": c.section, "text": c.text,
                                                                 "category": c.meta.get("category", "")})
            for i, (c, v) in enumerate(zip(chunks, vecs))])
        _STATE[corpus] = client
    return _STATE[corpus]


def search(query: str, corpus: str = "ragpay", candidates: int = 15, top_n: int = 5, category: str | None = None) -> dict:
    client = build(corpus)
    flt = models.Filter(must=[models.FieldCondition(key="category", match=models.MatchValue(value=category))]) if category else None
    q = embed([query], "minilm", is_query=True)[0].tolist()
    hits = client.query_points("docs", query=q, limit=candidates, query_filter=flt).points  # metadata filter runs inside Qdrant
    before = [{"rank": r, "doc": h.payload["doc"], "section": h.payload["section"], "score": h.score, "text": h.payload["text"]}
              for r, h in enumerate(hits, 1)]
    scores = cross_scores(query, [b["text"] for b in before])
    for b, s in zip(before, scores):
        b["rerank_score"], b["rerank_prob"] = s, sigmoid(s)
    after = sorted(before, key=lambda b: -b["rerank_score"])
    for r, b in enumerate(after, 1):
        b["new_rank"] = r
        b["moved"] = b["rank"] - r
    return {"before": before, "after": after[:top_n], "dropped": after[top_n:], "filter": category}


def ask(query: str, **kw) -> dict:
    res = search(query, **kw)
    res["answer"] = generate(query, [{"title": c["doc"], "section": c["section"], "text": c["text"]} for c in res["after"]], "strict")
    return res
