"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, ChevronRight, FileUp, FileText, Play, RotateCcw, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Callout, ErrorNote, Kicker, Panel, Provenance } from "@/components/kit/scaffold"
import { CodeBlock } from "@/components/kit/code-block"
import { Chip } from "@/components/kit/hero"
import { Term } from "@/components/kit/term"
import { VectorPlot, type PlotPoint } from "@/components/viz/vector-plot"
import { ScoreBar, fmtMs, Spinner, Cited } from "@/components/viz/rag-parts"
import { Simple, Technical } from "@/lib/mode"

type StepName = "load" | "chunk" | "embed" | "store" | "retrieve" | "prompt" | "generate"
const STAGES: { id: StepName; title: string; verb: string; tool: string; simple: string; tech: string; code: string; hl?: number[] }[] = [
  { id: "load", title: "Load", verb: "PDF → text", tool: "PyMuPDF4LLM", simple: "Open the file and pull out its text, keeping headings and lists so meaning is not lost.", tech: "Layout-aware PDF → Markdown. Headings survive as `##`, which later become chunk boundaries and citations.",
    code: `import pymupdf, pymupdf4llm\n\ndoc = pymupdf.open(stream=data, filetype="pdf")\ntext = pymupdf4llm.to_markdown(doc)   # PDF -> Markdown`, hl: [4] },
  { id: "chunk", title: "Chunk", verb: "text → pieces", tool: "plain Python", simple: "Cut the text into small overlapping pieces, like index cards that repeat a few words at the edges.", tech: "Fixed-size sliding window. Overlap prevents facts at a boundary from being split across two chunks.",
    code: `step = size - overlap\nchunks = [text[i : i + size] for i in range(0, len(text), step)]`, hl: [1, 2] },
  { id: "embed", title: "Embed", verb: "pieces → vectors", tool: "Sentence Transformers", simple: "Turn every piece into a fingerprint of numbers that captures its meaning.", tech: "all-MiniLM-L6-v2 bi-encoder → 384-d L2-normalised vectors. The map on the right is a 2-D PCA projection of them.",
    code: `from sentence_transformers import SentenceTransformer\n\nmodel = SentenceTransformer("all-MiniLM-L6-v2")\nvectors = model.encode(chunks, normalize_embeddings=True)  # (n, 384)`, hl: [4] },
  { id: "store", title: "Store", verb: "vectors → index", tool: "NumPy array", simple: "Keep the fingerprints somewhere we can search. In this lesson “the database” is just a table of numbers in memory.", tech: "A dense (n × d) matrix is the simplest possible vector store. Vector DBs add ANN indexes, persistence and metadata filters.",
    code: `store = vectors            # shape (n_chunks, 384)\n# That's it. A vector database is this plus an index,\n# persistence and filters.`, hl: [1] },
  { id: "retrieve", title: "Retrieve", verb: "question → top-K", tool: "dot product", simple: "Turn the question into numbers too, then find the pieces whose numbers are closest.", tech: "Cosine similarity = dot product on normalised vectors. One matrix–vector multiply ranks every chunk.",
    code: `q = model.encode(question, normalize_embeddings=True)\nscores = store @ q                 # cosine similarity\ntop = np.argsort(-scores)[:k]`, hl: [2, 3] },
  { id: "prompt", title: "Prompt", verb: "pieces → prompt", tool: "string template", simple: "Paste the best pieces into a message with clear rules for the AI: answer only from these, and cite them.", tech: "System prompt with numbered context and a refusal instruction; retrieved text is marked as data, not instructions.",
    code: `system = RULES.format(context="\\n\\n".join(f"[{i}] {c}" for i, c in enumerate(top_chunks, 1)))\nmessages = [{"role": "system", "content": system},\n            {"role": "user", "content": question}]`, hl: [1] },
  { id: "generate", title: "Generate", verb: "prompt → answer", tool: "GroqCloud", simple: "The language model reads the prompt and writes the answer. We then show which pieces it used.", tech: "Groq chat completion (model set in .env). Citations [n] are parsed and mapped back to the retrieved chunks.",
    code: `reply = client.chat.completions.create(model=MODEL, messages=messages, temperature=0.1)\nanswer = reply.choices[0].message.content\nsources = parse_citations(answer, len(top_chunks))`, hl: [1] },
]

