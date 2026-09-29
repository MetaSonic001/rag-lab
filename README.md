# RAG LAB

An interactive lecture platform: **zero → hero RAG**. Next.js frontend + FastAPI/Python backend, LLM via GroqCloud.

```
app/ components/ content/ lib/     Next.js 16 + shadcn/ui (Base UI) + Aceternity / Spectrum / HeroUI pieces
backend/                           FastAPI. 01_basic_rag … 11_security = one lesson per folder (each has a README)
```

## How to run this project

**Prerequisites:** [Bun](https://bun.sh) (or Node 20+), Python 3.12, and [uv](https://docs.astral.sh/uv/) (`pip install uv`). No Docker needed.

**1. Install the frontend**
```bash
bun install
```

**2. Install the backend** (creates `backend/.venv` and installs the Python packages; the first install is several minutes because of PyTorch)
```bash
bun run setup:api
```

**3. Add your Groq key.** Copy the template and paste your key into `GROQ_API_KEY` (get one free at https://console.groq.com/keys):
```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

**4. Start everything** (Python API on http://localhost:8000 + website on http://localhost:3000)
```bash
bun run dev:all
```
Open **http://localhost:3000**. The first question you ask takes ~20 s while the embedding models load; after that it is fast.

`dev:all` shows both logs, prefixed `[api]` and `[web]`, and prints a green `[lab] ✓ API ready …` line (with your Groq key and model status) when the backend is up. Until then the site shows *backend offline*; the API takes 30–60 s on first start while it loads the AI models.

**Or run them in two separate terminals** (handy in a lecture, or when you want to restart only one side):

```bash
# Terminal 1: backend (leave it running; you will see its logs here)
cd backend
.venv\Scripts\python -m uvicorn main:app --port 8000        # macOS/Linux: .venv/bin/python -m uvicorn main:app --port 8000
# ready when you see:  "Application startup complete."  then check http://localhost:8000/api/status

# Terminal 2: frontend
bun run dev
```
Add `--reload` to the uvicorn command while editing Python files. Shortcuts from the project root: `bun run api` (backend only) and `bun run dev` (frontend only).
If the API lives elsewhere, set `BACKEND_URL` in `.env` (default `http://127.0.0.1:8000`).

**Useful checks**
```bash
bun run typecheck    # TypeScript
bun run build        # production build
```

**Troubleshooting**
- Top-bar pill says *backend offline*: the API isn't running. Use `bun run dev:all` or `bun run api`.
- Pill says *no API key*: `GROQ_API_KEY` is missing or `.env` isn't in the project root. Restart the API after editing it.
- Model not found error from Groq: change `GROQ_MODEL` / `GROQ_FAST_MODEL` in `.env` to a model your key can use.
- Port 8000 or 3000 already in use: stop the old process, then rerun.

Without a Groq key everything still runs: retrieval is real, answers fall back to an extractive mode that is clearly labelled.
Optional extras (Docling, Crawl4AI, RAGAS, DeepEval): `bun run setup:extras`.

## Deploy

**Backend → Railway (or Render)**
- Root directory: `backend`. Install: `pip install -r requirements-deploy.txt` (CPU-only PyTorch). Start: the `Procfile` (`uvicorn main:app --host 0.0.0.0 --port $PORT`).
- Env vars: `GROQ_API_KEY`, `API_SHARED_SECRET` (any long random string), optional `GROQ_MODEL`, `GROQ_FAST_MODEL`.
- Needs roughly **1–1.5 GB RAM** (embedding model + cross-encoder). Free tiers with 512 MB will not fit; use the smallest paid/hobby tier or Hugging Face Spaces (free CPU, 16 GB).
- First request downloads two small models (~150 MB); the API warms them up in the background on start.

**Frontend → Vercel**
- Framework preset: Next.js, root directory: repo root.
- Env vars: `BACKEND_URL` (your Railway URL), `API_SHARED_SECRET` (same value as backend).
- The browser only calls `/backend/*` (a Next route handler that proxies to Python and adds the secret), so the Groq key and the API stay private.

## Notes
- `.env` is git-ignored; never commit your key.
- RAGPAY is a fictional company with fictional data, inspired by real payment-platform documentation.
- `bun run lint` fails on this template because of an ESLint 10 / eslint-plugin-react incompatibility that predates this work; `bun run typecheck` and `bun run build` pass.
