from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .rag import run

router = APIRouter(prefix="/api/multihop", tags=["06 multihop"])


class Req(BaseModel):
    question: str
    corpus: str = "ragpay"
    k: int = 3


@router.post("/run")
def run_route(r: Req):
    try:
        return run(r.question, r.corpus, r.k)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
