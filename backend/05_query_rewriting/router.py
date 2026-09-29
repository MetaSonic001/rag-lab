from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .rag import run

router = APIRouter(prefix="/api/rewrite", tags=["05 query rewriting"])


class Req(BaseModel):
    question: str
    mode: str = "rewrite"  # rewrite | multi | hyde
    corpus: str = "ragpay"
    k: int = 4


@router.post("/run")
def run_route(r: Req):
    try:
        return run(r.question, r.mode, r.corpus, r.k)
    except (KeyError, ValueError) as e:
        raise HTTPException(400, str(e)) from e
