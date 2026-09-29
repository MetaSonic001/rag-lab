"""03 - HYBRID RAG: FAISS (vectors) + BM25 (keywords) + Reciprocal Rank Fusion.

Problem solved: vector search is great at meaning but weak at exact identifiers
(error codes, endpoint names, part numbers). BM25 is the opposite. Run both, then fuse the rankings.
"""
from __future__ import annotations

import faiss
import numpy as np
from rank_bm25 import BM25Okapi

from core import docs as D
from core.embeddings import embed
from core.generate import generate
from core.retrieval import rrf, tokenize

_CACHE: dict = {}


def build(corpus: str):
    if corpus not in _CACHE:
        chunks = D.chunk_documents(D.get_corpus(corpus), "heading", 600, 0)
        vecs = embed([c.text for c in chunks], "minilm")
        index = faiss.IndexFlatIP(vecs.shape[1])  # inner product == cosine (vectors are normalised)
        index.add(vecs)
        bm25 = BM25Okapi([tokenize(c.text) for c in chunks])
        _CACHE[corpus] = (chunks, index, bm25)
    return _CACHE[corpus]


def search(query: str, corpus: str = "ragpay", k: int = 5) -> dict:
    chunks, index, bm25 = build(corpus)
    # 1) semantic search with FAISS
    q = embed([query], "minilm", is_query=True)
    scores, ids = index.search(q, k * 2)
    vector = [(int(i), float(s)) for i, s in zip(ids[0], scores[0]) if i >= 0]
    # 2) keyword search with BM25
    kw_scores = bm25.get_scores(tokenize(query))
    keyword = [(int(i), float(kw_scores[i])) for i in np.argsort(-kw_scores)[: k * 2] if kw_scores[i] > 0]
    # 3) fuse the two rankings
    fused = rrf([vector, keyword])[:k]

    def show(lst):
        return [{"rank": r, "id": chunks[i].id, "doc": chunks[i].doc_id, "section": chunks[i].section,
                 "score": s, "text": chunks[i].text} for r, (i, s) in enumerate(lst, 1)]

    return {"vector": show(vector[:k]), "bm25": show(keyword[:k]), "fused": show(fused), "n_chunks": len(chunks)}


def ask(query: str, corpus: str = "ragpay", k: int = 5) -> dict:
    res = search(query, corpus, k)
    chunks = [{"title": c["doc"], "section": c["section"], "text": c["text"]} for c in res["fused"]]
    res["answer"] = generate(query, chunks, "strict")
    return res
