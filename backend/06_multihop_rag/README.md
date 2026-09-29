# 06 · Multi-hop RAG (sqlite-vec)

## WHAT
Break one question into sub-questions, retrieve for each, combine the evidence, then answer. Vectors live in **sqlite-vec**, a SQLite extension (no server, no Docker).

## WHY
"Why is my settlement lower?" needs fee rules + refund rules + the reconciliation formula. A single search rarely finds all three.

## ARCHITECTURE
```
question -> decompose (LLM) -> [sub-question -> sqlite-vec search] x N -> merge -> Groq
```

## KEY FILES
- `rag.py` - `get_db()` (vec0 virtual table), `search()`, `decompose()`, `run()`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Retrieval becomes a *loop* controlled by the question, not a single call.

