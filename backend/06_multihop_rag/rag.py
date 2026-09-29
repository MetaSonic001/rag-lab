"""06 - MULTI-HOP RAG on sqlite-vec.

Problem solved: some questions need facts from SEVERAL documents ("why is my settlement lower?" needs the
fee rules + the refund rules + the reconciliation formula). One search rarely returns all of them.
So: decompose the question -> retrieve for each sub-question -> combine -> answer.

Vector store: sqlite-vec, a SQLite extension. No server, no Docker: just a Python file-less database.
"""
from __future__ import annotations

import sqlite3
import struct

import sqlite_vec

from core import config, docs as D
from core.embeddings import embed
from core.generate import generate
from core.llm import LLMUnavailable, get_llm

_DB: dict = {}

# Only used with no API key (flagged 'simulated'): a fixed decomposition for the demo question type.
DEMO_DECOMPOSITION = ["What is the gross amount settled and the reconciliation formula?",
                      "What platform fees and GST are deducted from a settlement?",
                      "Are refunds deducted from the next settlement?",
                      "Are dispute holds deducted from a settlement?"]


def _blob(v) -> bytes:
    return struct.pack(f"{len(v)}f", *v)


def get_db(corpus: str):
    if corpus not in _DB:
        chunks = D.chunk_documents(D.get_corpus(corpus), "heading", 600, 0)
        db = sqlite3.connect(":memory:", check_same_thread=False)
        db.enable_load_extension(True)
        sqlite_vec.load(db)
        db.execute("CREATE TABLE chunks(id INTEGER PRIMARY KEY, doc TEXT, section TEXT, body TEXT)")
        db.execute("CREATE VIRTUAL TABLE vec USING vec0(embedding float[384])")
        vecs = embed([c.text for c in chunks], "minilm")
        for i, (c, v) in enumerate(zip(chunks, vecs)):
            db.execute("INSERT INTO chunks VALUES (?,?,?,?)", (i, c.doc_id, c.section, c.text))
            db.execute("INSERT INTO vec(rowid, embedding) VALUES (?,?)", (i, _blob(v)))
        _DB[corpus] = db
    return _DB[corpus]


def search(db, query: str, k: int = 3) -> list[dict]:
    q = _blob(embed([query], "minilm", is_query=True)[0])
    rows = db.execute("SELECT rowid, distance FROM vec WHERE embedding MATCH ? AND k = ? ORDER BY distance", (q, k)).fetchall()
    out = []
    for rowid, dist in rows:
        doc, sec, body = db.execute("SELECT doc, section, body FROM chunks WHERE id=?", (rowid,)).fetchone()
        out.append({"id": f"{doc}#{rowid}", "doc": doc, "section": sec, "text": body, "score": 1 - float(dist) ** 2 / 2})  # L2 distance of unit vectors -> cosine
    return out


def decompose(question: str) -> tuple[list[str], bool, str | None]:
    try:
        r = get_llm().json([{"role": "system", "content": "Break the support question into 3-4 short, independent sub-questions, each answerable "
                             'from ONE documentation page. JSON: {"sub_questions": ["..."]}'},
                            {"role": "user", "content": question}], model=config.fast_model(), max_tokens=250)
        return r["sub_questions"][:4], False, None
    except LLMUnavailable as e:
        return DEMO_DECOMPOSITION, True, str(e)


def run(question: str, corpus: str = "ragpay", k: int = 3) -> dict:
    db = get_db(corpus)
    single = search(db, question, k)  # what plain RAG would have used
    subs, simulated, err = decompose(question)
    hops, seen, context = [], set(), []
    for n, sq in enumerate(subs, 1):
        hits = search(db, sq, k)
        new = [h for h in hits if h["id"] not in seen]
        seen.update(h["id"] for h in hits)
        context += new
        hops.append({"hop": n, "sub_question": sq, "results": hits, "new_chunks": len(new)})
    answer = generate(question, [{"title": c["doc"], "section": c["section"], "text": c["text"]} for c in context[:8]], "strict")
    return {"single_shot": single, "sub_questions": subs, "hops": hops, "context_docs": sorted({c["doc"] for c in context}),
            "answer": answer, "simulated_decomposition": simulated, "error": err}
