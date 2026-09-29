"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { AlertTriangle, Cpu, HelpCircle, Play, Wrench } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { runLab } from "@/lib/lab"
import type { LabResult } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kicker, Provenance, ErrorNote } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/viz/flow"
import { AnswerView, ChunkCard, Spinner, fmtMs, labSources } from "@/components/viz/rag-parts"
import { approxTokens } from "@/components/demos/demos-a"
import { Simple, Technical } from "@/lib/mode"

const NODES: FlowNode[] = [
  { id: "question", label: "Question", sub: "user input", x: 90, y: 70, tone: "primary", w: 130, h: 54 },
  { id: "query", label: "Query processing", sub: "clean & tokenise", x: 275, y: 70, tone: "embed", w: 140, h: 54 },
  { id: "embedding", label: "Embedding", sub: "text → numbers", x: 460, y: 70, tone: "embed", w: 130, h: 54 },
  { id: "retrieval", label: "Retrieval", sub: "vector + BM25", x: 640, y: 70, tone: "retrieve", w: 130, h: 54 },
  { id: "topk", label: "Top-K chunks", sub: "shortlist", x: 810, y: 70, tone: "retrieve", w: 130, h: 54 },
  { id: "rerank", label: "Rerank", sub: "cross-encoder", x: 810, y: 200, tone: "rerank", w: 130, h: 54 },
  { id: "context", label: "Context", sub: "build prompt", x: 640, y: 200, tone: "generate", w: 130, h: 54 },
  { id: "llm", label: "LLM", sub: "GroqCloud", x: 460, y: 200, tone: "generate", w: 130, h: 54 },
  { id: "answer", label: "Answer", sub: "+ citations", x: 275, y: 200, tone: "good", w: 130, h: 54 },
]
const ORDER = NODES.map((n) => n.id)
const EDGES: FlowEdge[] = ORDER.slice(1).map((to, i) => ({ from: ORDER[i], to }))

const INFO: Record<string, { does: string; why: string; wrong: string[]; tech: string[]; simple: string }> = {
  question: { simple: "Everything starts with a person typing a question in their own words.", does: "Captures the user’s message (and, in a chat, recent history).", why: "It is the only signal we have about what the user needs.", wrong: ["Vague or multi-part questions", "Follow-ups that depend on earlier turns (‘what about the fee?’)", "Typos and slang that do not match the documents"], tech: ["Chat UI", "conversation memory"] },
  query: { simple: "We tidy the question up: drop filler words and split it into pieces the search can use.", does: "Normalises the query: lowercases, removes stop-words, tokenises (for BM25), optionally rewrites it with an LLM.", why: "Keyword search only sees words; a cleaner query means better matches.", wrong: ["Removing a word that mattered", "Rewrites that drift from the original meaning", "Identifiers split incorrectly (PAY_ERR_3DS_FAILED)"], tech: ["Tokenizer", "query rewriting (lesson 05)"] },
  embedding: { simple: "The question is turned into a list of numbers that captures what it means.", does: "Encodes the query into a dense vector with the same model used for the chunks.", why: "Vectors let us compare meaning geometrically instead of by exact words.", wrong: ["Using a different model than the index", "Truncation of long queries", "Model that does not know your domain vocabulary"], tech: ["Sentence Transformers", "all-MiniLM-L6-v2", "384 dimensions"] },
  retrieval: { simple: "We search the chunk library two ways at once: by meaning, and by exact words.", does: "Runs vector search and BM25 over all chunks and fuses the two rankings with Reciprocal Rank Fusion.", why: "Meaning search finds paraphrases; keyword search finds exact codes and names. Together they cover both.", wrong: ["Right document, wrong chunk", "Exact identifiers missed by vectors", "Chunks too big or too small to match"], tech: ["Vector search (cosine)", "BM25", "RRF fusion"] },
  topk: { simple: "We keep only the best few candidates and throw the rest away.", does: "Selects the top-N fused candidates as the shortlist for the next stage.", why: "The model can only read so much, and noise makes answers worse.", wrong: ["K too low: the answer is not in the list", "K too high: noise and cost", "Near-duplicate chunks wasting slots"], tech: ["Top-K", "metadata filters", "deduplication"] },
  rerank: { simple: "A careful second reader re-orders the shortlist by how well each chunk truly answers the question.", does: "A cross-encoder reads (question, chunk) together and gives a relevance score; we sort by it and keep the best.", why: "First-stage search is fast but coarse; reranking gives precision.", wrong: ["Adds latency", "Truncates long chunks", "Can demote chunks that need a neighbour for context"], tech: ["Cross-encoder ms-marco-MiniLM", "Sentence Transformers"] },
  context: { simple: "The winning chunks are pasted into a prompt, numbered so they can be cited.", does: "Formats the selected chunks with source labels and combines them with the instructions and the question.", why: "This text is everything the model will know about your documents for this question.", wrong: ["Context too long for the window", "Sources not labelled, so no citations", "Retrieved text treated as instructions (prompt injection)"], tech: ["Prompt template", "token budget"] },
  llm: { simple: "The language model reads the prompt and writes the answer in plain language.", does: "Generates an answer conditioned on the context, following the rules in the system prompt.", why: "It turns raw chunks into a clear, human answer.", wrong: ["Hallucinating beyond the context", "Ignoring the citation rules", "Slow or expensive models"], tech: ["GroqCloud", "gpt-oss-120b (configurable)", "temperature 0.1"] },
  answer: { simple: "You get the answer plus the sources it came from, so you can check it.", does: "Returns the text with [n] citations mapped back to documents and sections.", why: "Verifiable answers are trustworthy answers.", wrong: ["Citations that do not support the claim", "Answer shown despite weak evidence", "No fallback when nothing was found"], tech: ["Citation parsing", "grounding checks (RAGPAY)"] },
}
const STOP = new Set("a an the of to in on for and or is are was were be been it its this that with as at by from i my me we our you your do does did can could should would what when why how which who".split(" "))
type Embed = { dims: number; first_values: number[][] }

