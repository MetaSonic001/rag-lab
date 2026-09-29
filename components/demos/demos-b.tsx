"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useLab } from "@/lib/lab"
import { QUESTION_PRESETS } from "@/content/sample"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { VectorPlot, type PlotPoint } from "@/components/viz/vector-plot"
import { AnswerView, ChunkCard, Cited, labSources } from "@/components/viz/rag-parts"
import { DemoFrame, ErrorNote, Labeled, Presets, RunButton } from "@/components/demos/parts"

/* ── 07 Vector database: real nearest-neighbour math on synthetic points ─ */
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296) }
const N_POINTS = 420
const GRID = 8
export function VectorDbDemo() {
  const points = React.useMemo(() => {
    const r = rng(7)
    const centers = [[0.2, 0.25], [0.75, 0.3], [0.5, 0.75], [0.15, 0.8], [0.85, 0.8]]
    return Array.from({ length: N_POINTS }, (_, i) => { const c = centers[i % centers.length]; return { id: i, x: c[0] + (r() - 0.5) * 0.28 + (r() - 0.5) * 0.1, y: c[1] + (r() - 0.5) * 0.28 + (r() - 0.5) * 0.1 } })
  }, [])
  const [q, setQ] = React.useState({ x: 0.55, y: 0.45 })
  const [k, setK] = React.useState(5)
  const grid = React.useMemo(() => {
    const g: number[][] = Array.from({ length: GRID * GRID }, () => [])
    points.forEach((p, i) => g[Math.min(GRID - 1, Math.max(0, Math.floor(p.y * GRID))) * GRID + Math.min(GRID - 1, Math.max(0, Math.floor(p.x * GRID)))].push(i))
    return g
  }, [points])
  const dist = (i: number) => Math.hypot(points[i].x - q.x, points[i].y - q.y)
  const exact = points.map((_, i) => i).sort((a, b) => dist(a) - dist(b)).slice(0, k)
  // ring-by-ring grid search: an "index" that avoids comparing with every point
  let checked = 0
  const cand: number[] = []
  const qc = [Math.min(GRID - 1, Math.max(0, Math.floor(q.x * GRID))), Math.min(GRID - 1, Math.max(0, Math.floor(q.y * GRID)))]
  for (let ring = 0; ring <= GRID; ring++) {
    for (let gy = qc[1] - ring; gy <= qc[1] + ring; gy++) for (let gx = qc[0] - ring; gx <= qc[0] + ring; gx++) {
      if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue
      if (Math.max(Math.abs(gx - qc[0]), Math.abs(gy - qc[1])) !== ring) continue
      grid[gy * GRID + gx].forEach((i) => { cand.push(i); checked++ })
    }
    if (cand.length >= k) { const kth = cand.map(dist).sort((a, b) => a - b)[k - 1]; if (kth <= ring / GRID) break }
  }
  const approx = cand.sort((a, b) => dist(a) - dist(b)).slice(0, k)
  const overlap = approx.filter((i) => exact.includes(i)).length
  const pts: PlotPoint[] = [
    ...points.map((p) => ({ id: p.id, x: p.x, y: 1 - p.y, kind: (approx.includes(p.id) ? "hit" : "chunk") as PlotPoint["kind"], rank: approx.includes(p.id) ? approx.indexOf(p.id) + 1 : undefined })),
    { id: "q", x: q.x, y: 1 - q.y, kind: "query" },
  ]
  return (
    <DemoFrame title="Nearest neighbours, visibly">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative cursor-crosshair" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setQ({ x: Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width)), y: Math.min(0.98, Math.max(0.02, 1 - (e.clientY - r.top) / r.height)) }) }}>
          <VectorPlot points={pts} height={320} />
          <div className="pointer-events-none absolute top-2 left-3 rounded bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">click anywhere to move the question</div>
        </div>
        <div className="space-y-4">
          <Labeled label={`K = ${k} nearest`}><Slider value={[k]} min={1} max={15} onValueChange={(v) => setK(Array.isArray(v) ? v[0] : v)} /></Labeled>
          <div className="space-y-2 rounded-xl border bg-background p-3.5 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Brute force (compare with all)</span><span className="font-mono">{N_POINTS} distances</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Grid index (search nearby cells)</span><span className="font-mono text-good">{checked} distances</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Same answer as brute force</span><span className="font-mono">{overlap}/{k}</span></div>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">Real vector databases use smarter indexes (HNSW graphs, IVF clusters) but the trick is the same: look only where the answer can be. Points here are synthetic. <Provenance kind="real" className="ml-1" /></p>
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── 08 Retrieval (real) ─────────────────────────────────────────────── */
export function RetrievalDemo() {
  const { result, loading, error, run } = useLab()
  const [q, setQ] = React.useState(QUESTION_PRESETS[0])
  const [retriever, setRetriever] = React.useState<"vector" | "bm25" | "hybrid">("vector")
  const go = (question = q, r = retriever) => run(question, { retriever: r, top_k: 3, generate: false, chunk_strategy: "heading", chunk_size: 500, chunk_overlap: 0 })
  React.useEffect(() => { go() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])
  return (
    <DemoFrame title="What does retrieval actually return?">
      <Presets items={QUESTION_PRESETS} active={q} onPick={(s) => { setQ(s); go(s) }} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className="min-w-64 flex-1" />
        <ToggleGroup value={[retriever]} onValueChange={(v) => { const n = (v[0] ?? retriever) as typeof retriever; setRetriever(n); go(q, n) }} variant="outline" size="sm">
          <ToggleGroupItem value="vector">Meaning</ToggleGroupItem><ToggleGroupItem value="bm25">Keywords</ToggleGroupItem><ToggleGroupItem value="hybrid">Both</ToggleGroupItem>
        </ToggleGroup>
        <RunButton onClick={() => go()} loading={loading}>Retrieve</RunButton>
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {result?.candidates.slice(0, 3).map((c, i) => <ChunkCard key={c.chunk.id + retriever} c={c} index={i} />)}
      </div>
      {result && <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground"><Provenance kind="real" /> {result.stats.chunks} chunks searched in {Math.round(result.latency_ms.retrieval)} ms</div>}
    </DemoFrame>
  )
}

/* ── 09 Context budget ───────────────────────────────────────────────── */
export function ContextDemo() {
  const [k, setK] = React.useState(4)
  const [size, setSize] = React.useState(500)
  const [win, setWin] = React.useState("8192")
  const W = Number(win)
  const sys = 120, question = 20, answer = 400
  const ctx = Math.round((k * size) / 4)
  const used = sys + ctx + question
  const free = Math.max(W - used - answer, 0)
  const seg = [{ l: "System prompt", v: sys, c: "var(--generate)" }, { l: `Context (${k} × ${size} chars)`, v: ctx, c: "var(--retrieve)" }, { l: "Question", v: question, c: "var(--primary)" }, { l: "Reserved for answer", v: answer, c: "var(--good)" }]
  const cost = (used / 1_000_000) * 0.15
  return (
    <DemoFrame title="Spend your token budget">
      <div className="grid gap-5 sm:grid-cols-3">
        <Labeled label={`Top-K: ${k}`}><Slider value={[k]} min={1} max={20} onValueChange={(v) => setK(Array.isArray(v) ? v[0] : v)} /></Labeled>
        <Labeled label={`Chunk size: ${size} chars`}><Slider value={[size]} min={100} max={2000} step={50} onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)} /></Labeled>
        <Labeled label="Context window"><ToggleGroup value={[win]} onValueChange={(v) => v[0] && setWin(v[0])} variant="outline" size="sm"><ToggleGroupItem value="4096">4k</ToggleGroupItem><ToggleGroupItem value="8192">8k</ToggleGroupItem><ToggleGroupItem value="32768">32k</ToggleGroupItem></ToggleGroup></Labeled>
      </div>
      <div className="mt-5 flex h-9 overflow-hidden rounded-lg border bg-foreground/5">
        {seg.map((s) => <div key={s.l} title={`${s.l}: ${s.v} tokens`} style={{ width: `${Math.min((s.v / W) * 100, 100)}%`, background: s.c }} className="h-full transition-all duration-500" />)}
        <div className="flex-1" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {seg.map((s) => <span key={s.l} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: s.c }} />{s.l} <span className="font-mono text-foreground/80">{s.v}</span></span>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
        <Chip tone={free === 0 ? "danger" : "accent"}>{used} of {W} tokens used</Chip>
        <Chip>{free} tokens free</Chip><Chip tone="warning">≈ ${cost.toFixed(5)} input per question at $0.15 / 1M</Chip>
        {free === 0 && <span className="text-bad">Over budget: the model would truncate your context.</span>}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">Rough estimate: 1 token ≈ 4 characters. The price is a placeholder to show the shape of the trade-off. <Provenance kind="simulated" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── 10 Prompting (real) ─────────────────────────────────────────────── */
export function PromptingDemo() {
  const { result, loading, error, run } = useLab()
  const [prompt, setPrompt] = React.useState<"naive" | "strict">("naive")
  const q = "How many make-up sessions are allowed, and what is the fee for a late make-up session?"
  const go = (p = prompt) => run(q, { prompt: p, top_k: 3, chunk_strategy: "heading", chunk_size: 500, chunk_overlap: 0 })
  return (
    <DemoFrame title="Same context, different prompt">
      <p className="mb-3 text-[13px] text-muted-foreground">The policy says how many make-up sessions exist (2) but <strong>never mentions a fee</strong>. Which prompt admits that?</p>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup value={[prompt]} onValueChange={(v) => { const n = (v[0] ?? prompt) as typeof prompt; setPrompt(n); go(n) }} variant="outline" size="sm">
          <ToggleGroupItem value="naive">Loose prompt</ToggleGroupItem><ToggleGroupItem value="strict">Grounded prompt</ToggleGroupItem>
        </ToggleGroup>
        <RunButton onClick={() => go()} loading={loading}>Ask</RunButton>
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {result?.answer && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-background p-4"><Labeled label="Answer"><AnswerView answer={result.answer} sources={labSources(result)} animate={false} /></Labeled></div>
          <Labeled label="System prompt sent to the model"><pre className="scrollbar-thin max-h-56 overflow-auto rounded-xl border bg-background p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{result.answer.messages?.[0]?.content.split("Context:")[0].split("\n\n[1]")[0]}…</pre></Labeled>
        </div>
      )}
    </DemoFrame>
  )
}

/* ── 11 LLM with / without context (real) ────────────────────────────── */
export function LlmDemo() {
  const a = useLab(), b = useLab()
  const q = "What is the minimum attendance required to write exams at Greenfield Institute of Technology?"
  const go = () => { a.run(q, { prompt: "none", top_k: 3 }); b.run(q, { prompt: "strict", top_k: 3 }) }
  const loading = a.loading || b.loading
  return (
    <DemoFrame title="Ask the model with and without context">
      <div className="mb-3 flex flex-wrap items-center gap-3"><span className="rounded-lg border bg-background px-3 py-1.5 text-[13px]">“{q}”</span><RunButton onClick={go} loading={loading}>Ask both</RunButton></div>
      <div className="grid gap-4 md:grid-cols-2">
        {[{ t: "No retrieval", s: a, tone: "bad" }, { t: "With retrieval (RAG)", s: b, tone: "good" }].map(({ t, s, tone }) => (
          <div key={t} className={cn("rounded-xl border p-4", tone === "good" ? "border-good/30 bg-good/[0.05]" : "border-bad/30 bg-bad/[0.04]")}>
            <div className="mb-2 font-mono text-[10.5px] tracking-[0.14em] uppercase">{t}</div>
            {s.error && <ErrorNote>{s.error}</ErrorNote>}
            {s.result?.answer ? (s.result.answer.mode === "llm" ? <AnswerView answer={s.result.answer} sources={labSources(s.result)} animate={false} /> :
              tone === "bad" ? <p className="text-sm text-muted-foreground">Needs a Groq key to show what a bare model says. Add <code>GROQ_API_KEY</code> to <code>.env</code>.</p> : <AnswerView answer={s.result.answer} sources={labSources(s.result)} animate={false} />)
              : <p className="text-sm text-muted-foreground">Press “Ask both”.</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">This college does not exist outside our bundled document. Without retrieval the model can only guess or refuse.</p>
    </DemoFrame>
  )
}

/* ── 12 Citations (real) ─────────────────────────────────────────────── */
export function CitationsDemo() {
  const { result, loading, error, run } = useLab()
  const [q, setQ] = React.useState("Can I get condonation if I have 70% attendance, and what does it cost?")
  const [open, setOpen] = React.useState<number | null>(null)
  const go = () => run(q, { top_k: 3, chunk_strategy: "heading", chunk_size: 500, chunk_overlap: 0 }).then(() => setOpen(null))
  React.useEffect(() => { go() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])
  const srcs = result ? labSources(result) : []
  const sel = result?.candidates.filter((c) => c.selected) ?? []
  return (
    <DemoFrame title="Click a citation, inspect the evidence">
      <div className="mb-3 flex gap-3"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className="flex-1" /><RunButton onClick={go} loading={loading}>Ask</RunButton></div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {result?.answer && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border bg-background p-4">
            <div className="mb-2 flex items-center gap-2"><Provenance kind={result.answer.mode === "llm" ? "llm" : "extractive"} /></div>
            <div className="text-[15px] leading-relaxed">
              {result.answer.answer.split(/(\[\d+\])/g).map((p, i) => {
                const m = p.match(/^\[(\d+)\]$/)
                return m ? <button key={i} onClick={() => setOpen(+m[1])} className={cn("mx-0.5 rounded px-1 py-px align-super font-mono text-[10px] font-semibold transition-colors", open === +m[1] ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary hover:bg-primary/30")}>{m[1]}</button> : <React.Fragment key={i}>{p}</React.Fragment>
              })}
            </div>
          </div>
          <div className="space-y-2">
            {sel.map((c, i) => (
              <div key={c.chunk.id} className={cn("rounded-xl border p-3 text-[12.5px] transition-all", open === i + 1 ? "border-primary/50 bg-primary/[0.06]" : "bg-card opacity-80")}>
                <div className="mb-1 flex items-center gap-2 font-mono text-[11px]"><span className="grid size-5 place-items-center rounded bg-primary/15 text-primary">{i + 1}</span>{c.chunk.doc_id} <span className="text-muted-foreground">§ {c.chunk.section}</span></div>
                <p className="line-clamp-4 leading-relaxed text-foreground/80">{c.chunk.text.replace(/^.*?>.*?\n/, "")}</p>
              </div>
            ))}
            {!sel.length && <Cited text="" sources={srcs} />}
          </div>
        </div>
      )}
    </DemoFrame>
  )
}
