# 10 · Evaluation

## WHAT
Scores three RAG configurations (Basic, Hybrid, Reranked) on 25 golden questions.

## WHY
A RAG system that produces an answer is not necessarily a good RAG system. You need numbers.

## METRICS
| Metric | How it is computed here |
|---|---|
| Context precision | rank-aware precision of retrieved chunks vs gold documents (exact, deterministic) |
| Context recall | share of gold documents retrieved (exact, deterministic) |
| Faithfulness | LLM judge (Groq): supported claims / total claims. Without a key: lexical **proxy**, labelled as such |
| Answer relevancy | LLM judge rating 0-1. Without a key: embedding-similarity **proxy** |
| Latency, tokens | measured |

These follow the RAGAS metric families. The definitions are implemented in `metrics.py` so students can read them; RAGAS and DeepEval can be installed from `requirements-extra.txt` to cross-check.

## KEY FILES
`metrics.py`, `rag.py` (system definitions), `router.py`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Not a new retriever: a harness that compares all the previous ones.

