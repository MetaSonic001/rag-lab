# 03 · Hybrid RAG (FAISS + BM25)

## WHAT
Run **vector search (FAISS)** and **keyword search (BM25)** on the same chunks, then merge the rankings with **Reciprocal Rank Fusion**.

## WHY
Vectors understand meaning but blur exact tokens (error codes, endpoints, part numbers). BM25 is the reverse. Together they cover both.

## ARCHITECTURE
```
query -> FAISS top-N ---\
                         > RRF fusion -> top-K
query -> BM25  top-N ---/
```

## KEY FILES
- `rag.py` - builds both indexes, `search()` returns vector, BM25 and fused lists side by side.
- `../core/retrieval.py` - the 6-line `rrf()` function.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Adds a second retriever and a fusion step. Chunking is heading-aware (one chunk per section).

