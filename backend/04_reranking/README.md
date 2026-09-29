# 04 · Reranking (Qdrant + cross-encoder)

## WHAT
Retrieve a wide candidate set from **Qdrant** (in-process, with **metadata filtering**), then re-score every candidate with a **cross-encoder** and keep the best few.

## WHY
A bi-encoder compares two pre-computed vectors: fast but coarse. A cross-encoder reads *question and chunk together*: slow but precise. Use the cheap one to get 15 candidates, the precise one to pick 5.

## ARCHITECTURE
```
query -> Qdrant (top-15, optional category filter) -> cross-encoder -> top-5 -> Groq
```

## KEY FILES
- `rag.py` - `search()` returns the ranking *before* and *after* reranking, plus how far each chunk moved.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Vector DB switches to Qdrant; adds payload filtering and a second-stage ranker.

