"""02 - RAG with LangChain + Chroma.

Same idea as lesson 01, but every box is now a LangChain *component* and the whole pipeline is one
composable chain (LCEL):

    retriever | prompt | llm | parser

LangChain's role: orchestration + ready-made components. It does not make retrieval better by itself.
"""
from __future__ import annotations

import uuid

import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter

from core import config, docs as D
from core.embeddings import embed
from core.generate import NO_ANSWER, extractive
from core.llm import is_configured


class SentenceTransformerEmbeddings(Embeddings):
    """Adapter: LangChain calls these two methods; we delegate to Sentence Transformers."""

    def embed_documents(self, texts):
        return embed(texts, "minilm").tolist()

    def embed_query(self, text):
        return embed([text], "minilm", is_query=True)[0].tolist()


PROMPT = ChatPromptTemplate.from_messages([
    ("system", "Answer ONLY from the context. Cite sources like [1]. If missing, say: " + NO_ANSWER + "\n\nContext:\n{context}"),
    ("human", "{question}"),
])
_STORES: dict[str, Chroma] = {}


def get_store(corpus: str, chunk_size: int, overlap: int) -> Chroma:
    key = f"{corpus}-{chunk_size}-{overlap}"
    if key not in _STORES:
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)
        docs = [Document(page_content=d.text, metadata={"source": d.id, "title": d.title}) for d in D.get_corpus(corpus)]
        pieces = splitter.split_documents(docs)
        # Chroma runs fully in-process (no server, no Docker). EphemeralClient = in-memory.
        client = chromadb.EphemeralClient()
        _STORES[key] = Chroma.from_documents(pieces, SentenceTransformerEmbeddings(), client=client,
                                             collection_name="c" + uuid.uuid4().hex[:8])
    return _STORES[key]


def _format(docs: list[Document]) -> str:
    return "\n\n".join(f"[{i}] ({d.metadata['title']})\n{d.page_content}" for i, d in enumerate(docs, 1))


def ask(question: str, corpus: str = "attendance", k: int = 4, chunk_size: int = 500, overlap: int = 50) -> dict:
    store = get_store(corpus, chunk_size, overlap)
    retriever = store.as_retriever(search_kwargs={"k": k})
    hits = store.similarity_search_with_score(question, k=k)  # (Document, distance) - lower is closer
    docs = [d for d, _ in hits]
    out = {"chain": "retriever | prompt | ChatGroq | StrOutputParser", "mode": "llm", "error": None}
    out["sources"] = [{"n": i, "source": d.metadata["source"], "distance": float(s), "text": d.page_content}
                      for i, (d, s) in enumerate(hits, 1)]
    if not is_configured():
        out.update(mode="extractive-fallback", error="GROQ_API_KEY is not set: showing the best-matching source sentences only.",
                   answer=extractive(question, [{"text": d.page_content} for d in docs]))
        return out
    from langchain_groq import ChatGroq

    chain = (
        {"context": retriever | RunnableLambda(_format), "question": RunnablePassthrough()}
        | PROMPT
        | ChatGroq(model=config.default_model(), temperature=0.1, api_key=config.groq_api_key())
        | StrOutputParser()
    )
    try:
        out["answer"] = chain.invoke(question)
    except Exception as e:
        out.update(mode="extractive-fallback", error=f"{type(e).__name__}: {str(e)[:200]}", answer=docs[0].page_content[:300] if docs else NO_ANSWER)
    return out
