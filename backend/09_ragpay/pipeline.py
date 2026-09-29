"""09 - RAGPAY: the flagship. A production-style support-assistant pipeline.

    query -> UNDERSTAND (intent, entities, rewrite)
          -> HYBRID RETRIEVAL (Chroma vectors + BM25) -> FUSION (RRF)
          -> RERANK (cross-encoder) -> CONTEXT FILTER (score threshold)
          -> GENERATE (Groq, strict grounded prompt)
          -> GROUND (measurable signals) -> ESCALATE (when the KB cannot answer) -> CITATIONS

Nothing here is hidden chain-of-thought: every step reports what it did and the numbers it measured.
"""
from __future__ import annotations

import re
import time

import chromadb
from rank_bm25 import BM25Okapi

from core import config, docs as D
from core.embeddings import cross_scores, embed
from core.generate import NO_ANSWER, generate, parse_citations
from core.llm import LLMUnavailable, get_llm
from core.retrieval import rrf, sigmoid, strip_entities, tokenize

MIN_RELEVANCE = 0.12   # context filter: chunks whose cross-encoder probability is lower are dropped
MAX_CONTEXT = 6

INTENTS = {
    "payment_failure": ["fail", "declin", "error", "charged", "debited", "captured", "authorized", "webhook", "order"],
    "refund": ["refund", "arn", "money back"],
    "settlement": ["settlement", "payout", "utr", "received", "reconcil", "deduct"],
    "dispute": ["dispute", "chargeback"],
    "onboarding_kyc": ["kyc", "verification", "document", "onboard", "activate"],
    "api_integration": ["api", "endpoint", "auth", "401", "key", "rate limit", "recurring", "subscription", "webhook"],
}
ESCALATION_TRIGGERS = {
    "duplicate debit": ["twice", "double charged", "duplicate", "charged two"],
    "unauthorised transaction / fraud": ["fraud", "unauthori", "stolen", "not me", "hacked"],
    "account suspension / risk block": ["suspend", "risk_blocked", "blocked my account", "frozen"],
    "legal / tax / regulatory": ["lawyer", "legal", "court", "tax filing", "regulator", "rbi"],
}
SYNONYMS = {"money back": "refund", "never came back": "refund not received", "charged": "payment captured debited",
            "payout": "settlement", "stuck": "pending", "denied": "declined failed", "less": "lower fees deducted"}
INTENT_EXPANSION = {
    "payment_failure": "payment status captured failed webhook order error code",
    "refund": "refund status processed ARN timeline",
    "settlement": "settlement amount lower than expected reconciliation fees GST refunds deducted",
    "dispute": "dispute chargeback evidence deadline",
    "onboarding_kyc": "KYC documents required verification",
    "api_integration": "API endpoint authentication error",
}
_STATE: dict = {}


# ── indexing ─────────────────────────────────────────────────────────────
def build() -> dict:
    if not _STATE:
        chunks = D.chunk_documents(D.get_corpus("ragpay"), "heading", 600, 0)
        vecs = embed([c.text for c in chunks], "minilm")
        col = chromadb.EphemeralClient().create_collection("ragpay", metadata={"hnsw:space": "cosine"})
        col.add(ids=[str(i) for i in range(len(chunks))], embeddings=vecs.tolist(), documents=[c.text for c in chunks])
        _STATE.update(chunks=chunks, col=col, bm25=BM25Okapi([tokenize(c.text) or ["_"] for c in chunks]))
    return _STATE


# ── 1. query understanding ───────────────────────────────────────────────
INTENT_SUBQUERIES = {
    "settlement": ["settlement fees GST deducted from payments", "refunds deducted from next settlement", "settlement reconciliation formula gross amount"],
    "payment_failure": ["payment status captured vs order paid", "webhook payment.captured not processed", "payment failure error codes"],
    "refund": ["refund status processed pending timeline", "refund troubleshooting ARN not received"],
    "dispute": ["dispute chargeback response deadline evidence", "dispute hold deducted from settlement"],
    "onboarding_kyc": ["KYC documents required for verification", "merchant onboarding activation steps"],
    "api_integration": ["API authentication errors keys", "webhooks events and signature verification"],
}


