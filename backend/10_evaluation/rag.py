"""Runs a RAG *system configuration* over the golden question set and scores it."""
from __future__ import annotations

import json

from core import lab
from core.config import DATA_DIR

from .metrics import context_precision, context_recall, judge

GOLDEN = json.loads((DATA_DIR / "eval" / "golden.json").read_text(encoding="utf-8"))

SYSTEMS = {
    "basic": {"label": "Basic RAG", "note": "Fixed 400-char chunks, vector search, top-3.",
              "cfg": dict(chunk_strategy="fixed", chunk_size=400, chunk_overlap=0, contextual=False, retriever="vector", rerank=False)},
    "hybrid": {"label": "Hybrid RAG", "note": "Heading-aware chunks, vector + BM25 fused with RRF, top-3.",
               "cfg": dict(chunk_strategy="heading", chunk_size=600, chunk_overlap=0, retriever="hybrid", rerank=False)},
    "reranked": {"label": "Reranked RAG", "note": "Hybrid top-12, cross-encoder rerank, keep top-3.",
                 "cfg": dict(chunk_strategy="heading", chunk_size=600, chunk_overlap=0, retriever="hybrid", rerank=True, rerank_candidates=12)},
}


def run_system(system: str, n: int = 15, with_llm: bool = False, k: int = 3) -> dict:
    rows = []
    for item in GOLDEN[:n]:
        r = lab.run(item["q"], corpus="ragpay", top_k=k, generate=with_llm, **SYSTEMS[system]["cfg"])
        sel = [c["chunk"]["doc_id"] for c in r["candidates"] if c["selected"]]
        gold = set(item["gold"])
        row = {"question": item["q"], "gold": item["gold"], "retrieved": sel,
               "context_precision": context_precision(sel, gold), "context_recall": context_recall(sel, gold),
               "latency_ms": r["latency_ms"]["total"] - r["latency_ms"]["embed_index"], "retrieval_ms": r["latency_ms"]["retrieval"]}
        if with_llm and r["answer"]:
            a = r["answer"]
            row.update(answer=a["answer"], answer_mode=a["mode"], tokens=a["prompt_tokens"] + a["completion_tokens"])
            j = judge(item["q"], r["context"], a["answer"])  # LLM judge, or a labelled proxy without a key
            row.update(faithfulness=j["faithfulness"], answer_relevancy=j["answer_relevancy"], judge_method=j["method"])
            row["tokens"] += j["tokens"]
        rows.append(row)
    keys = ["context_precision", "context_recall", "latency_ms", "retrieval_ms"] + (["faithfulness", "answer_relevancy", "tokens"] if with_llm else [])
    agg = {k: sum(r.get(k, 0) for r in rows) / max(len(rows), 1) for k in keys}
    if with_llm:
        agg["tokens_total"] = sum(r.get("tokens", 0) for r in rows)
    return {"system": system, "label": SYSTEMS[system]["label"], "note": SYSTEMS[system]["note"], "n": len(rows), "aggregate": agg, "rows": rows,
            "generation_method": rows[0].get("judge_method") if rows and with_llm else None,
            "answer_mode": rows[0].get("answer_mode") if rows and with_llm else None}
