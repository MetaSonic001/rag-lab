"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { POLICY_EXCERPT } from "@/content/sample"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { VectorPlot, type PlotPoint } from "@/components/viz/vector-plot"
import { DemoFrame, ErrorNote, Labeled, Presets, RunButton } from "@/components/demos/parts"

/* ── 01 Documents ────────────────────────────────────────────────────── */
const FORMATS = {
  PDF: { human: "A two-column page with a footer, page number and a table.", machine: "Attendance Policy 2025-26  Page 3 of 9\nCourse type Minimum Theory 75% Lab 80%\nGreenfield Institute ©", keeps: 0.35, note: "Layout is lost. Headers, footers and tables mix into the text." },
  "Web page": { human: "A page with a menu, cookie banner and an article.", machine: "<nav>Home Login</nav><div class=\"cookie\">Accept</div><h2>Attendance</h2><p>Minimum <b>75%</b> …</p>", keeps: 0.55, note: "Structure exists but is buried in markup noise." },
  Markdown: { human: "Clean headings and lists.", machine: "## 2. Minimum attendance requirement\nA student must attend at least **75%** …", keeps: 0.95, note: "Ideal: headings become natural chunk boundaries and citations." },
  Code: { human: "A config file and a docstring.", machine: "MIN_ATTENDANCE = 0.75  # theory\nLAB_MIN = 0.80\ndef eligible(pct): ...", keeps: 0.7, note: "Meaning lives in names and structure; chunk by function, not by character." },
} as const