def understand(question: str, history: list[dict], case: dict | None) -> dict:
    low = question.lower()
    entities = {
        "payment_ids": re.findall(r"\bpay_\w+", question), "order_ids": re.findall(r"\border_\w+", question),
        "amounts": re.findall(r"₹\s?[\d,]+(?:\.\d+)?", question), "error_codes": re.findall(r"\b[A-Z][A-Z0-9_]{5,}\b", question),
    }
    intent = next((k for k, kws in INTENTS.items() if any(w in low for w in kws)), "general")
    flags = [name for name, kws in ESCALATION_TRIGGERS.items() if any(w in low for w in kws)]
    rewritten, subs, by, err = question, [], "rules", None
    try:
        hist = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in history[-4:])
        r = get_llm().json([{"role": "system", "content": "You prepare search queries for a payments-platform documentation search. From the merchant's latest message produce: "
                             "(1) 'query': ONE standalone query in documentation vocabulary (resolve pronouns from the conversation; remove amounts, currency values and ids, keep error codes exactly); "
                             "(2) 'sub_queries': 0-3 short queries for DIFFERENT documentation topics that are needed to answer fully (for example fees, refunds, formulas). Use [] for simple questions. "
                             'JSON: {"query": "...", "sub_queries": ["..."]}'}, {"role": "user", "content": f"Conversation:\n{hist}\n\nLatest message: {question}"}],
                           model=config.fast_model(), max_tokens=200)
        rewritten, subs, by = r["query"], [s for s in r.get("sub_queries", []) if isinstance(s, str)][:3], "LLM"
    except LLMUnavailable as e:
        err = str(e)
        extra = [v for k, v in SYNONYMS.items() if k in low]
        prev = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
        rewritten = ((prev + " ") if len(question.split()) <= 6 and prev else "") + strip_entities(question) + " " + INTENT_EXPANSION.get(intent, "") + " " + " ".join(extra)
        subs = INTENT_SUBQUERIES.get(intent, []) if len(question.split()) > 6 else []
    if len(question.split()) > 6:  # always cover the intent's standard documentation facets, in addition to the LLM's own
        subs = (subs + [x for x in INTENT_SUBQUERIES.get(intent, []) if x not in subs])[:4]
    return {"intent": intent, "entities": entities, "escalation_flags": flags, "rewritten": rewritten.strip(), "sub_queries": subs, "by": by, "error": err}


# ── 2-5. retrieval pipeline ──────────────────────────────────────────────
def retrieve(query: str, subs: list[str] | None = None, n: int = 12) -> dict:
    """Hybrid retrieval for the main query and every sub-query, fused (RRF), then reranked. A chunk's rerank
    score is its BEST score against any query, so a passage needed for one facet of the question is not lost."""
    st = build()
    chunks = st["chunks"]
    queries = [query] + (subs or [])
    vec_lists, kw_lists = [], []
    t_vec = t_kw = 0.0
    for qq in queries:
        t = time.perf_counter()
        qv = embed([qq], "minilm", is_query=True)[0].tolist()
        res = st["col"].query(query_embeddings=[qv], n_results=n)
        vec_lists.append([(int(i), 1 - d) for i, d in zip(res["ids"][0], res["distances"][0])])
        t_vec += (time.perf_counter() - t) * 1000
        t = time.perf_counter()
        sc = st["bm25"].get_scores(tokenize(qq))
        kw_lists.append([(int(i), float(sc[i])) for i in sc.argsort()[::-1][:n] if sc[i] > 0])
        t_kw += (time.perf_counter() - t) * 1000
    vec, kw = vec_lists[0], kw_lists[0]
    fused = rrf(vec_lists + kw_lists)[:12 if subs else 10]
    vr, kr = {i: r for r, (i, _) in enumerate(vec, 1)}, {i: r for r, (i, _) in enumerate(kw, 1)}
    vs, ks = dict(vec), dict(kw)
    t = time.perf_counter()
    ids = [i for i, _ in fused]
    per_query = [cross_scores(qq, [chunks[i].text for i in ids]) for qq in queries]
    best = [max(col) for col in zip(*per_query)]
    rr = sorted(zip(ids, best), key=lambda x: -x[1])
    t_rr = (time.perf_counter() - t) * 1000
    fs = dict(fused)
    cands = []
    for r, (i, s) in enumerate(rr, 1):
        c = chunks[i]
        cands.append({"rank": r, "doc": c.doc_id, "title": c.title, "section": c.section, "category": c.meta.get("category", ""),
                      "text": c.text, "vector_rank": vr.get(i), "vector_score": vs.get(i), "bm25_rank": kr.get(i), "bm25_score": ks.get(i),
                      "rrf_score": fs[i], "rerank_score": s, "relevance": sigmoid(s)})
    kept = [c for c in cands if c["relevance"] >= MIN_RELEVANCE][:MAX_CONTEXT]
    for c in cands:
        c["kept"] = c in kept
    return {"candidates": cands, "kept": kept, "ms": {"vector": t_vec, "bm25": t_kw, "rerank": t_rr}, "queries": len(queries),
            "counts": {"vector": len(vec), "bm25": len(kw), "fused": len(fused), "kept": len(kept)}}


