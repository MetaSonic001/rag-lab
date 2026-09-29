"""RAG LAB API.  Run from the backend folder:  uvicorn main:app --port 8000

Each numbered folder is a standalone lesson exposing a FastAPI `router`. This file only mounts them,
plus a few shared routes (status, lab engine, source explorer).
"""
from __future__ import annotations

import difflib
import importlib
import sys
import threading
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND))

from core import config, docs as D, lab, llm  # noqa: E402
from core.embeddings import MODELS  # noqa: E402

LESSONS = [
    "01_basic_rag", "02_langchain_rag", "03_hybrid_rag", "04_reranking", "05_query_rewriting",
    "06_multihop_rag", "07_agentic_rag", "08_code_rag", "09_ragpay", "10_evaluation", "11_security",
]
LOADED: dict[str, str] = {}


def _warmup():
    """Load the models once in the background so the first click is fast."""
    try:
        from core.embeddings import embed, cross_scores
        embed(["warm up"], "minilm")
        cross_scores("q", ["p"])
    except Exception:
        traceback.print_exc()


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_warmup, daemon=True).start()
    yield


app = FastAPI(title="RAG LAB API", lifespan=lifespan)
import os  # noqa: E402

_ORIGINS = [o for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o]
app.add_middleware(CORSMiddleware, allow_origins=_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

_SECRET = os.getenv("API_SHARED_SECRET", "")


@app.middleware("http")
async def require_shared_secret(request, call_next):
    """Optional: when API_SHARED_SECRET is set, only the Next.js proxy (which sends it) may call this API."""
    if _SECRET and request.method != "OPTIONS" and request.url.path != "/health" and request.headers.get("x-api-secret") != _SECRET:
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "forbidden"}, status_code=403)
    return await call_next(request)


for name in LESSONS:
    try:
        mod = importlib.import_module(f"{name}.router")
        app.include_router(mod.router)
        LOADED[name] = "ok"
    except Exception as e:  # keep the rest of the lab alive
        LOADED[name] = f"failed: {e}"
        traceback.print_exc()


@app.get("/health")
def health():
    """Public, secret-free liveness check for the hosting platform (Render / Railway)."""
    return {"ok": True}


# ── status ──────────────────────────────────────────────────────────────
def _installed(mod: str) -> bool:
    return importlib.util.find_spec(mod) is not None


@app.get("/api/status")
def status():
    return {
        "llm": llm.status(),
        "lessons": LOADED,
        "embedding_models": {k: {"label": v["label"], "dim": v["dim"], "note": v["note"]} for k, v in MODELS.items()},
        "libraries": {n: _installed(m) for n, m in [
            ("PyMuPDF4LLM", "pymupdf4llm"), ("Chonkie", "chonkie"), ("Chroma", "chromadb"), ("FAISS", "faiss"),
            ("Qdrant", "qdrant_client"), ("sqlite-vec", "sqlite_vec"), ("LangChain", "langchain"),
            ("LangGraph", "langgraph"), ("LlamaIndex", "llama_index"), ("Sentence Transformers", "sentence_transformers"),
            ("Docling", "docling"), ("Crawl4AI", "crawl4ai"), ("RAGAS", "ragas"), ("DeepEval", "deepeval")]},
    }


# ── lab engine (Playground / Watch / Break / Apps) ──────────────────────
class LabRequest(BaseModel):
    question: str
    corpus: str = "attendance"
    chunk_strategy: str = "recursive"
    chunk_size: int = 500
    chunk_overlap: int = 50
    contextual: bool = True
    embedding_model: str = "minilm"
    top_k: int = 4
    retriever: str = "vector"
    rerank: bool = False
    rerank_candidates: int = 12
    prompt: str = "strict"
    generate: bool = True
    filters: dict | None = None
    min_score: float | None = None
    llm_model: str | None = None
    facts: list[str] | None = None
    inline_docs: list[dict] | None = None


@app.post("/api/lab/run")
def lab_run(req: LabRequest):
    data = req.model_dump()
    q = data.pop("question")
    try:
        return lab.run(q, **data)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.get("/api/lab/options")
