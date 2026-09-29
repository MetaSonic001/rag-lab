"""05 - QUERY REWRITING with LlamaIndex retrieval.

Problem solved: users do not write good search queries. "money never came back" shares almost no words
with a document titled "Refund troubleshooting". Fix the QUERY before you search.

Three techniques (all use the same LlamaIndex vector index):
  rewrite  - an LLM turns a messy message into a clean, standalone search query
  multi    - an LLM writes 3 different queries; we retrieve for each and fuse the results (RRF)
  hyde     - an LLM writes a *fake answer*; we search with the fake answer's embedding
"""
from __future__ import annotations

from llama_index.core import Document, Settings, VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core.embeddings import BaseEmbedding

from core import config, docs as D
from core.embeddings import embed
from core.llm import LLMUnavailable, get_llm
from core.retrieval import rrf, tokenize

class STEmbedding(BaseEmbedding):
    """LlamaIndex asks for embeddings through these methods; we answer with Sentence Transformers."""

    def _get_query_embedding(self, query: str):
        return embed([query], "minilm", is_query=True)[0].tolist()

    def _get_text_embedding(self, text: str):
        return embed([text], "minilm")[0].tolist()

    async def _aget_query_embedding(self, query: str):
        return self._get_query_embedding(query)


Settings.llm = None  # we only use LlamaIndex for retrieval; generation goes through core.llm (Groq)
_INDEX: dict = {}

# Used ONLY when there is no API key, so the page still teaches the idea. Flagged as simulated in the UI.
SYNONYMS = {"money back": "refund", "never came back": "refund not received", "charged": "payment captured debited",
            "payout": "settlement", "less": "lower amount fees deducted", "stuck": "pending", "denied": "declined failed"}


def get_index(corpus: str) -> VectorStoreIndex:
    if corpus not in _INDEX:
        docs = [Document(text=d.text, metadata={"doc": d.id, "title": d.title}) for d in D.get_corpus(corpus)]
        emb = STEmbedding(model_name="all-MiniLM-L6-v2")
        _INDEX[corpus] = VectorStoreIndex.from_documents(docs, embed_model=emb, transformations=[MarkdownNodeParser()])
    return _INDEX[corpus]


def _retrieve(index: VectorStoreIndex, query: str, k: int) -> list[dict]:
    nodes = index.as_retriever(similarity_top_k=k).retrieve(query)
    return [{"rank": r, "doc": n.node.metadata["doc"], "score": float(n.score or 0), "text": n.node.get_content()[:400],
             "id": n.node.node_id} for r, n in enumerate(nodes, 1)]


def _llm_json(system: str, user: str) -> dict:
    return get_llm().json([{"role": "system", "content": system}, {"role": "user", "content": user}],
                          model=config.fast_model(), max_tokens=300)


def _fallback_queries(q: str) -> list[str]:
    low, extra = q.lower(), []
    for k, v in SYNONYMS.items():
        if k in low:
            extra.append(v)
    return [q + " " + " ".join(extra)] if extra else [q]


def run(question: str, mode: str = "rewrite", corpus: str = "ragpay", k: int = 4) -> dict:
    index = get_index(corpus)
    baseline = _retrieve(index, question, k)
    out = {"mode": mode, "original": question, "baseline": baseline, "simulated": False, "error": None}
    try:
        if mode == "rewrite":
            q = _llm_json('Rewrite the user message as ONE clear standalone search query for a payments-platform '
                          'documentation search. Use the documentation vocabulary. JSON: {"query": "..."}', question)["query"]
            out["queries"], out["results"] = [q], _retrieve(index, q, k)
        elif mode == "multi":
            qs = _llm_json('Write 3 different search queries (different wording) that would find documentation answering '
                           'the user message. JSON: {"queries": ["...", "...", "..."]}', question)["queries"][:3]
            lists = [_retrieve(index, q, k * 2) for q in [question] + qs]
            fused = rrf([[(hash(r["id"]), r["score"]) for r in lst] for lst in lists])
            by_hash = {hash(r["id"]): r for lst in lists for r in lst}
            out["queries"] = qs
            out["per_query"] = [{"query": q, "results": lst[:k]} for q, lst in zip([question] + qs, lists)]
            out["results"] = [{**by_hash[h], "rank": i + 1, "score": s} for i, (h, s) in enumerate(fused[:k])]
        elif mode == "hyde":
            fake = get_llm().complete([{"role": "system", "content": "Write a short (3 sentence) plausible documentation "
                                        "passage that answers the question. It may contain errors; it is only used for search."},
                                       {"role": "user", "content": question}], model=config.fast_model(), max_tokens=150).text
            out["queries"], out["hypothetical_document"], out["results"] = [fake], fake, _retrieve(index, fake, k)
        else:
            raise ValueError(f"unknown mode {mode}")
    except LLMUnavailable as e:
        if mode == "hyde":
            out.update(error=str(e), results=[], queries=[])
        else:  # no key: rule-based stand-ins so the page still teaches the idea (flagged `simulated`)
            qs = _fallback_queries(question)
            if mode == "multi":
                qs = qs + [" ".join(tokenize(question))]
                lists = [_retrieve(index, q, k * 2) for q in [question] + qs]
                fused = rrf([[(hash(r["id"]), r["score"]) for r in lst] for lst in lists])
                by_hash = {hash(r["id"]): r for lst in lists for r in lst}
                out["per_query"] = [{"query": q, "results": lst[:k]} for q, lst in zip([question] + qs, lists)]
                out["results"] = [{**by_hash[h], "rank": i + 1, "score": s} for i, (h, s) in enumerate(fused[:k])]
                out.update(error=str(e), simulated=True, queries=qs)
            else:
                out.update(error=str(e), simulated=True, queries=qs, results=_retrieve(index, qs[0], k))
    return out