type Out = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export function BuildLab() {
  const [source, setSource] = React.useState("sample")
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<string | null>(null)
  const [outs, setOuts] = React.useState<Partial<Record<StepName, Out>>>({})
  const [active, setActive] = React.useState<StepName>("load")
  const [running, setRunning] = React.useState<StepName | "all" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [size, setSize] = React.useState(500)
  const [overlap, setOverlap] = React.useState(80)
  const [k, setK] = React.useState(3)
  const [question, setQuestion] = React.useState("Can I get condonation if I have 70% attendance?")
  const [samples, setSamples] = React.useState<string[]>([])
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [loaders, setLoaders] = React.useState<Record<string, { label: string; note: string; available: boolean }>>({})
  const [loader, setLoader] = React.useState("pymupdf4llm")
  const [url, setUrl] = React.useState("")
  const [crawling, setCrawling] = React.useState(false)

  React.useEffect(() => { api<Record<string, { label: string; note: string; available: boolean }>>("/api/basic/loaders").then(setLoaders).catch(() => {}) }, [])
  React.useEffect(() => { api<{ questions: string[] }>("/api/basic/sample").then((s) => setSamples(s.questions)).catch(() => {}) }, [])

  const call = React.useCallback(async (step: StepName, sess: string | null) => {
    const r = await api<{ session: string; output: Out }>("/api/basic/step", { session: sess, step, source, question, size, overlap, k, model: "minilm" })
    setSession(r.session)
    setOuts((o) => ({ ...o, [step]: r.output }))
    return r.session
  }, [source, question, size, overlap, k])

  const runOne = async (step: StepName) => {
    setRunning(step); setError(null)
    try { await call(step, step === "load" ? null : session); setActive(step) }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setRunning(null) }
  }
  const runAll = async () => {
    setRunning("all"); setError(null); setOuts({})
    try { let s: string | null = null; for (const st of STAGES) { s = await call(st.id, st.id === "load" ? null : s); setActive(st.id) } }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setRunning(null) }
  }
  const reset = () => { setOuts({}); setSession(null); setActive("load"); setError(null) }
  const upload = async (f: File) => {
    setError(null)
    try {
      const fd = new FormData(); fd.append("file", f); fd.append("loader", loader)
      const r = await api<{ source: string; name: string; loader: string; characters: number }>("/api/basic/upload", fd)
      setSource(r.source); setFileName(`${r.name} (${r.loader})`); reset()
    } catch (e) { setError(e instanceof Error ? e.message : "upload failed") }
  }

  const crawl = async () => {
    setCrawling(true); setError(null)
    try { const r = await api<{ source: string; name: string; loader: string }>("/api/basic/crawl", { url }); setSource(r.source); setFileName(`${r.name} (${r.loader})`); reset() }
    catch (e) { setError(e instanceof Error ? e.message : "crawl failed") } finally { setCrawling(false) }
  }

  const stage = STAGES.find((s) => s.id === active)!
  const idx = STAGES.findIndex((s) => s.id === active)
  const out = outs[active]

  return (
    <div className="space-y-6">
      {/* Source + controls */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel kicker="Document" title="What should we build a RAG over?" bodyClassName="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => { setSource("sample"); setFileName(null); reset() }} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition-colors", source === "sample" ? "border-primary/50 bg-primary/10" : "hover:bg-accent")}>
              <FileText className="size-5 text-primary" /><span><span className="block text-[13.5px] font-medium">Attendance policy (PDF)</span><span className="block text-[12px] text-muted-foreground">College handbook, 9 sections</span></span>
            </button>
            <button onClick={() => fileRef.current?.click()} className={cn("flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors", source !== "sample" ? "border-primary/50 bg-primary/10" : "hover:bg-accent")}>
              <FileUp className="size-5 text-primary" /><span><span className="block text-[13.5px] font-medium">{fileName ?? "Upload your own"}</span><span className="block text-[12px] text-muted-foreground">PDF, Markdown or text (15 MB max)</span></span>
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.md,.txt,.markdown" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
          <div className="space-y-2 rounded-xl border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2 text-[12px]"><Kicker>PDF parser for uploads</Kicker>
              {(["pymupdf4llm", "docling"] as const).map((k) => <button key={k} disabled={loaders[k] && !loaders[k].available} onClick={() => setLoader(k)} title={loaders[k]?.note} className={cn("rounded-full border px-2.5 py-0.5 disabled:opacity-40", loader === k ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>{loaders[k]?.label ?? k}{loaders[k] && !loaders[k].available ? " (not installed)" : ""}</button>)}</div>
            <div className="flex gap-2"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or crawl a web page with Crawl4AI: https://…" className="h-8 text-[12.5px]" disabled={loaders.crawl4ai && !loaders.crawl4ai.available} />
              <Button size="sm" variant="outline" onClick={crawl} disabled={!url.startsWith("http") || crawling || (loaders.crawl4ai && !loaders.crawl4ai.available)}>{crawling ? <Spinner /> : "Crawl"}</Button></div>
            {loaders.crawl4ai && !loaders.crawl4ai.available && <p className="text-[11.5px] text-muted-foreground">Crawl4AI is optional: <code>bun run setup:extras</code></p>}
          </div>
          <div><Kicker className="mb-1.5">Question to ask</Kicker><Input value={question} onChange={(e) => setQuestion(e.target.value)} />
            {source === "sample" && <div className="mt-2 flex flex-wrap gap-1.5">{samples.map((s) => <button key={s} onClick={() => setQuestion(s)} className="rounded-full border px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-accent">{s}</button>)}</div>}</div>
        </Panel>
        <Panel kicker="Knobs" title="Chunking and retrieval" bodyClassName="space-y-4">
          <div><Kicker className="mb-2">Chunk size · {size} chars</Kicker><Slider value={[size]} min={150} max={1200} step={25} onValueChange={(v) => { setSize(Array.isArray(v) ? v[0] : v); }} /></div>
          <div><Kicker className="mb-2">Overlap · {overlap} chars</Kicker><Slider value={[overlap]} min={0} max={250} step={10} onValueChange={(v) => setOverlap(Array.isArray(v) ? v[0] : v)} /></div>
          <div><Kicker className="mb-2">Top-K · {k}</Kicker><Slider value={[k]} min={1} max={8} onValueChange={(v) => setK(Array.isArray(v) ? v[0] : v)} /></div>
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={runAll} disabled={!!running} className="gap-1.5">{running === "all" ? <Spinner /> : <><Zap className="size-4" />Run whole pipeline</>}</Button>
            <Button variant="outline" onClick={reset} disabled={!!running} className="gap-1.5"><RotateCcw className="size-3.5" />Reset</Button>
          </div>
        </Panel>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Pipeline rail */}
      <div className="scrollbar-thin overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-1.5">
          {STAGES.map((s, i) => {
            const done = !!outs[s.id]
            return (
              <React.Fragment key={s.id}>
                <button onClick={() => setActive(s.id)} className={cn("group flex w-[138px] flex-col rounded-xl border p-3 text-left transition-all", active === s.id ? "border-primary/60 bg-primary/10 shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_14%,transparent)]" : "bg-card hover:bg-accent")}>
                  <span className="mb-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground"><span>{String(i + 1).padStart(2, "0")}</span>{done ? <Check className="size-3.5 text-good" /> : running === s.id ? <Spinner /> : null}</span>
                  <span className="text-[14px] font-medium">{s.title}</span>
                  <span className="text-[11.5px] text-muted-foreground">{s.verb}</span>
                  <span className="mt-1.5 truncate font-mono text-[10px] text-primary/80">{s.tool}</span>
                </button>
                {i < STAGES.length - 1 && <ChevronRight className="my-auto size-4 shrink-0 text-muted-foreground/50" />}
              </React.Fragment>
            )
          })}
          <div className="flex w-[110px] flex-col justify-center rounded-xl border border-dashed p-3 text-[12px] text-muted-foreground">+ Sources<br />shown with the answer</div>
        </div>
      </div>

      {/* Stage detail */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-1 font-mono text-[10.5px] tracking-[0.16em] text-primary uppercase">Stage {idx + 1} · {stage.title}</div>
            <p className="text-[15px] leading-relaxed"><Simple>{stage.simple}</Simple><Technical>{stage.simple} <span className="text-muted-foreground">{stage.tech}</span></Technical></p>
            <Button onClick={() => runOne(stage.id)} disabled={!!running || (stage.id !== "load" && !outs[STAGES[idx - 1].id] && !outs[stage.id])} className="mt-4 gap-1.5" size="sm">
              {running === stage.id ? <Spinner /> : <><Play className="size-3.5 fill-current" />{outs[stage.id] ? "Run again" : `Run “${stage.title}”`}</>}
            </Button>
            {stage.id !== "load" && !outs[STAGES[idx - 1]?.id] && !outs[stage.id] && <p className="mt-2 text-[12px] text-muted-foreground">Run the previous stage first.</p>}
          </div>
          <CodeBlock code={stage.code} title={`01_basic_rag/rag.py · ${stage.title.toLowerCase()}`} highlight={stage.hl} />
        </div>
        <div className="min-h-64 rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b bg-surface/60 px-4 py-2.5"><Kicker>Output of “{stage.title}”</Kicker>{out && <div className="flex items-center gap-2"><Provenance kind="real" /><span className="font-mono text-[11px] text-muted-foreground">{fmtMs(out.ms ?? 0)}</span></div>}</div>
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div key={active + (out ? "1" : "0")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {out ? <StageOutput stage={active} out={out} embed={outs.embed} /> : <div className="grid min-h-48 place-items-center text-center text-[13.5px] text-muted-foreground">Nothing yet.<br />Press “Run {stage.title}” to execute this stage on the real document.</div>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function StageOutput({ stage, out, embed }: { stage: StepName; out: Out; embed?: Out }) {
  if (stage === "load") return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Chip tone="accent">{out.loader}</Chip><Chip>{out.characters.toLocaleString()} characters</Chip></div>
      <pre className="scrollbar-thin max-h-80 overflow-auto rounded-lg border bg-background p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">{out.preview}</pre>
      <p className="text-[12.5px] text-muted-foreground">Notice the <code>##</code> headings: structure survived extraction.</p>
    </div>
  )
  if (stage === "chunk") return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Chip tone="accent">{out.count} chunks</Chip><Chip>size {out.size}</Chip><Chip>overlap {out.overlap}</Chip></div>
      <div className="scrollbar-thin max-h-80 space-y-2 overflow-auto pr-1">
        {out.chunks.map((c: { id: number; text: string }) => (
          <div key={c.id} className="rounded-lg border bg-background p-2.5"><div className="mb-1 font-mono text-[10px] text-muted-foreground">chunk {c.id} · {c.text.length} chars</div><p className="line-clamp-3 text-[12.5px] leading-relaxed whitespace-pre-line">{c.text}</p></div>
        ))}
      </div>
    </div>
  )
  if (stage === "embed") return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Chip tone="accent">{out.model}</Chip><Chip>{out.dimensions} dimensions</Chip><Chip>{out.count} vectors</Chip></div>
      <VectorPlot points={out.points.map((p: PlotPoint) => ({ ...p, kind: "chunk" as const }))} height={230} />
      <div className="rounded-lg border bg-background p-3 font-mono text-[11.5px]">{out.sample.map((s: { id: number; first_values: number[] }) => <div key={s.id} className="truncate"><span className="text-muted-foreground">chunk {s.id}</span> → [{s.first_values.join(", ")}, …]</div>)}</div>
    </div>
  )
  if (stage === "store") return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Chip tone="accent">shape {out.shape[0]} × {out.shape[1]}</Chip><Chip>{(out.bytes / 1024).toFixed(1)} KB</Chip></div>
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] rounded-lg border bg-background p-3">{Array.from({ length: Math.min(out.shape[0], 12) * 24 }, (_, i) => <span key={i} className="aspect-square rounded-[2px]" style={{ background: `color-mix(in oklch, var(--embed) ${20 + ((i * 37) % 70)}%, transparent)` }} />)}</div>
      <p className="text-[13px] text-muted-foreground">{out.note} <Term k="vectordb">Vector databases</Term> come later.</p>
    </div>
  )
  if (stage === "retrieve") return (
    <div className="space-y-3">
      {embed && (
        <VectorPlot height={230} points={[
          ...embed.points.map((p: PlotPoint) => { const hit = out.results.find((r: { id: number }) => r.id === p.id); return { ...p, kind: hit ? ("hit" as const) : ("chunk" as const), rank: hit?.rank } }),
          { id: "q", x: out.query_point.x, y: out.query_point.y, kind: "query" as const },
        ]} />
      )}
      <div className="space-y-2">
        {out.results.map((r: { rank: number; score: number; id: number; text: string }) => (
          <div key={r.id} className="rounded-lg border bg-background p-3"><div className="mb-1.5 flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">{r.rank}</span><span className="font-mono text-[11px] text-muted-foreground">chunk {r.id}</span></div><p className="mb-2 line-clamp-3 text-[12.5px] leading-relaxed whitespace-pre-line">{r.text}</p><ScoreBar label="cosine" value={r.score} /></div>
        ))}
      </div>
      <p className="text-[12.5px] text-muted-foreground">Ranked by <Term k="cosine">cosine similarity</Term> to the question, over {out.all_scores.length} chunks.</p>
    </div>
  )
  if (stage === "prompt") return (
    <div className="space-y-2">
      {out.messages.map((m: { role: string; content: string }, i: number) => (
        <div key={i}><Kicker className="mb-1">{m.role}</Kicker><pre className="scrollbar-thin max-h-60 overflow-auto rounded-lg border bg-background p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{m.content}</pre></div>
      ))}
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">{out.mode === "llm" ? <Provenance kind="llm" /> : <Provenance kind="extractive" />}{out.mode === "llm" && <span className="font-mono text-[11px] text-muted-foreground">{out.model} · {fmtMs(out.latency_ms)} · {out.prompt_tokens}+{out.completion_tokens} tokens</span>}</div>
      <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-4 text-[15px] leading-relaxed"><Cited text={out.answer} sources={out.sources?.map((s: { n: number; id: number }) => ({ n: s.n, label: `chunk ${s.id}` }))} /></div>
      {out.error && <p className="text-[12px] text-generate">{out.error}</p>}
      <Kicker>Sources</Kicker>
      <div className="space-y-2">{(out.sources ?? []).map((s: { n: number; id: number; text: string; score: number }) => (
        <div key={s.n} className="rounded-lg border bg-background p-3 text-[12.5px]"><span className="mr-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">{s.n}</span><span className="font-mono text-[11px] text-muted-foreground">chunk {s.id} · cosine {s.score.toFixed(2)}</span><p className="mt-1.5 line-clamp-3 leading-relaxed text-foreground/80">{s.text}</p></div>
      ))}</div>
      {!out.sources?.length && <Callout tone="warn" title="No citations">The answer did not cite any chunk. In a real system you would refuse to show it.</Callout>}
    </div>
  )
}
