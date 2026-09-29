from fastapi import APIRouter
from pydantic import BaseModel

from .rag import describe, run

router = APIRouter(prefix="/api/agentic", tags=["07 agentic"])


class Req(BaseModel):
    question: str


@router.get("/graph")
def graph():
    return describe()


@router.post("/run")
def run_route(r: Req):
    return run(r.question)