def lab_options():
    return {
        "chunkers": {k: {"label": v[1], "note": v[2]} for k, v in D.CHUNKERS.items()},
        "embedding_models": {k: {"label": v["label"], "note": v["note"]} for k, v in MODELS.items()},
        "prompts": {"strict": lab_prompt("strict"), "naive": lab_prompt("naive"), "none": lab_prompt("none")},
        "corpora": [{"id": "attendance", "label": "College attendance policy"},
                    {"id": "ragpay", "label": "RAGPAY docs (26 files)"}],
    }


class EmbedRequest(BaseModel):
    texts: list[str]
    model: str = "minilm"


@app.post("/api/lab/embed")
def lab_embed(req: EmbedRequest):
    """Real embeddings for the Fundamentals demos: 2-D map (PCA), first values, pairwise cosine."""
    import numpy as np
    from core.embeddings import embed

    texts = [t for t in req.texts if t.strip()][:24]
    if not texts:
        raise HTTPException(400, "no text")
    v = embed(texts, req.model)
    sims = (v @ v.T).tolist()
    if len(texts) >= 3:
        c = v - v.mean(0)
        _, _, vt = np.linalg.svd(c, full_matrices=False)
        pts = (c @ vt[:2].T).tolist()
    else:
        pts = [[float(i), 0.0] for i in range(len(texts))]
    return {"texts": texts, "dims": int(v.shape[1]), "points": pts, "similarity": sims,
            "first_values": [[round(float(x), 3) for x in row[:8]] for row in v]}


@app.get("/api/models")
def models():
    """Chat models this Groq key can use (for the Playground model picker)."""
    try:
        from groq import Groq
        ids = [m.id for m in Groq(api_key=config.groq_api_key()).models.list().data]
        return [i for i in sorted(ids) if not any(x in i for x in ("whisper", "orpheus", "guard", "safeguard", "allam"))]
    except Exception:
        return [config.default_model(), config.fast_model()]


@app.get("/api/lab/scenarios")
def lab_scenarios():
    from core.scenarios import SCENARIOS
    return SCENARIOS


def lab_prompt(key: str) -> str:
    from core.generate import PROMPTS
    return PROMPTS[key]


# ── source explorer (open the code live in the lecture) ─────────────────
def _files(folder: Path) -> list[Path]:
    return sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix in {".py", ".md", ".txt"}
                  and "__pycache__" not in p.parts and ".venv" not in p.parts)


@app.get("/api/code/modules")
def code_modules():
    out = []
    for name in LESSONS:
        folder = BACKEND / name
        readme = folder / "README.md"
        out.append({"name": name, "readme": readme.read_text(encoding="utf-8") if readme.exists() else "",
                    "files": [str(p.relative_to(BACKEND)).replace("\\", "/") for p in _files(folder) if p.name != "__init__.py"]})
    return out


def _safe(rel: str) -> Path:
    p = (BACKEND / rel).resolve()
    if BACKEND not in p.parents or ".venv" in p.parts or p.suffix not in {".py", ".md", ".txt", ".json"}:
        raise HTTPException(400, "path not allowed")
    if not p.exists():
        raise HTTPException(404, "file not found")
    return p


@app.get("/api/code/file")
def code_file(path: str):
    p = _safe(path)
    return {"path": path, "content": p.read_text(encoding="utf-8")}


@app.get("/api/code/diff")
def code_diff(a: str, b: str):
    pa, pb = _safe(a), _safe(b)
    diff = list(difflib.unified_diff(pa.read_text(encoding="utf-8").splitlines(), pb.read_text(encoding="utf-8").splitlines(),
                                     fromfile=a, tofile=b, lineterm="", n=3))
    return {"a": a, "b": b, "diff": "\n".join(diff), "added": sum(1 for x in diff if x.startswith("+") and not x.startswith("+++")),
            "removed": sum(1 for x in diff if x.startswith("-") and not x.startswith("---"))}
