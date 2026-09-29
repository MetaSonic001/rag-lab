"""10 - EVALUATION metrics, implemented from scratch so students can read the definitions.

They mirror the RAGAS metric families (context precision / recall, faithfulness, answer relevancy).
Retrieval metrics are computed EXACTLY against gold document labels (real, deterministic).
Generation metrics use an LLM judge (Groq) when a key is set, otherwise a labelled lexical PROXY.
"""
from __future__ import annotations

import re

from core import config
from core.embeddings import embed
from core.llm import LLMUnavailable, get_llm
from core.retrieval import tokenize


def context_precision(retrieved_docs: list[str], gold: set[str]) -> float:
    """Rank-aware precision (average precision@k). Relevant chunks ranked FIRST score higher."""
    hits, total = 0, 0.0
    for rank, d in enumerate(retrieved_docs, 1):
        if d in gold:
            hits += 1
            total += hits / rank
    return total / hits if hits else 0.0


def context_recall(retrieved_docs: list[str], gold: set[str]) -> float:
    """Share of the documents needed to answer that were actually retrieved."""
    return len(gold & set(retrieved_docs)) / len(gold) if gold else 0.0


JUDGE_SYSTEM = (
    "You are a strict RAG evaluator. Given a QUESTION, retrieved CONTEXT and an ANSWER: "
    "(1) split the answer into atomic factual claims and count how many are directly supported by the context; "
    "(2) rate from 0 to 1 how directly the answer addresses the question. "
    'Reply as JSON: {"claims": int, "supported": int, "relevancy": float}.'
)


def judge(question: str, context: str, answer: str) -> dict:
    """Returns {faithfulness, answer_relevancy, method, tokens}."""
    try:
        res = get_llm().complete([{"role": "system", "content": JUDGE_SYSTEM},
                                  {"role": "user", "content": f"QUESTION: {question}\n\nCONTEXT:\n{context}\n\nANSWER: {answer}"}],
                                 model=config.fast_model(), json_mode=True, max_tokens=120, temperature=0)
        import json

        j = json.loads(res.text)
        claims = max(int(j.get("claims", 0)), 1)
        return {"faithfulness": min(int(j.get("supported", 0)) / claims, 1.0), "answer_relevancy": float(j.get("relevancy", 0)),
                "method": "llm-judge", "tokens": res.prompt_tokens + res.completion_tokens}
    except (LLMUnavailable, ValueError, KeyError):
        pass
    ctx = set(tokenize(context))
    sents = [s for s in re.split(r"(?<=[.!?])\s+", answer) if len(s) > 20]
    sup = sum(len(set(tokenize(s)) & ctx) / max(len(set(tokenize(s))), 1) >= 0.6 for s in sents)
    q, a = embed([question, answer], "minilm")
    return {"faithfulness": sup / len(sents) if sents else 0.0, "answer_relevancy": max(float(q @ a), 0.0), "method": "proxy", "tokens": 0}
