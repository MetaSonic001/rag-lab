from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .attacks import ATTACKS
from .rag import run

router = APIRouter(prefix="/api/security", tags=["11 security"])


class Req(BaseModel):
    attack_id: str
    defended: bool = False


@router.get("/attacks")
def attacks():
    return [{k: a[k] for k in ("id", "title", "risk", "question", "explain")} | {"docs": a["docs"]} for a in ATTACKS]


@router.post("/run")
def run_route(r: Req):
    if r.attack_id not in {a["id"] for a in ATTACKS}:
        raise HTTPException(404, "unknown attack")
    return run(r.attack_id, r.defended)
