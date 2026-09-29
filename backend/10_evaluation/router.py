import importlib.util

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.llm import is_configured

from .rag import GOLDEN, SYSTEMS, run_system

router = APIRouter(prefix="/api/eval", tags=["10 evaluation"])


class Req(BaseModel):
    system: str
    n: int = 15
    with_llm: bool = False


@router.get("/config")
def config():
    return {"systems": {k: {"label": v["label"], "note": v["note"]} for k, v in SYSTEMS.items()}, "questions": len(GOLDEN),
            "llm_available": is_configured(),
            "frameworks": {"ragas": importlib.util.find_spec("ragas") is not None, "deepeval": importlib.util.find_spec("deepeval") is not None}}


@router.post("/run")
def run(r: Req):
    if r.system not in SYSTEMS:
        raise HTTPException(400, "unknown system")
    return run_system(r.system, min(r.n, len(GOLDEN)), r.with_llm)
