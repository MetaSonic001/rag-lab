/**
 * 09 · Applications. Six domains, each chosen because it exposes a different RETRIEVAL problem.
 * Every scenario runs the real lab engine on a small inline corpus and counts whether the facts needed
 * to answer actually reached the context (substring match, no LLM involved).
 */
import type { LabRunOptions } from "@/lib/lab"

export type InlineDoc = { id: string; title: string; text: string; meta?: Record<string, string> }
export type AppScenario = {
  id: string
  domain: string
  problem: string // the retrieval problem type
  fixWith: string
  blurb: string
  question: string
  facts: string[]
  docs?: InlineDoc[]
  corpus?: string
  labelA: string
  labelB: string
  a: LabRunOptions
  b: LabRunOptions
  aDocs?: InlineDoc[]
  bDocs?: InlineDoc[]
  takeaway: string
  learnMore: { label: string; href: string }
}

const d = (id: string, title: string, text: string, meta?: Record<string, string>): InlineDoc => ({ id, title, text: `# ${title}\n\n${text}`, meta })
const H = { chunk_strategy: "heading", chunk_size: 600, chunk_overlap: 0 }

const TOKENS_PY = `"""Signed session tokens (HMAC-based, JWT-like)."""
import base64, hashlib, hmac, json, time

from config import Settings


def _sign(payload: bytes) -> str:
    sig = hmac.new(Settings.SECRET_KEY.encode(), payload, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode()


def issue_token(user_id: int) -> str:
    """Create a token containing the user id and an expiry timestamp."""
    body = json.dumps({"sub": user_id, "exp": time.time() + Settings.TOKEN_TTL_SECONDS})
    payload = base64.urlsafe_b64encode(body.encode())
    return payload.decode() + "." + _sign(payload)


def verify_token(token: str):
    """Return the user id if the signature is valid and the token not expired."""
    try:
        payload, signature = token.split(".")
    except ValueError:
        return None
    if not hmac.compare_digest(signature, _sign(payload.encode())):
        return None
    data = json.loads(base64.urlsafe_b64decode(payload))
    if data["exp"] < time.time():
        return None
    return data["sub"]`

const split = (src: string) => {
  const parts = src.split(/\n\n\n(?=def )/)
  return parts.map((p, i) => ({ id: `tokens.py#${i}`, title: p.match(/def (\w+)/)?.[1] ?? "module header", text: p }))
}

