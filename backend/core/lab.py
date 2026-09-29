"""The configurable RAG lab engine.

Powers the Playground, Watch, Break, Applications and Evaluation pages. It is a *teaching instrument*:
every stage is timed and returned so the UI can show exactly what happened.
The numbered folders (01_ ... 11_) contain the standalone implementations.
"""
from __future__ import annotations

import time

from . import docs as D
from .generate import format_context, generate
from .retrieval import get_index, rerank, rrf, sigmoid

DEFAULTS = dict(
    corpus="attendance", chunk_strategy="recursive", chunk_size=500, chunk_overlap=50, contextual=True,
    embedding_model="minilm", top_k=4, retriever="vector", rerank=False, rerank_candidates=12,
    prompt="strict", generate=True, filters=None, min_score=None, llm_model=None, facts=None,
    inline_docs=None,
)

_CHUNK_CACHE: dict[tuple, list[D.Chunk]] = {}


def prepare(cfg: dict):
    """Load + chunk + index. Returns (docs, chunks, index, timings)."""
    t0 = time.perf_counter()
    inline = cfg.get("inline_docs")
    if inline:
        docs = [D.Document(id=d["id"], title=d.get("title", d["id"]), text=d["text"], meta=d.get("meta", {})) for d in inline]
        ckey = ("inline", hash(tuple((d.id, d.text) for d in docs)), cfg["chunk_strategy"], int(cfg["chunk_size"]),
                int(cfg["chunk_overlap"]), cfg["contextual"])
    else:
        docs = D.get_corpus(cfg["corpus"])
        ckey = (cfg["corpus"], cfg["chunk_strategy"], int(cfg["chunk_size"]), int(cfg["chunk_overlap"]), cfg["contextual"])
    load_ms = (time.perf_counter() - t0) * 1000
    t1 = time.perf_counter()
    if ckey in _CHUNK_CACHE and not cfg["corpus"].startswith("upload:"):
        chunks = _CHUNK_CACHE[ckey]
    else:
        chunks = D.chunk_documents(docs, cfg["chunk_strategy"], int(cfg["chunk_size"]), int(cfg["chunk_overlap"]), cfg["contextual"])
        if not cfg["corpus"].startswith("upload:"):
            _CHUNK_CACHE[ckey] = chunks
    chunk_ms = (time.perf_counter() - t1) * 1000
    if cfg["corpus"].startswith("upload:"):
        ckey = ckey + (id(docs),)
    index, idx_cached = get_index(ckey, chunks, cfg["embedding_model"])
    return docs, chunks, index, dict(load_ms=load_ms, chunk_ms=chunk_ms,
                                     embed_index_ms=0.0 if idx_cached else index.embed_ms, index_cached=idx_cached)


