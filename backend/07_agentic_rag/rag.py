"""07 - AGENTIC RAG with LangGraph.

Until now RAG was a straight line. Here it is a GRAPH with decisions and a loop:

    classify -> (payments | refunds | settlements | general) retrieve -> rerank -> synthesize -> verify
                                                                     ^                      |
                                                                     +------ retry --------+

LangGraph's role: run a stateful workflow where each node reads/writes a shared `state`, and edges can be
conditional. The nodes are plain Python functions you already understand from lessons 01-06.
"""
from __future__ import annotations

import operator
import re
import time
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph

from core import config, lab
from core.generate import NO_ANSWER, generate
from core.llm import LLMUnavailable, get_llm
from core.retrieval import rerank, rrf, sigmoid, strip_entities, tokenize

CATEGORIES = {
    "payments": {"payments", "developer"},
    "refunds": {"refunds", "payments"},
    "settlements": {"settlements", "refunds"},  # refunds are netted from settlements: the agent knows to look there too
    "general": None,
}
KEYWORDS = {"refunds": ["refund", "arn"], "settlements": ["settlement", "payout", "utr", "reconcil", "received"],
            "payments": ["payment", "charged", "debited", "capture", "webhook", "order", "upi", "card", "api"]}


HINTS = {"settlements": "settlement lower fees GST refunds deducted reconciliation", "refunds": "refund status timeline", "payments": "payment status webhook"}


class State(TypedDict, total=False):
    question: str
    category: str
    classified_by: str
    attempts: int
    query: str
    candidates: list
    ranked: list
    answer: dict
    verdict: dict
    events: Annotated[list, operator.add]  # every node APPENDS to this trace


def _prep():
    return lab.prepare({**lab.DEFAULTS, "corpus": "ragpay", "chunk_strategy": "heading", "chunk_size": 600, "chunk_overlap": 0})


def _event(node: str, t0: float, summary: str, **extra) -> list:
    return [{"node": node, "ms": (time.perf_counter() - t0) * 1000, "summary": summary, **extra}]


def classify(s: State) -> State:
    t0 = time.perf_counter()
    try:
        r = get_llm().json([{"role": "system", "content": 'Classify the merchant question as one of: payments, refunds, settlements, '
                             'general. JSON: {"category": "..."}'}, {"role": "user", "content": s["question"]}],
                           model=config.fast_model(), max_tokens=30)
        cat, by = r.get("category", "general"), "LLM"
    except LLMUnavailable:
        low = s["question"].lower()
        cat = next((c for c, kws in KEYWORDS.items() if any(k in low for k in kws)), "general")
        by = "keyword rules (no API key)"
    if cat not in CATEGORIES:
        cat = "general"
    return {"category": cat, "classified_by": by, "attempts": s.get("attempts", 0), "query": (strip_entities(s["question"]) + " " + HINTS.get(cat, "")).strip(),
            "events": _event("classify", t0, f"category = {cat}", by=by)}


def route(s: State) -> str:
    return "retrieve_" + s["category"]


def _retrieve(name: str, s: State) -> State:
    t0 = time.perf_counter()
    docs, chunks, index, _ = _prep()
    allowed = None
    cats = CATEGORIES[s["category"]] if name != "retrieve_general" else None
    if cats:
        allowed = index.allowed(None) & [c.meta.get("category") in cats for c in chunks]
    q = s["query"]
    vec, kw = index.vector(q, 12, allowed), index.keyword(q, 12, allowed)
    fused = rrf([vec, kw])[:10]
    cand = [i for i, _ in fused]
    return {"candidates": cand, "events": _event(name, t0, f"{len(cand)} candidates (hybrid) restricted to "
                                                 f"{sorted(cats) if cats else 'ALL categories'}")}


def retrieve_payments(s): return _retrieve("retrieve_payments", s)
def retrieve_refunds(s): return _retrieve("retrieve_refunds", s)
def retrieve_settlements(s): return _retrieve("retrieve_settlements", s)
def retrieve_general(s): return _retrieve("retrieve_general", s)


def rerank_node(s: State) -> State:
    t0 = time.perf_counter()
    _, chunks, _, _ = _prep()
    rr = rerank(s["query"], chunks, s["candidates"])[:5]
    return {"ranked": [{"idx": i, "score": sc, "prob": sigmoid(sc)} for i, sc in rr],
            "events": _event("rerank", t0, f"kept top {len(rr)}; best relevance {sigmoid(rr[0][1]):.2f}" if rr else "nothing to rerank")}


