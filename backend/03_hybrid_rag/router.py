from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .rag import ask, search

router = APIRouter(prefix="/api/hybrid", tags=["03 hybrid"])


class Req(BaseModel):
    question: str
    corpus: str = "ragpay"
    k: int = 5
    answer: bool = False


@router.post("/ask")
def ask_route(r: Req):
    try:
        return ask(r.question, r.corpus, r.k) if r.answer else search(r.question, r.corpus, r.k)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