export const APPS: AppScenario[] = [
  {
    id: "education", domain: "Education", problem: "Vocabulary mismatch", fixWith: "Semantic (vector) search",
    blurb: "Students ask in everyday words; the handbook uses formal ones. “Finals” never appears in the policy, and neither does “skipped classes”.",
    question: "Can I still take the finals if I skipped a lot of classes?", facts: ["three quarters"],
    docs: [
      d("late.md", "Late submissions", "Assignments handed in after the deadline lose 10% of marks per day. After 5 days no marks are awarded."),
      d("eligibility.md", "Assessment eligibility", "Learners must have completed at least three quarters of scheduled sessions to be admitted to the final assessment."),
      d("integrity.md", "Academic integrity", "Copying text without attribution results in a zero for the assignment and a disciplinary hearing."),
      d("library.md", "Library hours", "The library is open from 8am to 10pm on weekdays and 10am to 6pm on weekends."),
      d("scholarship.md", "Scholarship renewal", "Scholarship holders must maintain a grade average of 3.0 and complete 24 credits each year."),
    ],
    labelA: "Keyword search (BM25)", labelB: "Vector search", a: { retriever: "bm25", top_k: 1, ...H }, b: { retriever: "vector", top_k: 1, ...H },
    takeaway: "BM25 needs shared words, so it returns nothing. Embeddings map “skipped classes” near “scheduled sessions”. Users rarely use your documents’ vocabulary.",
    learnMore: { label: "Fundamentals · Embeddings", href: "/fundamentals/embeddings" },
  },
  {
    id: "code", domain: "Code", problem: "Structure: where to cut", fixWith: "Chunk by function (syntax tree)",
    blurb: "Cutting source code every N characters slices functions in half. The answer needs the whole function.",
    question: "How does token expiry get checked?", facts: [`data["exp"] < time.time()`, "return data[\"sub\"]"],
    labelA: "Fixed 250-character chunks", labelB: "One chunk per function",
    a: { inline_docs: [{ id: "tokens.py", title: "auth/tokens.py", text: TOKENS_PY }], corpus: "attendance", chunk_strategy: "fixed", chunk_size: 250, chunk_overlap: 0, contextual: false, top_k: 1, retriever: "vector" },
    b: { inline_docs: split(TOKENS_PY), corpus: "attendance", chunk_strategy: "heading", chunk_size: 900, chunk_overlap: 0, contextual: false, top_k: 1, retriever: "vector" },
    takeaway: "The expiry check sits at the end of verify_token. A 250-character window lands on the middle of the function; a function-level chunk contains it all. The Code RAG lesson uses Python’s ast module to do this automatically and cites file and line numbers.",
    learnMore: { label: "Try Code RAG on a real repository", href: "/code-rag" },
  },
  {
    id: "finance", domain: "Finance", problem: "Same words, different period", fixWith: "Metadata filtering",
    blurb: "Every quarterly report reads almost identically. Semantic search cannot tell FY23 from FY24; only the numbers differ.",
    question: "What was revenue in the third quarter?", facts: ["4,890"],
    docs: [
      d("q3fy22.md", "Q3 FY22 results", "Revenue for the third quarter was Rs 3,760 crore, up 6% year on year. Net profit was Rs 540 crore.", { year: "FY22" }),
      d("q3fy23.md", "Q3 FY23 results", "Revenue for the third quarter was Rs 4,120 crore, up 9% year on year. Net profit was Rs 610 crore.", { year: "FY23" }),
      d("q3fy24.md", "Q3 FY24 results", "Revenue for the third quarter was Rs 4,890 crore, up 19% year on year. Net profit was Rs 702 crore.", { year: "FY24" }),
      d("q2fy24.md", "Q2 FY24 results", "Revenue for the second quarter was Rs 4,455 crore, up 14% year on year. Net profit was Rs 655 crore.", { year: "FY24" }),
    ],
    labelA: "No filter", labelB: "Filter: year = FY24 (from the user’s context)", a: { retriever: "vector", top_k: 1, ...H }, b: { retriever: "vector", top_k: 1, filters: { year: "FY24" }, ...H },
    takeaway: "Similar-looking documents are a coin toss for embeddings. The application knows which fiscal year the user is looking at, so it should filter, not hope.",
    learnMore: { label: "Advanced · Metadata filtering", href: "/advanced/metadata" },
  },
  {
    id: "legal", domain: "Legal", problem: "Clauses and their exceptions", fixWith: "Structure-aware chunking",
    blurb: "The rule is in 12.1; the exception that changes the answer is in 12.2. Cut between them and the answer is confidently wrong.",
    question: "How much notice is required to terminate the contract?", facts: ["60 days", "Force Majeure"],
    docs: [d("msa.md", "Master Services Agreement", "## 12. Termination\n\n12.1 Either party may terminate this Agreement for convenience by giving 60 days' written notice to the other party.\n\n12.2 The notice period in 12.1 does not apply where a Force Majeure event continues for more than 30 days, in which case either party may terminate immediately.\n\n## 13. Payment\n\n13.1 Invoices are payable within 30 days of receipt.\n\n## 14. Liability\n\n14.1 Liability is capped at fees paid in the preceding twelve months.")],
    labelA: "Fixed 220-character chunks", labelB: "One chunk per numbered section", a: { chunk_strategy: "fixed", chunk_size: 220, chunk_overlap: 0, contextual: false, top_k: 1, retriever: "vector" }, b: { chunk_strategy: "heading", chunk_size: 900, chunk_overlap: 0, top_k: 1, retriever: "vector" },
    takeaway: "With the clause split from its exception, the model would state “60 days” with no caveat. In legal text, always retrieve the whole section, and consider parent–child retrieval (search small, return the parent).",
    learnMore: { label: "Advanced · Better chunking", href: "/advanced/chunking" },
  },
  {
    id: "manufacturing", domain: "Manufacturing", problem: "Near-identical part numbers", fixWith: "Keyword / hybrid + rerank",
    blurb: "KX-4471-A, KX-4471-B, KX-4417-B and KX-4741-B look the same to an embedding model. A wrong torque value is not a small mistake.",
    question: "torque spec for part KX-4471-B", facts: ["42 Nm"],
    docs: [
      d("kx4471a.md", "Part KX-4471-A", "Part KX-4471-A flange bolt. Torque specification 38 Nm. Use thread locker grade 243."),
      d("kx4471b.md", "Part KX-4471-B", "Part KX-4471-B flange bolt, stainless. Torque specification 42 Nm. Do not use thread locker."),
      d("kx4417b.md", "Part KX-4417-B", "Part KX-4417-B motor mount bolt. Torque specification 55 Nm. Use thread locker grade 271."),
      d("kx4741b.md", "Part KX-4741-B", "Part KX-4741-B cover screw. Torque specification 6 Nm. Hand tighten then quarter turn."),
      d("gen.md", "General assembly notes", "Always torque bolts in a cross pattern. Recalibrate the torque wrench every 500 cycles."),
    ],
    labelA: "Vector search", labelB: "Hybrid + cross-encoder rerank", a: { retriever: "vector", top_k: 1, ...H }, b: { retriever: "hybrid", rerank: true, top_k: 1, ...H },
    takeaway: "Embeddings treat part numbers as fuzzy tokens and return the neighbour, KX-4471-A (38 Nm). Exact-match signals plus a reranker that reads the query and chunk together pick the right one.",
    learnMore: { label: "Advanced · Hybrid search", href: "/advanced/hybrid" },
  },
  {
    id: "support", domain: "Customer support", problem: "Answers spread over several documents", fixWith: "Better chunks, hybrid, then multi-hop",
    blurb: "“Why is my payout smaller?” needs the fee rate, the GST rule and the refund-netting rule: three facts in different documents.",
    question: "why is my settlement lower than what my customers paid", facts: ["Refunds netted off", "2% platform fee", "GST at 18%"], corpus: "ragpay",
    labelA: "Basic: 400-char chunks, vector, top-3", labelB: "Heading chunks, hybrid, top-3",
    a: { corpus: "ragpay", chunk_strategy: "fixed", chunk_size: 400, chunk_overlap: 0, contextual: false, top_k: 3, retriever: "vector" }, b: { corpus: "ragpay", ...H, top_k: 3, retriever: "hybrid" },
    takeaway: "Better chunks and hybrid search recover two of the three facts, but a single query still cannot reach all three. That is the motivation for query decomposition (multi-hop) and agentic RAG, which RAGPAY uses.",
    learnMore: { label: "Advanced · Multi-hop RAG", href: "/advanced/multi-hop" },
  },
]
