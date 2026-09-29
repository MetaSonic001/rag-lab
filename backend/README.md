# RAG LAB backend

FastAPI + Python. Each numbered folder is a **standalone lesson**: open two of them side by side (or use the *Source* page in the app, which shows a diff) to see exactly what changes.

| Folder | Idea | Stack |
|---|---|---|
| `01_basic_rag` | RAG from scratch | PyMuPDF4LLM, Sentence Transformers, NumPy, Groq |
| `02_langchain_rag` | Framework components | LangChain, Chroma |
| `03_hybrid_rag` | Meaning + keywords | FAISS, BM25, RRF |
| `04_reranking` | Precision | Qdrant (local), cross-encoder |
| `05_query_rewriting` | Better questions | LlamaIndex |
| `06_multihop_rag` | Multi-document questions | sqlite-vec |
| `07_agentic_rag` | Decisions and loops | LangGraph |
| `08_code_rag` | Repositories | ast, Chroma, BM25 |
| `09_ragpay` | Flagship | hybrid + rerank + grounding + escalation |
| `10_evaluation` | Measuring | precision/recall/faithfulness/relevancy |
| `11_security` | Attacks and defences | scanners, ACLs, fencing |

`core/` holds the small shared pieces: the LLM abstraction (`llm.py`), embeddings, chunkers, retrieval helpers, and `lab.py` (the configurable engine behind the Playground, Watch, Break and Applications pages).

## Run
```bash
uv venv .venv --python 3.12
uv pip install --python .venv/Scripts/python.exe -r requirements.txt   # macOS/Linux: .venv/bin/python
.venv/Scripts/python -m uvicorn main:app --port 8000
```
The LLM key lives in `../.env` (`GROQ_API_KEY`). Without it everything still runs: retrieval is real, and answers fall back to extractive mode (clearly labelled).