def run(question: str, **overrides) -> dict:
    cfg = {**DEFAULTS, **{k: v for k, v in overrides.items() if v is not None or k in ("filters", "min_score")}}
    t_all = time.perf_counter()
    docs, chunks, index, prep = prepare(cfg)
    allowed = index.allowed(cfg["filters"]) if cfg["filters"] else None
    k = int(cfg["top_k"])
    n_cand = max(k, int(cfg["rerank_candidates"])) if cfg["rerank"] else k
    hybrid = cfg["retriever"] == "hybrid"
    trace = [
        {"stage": "load", "label": "Load documents", "ms": prep["load_ms"], "measured": True,
         "detail": f"{len(docs)} document(s)"},
        {"stage": "chunk", "label": "Chunk", "ms": prep["chunk_ms"], "measured": True,
         "detail": f"{len(chunks)} chunks using '{cfg['chunk_strategy']}' (size {cfg['chunk_size']}, overlap {cfg['chunk_overlap']})"},
        {"stage": "index", "label": "Embed + index chunks", "ms": prep["embed_index_ms"], "measured": True,
         "detail": ("reused cached index" if prep["index_cached"] else f"embedded {len(chunks)} chunks") + f" with {cfg['embedding_model']}"},
    ]

    scores: dict[int, dict] = {}
    vec: list = []
    kw: list = []
    t = time.perf_counter()
    if cfg["retriever"] in ("vector", "hybrid"):
        vec = index.vector(question, n_cand * (2 if hybrid else 1), allowed)
        for i, s in vec:
            scores.setdefault(i, {})["vector"] = s
    v_ms = (time.perf_counter() - t) * 1000
    t = time.perf_counter()
    if cfg["retriever"] in ("bm25", "hybrid"):
        kw = index.keyword(question, n_cand * (2 if hybrid else 1), allowed)
        for i, s in kw:
            scores.setdefault(i, {})["bm25"] = s
    b_ms = (time.perf_counter() - t) * 1000

    if cfg["retriever"] == "vector":
        ranked = vec[:n_cand]
    elif cfg["retriever"] == "bm25":
        ranked = kw[:n_cand]
    else:
        ranked = rrf([vec, kw])[:n_cand]
        for i, s in ranked:
            scores[i]["rrf"] = s
    if cfg["retriever"] in ("vector", "hybrid"):
        trace.append({"stage": "retrieve-vector", "label": "Vector search", "ms": v_ms, "measured": True,
                      "detail": f"query embedded and compared with {len(chunks)} chunk vectors (cosine)"})
    if cfg["retriever"] in ("bm25", "hybrid"):
        trace.append({"stage": "retrieve-bm25", "label": "BM25 keyword search", "ms": b_ms, "measured": True,
                      "detail": "exact-word matching with term-frequency weighting"})
    if hybrid:
        trace.append({"stage": "fuse", "label": "Reciprocal Rank Fusion", "ms": 0.1, "measured": True,
                      "detail": f"merged {len(vec)} vector + {len(kw)} BM25 results into {len(ranked)}"})

    rerank_ms = 0.0
    if cfg["rerank"] and ranked:
        t = time.perf_counter()
        rr = rerank(question, chunks, [i for i, _ in ranked])
        rerank_ms = (time.perf_counter() - t) * 1000
        for i, s in rr:
            scores[i]["rerank"] = s
            scores[i]["rerank_prob"] = sigmoid(s)
        ranked = rr
        trace.append({"stage": "rerank", "label": "Cross-encoder rerank", "ms": rerank_ms, "measured": True,
                      "detail": f"re-scored {len(rr)} candidates by reading query + chunk together"})

    selected = ranked[:k]
    primary = "rerank_prob" if cfg["rerank"] else ("vector" if cfg["retriever"] == "vector" else None)
    if cfg["min_score"] is not None and primary:
        kept = [(i, s) for i, s in selected if scores[i][primary] >= cfg["min_score"]]
        trace.append({"stage": "filter", "label": "Context filter", "ms": 0.1, "measured": True,
                      "detail": f"dropped {len(selected) - len(kept)} chunk(s) below score {cfg['min_score']}"})
        selected = kept

    sel_ids = {i for i, _ in selected}
    cand = [{"rank": r, "selected": i in sel_ids, "chunk": chunks[i].public(), "scores": scores[i]}
            for r, (i, _) in enumerate(ranked, 1)]
    ctx_chunks = [chunks[i].public() for i, _ in selected]
    context = format_context(ctx_chunks)
    trace.append({"stage": "context", "label": "Build context", "ms": 0.1, "measured": True,
                  "detail": f"{len(ctx_chunks)} chunks, {len(context)} characters"})

    answer = None
    if cfg["generate"]:
        answer = generate(question, ctx_chunks, cfg["prompt"], cfg["llm_model"])
        trace.append({"stage": "generate", "label": "LLM answer", "ms": answer["latency_ms"],
                      "measured": answer["mode"] == "llm",
                      "detail": f"{answer['model']} via {answer['provider']}" if answer["mode"] == "llm"
                      else "no API key: extractive fallback (NOT an LLM answer)"})

    measured: dict = {}
    if cfg.get("facts"):
        low = context.lower()
        found = [f for f in cfg["facts"] if f.lower() in low]
        measured["fact_coverage"] = {"found": found, "total": len(cfg["facts"]),
                                     "missing": [f for f in cfg["facts"] if f not in found]}
    top = [scores[i].get(primary or ("vector" if "vector" in scores[i] else "bm25"), 0) for i, _ in selected]
    measured["top_score"] = max(top) if top else 0
    total = (time.perf_counter() - t_all) * 1000
    return {
        "question": question,
        "config": {k2: v for k2, v in cfg.items() if k2 != "inline_docs"},
        "stats": {"documents": len(docs), "chunks": len(chunks),
                  "avg_chunk_chars": round(sum(len(c.text) for c in chunks) / max(len(chunks), 1))},
        "trace": trace, "candidates": cand, "context": context, "answer": answer, "measured": measured,
        "latency_ms": {"total": total, "retrieval": v_ms + b_ms + rerank_ms, "rerank": rerank_ms,
                       "generation": answer["latency_ms"] if answer else 0.0, "embed_index": prep["embed_index_ms"]},
        "tokens": {"prompt": answer["prompt_tokens"] if answer else 0,
                   "completion": answer["completion_tokens"] if answer else 0},
    }
