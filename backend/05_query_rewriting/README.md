# 05 · Query rewriting (LlamaIndex)

## WHAT
Fix the **question** before searching: rewrite it, expand it into several queries (multi-query), or search with a hypothetical answer (HyDE). Retrieval uses **LlamaIndex**.

## WHY
Users write "the money never came back"; the docs say "refund not received". Better queries beat better indexes.

## ARCHITECTURE
```
user message -> LLM rewrite / multi-query / HyDE -> LlamaIndex retriever -> (RRF) -> results
```

## KEY FILES
- `rag.py` - three modes over one `VectorStoreIndex`, plus a small embedding adapter for LlamaIndex.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Adds an LLM *before* retrieval. Without an API key it falls back to rule-based rewriting and labels the result `simulated`.

