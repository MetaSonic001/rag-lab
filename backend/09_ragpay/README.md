# 09 · RAGPAY (flagship)

## WHAT
A production-style support assistant for a **fictional** payments platform. 26 fictional docs (API, refunds, settlements, disputes, KYC, webhooks...) and 8 fictional support cases. Inspired by real payment-platform documentation; not affiliated with any company; all data is invented.

## WHY
It combines everything: one question often needs several documents, exact identifiers matter, and a wrong answer costs money, so the system must cite sources and know when to escalate.

## ARCHITECTURE
```
question -> understand (intent, entities, rewrite) -> Chroma vectors + BM25 -> RRF -> cross-encoder rerank
         -> context filter -> Groq (strict grounded prompt) -> grounding signals -> escalation check -> answer + citations
```

## KEY FILES
- `pipeline.py` - every stage as a small function. `ground()` computes measurable signals: retrieval confidence, evidence support, citation coverage, numeric consistency. `escalation()` decides when a human must take over.
- `router.py` - `/api/ragpay/ask`, `/cases`, `/docs`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Combines 03 + 04 + 05 and adds what production needs: grounding signals, thresholds and escalation. No hidden chain-of-thought is exposed; the trace is the pipeline's own measurements.

