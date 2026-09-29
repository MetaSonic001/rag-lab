from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .rag import ask, search

router = APIRouter(prefix="/api/rerank", tags=["04 rerank"])


class Req(BaseModel):
    question: str
    corpus: str = "ragpay"
    candidates: int = 15
    top_n: int = 5
    category: str | None = None
    answer: bool = False


@router.post("/ask")
def ask_route(r: Req):
    try:
        kw = dict(corpus=r.corpus, candidates=r.candidates, top_n=r.top_n, category=r.category or None)
        return ask(r.question, **kw) if r.answer else search(r.question, **kw)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
