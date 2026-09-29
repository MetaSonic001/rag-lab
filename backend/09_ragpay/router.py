import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core import docs as D
from core.config import DATA_DIR

from .pipeline import ask

router = APIRouter(prefix="/api/ragpay", tags=["09 ragpay"])


class Msg(BaseModel):
    role: str
    content: str


class Req(BaseModel):
    question: str
    history: list[Msg] = []
    case_id: str | None = None


def _cases() -> list[dict]:
    return json.loads((DATA_DIR / "ragpay" / "cases.json").read_text(encoding="utf-8"))


@router.get("/cases")
def cases():
    return _cases()


@router.get("/docs")
def docs():
    return [{"id": d.id, "title": d.title, "category": d.meta.get("category", ""), "chars": len(d.text)} for d in D.get_corpus("ragpay")]


@router.get("/docs/{doc_id}")
def doc(doc_id: str):
    for d in D.get_corpus("ragpay"):
        if d.id == doc_id:
            return {"id": d.id, "title": d.title, "category": d.meta.get("category", ""), "text": d.text}
    raise HTTPException(404, "document not found")


@router.post("/ask")
def ask_route(r: Req):
    case = next((c for c in _cases() if c["id"] == r.case_id), None) if r.case_id else None
    return ask(r.question, [m.model_dump() for m in r.history], case)