export function WatchRag() {
  const [q, setQ] = React.useState("Can I get condonation if I have 70% attendance?")
  const [corpus, setCorpus] = React.useState<"attendance" | "ragpay">("attendance")
  const [res, setRes] = React.useState<LabResult | null>(null)
  const [emb, setEmb] = React.useState<Embed | null>(null)
  const [step, setStep] = React.useState(-1)
  const [selected, setSelected] = React.useState<string>("retrieval")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const go = async () => {
    setLoading(true); setError(null); setStep(-1)
    try {
      const [r, e] = await Promise.all([
        runLab(q, { corpus, retriever: "hybrid", rerank: true, rerank_candidates: 10, top_k: 3, chunk_strategy: "heading", chunk_size: corpus === "ragpay" ? 600 : 500, chunk_overlap: 0 }),
        api<Embed>("/api/lab/embed", { texts: [q], model: "minilm" }),
      ])
      setRes(r); setEmb(e)
      let i = 0
      setStep(0); setSelected(ORDER[0])
      timer.current && clearInterval(timer.current)
      timer.current = setInterval(() => { i += 1; if (i >= ORDER.length) { timer.current && clearInterval(timer.current); return } setStep(i); setSelected(ORDER[i]) }, 1100)
    } catch (err) { setError(err instanceof Error ? err.message : "failed") } finally { setLoading(false) }
  }
  React.useEffect(() => () => { timer.current && clearInterval(timer.current) }, [])

  const info = INFO[selected]
  const active = step >= 0 ? [ORDER[step], ORDER[Math.max(step - 1, 0)]] : []
  const visited = step >= 0 ? ORDER.slice(0, step + 1) : []
  const toks = approxTokens(q)
  const kw = q.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !STOP.has(w)) ?? []
  const cands = res?.candidates ?? []
  const byFusion = [...cands].sort((a, b) => (b.scores.rrf ?? 0) - (a.scores.rrf ?? 0))
  const label = NODES.find((n) => n.id === selected)?.label

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className="min-w-72 flex-1" />
        <div className="flex rounded-lg border p-0.5 text-[12.5px]">{(["attendance", "ragpay"] as const).map((c) => <button key={c} onClick={() => { setCorpus(c); setQ(c === "attendance" ? "Can I get condonation if I have 70% attendance?" : "Why did the payment fail with PAY_ERR_3DS_FAILED?") }} className={cn("rounded-md px-3 py-1.5", corpus === c ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{c === "attendance" ? "College policy" : "RAGPAY docs"}</button>)}</div>
        <Button onClick={go} disabled={loading} className="gap-2">{loading ? <Spinner /> : <><Play className="size-4 fill-current" />Run & watch</>}</Button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="rounded-2xl border bg-card p-3 sm:p-5">
        <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={270} active={active} visited={visited} selected={selected} onSelect={(id) => { setSelected(id); timer.current && clearInterval(timer.current) }} minWidth={780} />
        <p className="px-2 text-center text-[12.5px] text-muted-foreground">{step < 0 ? "Press “Run & watch”, then click any node at any time." : "Click any node to pause the animation and inspect it."}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2"><span className="font-mono text-[10.5px] tracking-[0.16em] text-primary uppercase">Node {ORDER.indexOf(selected) + 1}/9</span><h3 className="font-display text-2xl">{label}</h3></div>
            <Simple><p className="text-[15px] leading-relaxed">{info.simple}</p></Simple>
            <Technical><p className="text-[15px] leading-relaxed">{info.simple}</p></Technical>
            <dl className="space-y-3 text-[13.5px]">
              <div><dt className="mb-0.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase"><HelpCircle className="size-3" />What it does</dt><dd>{info.does}</dd></div>
              <div><dt className="mb-0.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase"><Wrench className="size-3" />Why it exists</dt><dd>{info.why}</dd></div>
              <div><dt className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-bad uppercase"><AlertTriangle className="size-3" />What can go wrong</dt><dd><ul className="list-disc space-y-0.5 pl-4 text-foreground/85">{info.wrong.map((w) => <li key={w}>{w}</li>)}</ul></dd></div>
              <div><dt className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase"><Cpu className="size-3" />Technology</dt><dd className="flex flex-wrap gap-1.5">{info.tech.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}</dd></div>
            </dl>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between"><Kicker>This run · {label}</Kicker>{res && <Provenance kind="real" />}</div>
            {!res && <p className="grid min-h-40 place-items-center text-center text-[13.5px] text-muted-foreground">Run the pipeline to see the actual data at this node.</p>}
            {res && selected === "question" && <div className="rounded-lg border bg-background p-4 font-display text-2xl leading-snug">“{q}”</div>}
            {res && selected === "query" && (
              <div className="space-y-3 text-[13px]">
                <div><Kicker className="mb-1.5">Tokens (approximate)</Kicker><div className="flex flex-wrap gap-1 font-mono text-[12px]">{toks.map((t, i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5">{t.trim()}</span>)}</div></div>
                <div><Kicker className="mb-1.5">Keywords sent to BM25 (stop-words removed)</Kicker><div className="flex flex-wrap gap-1 font-mono text-[12px]">{kw.map((t, i) => <span key={i} className="rounded bg-embed/20 px-1.5 py-0.5">{t}</span>)}</div></div>
              </div>
            )}
            {res && selected === "embedding" && emb && (
              <div className="space-y-2 text-[13px]"><p>The question becomes <strong>{emb.dims}</strong> numbers. First 8:</p><div className="rounded-lg border bg-background p-3 font-mono text-[12.5px]">[{emb.first_values[0].join(", ")}, …]</div><p className="text-muted-foreground">Embedding time is included in retrieval: {fmtMs(res.latency_ms.retrieval - res.latency_ms.rerank)}.</p></div>
            )}
            {res && selected === "retrieval" && (
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground">{res.stats.chunks} chunks searched. Fused order (before reranking), with each retriever’s own score:</p>
                {byFusion.slice(0, 6).map((c, i) => (
                  <div key={c.chunk.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-[12.5px]"><span className="font-mono text-muted-foreground">{i + 1}</span><span className="min-w-0 flex-1 truncate">{c.chunk.doc_id} <span className="text-muted-foreground">§ {c.chunk.section}</span></span><span className="font-mono text-retrieve" title="vector cosine">v {c.scores.vector?.toFixed(2) ?? "–"}</span><span className="font-mono text-embed" title="BM25">b {c.scores.bm25?.toFixed(1) ?? "–"}</span></div>
                ))}
              </div>
            )}
            {res && selected === "topk" && <div className="grid gap-2">{byFusion.slice(0, 6).map((c, i) => <div key={c.chunk.id} className={cn("truncate rounded-lg border px-3 py-2 text-[12.5px]", i < 6 ? "bg-background" : "")}><span className="mr-2 font-mono text-muted-foreground">{i + 1}</span>{c.chunk.doc_id} <span className="text-muted-foreground">§ {c.chunk.section}</span></div>)}<p className="text-[12px] text-muted-foreground">These {Math.min(6, byFusion.length)} of {byFusion.length} candidates go on to the reranker.</p></div>}
            {res && selected === "rerank" && (
              <div className="space-y-2">{res.candidates.slice(0, 5).map((c) => { const before = byFusion.findIndex((x) => x.chunk.id === c.chunk.id) + 1; const moved = before - c.rank; return (
                <div key={c.chunk.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-[12.5px]"><span className={cn("grid size-5 place-items-center rounded font-mono text-[10px]", c.selected ? "bg-rerank text-background" : "bg-muted")}>{c.rank}</span><span className="min-w-0 flex-1 truncate">{c.chunk.doc_id} <span className="text-muted-foreground">§ {c.chunk.section}</span></span><span className={cn("font-mono text-[11px]", moved > 0 ? "text-good" : moved < 0 ? "text-bad" : "text-muted-foreground")}>{moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : "–"}</span><span className="font-mono text-rerank">{c.scores.rerank_prob?.toFixed(2)}</span></div>) })}<p className="text-[12px] text-muted-foreground">Arrows show how far the reranker moved each chunk from its fused position.</p></div>
            )}
            {res && selected === "context" && <div className="space-y-2">{res.candidates.filter((c) => c.selected).map((c, i) => <ChunkCard key={c.chunk.id} c={c} index={i} />)}<p className="text-[12px] text-muted-foreground">{res.context.length} characters ≈ {Math.round(res.context.length / 4)} tokens.</p></div>}
            {res && selected === "llm" && res.answer && <div className="space-y-2 text-[13px]"><Chip tone="accent">{res.answer.mode === "llm" ? res.answer.model : "no API key"}</Chip><Chip>{fmtMs(res.answer.latency_ms)}</Chip><Chip>{res.answer.prompt_tokens} prompt + {res.answer.completion_tokens} completion tokens</Chip><pre className="scrollbar-thin mt-2 max-h-56 overflow-auto rounded-lg border bg-background p-3 font-mono text-[11.5px] whitespace-pre-wrap">{res.answer.messages?.[0].content.split("\n\n[1]")[0]} …</pre></div>}
            {res && selected === "answer" && res.answer && <AnswerView answer={res.answer} sources={labSources(res)} animate={false} />}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