# ── 6. grounding signals (all computed, none guessed) ────────────────────
def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if len(s.strip()) > 20]


def _nums(text: str) -> set[str]:
    return set(re.findall(r"\d[\d,\.]*\d|\d", text.replace(",", "")))


def ground(answer: str, kept: list[dict]) -> dict:
    ctx = " ".join(c["text"] for c in kept)
    ctx_tok, ctx_nums = set(tokenize(ctx)), _nums(ctx)
    sents = _sentences(answer)
    support, cited, evidence = 0, 0, []
    for s in sents:
        toks = set(tokenize(s)) or {"_"}
        best = max(kept, key=lambda c: len(toks & set(tokenize(c["text"]))), default=None)
        overlap = len(toks & ctx_tok) / len(toks)
        support += overlap >= 0.5
        cited += bool(re.search(r"\[\d+\]", s))
        evidence.append({"sentence": re.sub(r"\s*\[\d+\]", "", s), "supported": overlap >= 0.5, "overlap": overlap,
                         "best_source": {"doc": best["doc"], "section": best["section"]} if best and overlap > 0.2 else None})
    a_nums = _nums(re.sub(r"\[\d+\]", "", answer))
    numeric = (len(a_nums & ctx_nums) / len(a_nums)) if a_nums else 1.0
    n = max(len(sents), 1)
    retrieval = kept[0]["relevance"] if kept else 0.0
    signals = {"retrieval_confidence": retrieval, "evidence_support": support / n, "citation_coverage": cited / n, "numeric_consistency": numeric,
               "source_count": len({c["doc"] for c in kept})}
    score = 0.35 * retrieval + 0.30 * signals["evidence_support"] + 0.20 * signals["citation_coverage"] + 0.15 * numeric
    return {"signals": signals, "score": score, "band": "high" if score >= 0.7 else "medium" if score >= 0.45 else "low",
            "weights": {"retrieval_confidence": 0.35, "evidence_support": 0.30, "citation_coverage": 0.20, "numeric_consistency": 0.15},
            "evidence_map": evidence}


# ── 7. escalation ────────────────────────────────────────────────────────
def escalation(u: dict, kept: list[dict], g: dict | None, question: str, case: dict | None) -> dict:
    reasons = []
    if not kept:
        reasons.append("The knowledge base has no passage relevant enough to answer safely.")
    if g and g["band"] == "low" and kept:
        reasons.append(f"Grounding score is low ({g['score']:.2f}); the answer is not well supported by the sources.")
    reasons += [f"Sensitive case type detected: {f}." for f in u["escalation_flags"]]
    if not reasons:
        return {"needed": False}
    ids = u["entities"]["payment_ids"] + u["entities"]["order_ids"]
    return {"needed": True, "blocking": not kept, "reasons": reasons,
            "ticket": {"priority": "high" if u["escalation_flags"] else "standard", "sla": "4 business hours" if u["escalation_flags"] else "24 hours",
                       "summary": (case["title"] if case else question)[:120], "identifiers": ids, "intent": u["intent"],
                       "attach": ["payment id / order id", "timestamp", "screenshots of the dashboard entry"]}}


