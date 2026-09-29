"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { runLab, type LabRunOptions } from "@/lib/lab"
import type { LabResult } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Callout, ErrorNote, Kicker, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/viz/flow"
import { AnswerView, Spinner, fmtMs } from "@/components/viz/rag-parts"
import { DemoFrame, Presets, RunButton } from "@/components/demos/parts"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

function useCall<T = Any>() {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const call = React.useCallback(async (path: string, body: unknown) => {
    setLoading(true); setError(null)
    try { const r = await api<T>(path, body); setData(r); return r } catch (e) { setError(e instanceof Error ? e.message : "failed"); return null } finally { setLoading(false) }
  }, [])
  return { data, loading, error, call }
}

const CAT_TONE: Record<string, string> = { payments: "bg-retrieve/20 text-retrieve", refunds: "bg-good/20 text-good", settlements: "bg-generate/20 text-generate", developer: "bg-embed/20 text-embed", onboarding: "bg-rerank/20 text-rerank" }
function DocRow({ n, doc, section, score, note, hl, right }: { n?: number; doc: string; section?: string; score?: number; note?: string; hl?: boolean; right?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-[12.5px]", hl && "border-primary/40 bg-primary/[0.06]")}>
      {n !== undefined && <span className="grid size-5 shrink-0 place-items-center rounded bg-muted font-mono text-[10px] text-muted-foreground">{n}</span>}
      <span className="min-w-0 flex-1 truncate">{doc}{section && <span className="text-muted-foreground"> § {section}</span>}{note && <span className="ml-1.5 text-[11px] text-muted-foreground">{note}</span>}</span>
      {score !== undefined && <span className="font-mono text-[11px] text-muted-foreground">{score.toFixed(2)}</span>}
      {right}
    </div>
  )
}
const List = ({ title, tone, children }: { title: string; tone?: string; children: React.ReactNode }) => <div className="space-y-1.5"><Kicker className={tone}>{title}</Kicker>{children}</div>

/* ── A · Basic ─────────────────────────────────────────────────────── */
export function BasicDemo() {
  const [q, setQ] = React.useState("Why did I receive less than my expected settlement?")
  const [r, setR] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const go = async (x = q) => { setLoading(true); setR(await runLab(x, { corpus: "ragpay", chunk_strategy: "fixed", chunk_size: 400, chunk_overlap: 0, contextual: false, top_k: 3, generate: true }).catch(() => null)); setLoading(false) }
  return (
    <DemoFrame title="Basic RAG on the RAGPAY docs">
      <Presets items={["Why did I receive less than my expected settlement?", "What does payment.captured mean?", "the customer says the money never came back"]} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Ask</RunButton></div>
      {r && <div className="mt-4 grid gap-4 lg:grid-cols-2"><List title="Top-3 retrieved (fixed 400-char chunks, vector search)">{r.candidates.map((c) => <DocRow key={c.chunk.id} n={c.rank} doc={c.chunk.doc_id} section={c.chunk.section} score={c.scores.vector} />)}</List>{r.answer && <div className="rounded-xl border bg-background p-3.5"><Kicker className="mb-1.5">Answer</Kicker><AnswerView answer={r.answer} animate={false} /></div>}</div>}
      <p className="mt-3 text-[13px] text-muted-foreground">Try the three questions. Basic RAG handles the first partially (one document, not all three that matter) and stumbles on the exact event name and the vague phrasing. Each of the next techniques fixes one of these.</p>
    </DemoFrame>
  )
}