export function DocumentsDemo() {
  const [f, setF] = React.useState<keyof typeof FORMATS>("PDF")
  const cur = FORMATS[f]
  return (
    <DemoFrame title="One fact, four formats">
      <Presets items={Object.keys(FORMATS)} onPick={(s) => setF(s as keyof typeof FORMATS)} active={f} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Labeled label="What a human sees"><div className="min-h-24 rounded-lg border bg-background p-3 text-sm">{cur.human}</div></Labeled>
        <Labeled label="What the machine receives"><pre className="min-h-24 rounded-lg border bg-background p-3 font-mono text-[12px] whitespace-pre-wrap">{cur.machine}</pre></Labeled>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="w-32 text-xs text-muted-foreground">Structure preserved</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${cur.keeps * 100}%` }} /></div>
        <span className="w-10 text-right font-mono text-xs">{Math.round(cur.keeps * 100)}%</span>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{cur.note} <Provenance kind="simulated" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── 02 Extraction ───────────────────────────────────────────────────── */
export function ExtractionDemo() {
  const [smart, setSmart] = React.useState(false)
  const naive = "Course type Minimum Theory 75% Lab 80% Make-up sessions 2 Condonation fee Rs. 500"
  const good = "| Course type | Minimum |\n|---|---|\n| Theory | 75% |\n| Lab | 80% |\n\n| Item | Value |\n|---|---|\n| Make-up sessions | 2 |\n| Condonation fee | Rs. 500 |"
  return (
    <DemoFrame title="Naive vs layout-aware extraction">
      <label className="mb-4 flex items-center gap-3 text-sm"><Switch checked={smart} onCheckedChange={setSmart} /> Layout-aware extraction (PyMuPDF4LLM / Docling)</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Extracted text"><pre className={cn("min-h-40 rounded-lg border bg-background p-3 font-mono text-[12px] whitespace-pre-wrap", smart && "border-good/40")}>{smart ? good : naive}</pre></Labeled>
        <Labeled label="Can you answer: “What does the lab need?”">
          <div className="min-h-40 rounded-lg border bg-background p-3 text-sm">
            {smart ? <p><span className="text-good">Clear.</span> The row “Lab | 80%” keeps the label attached to the number.</p>
              : <p><span className="text-bad">Ambiguous.</span> “Lab 80% Make-up sessions 2”: a model might read 80% as belonging to make-up sessions, or 2 as the lab requirement.</p>}
          </div>
        </Labeled>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">Illustration of the effect. The real PDF → Markdown output is shown in lesson 02. <Provenance kind="simulated" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── 03 Tokens ───────────────────────────────────────────────────────── */
const SUFFIXES = ["ing", "tion", "ment", "able", "ness", "ed", "ly", "es", "s"]
export function approxTokens(text: string): string[] {
  const out: string[] = []
  for (const m of text.match(/\s?[A-Za-z]+|\s?\d{1,3}|\s+|[^\sA-Za-z\d]/g) ?? []) {
    const lead = m.match(/^\s/) ? " " : ""
    let w = m.trim()
    if (!w) { if (m.includes("\n")) out.push("\\n"); continue }
    if (!/[A-Za-z]/.test(w) || w.length <= 5) { out.push(lead + w); continue }
    const suf = SUFFIXES.find((s) => w.endsWith(s) && w.length - s.length >= 3)
    if (suf) w = w.slice(0, -suf.length)
    const parts: string[] = []
    for (let i = 0; i < w.length; i += 5) parts.push(w.slice(i, i + 5))
    if (suf) parts.push(suf)
    parts.forEach((p, i) => out.push((i === 0 ? lead : "") + p))
  }
  return out
}
const TOKEN_TINTS = ["bg-retrieve/25", "bg-generate/25", "bg-good/25", "bg-rerank/25", "bg-embed/25", "bg-primary/25"]

export function TokensDemo() {
  const [text, setText] = React.useState("Refunds are unbelievably slow when the bank is closed on weekends.")
  const toks = approxTokens(text)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return (
    <DemoFrame title="Watch text turn into tokens">
      <Labeled label="Type anything"><Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 font-mono text-[13px]" /></Labeled>
      <div className="mt-4 flex flex-wrap gap-y-1.5 rounded-lg border bg-background p-3 font-mono text-[13px] leading-8">
        {toks.map((t, i) => <span key={i} className={cn("rounded-[4px] px-[1px]", TOKEN_TINTS[i % TOKEN_TINTS.length])}>{t.replace(/ /g, " ")}</span>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <Chip tone="accent">{toks.length} tokens</Chip><Chip>{words} words</Chip><Chip>{text.length} characters</Chip>
        <Chip tone="warning">≈ {words ? (toks.length / words).toFixed(2) : "0"} tokens per word</Chip>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">A teaching approximation (short common words stay whole, long words split into pieces). Real tokenizers such as BPE split differently, but the intuition holds. <Provenance kind="simulated" className="ml-1" /></p>
    </DemoFrame>
  )
}

/* ── 04 Chunking ─────────────────────────────────────────────────────── */
function fixedChunks(text: string, size: number, overlap: number) {
  const step = Math.max(size - overlap, 1)
  const out: { start: number; end: number }[] = []
  for (let i = 0; i < text.length; i += step) out.push({ start: i, end: Math.min(i + size, text.length) })
  return out
}
export function ChunkingDemo() {
  const [size, setSize] = React.useState(220)
  const [overlap, setOverlap] = React.useState(0)
  const [structure, setStructure] = React.useState(false)
  const text = POLICY_EXCERPT
  const chunks = React.useMemo(() => {
    if (!structure) return fixedChunks(text, size, overlap)
    const out: { start: number; end: number }[] = []
    let pos = 0
    for (const part of text.split(/(?=^## )/m)) { out.push({ start: pos, end: pos + part.length }); pos += part.length }
    return out
  }, [text, size, overlap, structure])
  const midCuts = chunks.slice(1).filter((c) => !/[.\n]\s*$/.test(text.slice(Math.max(c.start - 2, 0), c.start + 1)) && !/^\s*\n?#{2}/.test(text.slice(c.start, c.start + 3))).length
  const cutAt = new Set(chunks.slice(1).map((c) => c.start))
  const ovAt = new Set<number>()
  if (!structure && overlap) chunks.slice(1).forEach((c) => { for (let i = c.start; i < Math.min(c.start + overlap, text.length); i++) ovAt.add(i) })
  const tints = ["bg-retrieve/15", "bg-generate/15"]
  const rendered: React.ReactNode[] = []
  let cur = 0
  chunks.forEach((c, ci) => {
    if (c.end <= cur) return
    const s = Math.max(c.start, cur)
    rendered.push(<span key={ci} className={cn(tints[ci % 2], "rounded-sm")}>{[...text.slice(s, c.end)].map((ch, i) => <span key={i} className={ovAt.has(s + i) ? "bg-primary/35" : undefined}>{ch}</span>)}</span>)
    if (cutAt.has(c.end - (overlap && !structure ? overlap : 0))) rendered.push(<span key={`c${ci}`} className="mx-px text-primary select-none">✂</span>)
    cur = c.end
  })
  return (
    <DemoFrame title="Slice a real policy">
      <div className="grid gap-5 sm:grid-cols-2">
        <Labeled label={`Chunk size: ${size} characters`} right={structure ? <span className="text-[11px] text-muted-foreground">ignored in heading mode</span> : null}><Slider value={[size]} min={80} max={700} step={10} onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)} disabled={structure} /></Labeled>
        <Labeled label={`Overlap: ${overlap} characters`}><Slider value={[overlap]} min={0} max={Math.floor(size / 2)} step={5} onValueChange={(v) => setOverlap(Array.isArray(v) ? v[0] : v)} disabled={structure} /></Labeled>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm"><Switch checked={structure} onCheckedChange={setStructure} /> Split by document structure (one chunk per heading)</label>
      <div className="scrollbar-thin mt-4 max-h-64 overflow-auto rounded-lg border bg-background p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">{rendered}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <Chip tone="accent">{chunks.length} chunks</Chip>
        <Chip>avg {Math.round(chunks.reduce((a, c) => a + (c.end - c.start), 0) / chunks.length)} chars</Chip>
        <Chip tone={midCuts ? "danger" : "success"}>{midCuts} cut{midCuts === 1 ? "" : "s"} mid-sentence</Chip>
        {overlap > 0 && !structure && <Chip tone="warning">orange = repeated by overlap</Chip>}
        <Provenance kind="real" className="ml-auto" />
      </div>
    </DemoFrame>
  )
}

/* ── 05 Embeddings (real, via backend) ───────────────────────────────── */
type EmbedRes = { texts: string[]; dims: number; points: number[][]; similarity: number[][]; first_values: number[][] }
const MAP_DEFAULT = ["How do I get a refund?", "Where is my money back?", "My refund has not arrived", "What is the minimum attendance?", "Do I need 75% to write exams?", "Lab sessions need 80% attendance", "Office parking rules", "Where can I park my bike?"]

export function EmbeddingsDemo() {
  const [text, setText] = React.useState(MAP_DEFAULT.join("\n"))
  const [res, setRes] = React.useState<EmbedRes | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [sel, setSel] = React.useState(0)
  const run = async () => {
    setLoading(true); setErr(null)
    try { setRes(await api<EmbedRes>("/api/lab/embed", { texts: text.split("\n"), model: "minilm" })); setSel(0) }
    catch (e) { setErr(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }
  React.useEffect(() => { run() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])
  const pts: PlotPoint[] = res ? res.points.map((p, i) => ({ id: i, x: p[0], y: p[1], label: res.texts[i], kind: i === sel ? "hit" : "chunk", rank: i + 1 })) : []
  return (
    <DemoFrame title="Draw your own map of meaning">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Labeled label="One sentence per line (max 24)"><Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-44 text-[13px]" /></Labeled>
          <div className="flex items-center gap-3"><RunButton onClick={run} loading={loading}>Embed & plot</RunButton><Provenance kind="real" /></div>
          {err && <ErrorNote>{err}</ErrorNote>}
        </div>
        <div>
          <VectorPlot points={pts} height={280} onHover={(p) => p && setSel(Number(p.id))} />
          {res && (
            <div className="mt-3 rounded-lg border bg-background p-3 text-[12px]">
              <div className="mb-1 text-muted-foreground">#{sel + 1} “{res.texts[sel]}” → {res.dims} numbers, first 8:</div>
              <div className="font-mono text-foreground/90">[{res.first_values[sel].join(", ")}, …]</div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">The 384 numbers per sentence are squashed to 2-D (PCA) so we can draw them. Refund sentences cluster together, attendance sentences together, parking apart, with no shared keywords required.</p>
    </DemoFrame>
  )
}

/* ── 06 Similarity (real) ────────────────────────────────────────────── */
const PAIRS = [
  ["How do I get a refund?", "Where is my money back?"],
  ["The exam is on Monday", "The exam is not on Monday"],
  ["How do I get a refund?", "Office parking rules"],
  ["Minimum attendance is 75%", "You must attend 75 percent of classes"],
]
export function SimilarityDemo() {
  const [a, setA] = React.useState(PAIRS[0][0])
  const [b, setB] = React.useState(PAIRS[0][1])
  const [score, setScore] = React.useState<number | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const run = React.useCallback(async (x = a, y = b) => {
    setLoading(true); setErr(null)
    try { const r = await api<EmbedRes>("/api/lab/embed", { texts: [x, y], model: "minilm" }); setScore(r.similarity[0][1]) }
    catch (e) { setErr(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }, [a, b])
  React.useEffect(() => { run() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])
  const band = score === null ? "" : score > 0.6 ? "very similar meaning" : score > 0.35 ? "related" : score > 0.15 ? "weakly related" : "unrelated"
  return (
    <DemoFrame title="Score any two sentences">
      <Presets items={PAIRS.map((p) => `${p[0]} ↔ ${p[1]}`)} onPick={(s) => { const p = PAIRS.find((q) => `${q[0]} ↔ ${q[1]}` === s)!; setA(p[0]); setB(p[1]); run(p[0], p[1]) }} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Labeled label="Sentence A"><Textarea value={a} onChange={(e) => setA(e.target.value)} className="min-h-16 text-[13px]" /></Labeled>
        <Labeled label="Sentence B"><Textarea value={b} onChange={(e) => setB(e.target.value)} className="min-h-16 text-[13px]" /></Labeled>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <RunButton onClick={() => run()} loading={loading}>Compare</RunButton>
        {score !== null && (
          <div className="flex flex-1 items-center gap-3">
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <motion.div className="h-full rounded-full bg-embed" animate={{ width: `${Math.max(score, 0) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="font-mono text-lg">{score.toFixed(2)}</span><span className="text-sm text-muted-foreground">{band}</span>
          </div>
        )}
        <Provenance kind="real" />
      </div>
      {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}
      <p className="mt-3 text-[13px] text-muted-foreground">Notice the second pair: opposite meaning, yet a high score. Embeddings capture <em>topic</em> similarity, not logic. That is why retrieval is not the same as understanding.</p>
    </DemoFrame>
  )
}