def ask(question: str, history: list[dict] | None = None, case: dict | None = None, use_rerank: bool = True) -> dict:
    history = history or []
    t_all = time.perf_counter()
    steps = []
    t = time.perf_counter()
    u = understand(question, history, case)
    steps.append({"id": "understand", "label": "Query understanding", "ms": (time.perf_counter() - t) * 1000,
                  "summary": f"intent: {u['intent']} · {1 + len(u['sub_queries'])} search quer{'y' if not u['sub_queries'] else 'ies'} · via {u['by']}", "detail": u})
    r = retrieve(u["rewritten"], u["sub_queries"])
    c = r["counts"]
    steps += [
        {"id": "vector", "label": "Vector search (Chroma)", "ms": r["ms"]["vector"], "summary": f"{c['vector']} candidates", "detail": None},
        {"id": "bm25", "label": "BM25 keyword search", "ms": r["ms"]["bm25"], "summary": f"{c['bm25']} candidates", "detail": None},
        {"id": "fusion", "label": "Reciprocal Rank Fusion", "ms": 0.2, "summary": f"{c['fused']} fused candidates", "detail": None},
        {"id": "rerank", "label": "Cross-encoder rerank", "ms": r["ms"]["rerank"], "summary": "re-scored by reading query + chunk together", "detail": None},
        {"id": "filter", "label": "Context filter", "ms": 0.1, "summary": f"kept {c['kept']} of {c['fused']} (relevance >= {MIN_RELEVANCE})", "detail": None},
    ]
    kept = r["kept"]
    ans = grounded = None
    if kept:
        q = question
        if case:
            q = f"Merchant case facts: {'; '.join(f'{f['label']}: {f['value']}' for f in case['facts'])}\n\nMerchant question: {question}"
        ctx = [{"title": k["doc"], "section": k["section"], "text": k["text"]} for k in kept]
        ans = generate(q, ctx, "support", max_tokens=450)
        steps.append({"id": "generate", "label": "Groq LLM" if ans["mode"] == "llm" else "Extractive fallback (no API key)", "ms": ans["latency_ms"],
                      "summary": f"{ans['model']} - {ans['prompt_tokens']}+{ans['completion_tokens']} tokens" if ans["mode"] == "llm" else "answer built from source sentences",
                      "detail": None})
        if NO_ANSWER not in ans["answer"]:
            grounded = ground(ans["answer"], kept)
        steps.append({"id": "ground", "label": "Grounding check", "ms": 0.5,
                      "summary": f"grounding {grounded['score']:.2f} ({grounded['band']})" if grounded else "model declined to answer", "detail": None})
    declined = bool(ans and NO_ANSWER in ans["answer"])
    esc = escalation(u, [] if declined else kept, grounded, question, case)
    steps.append({"id": "escalate", "label": "Escalation check", "ms": 0.1,
                  "summary": "escalate to a human agent" if esc["needed"] else "no escalation needed", "detail": None})
    cited = parse_citations(ans["answer"], len(kept)) if ans else []
    return {"question": question, "understanding": u, "steps": steps, "candidates": r["candidates"],
            "kept": [{"n": n, **{k: v for k, v in c.items() if k != "text"}, "text": c["text"]} for n, c in enumerate(kept, 1)],
            "answer": ans, "citations": cited, "grounding": grounded, "escalation": esc,
            "decision": "escalated" if esc["needed"] and esc.get("blocking") else "answered_with_escalation" if esc["needed"] else "answered",
            "latency_ms": (time.perf_counter() - t_all) * 1000}
