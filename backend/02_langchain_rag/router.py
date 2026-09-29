from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .rag import ask

router = APIRouter(prefix="/api/langchain", tags=["02 langchain"])


class Req(BaseModel):
    question: str
    corpus: str = "attendance"
    k: int = 4
    chunk_size: int = 500
    overlap: int = 50


@router.post("/ask")
def ask_route(r: Req):
    try:
        return ask(r.question, r.corpus, r.k, r.chunk_size, r.overlap)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
