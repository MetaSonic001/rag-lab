"""01 - BASIC RAG, from scratch.

No RAG framework. No vector database. Just:
  PyMuPDF4LLM (load) -> plain Python (chunk) -> Sentence Transformers (embed)
  -> a NumPy matrix (store) -> dot product (retrieve) -> Groq (generate).

Read this file top to bottom: each method is one box in the RAG diagram.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np

from core.docs import load_file
from core.embeddings import MODELS, embed
from core.generate import build_messages, generate


@dataclass
class BasicRAG:
    model: str = "minilm"
    text: str = ""
    filename: str = ""
    loader: str = ""
    chunks: list[dict] = field(default_factory=list)
    vectors: np.ndarray | None = None  # <- this matrix IS the "vector store"

    # 1. LOAD ---------------------------------------------------------------
    def load(self, filename: str, data: bytes) -> dict:
        t = time.perf_counter()
        self.text, self.loader = load_file(filename, data)
        self.filename, self.chunks, self.vectors = filename, [], None
        return {"characters": len(self.text), "loader": self.loader, "preview": self.text[:2500],
                "ms": (time.perf_counter() - t) * 1000}

    def load_text(self, filename: str, text: str, loader: str) -> dict:
        """Already-extracted text (an upload or a crawled page): skip the parser but keep the same output shape."""
        self.text, self.loader, self.filename, self.chunks, self.vectors = text, loader, filename, [], None
        return {"characters": len(text), "loader": loader, "preview": text[:2500], "ms": 0.0}

    # 2. CHUNK --------------------------------------------------------------
    def chunk(self, size: int = 500, overlap: int = 80) -> dict:
        """Fixed-size sliding window. `overlap` repeats the tail of one chunk at the head of the next."""
        t = time.perf_counter()
        step = max(size - overlap, 1)
        self.chunks = [
            {"id": n, "text": self.text[i:i + size].strip(), "start": i}
            for n, i in enumerate(range(0, len(self.text), step))
            if self.text[i:i + size].strip()
        ]
        self.vectors = None
        return {"count": len(self.chunks), "chunks": self.chunks, "size": size, "overlap": overlap,
                "ms": (time.perf_counter() - t) * 1000}

    # 3. EMBED --------------------------------------------------------------
    def embed(self) -> dict:
        """Turn every chunk into a vector (a list of numbers that captures meaning)."""
        t = time.perf_counter()
        self.vectors = embed([c["text"] for c in self.chunks], self.model)
        ms = (time.perf_counter() - t) * 1000
        # 2-D picture of the vector space (PCA via SVD) so students can *see* it
        centered = self.vectors - self.vectors.mean(0)
        _, _, vt = np.linalg.svd(centered, full_matrices=False)
        self._basis, self._mean = vt[:2], self.vectors.mean(0)
        pts = centered @ vt[:2].T
        return {"model": MODELS[self.model]["label"], "dimensions": int(self.vectors.shape[1]), "count": len(self.chunks),
                "sample": [{"id": i, "first_values": [round(float(x), 4) for x in self.vectors[i][:10]]}
                           for i in range(min(3, len(self.chunks)))],
                "points": [{"id": i, "x": float(p[0]), "y": float(p[1])} for i, p in enumerate(pts)], "ms": ms}

    # 4. STORE --------------------------------------------------------------
    def store(self) -> dict:
        """In this lesson 'storing' is keeping the matrix in memory. Databases add persistence, filters, ANN indexes."""
        return {"shape": list(self.vectors.shape), "bytes": int(self.vectors.nbytes),
                "note": "A vector database is this matrix plus an index for fast search, persistence and metadata filtering."}

    # 5. RETRIEVE -----------------------------------------------------------
    def retrieve(self, question: str, k: int = 3) -> dict:
        t = time.perf_counter()
        q = embed([question], self.model, is_query=True)[0]
        sims = self.vectors @ q  # cosine similarity (vectors are normalised)
        order = np.argsort(-sims)[:k]
        qp = (q - self._mean) @ self._basis.T
        return {"query_point": {"x": float(qp[0]), "y": float(qp[1])},
                "results": [{"rank": r + 1, "score": float(sims[i]), **self.chunks[i]} for r, i in enumerate(order)],
                "all_scores": [float(s) for s in sims], "ms": (time.perf_counter() - t) * 1000}

    # 6. PROMPT -------------------------------------------------------------
    def prompt(self, question: str, retrieved: list[dict]) -> dict:
        chunks = [{"title": self.filename, "section": f"chunk {c['id']}", "text": c["text"]} for c in retrieved]
        return {"messages": build_messages(question, chunks, "strict"), "chunks": chunks}

    # 7. GENERATE + SOURCES -------------------------------------------------
    def answer(self, question: str, retrieved: list[dict]) -> dict:
        chunks = self.prompt(question, retrieved)["chunks"]
        out = generate(question, chunks, "strict")
        out["sources"] = [{"n": n, **retrieved[n - 1]} for n in out["citations"]]
        return out
