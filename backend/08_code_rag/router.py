from fastapi import APIRouter
from pydantic import BaseModel

from .rag import ask, files

router = APIRouter(prefix="/api/coderag", tags=["08 code rag"])


class Req(BaseModel):
    question: str
    k: int = 5


@router.get("/files")
def list_files():
    return files()


@router.post("/ask")
def ask_route(r: Req):
    return ask(r.question, r.k)