/* ── generic A/B run of the lab engine ─────────────────────────────── */
export function CompareRun({ title, question, facts, corpus, a, b, labelA, labelB, presets }: { title: string; question: string; facts: string[]; corpus: string; a: LabRunOptions; b: LabRunOptions; labelA: string; labelB: string; presets?: { q: string; facts: string[] }[] }) {
  const [q, setQ] = React.useState(question)
  const [f, setF] = React.useState(facts)
  const [ra, setRa] = React.useState<LabResult | null>(null)
  const [rb, setRb] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const go = async (x = q, fx = f) => {
    setLoading(true)
    const cfg = (o: LabRunOptions) => ({ corpus, generate: false, facts: fx, ...o })
    const [x1, x2] = await Promise.all([runLab(x, cfg(a)).catch(() => null), runLab(x, cfg(b)).catch(() => null)])
    setRa(x1); setRb(x2); setLoading(false)
  }
  return (
    <DemoFrame title={title}>
      {presets && <Presets items={presets.map((p) => p.q)} active={q} onPick={(s) => { const p = presets.find((x) => x.q === s)!; setQ(p.q); setF(p.facts); go(p.q, p.facts) }} />}
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Compare</RunButton></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[[labelA, ra, "bad"], [labelB, rb, "good"]].map(([label, r, tone]) => { const res = r as LabResult | null; const fc = res?.measured.fact_coverage; return (
          <div key={label as string} className={cn("space-y-2 rounded-xl border p-3.5", tone === "good" ? "border-good/30" : "border-bad/30")}>
            <div className="flex items-center justify-between"><Kicker className={tone === "good" ? "text-good" : "text-bad"}>{label as string}</Kicker>{res && <Provenance kind="real" />}</div>
            {!res && <p className="py-6 text-center text-[13px] text-muted-foreground">Press Compare.</p>}
            {res && <>{fc && <div className="flex items-center gap-2"><span className={cn("font-display text-2xl", fc.found.length === fc.total ? "text-good" : "text-bad")}>{fc.found.length}/{fc.total}</span><span className="text-[12.5px] text-muted-foreground">facts in context {fc.missing.length ? `(missing: ${fc.missing.join(", ")})` : ""}</span></div>}
              {res.candidates.filter((c) => c.selected).map((c) => <DocRow key={c.chunk.id} n={c.rank} doc={c.chunk.doc_id} section={c.chunk.section} />)}</>}
          </div>) })}
      </div>
    </DemoFrame>
  )
}

export const ChunkingCompareDemo = () => <CompareRun title="Fixed 200-char chunks vs heading-aware chunks" question="What is the condonation fee and which attendance range qualifies?" facts={["Rs. 500", "65%"]} corpus="attendance" labelA="Fixed 200 characters, top-1" labelB="One chunk per section, top-1"
  a={{ chunk_strategy: "fixed", chunk_size: 200, chunk_overlap: 0, contextual: false, top_k: 1 }} b={{ chunk_strategy: "heading", chunk_size: 500, chunk_overlap: 0, top_k: 1 }} />

