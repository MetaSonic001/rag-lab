"""HTTP layer for lesson 01: a step-by-step runner so students can execute each stage."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core import docs as D
from core.samplepdf import ensure_sample_pdf

from .rag import BasicRAG

router = APIRouter(prefix="/api/basic", tags=["01 basic rag"])
SESSIONS: dict[str, BasicRAG] = {}
STEPS = ["load", "chunk", "embed", "store", "retrieve", "prompt", "generate"]


class Step(BaseModel):
    session: str | None = None
    step: str
    source: str = "sample"  # "sample" | "upload:<id>"
    question: str = ""
    size: int = 500
    overlap: int = 80
    k: int = 3
    model: str = "minilm"


@router.get("/sample")
def sample():
    pdf = ensure_sample_pdf()
    return {"name": pdf.name, "bytes": pdf.stat().st_size, "steps": STEPS,
            "questions": ["What is the minimum attendance to write exams?",
                          "Can I get condonation if I have 70% attendance?",
                          "How do I appeal a wrong attendance record?"]}


@router.get("/loaders")
def loaders():
    return D.loader_status()


class Crawl(BaseModel):
    url: str


@router.post("/crawl")
def crawl(req: Crawl):
    """Crawl4AI: web page -> Markdown -> upload."""
    if not D.loader_status()["crawl4ai"]["available"]:
        raise HTTPException(501, "Crawl4AI is not installed (see backend/requirements-extra.txt).")
    try:
        text, loader = D.load_url(req.url)
    except Exception as e:  # browser missing, network, bad url
        raise HTTPException(502, f"{type(e).__name__}: {str(e)[:240]}. If the browser is missing run `crawl4ai-setup` once.") from e
    uid = uuid.uuid4().hex[:8]
    D.register_upload(uid, [D.Document(id=req.url, title=req.url, text=text, meta={"loader": loader})])
    return {"upload_id": uid, "source": f"upload:{uid}", "name": req.url, "loader": loader, "characters": len(text)}


@router.post("/upload")
async def upload(file: UploadFile = File(...), loader: str = Form("pymupdf4llm")):
    data = await file.read()
    if len(data) > 15_000_000:
        raise HTTPException(413, "File too large (15 MB max).")
    if loader == "docling" and not D.loader_status()["docling"]["available"]:
        raise HTTPException(501, "Docling is not installed (see backend/requirements-extra.txt).")
    text, loader = D.load_file(file.filename or "upload.txt", data, loader)
    uid = uuid.uuid4().hex[:8]
    D.register_upload(uid, [D.Document(id=file.filename or uid, title=file.filename or uid, text=text, meta={"loader": loader})])
    return {"upload_id": uid, "source": f"upload:{uid}", "name": file.filename, "loader": loader, "characters": len(text)}


@router.post("/step")
async def run_step(req: Step):
    sid = req.session or uuid.uuid4().hex[:8]
    rag = SESSIONS.get(sid)
    if rag is None or req.step == "load":
        rag = SESSIONS[sid] = BasicRAG(model=req.model)
    rag.model = req.model
    try:
        if req.step == "load":
            if req.source == "sample":
                pdf = ensure_sample_pdf()
                out = rag.load(pdf.name, pdf.read_bytes())
            else:
                doc = D.get_corpus(req.source)[0]
                out = rag.load_text(doc.id, doc.text, doc.meta.get("loader", "upload"))
        elif req.step == "chunk":
            out = rag.chunk(req.size, req.overlap)
        elif req.step == "embed":
            out = rag.embed()
        elif req.step == "store":
            out = rag.store()
        elif req.step == "retrieve":
            out = rag.retrieve(req.question, req.k)
        elif req.step == "prompt":
            out = rag.prompt(req.question, rag.retrieve(req.question, req.k)["results"])
        elif req.step == "generate":
            out = rag.answer(req.question, rag.retrieve(req.question, req.k)["results"])
        else:
            raise HTTPException(400, f"unknown step '{req.step}'")
    except (AttributeError, TypeError) as e:
        raise HTTPException(409, f"Run the earlier steps first ({e}).") from e
    return {"session": sid, "step": req.step, "output": out}