def synthesize(s: State) -> State:
    t0 = time.perf_counter()
    _, chunks, _, _ = _prep()
    ctx = [{"title": chunks[r["idx"]].doc_id, "section": chunks[r["idx"]].section, "text": chunks[r["idx"]].text} for r in s["ranked"]]
    ans = generate(s["question"], ctx, "support")
    ans["context"] = ctx
    return {"answer": ans, "events": _event("synthesize", t0, f"answer via {ans['mode']}")}


def verify(s: State) -> State:
    """Deterministic grounding check: does the answer cite something, and do its words appear in the sources?"""
    t0 = time.perf_counter()
    a = s["answer"]
    ctx_tokens = set(tokenize(" ".join(c["text"] for c in a["context"])))
    sents = [x for x in re.split(r"(?<=[.!?])\s+", a["answer"]) if len(x) > 20]
    supported = sum(1 for x in sents if len(set(tokenize(x)) & ctx_tokens) / max(len(set(tokenize(x))), 1) >= 0.45)
    support = supported / len(sents) if sents else 0.0
    best = s["ranked"][0]["prob"] if s["ranked"] else 0.0
    ok = NO_ANSWER not in a["answer"] and support >= 0.5 and best >= 0.3
    return {"verdict": {"ok": ok, "support": support, "best_relevance": best, "attempts": s["attempts"] + 1},
            "attempts": s["attempts"] + 1,
            "events": _event("verify", t0, f"grounding {support:.0%}, best relevance {best:.2f} -> {'PASS' if ok else 'FAIL'}")}


def after_verify(s: State) -> str:
    return END if s["verdict"]["ok"] or s["attempts"] >= 2 else "widen"


def widen(s: State) -> State:
    """Retry strategy: drop the category filter and search again across everything."""
    t0 = time.perf_counter()
    return {"category": "general", "events": _event("widen", t0, "verification failed -> retry with ALL categories")}


def build_graph():
    g = StateGraph(State)
    for fn in (classify, retrieve_payments, retrieve_refunds, retrieve_settlements, retrieve_general, rerank_node, synthesize, verify, widen):
        g.add_node(fn.__name__, fn)
    g.add_edge(START, "classify")
    g.add_conditional_edges("classify", route, ["retrieve_payments", "retrieve_refunds", "retrieve_settlements", "retrieve_general"])
    for n in ("retrieve_payments", "retrieve_refunds", "retrieve_settlements", "retrieve_general"):
        g.add_edge(n, "rerank_node")
    g.add_edge("rerank_node", "synthesize")
    g.add_edge("synthesize", "verify")
    g.add_conditional_edges("verify", after_verify, {END: END, "widen": "widen"})
    g.add_edge("widen", "retrieve_general")
    return g.compile()


GRAPH = None


def run(question: str) -> dict:
    global GRAPH
    GRAPH = GRAPH or build_graph()
    final = GRAPH.invoke({"question": question, "events": []})
    _, chunks, _, _ = _prep()
    sources = [{"n": n, "doc": chunks[r["idx"]].doc_id, "section": chunks[r["idx"]].section, "prob": r["prob"], "text": chunks[r["idx"]].text}
               for n, r in enumerate(final["ranked"], 1)]
    return {"events": final["events"], "category": final["category"], "answer": final["answer"], "verdict": final["verdict"],
            "sources": sources, "path": [e["node"] for e in final["events"]]}


def describe() -> dict:
    return {"nodes": [{"id": n} for n in ["START", "classify", "retrieve_payments", "retrieve_refunds", "retrieve_settlements",
                                          "retrieve_general", "rerank_node", "synthesize", "verify", "widen", "END"]],
            "edges": [["START", "classify"], ["classify", "retrieve_payments"], ["classify", "retrieve_refunds"], ["classify", "retrieve_settlements"],
                      ["classify", "retrieve_general"], ["retrieve_payments", "rerank_node"], ["retrieve_refunds", "rerank_node"],
                      ["retrieve_settlements", "rerank_node"], ["retrieve_general", "rerank_node"], ["rerank_node", "synthesize"],
                      ["synthesize", "verify"], ["verify", "END"], ["verify", "widen"], ["widen", "retrieve_general"]]}