/* ── C · Metadata filtering ───────────────────────────────────────── */
export function MetadataDemo() {
  const q = "How long until the money arrives?"
  const cats = ["", "refunds", "settlements", "payments"]
  const [cat, setCat] = React.useState("refunds")
  const off = useCall<Any>(), on = useCall<Any>()
  const go = (c = cat) => { off.call("/api/rerank/ask", { question: q, candidates: 6, top_n: 6 }); on.call("/api/rerank/ask", { question: q, candidates: 6, top_n: 6, category: c || null }) }
  return (
    <DemoFrame title="Ambiguous question, with and without a filter">
      <p className="mb-3 text-[13.5px]">“{q}” could be about refunds, settlements or UPI. Pick the category the user is in:</p>
      <div className="flex flex-wrap items-center gap-2"><Presets items={cats.slice(1)} active={cat} onPick={(c) => { setCat(c); go(c) }} /><RunButton onClick={() => go()} loading={on.loading || off.loading}>Search</RunButton></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <List title="No filter">{off.data?.before?.map((d: Any) => <DocRow key={d.rank} n={d.rank} doc={d.doc} score={d.score} right={<span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", CAT_TONE[d.category] ?? "bg-muted")}>{d.category}</span>} />) ?? <p className="text-[13px] text-muted-foreground">–</p>}</List>
        <List title={`Filter: category = ${cat || "none"}`} tone="text-good">{on.data?.before?.map((d: Any) => <DocRow key={d.rank} n={d.rank} doc={d.doc} score={d.score} right={<span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", CAT_TONE[d.category] ?? "bg-muted")}>{d.category}</span>} />) ?? <p className="text-[13px] text-muted-foreground">–</p>}</List>
      </div>
      {(off.error || on.error) && <div className="mt-3"><ErrorNote>{off.error ?? on.error}</ErrorNote></div>}
      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground"><Provenance kind="real" />Qdrant (in-process) applies the filter inside the search.</div>
    </DemoFrame>
  )
}

/* ── D/E · Hybrid & BM25 ──────────────────────────────────────────── */
export function HybridDemo({ focus = "hybrid" }: { focus?: "hybrid" | "bm25" }) {
  const presets = focus === "bm25" ? ["AUTH_IP_NOT_ALLOWED", "409 IDEMPOTENCY_CONFLICT", "GET /v1/settlements/reconciliation"] : ["payment.captured", "PAY_ERR_3DS_FAILED", "the customer says the money never came back"]
  const [q, setQ] = React.useState(presets[0])
  const { data, loading, error, call } = useCall<Any>()
  const go = (x = q) => call("/api/hybrid/ask", { question: x, k: 4 })
  const inFused = new Set(data?.fused?.map((d: Any) => d.id))
  const cols: [string, string, Any[]][] = focus === "bm25" ? [["Vector (FAISS)", "text-retrieve", data?.vector], ["BM25 (keywords)", "text-embed", data?.bm25]] : [["Vector (FAISS)", "text-retrieve", data?.vector], ["BM25 (keywords)", "text-embed", data?.bm25], ["Fused (RRF)", "text-primary", data?.fused]]
  return (
    <DemoFrame title={focus === "bm25" ? "Meaning vs exact words" : "Three rankings, one fusion"}>
      <Presets items={presets} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Search</RunButton></div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className={cn("mt-4 grid gap-4", focus === "bm25" ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
        {cols.map(([t, c, list]) => <List key={t} title={t} tone={c}>{list?.length ? list.map((d: Any) => <DocRow key={d.id} n={d.rank} doc={d.doc} section={d.section} hl={inFused.has(d.id) && t !== "Fused (RRF)" && focus === "hybrid"} right={<span className="font-mono text-[10.5px] text-muted-foreground">{d.score.toFixed(t.startsWith("BM25") ? 1 : 3)}</span>} />) : <p className="text-[13px] text-muted-foreground">{data ? "no matches" : "–"}</p>}</List>)}
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">Highlighted rows also made the fused top-4. Scores are on different scales (cosine vs BM25), which is why RRF fuses ranks, not scores. <Provenance kind="real" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── F · Reranking ────────────────────────────────────────────────── */
export function RerankDemo() {
  const [q, setQ] = React.useState("Why is my settlement lower than expected?")
  const { data, loading, error, call } = useCall<Any>()
  const go = (x = q) => call("/api/rerank/ask", { question: x, candidates: 15, top_n: 5 })
  return (
    <DemoFrame title="Retrieve 15, rerank, keep 5">
      <Presets items={["Why is my settlement lower than expected?", "customer paid twice for the same order", "how do I test webhooks locally"]} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Rerank</RunButton></div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <List title="Before: vector similarity order (Qdrant)">{data.before.slice(0, 8).map((d: Any) => <DocRow key={d.rank} n={d.rank} doc={d.doc} section={d.section} score={d.score} hl={d.new_rank !== undefined && data.after.some((a: Any) => a.rank === d.rank)} />)}</List>
          <List title="After: cross-encoder order (top 5 kept)" tone="text-rerank">{data.after.map((d: Any) => (
            <motion.div key={d.rank} layout><DocRow n={d.new_rank} doc={d.doc} section={d.section} score={d.rerank_prob} hl right={<span className={cn("flex items-center font-mono text-[10.5px]", d.moved > 0 ? "text-good" : d.moved < 0 ? "text-bad" : "text-muted-foreground")}>{d.moved > 0 ? <ArrowUp className="size-3" /> : d.moved < 0 ? <ArrowDown className="size-3" /> : <Minus className="size-3" />}{Math.abs(d.moved) || ""}</span>} /></motion.div>))}</List>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-muted-foreground">Arrows show how far the cross-encoder moved each chunk from its original rank. Right-hand score is the reranker’s relevance probability. <Provenance kind="real" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── G/H · Query rewriting, multi-query ───────────────────────────── */
export function RewriteDemo({ mode }: { mode: "rewrite" | "multi" }) {
  const [q, setQ] = React.useState("the customer says the money never came back")
  const { data, loading, error, call } = useCall<Any>()
  const go = (x = q) => call("/api/rewrite/run", { question: x, mode, k: 4 })
  return (
    <DemoFrame title={mode === "rewrite" ? "Rewrite the question before searching" : "Search with several phrasings, then fuse"}>
      <Presets items={["the customer says the money never came back", "my payout looks smaller this week", "why did it get declined"]} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Run</RunButton></div>
      {error && !data && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">{data.simulated ? <Provenance kind="simulated" /> : <Provenance kind="llm" />}{data.queries?.map((x: string, i: number) => <Chip key={i} tone="accent">{x}</Chip>)}</div>
          {data.simulated && <p className="text-[12px] text-generate">No API key: the rewrite above comes from simple synonym rules, not an LLM.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <List title="Original question">{data.baseline.map((d: Any) => <DocRow key={d.id} n={d.rank} doc={d.doc} score={d.score} note={d.text.slice(0, 40).replace(/\n/g, " ")} />)}</List>
            <List title={mode === "rewrite" ? "After rewriting" : "After multi-query + fusion"} tone="text-good">{data.results.map((d: Any) => <DocRow key={d.id} n={d.rank} doc={d.doc} score={d.score} hl note={d.text.slice(0, 40).replace(/\n/g, " ")} />)}</List>
          </div>
          {mode === "multi" && data.per_query && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.per_query.map((p: Any, i: number) => <div key={i} className="rounded-lg border bg-background p-2.5"><div className="mb-1.5 truncate font-mono text-[10.5px] text-muted-foreground" title={p.query}>{i === 0 ? "original" : `query ${i}`}: {p.query}</div>{p.results.slice(0, 3).map((d: Any) => <div key={d.id} className="truncate text-[12px]">{d.doc}</div>)}</div>)}</div>}
        </div>
      )}
    </DemoFrame>
  )
}

/* ── I · Multi-hop ────────────────────────────────────────────────── */
export function MultihopDemo() {
  const q = "Why did I receive ₹47,932 instead of ₹48,820 in my settlement?"
  const { data, loading, error, call } = useCall<Any>()
  return (
    <DemoFrame title="One search vs decomposed hops (sqlite-vec)">
      <div className="flex flex-wrap items-center gap-3"><span className="rounded-lg border bg-background px-3 py-1.5 text-[13.5px]">{q}</span><RunButton onClick={() => call("/api/multihop/run", { question: q })} loading={loading}>Run</RunButton></div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <List title="Single search finds">{[...new Set<string>(data.single_shot.map((d: Any) => d.doc))].map((d) => <DocRow key={d} doc={d} />)}</List>
            <List title={`Decomposed into ${data.hops.length} hops`} tone="text-good">{data.hops.map((h: Any) => (
              <div key={h.hop} className="rounded-lg border bg-background p-2.5"><div className="mb-1 flex items-center gap-2 text-[12.5px]"><span className="grid size-5 place-items-center rounded bg-primary/15 font-mono text-[10px] text-primary">{h.hop}</span><span className="min-w-0 flex-1">{h.sub_question}</span><Chip tone={h.new_chunks ? "success" : "default"}>+{h.new_chunks} new</Chip></div><div className="flex flex-wrap gap-1">{h.results.map((r: Any) => <span key={r.id} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px]">{r.doc.replace(".md", "")}</span>)}</div></div>))}</List>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Kicker>Documents gathered</Kicker>{data.context_docs.map((d: string) => <Chip key={d} tone="accent">{d}</Chip>)}{data.simulated_decomposition ? <Provenance kind="simulated" /> : <Provenance kind="llm" />}</div>
          <div className="rounded-xl border bg-background p-4"><Kicker className="mb-1.5">Answer</Kicker><AnswerView answer={data.answer} animate={false} /></div>
        </div>
      )}
    </DemoFrame>
  )
}

/* ── J · Agentic (LangGraph replay) ───────────────────────────────── */
const AG_NODES: FlowNode[] = [
  { id: "classify", label: "classify", x: 90, y: 125, tone: "generate", w: 120, h: 50 },
  { id: "retrieve_payments", label: "retrieve_payments", x: 300, y: 40, tone: "retrieve", w: 170, h: 46 }, { id: "retrieve_refunds", label: "retrieve_refunds", x: 300, y: 105, tone: "retrieve", w: 170, h: 46 },
  { id: "retrieve_settlements", label: "retrieve_settlements", x: 300, y: 170, tone: "retrieve", w: 170, h: 46 }, { id: "retrieve_general", label: "retrieve_general", x: 300, y: 235, tone: "retrieve", w: 170, h: 46 },
  { id: "rerank", label: "rerank", x: 500, y: 125, tone: "rerank", w: 110, h: 50 }, { id: "synthesize", label: "synthesize", x: 640, y: 125, tone: "generate", w: 120, h: 50 },
  { id: "verify", label: "verify", x: 780, y: 125, tone: "good", w: 100, h: 50 }, { id: "widen", label: "widen", x: 640, y: 245, tone: "bad", w: 100, h: 44 },
]
const AG_EDGES: FlowEdge[] = [
  ...["retrieve_payments", "retrieve_refunds", "retrieve_settlements", "retrieve_general"].flatMap((n) => [{ from: "classify", to: n }, { from: n, to: "rerank" }]),
  { from: "rerank", to: "synthesize" }, { from: "synthesize", to: "verify" }, { from: "verify", to: "widen", label: "fail", dashed: true }, { from: "widen", to: "retrieve_general", dashed: true, curve: 0.3 },
]
export function AgenticDemo() {
  const [q, setQ] = React.useState("Why did I receive ₹47,932 instead of ₹48,820 in my settlement?")
  const { data, loading, error, call } = useCall<Any>()
  const [i, setI] = React.useState(-1)
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const go = async (x = q) => {
    const r = await call("/api/agentic/run", { question: x })
    if (!r) return
    let k = 0; setI(0); timer.current && clearInterval(timer.current)
    timer.current = setInterval(() => { k += 1; if (k >= r.events.length) { timer.current && clearInterval(timer.current); return } setI(k) }, 900)
  }
  React.useEffect(() => () => { timer.current && clearInterval(timer.current) }, [])
  const path: string[] = data?.path ?? []
  const uiId = (n: string) => (n === "rerank_node" ? "rerank" : n)
  const visited = i >= 0 ? path.slice(0, i + 1).map(uiId) : []
  const active = i >= 0 ? [uiId(path[i])] : []
  const ev = data && i >= 0 ? data.events[i] : null
  return (
    <DemoFrame title="A LangGraph run, node by node">
      <Presets items={["Why did I receive ₹47,932 instead of ₹48,820 in my settlement?", "How do I issue a refund?", "What is the weather in Mumbai?"]} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /><RunButton onClick={() => go()} loading={loading}>Run graph</RunButton></div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-4 rounded-xl border bg-background p-3"><FlowDiagram nodes={AG_NODES} edges={AG_EDGES} width={900} height={290} active={active} visited={visited} minWidth={760} /></div>
      {data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5"><Kicker>Node log (state updates)</Kicker>{data.events.map((e: Any, k: number) => <div key={k} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-opacity", k <= i ? "bg-background" : "opacity-30")}><span className="font-mono text-[11px] text-primary">{e.node}</span><span className="min-w-0 flex-1 truncate text-muted-foreground">{e.summary}</span><span className="font-mono text-[10.5px] text-muted-foreground">{fmtMs(e.ms)}</span></div>)}
            {ev?.by && <p className="text-[11.5px] text-muted-foreground">classified by {ev.by}</p>}</div>
          <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Chip tone="accent">route: {data.category}</Chip><Chip tone={data.verdict.ok ? "success" : "danger"}>verify: {data.verdict.ok ? "pass" : "fail"} · grounding {(data.verdict.support * 100).toFixed(0)}%</Chip>{data.path.includes("widen") && <Chip tone="warning">retried with wider search</Chip>}</div>
            <div className="rounded-xl border bg-background p-4"><Kicker className="mb-1.5">Answer</Kicker><AnswerView answer={data.answer} animate={false} /></div></div>
        </div>
      )}
    </DemoFrame>
  )
}

/* ── K · Graph RAG (illustrative) ─────────────────────────────────── */
const G_NODES: FlowNode[] = [
  { id: "Payment", label: "Payment", x: 90, y: 60, tone: "retrieve", w: 100, h: 40 }, { id: "Order", label: "Order", x: 90, y: 170, tone: "retrieve", w: 100, h: 40 },
  { id: "Webhook", label: "Webhook", x: 270, y: 60, tone: "embed", w: 100, h: 40 }, { id: "Refund", label: "Refund", x: 270, y: 170, tone: "good", w: 100, h: 40 },
  { id: "Settlement", label: "Settlement", x: 470, y: 115, tone: "generate", w: 120, h: 44 }, { id: "Fee", label: "Platform fee", x: 660, y: 50, tone: "rerank", w: 120, h: 40 },
  { id: "GST", label: "GST 18%", x: 810, y: 115, tone: "rerank", w: 100, h: 40 }, { id: "Dispute", label: "Dispute", x: 660, y: 190, tone: "bad", w: 100, h: 40 },
]
const G_EDGES: (FlowEdge & { rel: string })[] = [
  { from: "Order", to: "Payment", rel: "has" }, { from: "Payment", to: "Webhook", rel: "emits" }, { from: "Payment", to: "Refund", rel: "may get" },
  { from: "Payment", to: "Settlement", rel: "settled in", curve: 0.3 }, { from: "Refund", to: "Settlement", rel: "deducted from" }, { from: "Settlement", to: "Fee", rel: "less" },
  { from: "Fee", to: "GST", rel: "taxed by" }, { from: "Settlement", to: "Dispute", rel: "held for" },
]
export function GraphDemo() {
  const [asked, setAsked] = React.useState(false)
  const hit = ["Settlement", "Refund", "Fee", "GST", "Dispute"]
  return (
    <DemoFrame title="Follow relationships, not just similar text">
      <p className="mb-2 text-[13.5px]">Question: <em>“Which things reduce a settlement?”</em> No single chunk lists them all, but the graph connects them.</p>
      <Button size="sm" onClick={() => setAsked((a) => !a)}>{asked ? "Reset" : "Traverse the graph from “Settlement”"}</Button>
      <div className="mt-3 rounded-xl border bg-background p-3"><FlowDiagram nodes={G_NODES} edges={G_EDGES.map((e) => ({ ...e, label: e.rel }))} width={900} height={250} active={asked ? hit : []} visited={asked ? hit : []} minWidth={760} /></div>
      {asked && <div className="mt-3 flex flex-wrap gap-2"><Chip tone="success">Refund: deducted from settlement</Chip><Chip tone="success">Platform fee: subtracted</Chip><Chip tone="success">GST: 18% on the fee</Chip><Chip tone="success">Dispute: amount held</Chip></div>}
      <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground"><Provenance kind="simulated" />A hand-drawn graph of the RAGPAY concepts to show the idea. A real Graph RAG builds it automatically from the documents with an LLM (see nano-graphrag / GraphRAG).</p>
    </DemoFrame>
  )
}

/* ── L · Multimodal (illustrative) ────────────────────────────────── */
const MODS = {
  Table: { raw: "[image of a fee table]", strat: "Layout parser → Markdown table → embed as text", out: "| Method | Fee |\n|---|---|\n| Cards | 2% |\n| Netbanking | 2.5% |", risk: "Flattened tables lose which number belongs to which row." },
  Chart: { raw: "[bar chart: settlements per week]", strat: "Vision LLM writes a caption + data summary → embed caption", out: "Bar chart of weekly settlements. Week 3 is lowest (₹31k) because of two refunds.", risk: "Captions can miss exact values; keep the source image for the answer step." },
  "Scanned page": { raw: "[photo of a printed receipt]", strat: "OCR → text; or embed the page image directly (ColPali)", out: "RECEIPT #4471  Total 2,499.00  UPI  2025-03-04", risk: "OCR errors on digits (0/O, 1/l) break exact-match search." },
  Diagram: { raw: "[architecture diagram]", strat: "Vision LLM describes nodes and arrows → text + keep image", out: "Client → API gateway → payments service → bank; webhooks return to the merchant server.", risk: "Relationships in diagrams are easy to mis-describe." },
} as const
export function MultimodalDemo() {
  const [m, setM] = React.useState<keyof typeof MODS>("Table")
  const d = MODS[m]
  return (
    <DemoFrame title="What do we embed when the knowledge is not text?">
      <Presets items={Object.keys(MODS)} active={m} onPick={(s) => setM(s as keyof typeof MODS)} />
      <div className="mt-4 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.2fr]">
        <div className="rounded-xl border bg-background p-3.5"><Kicker className="mb-1.5">In the document</Kicker><div className="grid h-24 place-items-center rounded-lg border border-dashed font-mono text-[11.5px] text-muted-foreground">{d.raw}</div></div>
        <span className="hidden place-self-center text-primary md:block">→</span>
        <div className="rounded-xl border bg-background p-3.5"><Kicker className="mb-1.5">Strategy</Kicker><p className="text-[13px] leading-relaxed">{d.strat}</p></div>
        <span className="hidden place-self-center text-primary md:block">→</span>
        <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-3.5"><Kicker className="mb-1.5">What gets indexed</Kicker><pre className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{d.out}</pre></div>
      </div>
      <Callout tone="warn" title="Watch out"><span className="text-[13.5px]">{d.risk}</span></Callout>
      <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground"><Provenance kind="simulated" />Illustrative examples. The PDF → Markdown path is real in lesson 02; Docling and ColPali are the heavier tools for tables and page images.</p>
    </DemoFrame>
  )
}

export const ADV_DEMOS: Record<string, React.ComponentType> = {
  basic: BasicDemo, chunking: ChunkingCompareDemo, metadata: MetadataDemo, hybrid: () => <HybridDemo focus="hybrid" />, bm25: () => <HybridDemo focus="bm25" />,
  rerank: RerankDemo, rewrite: () => <RewriteDemo mode="rewrite" />, multi: () => <RewriteDemo mode="multi" />, multihop: MultihopDemo, agentic: AgenticDemo, graph: GraphDemo, multimodal: MultimodalDemo,
}
export { Spinner }
