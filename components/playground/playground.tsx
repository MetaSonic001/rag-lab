"use client"

import * as React from "react"
import { motion } from "motion/react"
import { FileUp, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { api, useBackend } from "@/lib/api"
import { runLab } from "@/lib/lab"
import { DEFAULT_LAB, type LabConfig, type LabResult } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ErrorNote, Kicker, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { Term } from "@/components/kit/term"
import { AnswerView, ChunkCard, LatencyStrip, Spinner, Stat, fmtMs, labSources } from "@/components/viz/rag-parts"

type Options = { chunkers: Record<string, { label: string; note: string }>; embedding_models: Record<string, { label: string; note: string }>; prompts: Record<string, string>; corpora: { id: string; label: string }[] }

const QUESTIONS: Record<string, string[]> = {
  attendance: ["What attendance do I need to write exams?", "Can I get condonation with 70% attendance?", "How do I appeal a wrong attendance record?", "What is the hostel curfew time?"],
  ragpay: ["Why did I receive less than my expected settlement?", "PAY_ERR_3DS_FAILED", "How do I issue a refund?", "Which API should I use for recurring payments?"],
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5 flex items-baseline justify-between"><Kicker>{label}</Kicker>{hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}</div>{children}</div>
}
const num = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number))

export function Playground() {
  const { status } = useBackend()
  const [opts, setOpts] = React.useState<Options | null>(null)
  const [models, setModels] = React.useState<string[]>([])
  const [cfg, setCfg] = React.useState<LabConfig>(DEFAULT_LAB)
  const [question, setQuestion] = React.useState(QUESTIONS.attendance[0])
  const [customPrompt, setCustomPrompt] = React.useState("")
  const [res, setRes] = React.useState<LabResult | null>(null)
  const [prev, setPrev] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [uploads, setUploads] = React.useState<{ id: string; label: string }[]>([])
  const fileRef = React.useRef<HTMLInputElement>(null)
  const set = <K extends keyof LabConfig>(k: K, v: LabConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))

  React.useEffect(() => {
    api<Options>("/api/lab/options").then(setOpts).catch(() => {})
    api<string[]>("/api/models").then(setModels).catch(() => {})
  }, [])

  const run = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const prompt = cfg.prompt === "custom" ? customPrompt : cfg.prompt
      const r = await runLab(question, { ...cfg, prompt })
      setPrev((p) => (res ? res : p)); setRes(r)
    } catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }, [cfg, question, customPrompt, res])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [run])

  const upload = async (f: File) => {
    try {
      const fd = new FormData(); fd.append("file", f)
      const r = await api<{ source: string; name: string }>("/api/basic/upload", fd)
      setUploads((u) => [...u, { id: r.source, label: r.name }]); set("corpus", r.source); setQuestion("Summarise the key rules in this document.")
    } catch (e) { setError(e instanceof Error ? e.message : "upload failed") }
  }
  const corpora = [...(opts?.corpora ?? [{ id: "attendance", label: "College attendance policy" }, { id: "ragpay", label: "RAGPAY docs" }]), ...uploads.map((u) => ({ id: u.id, label: `Upload: ${u.label}` }))]
  const presetQs = QUESTIONS[cfg.corpus] ?? []
  const selected = res?.candidates.filter((c) => c.selected) ?? []
  const delta = res && prev ? { ms: res.latency_ms.total - prev.latency_ms.total, top: res.measured.top_score - prev.measured.top_score } : null

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      {/* controls */}
      <aside className="space-y-4 rounded-2xl border bg-card p-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto scrollbar-thin">
        <Field label="Documents">
          <div className="flex gap-2">
            <Select value={cfg.corpus} onValueChange={(v) => { set("corpus", v as string); const q = QUESTIONS[v as string]; if (q) setQuestion(q[0]) }}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{corpora.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} aria-label="Upload document"><FileUp className="size-4" /></Button>
            <input ref={fileRef} type="file" hidden accept=".pdf,.md,.txt" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
        </Field>
        <Field label="Question">
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-16 text-[13px]" />
          <div className="mt-2 flex flex-wrap gap-1.5">{presetQs.map((q) => <button key={q} onClick={() => setQuestion(q)} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">{q}</button>)}</div>
        </Field>

        <div className="h-px bg-border" />
        <Field label={<Term k="chunking">Chunking strategy</Term>} hint={opts?.chunkers[cfg.chunk_strategy]?.note}>
          <Select value={cfg.chunk_strategy} onValueChange={(v) => set("chunk_strategy", v as string)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(opts?.chunkers ?? {}).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={`Chunk size · ${cfg.chunk_size}`}><Slider value={[cfg.chunk_size]} min={150} max={1500} step={50} onValueChange={(v) => set("chunk_size", num(v))} /></Field>
        <Field label={<><Term k="overlap">Overlap</Term> · {cfg.chunk_overlap}</>}><Slider value={[cfg.chunk_overlap]} min={0} max={300} step={10} onValueChange={(v) => set("chunk_overlap", num(v))} /></Field>
        <label className="flex items-center justify-between text-[13px]"><span>Prefix chunks with “Title &gt; Section”</span><Switch checked={cfg.contextual} onCheckedChange={(v) => set("contextual", v)} /></label>

        <div className="h-px bg-border" />
        <Field label={<Term k="embedding">Embedding model</Term>} hint={opts?.embedding_models[cfg.embedding_model]?.note}>
          <Select value={cfg.embedding_model} onValueChange={(v) => set("embedding_model", v as string)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(opts?.embedding_models ?? {}).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={<Term k="retriever">Retriever</Term>}>
          <ToggleGroup value={[cfg.retriever]} onValueChange={(v) => v[0] && set("retriever", v[0] as LabConfig["retriever"])} variant="outline" className="w-full">
            <ToggleGroupItem value="vector" className="flex-1">Vector</ToggleGroupItem><ToggleGroupItem value="bm25" className="flex-1">BM25</ToggleGroupItem><ToggleGroupItem value="hybrid" className="flex-1">Hybrid</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label={<><Term k="topk">Top-K</Term> · {cfg.top_k}</>}><Slider value={[cfg.top_k]} min={1} max={10} onValueChange={(v) => set("top_k", num(v))} /></Field>
        <label className="flex items-center justify-between text-[13px]"><span><Term k="rerank">Reranking</Term> (cross-encoder)</span><Switch checked={cfg.rerank} onCheckedChange={(v) => set("rerank", v)} /></label>
        {cfg.rerank && <Field label={`Candidates to rerank · ${cfg.rerank_candidates}`}><Slider value={[cfg.rerank_candidates]} min={4} max={30} onValueChange={(v) => set("rerank_candidates", num(v))} /></Field>}
        <Field label={`Min. score filter · ${cfg.min_score === null ? "off" : cfg.min_score.toFixed(2)}`} hint="drops weak chunks"><Slider value={[cfg.min_score ?? 0]} min={0} max={0.9} step={0.05} onValueChange={(v) => set("min_score", num(v) === 0 ? null : num(v))} /></Field>

        <div className="h-px bg-border" />
        <Field label={<Term k="prompt">Prompt</Term>}>
          <ToggleGroup value={[cfg.prompt]} onValueChange={(v) => v[0] && set("prompt", v[0])} variant="outline" className="w-full">
            <ToggleGroupItem value="strict" className="flex-1">Strict</ToggleGroupItem><ToggleGroupItem value="naive" className="flex-1">Loose</ToggleGroupItem><ToggleGroupItem value="custom" className="flex-1">Custom</ToggleGroupItem>
          </ToggleGroup>
          {cfg.prompt === "custom" && <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder={"Write your own system prompt. Use {context} where the chunks go."} className="mt-2 min-h-24 font-mono text-[12px]" />}
          {cfg.prompt !== "custom" && opts && <pre className="scrollbar-thin mt-2 max-h-28 overflow-auto rounded-lg border bg-background p-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{opts.prompts[cfg.prompt]}</pre>}
        </Field>
        <Field label="LLM (GroqCloud)" hint={status?.llm.configured ? "" : "no API key"}>
          <Select value={cfg.llm_model ?? "default"} onValueChange={(v) => set("llm_model", v === "default" ? null : (v as string))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="default">Default ({status?.llm.model ?? "from .env"})</SelectItem>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <label className="flex items-center justify-between text-[13px]"><span>Generate an answer</span><Switch checked={cfg.generate} onCheckedChange={(v) => set("generate", v)} /></label>
        <Button onClick={run} disabled={loading} className="w-full gap-2">{loading ? <Spinner label="Running" /> : <><Play className="size-4 fill-current" />Run pipeline<span className="ml-1 hidden font-mono text-[10px] opacity-70 sm:inline">⌘↵</span></>}</Button>
      </aside>

      {/* results */}
      <div className="min-w-0 space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!res && !loading && <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed text-center text-[14px] text-muted-foreground"><div>Set your knobs, then <strong className="text-foreground">Run pipeline</strong>.<br />You will see every chunk, score, the exact context, the answer and where the time went.</div></div>}
        {loading && !res && <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed"><Spinner label="Chunking, embedding, retrieving… (first run downloads models)" /></div>}
        {res && (
          <motion.div key={res.latency_ms.total} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("space-y-4", loading && "opacity-60")}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Chunks indexed" value={res.stats.chunks} hint={`avg ${res.stats.avg_chunk_chars} chars`} />
              <Stat label="Retrieval" value={fmtMs(res.latency_ms.retrieval)} hint={delta ? `${delta.ms >= 0 ? "+" : ""}${Math.round(delta.ms)} ms total vs last run` : undefined} />
              <Stat label="Top score" value={res.measured.top_score.toFixed(2)} tone="primary" hint={delta ? `${delta.top >= 0 ? "+" : ""}${delta.top.toFixed(2)} vs last run` : undefined} />
              <Stat label="Tokens" value={res.tokens.prompt + res.tokens.completion || "–"} hint={res.tokens.prompt ? `${res.tokens.prompt} in · ${res.tokens.completion} out` : "no LLM call"} />
            </div>
            {res.answer && (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
                <Kicker className="mb-2">Answer</Kicker>
                <AnswerView answer={res.answer} sources={labSources(res)} />
                {res.answer.citations.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{res.answer.citations.map((n) => { const c = selected[n - 1]; return c ? <Chip key={n} tone="accent">[{n}] {c.chunk.doc_id} § {c.chunk.section}</Chip> : null })}</div>}
              </div>
            )}
            <Tabs defaultValue="trace">
              <TabsList variant="line" className="border-b"><TabsTrigger value="trace">Retrieval trace</TabsTrigger><TabsTrigger value="chunks">Chunks & scores ({res.candidates.length})</TabsTrigger><TabsTrigger value="context">Context</TabsTrigger><TabsTrigger value="prompt">Prompt sent</TabsTrigger></TabsList>
              <TabsContent value="trace" className="pt-4">
                <div className="rounded-2xl border bg-card p-4">
                  <Kicker className="mb-3">Where the time went</Kicker><LatencyStrip trace={res.trace} />
                  <ol className="mt-5 space-y-0">
                    {res.trace.map((t, i) => (
                      <li key={t.stage} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < res.trace.length - 1 && <span className="absolute top-5 bottom-0 left-[9px] w-px bg-border" />}
                        <span className={cn("relative mt-1 size-[19px] shrink-0 rounded-full border-2 bg-card", t.measured ? "border-good" : "border-generate")} />
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">{t.label}<span className="font-mono text-[11px] font-normal text-muted-foreground">{fmtMs(t.ms)}</span><Provenance kind={t.measured ? "real" : "extractive"} /></div><p className="text-[12.5px] text-muted-foreground">{t.detail}</p></div>
                      </li>
                    ))}
                  </ol>
                </div>
              </TabsContent>
              <TabsContent value="chunks" className="pt-4"><div className="grid gap-3 md:grid-cols-2">{res.candidates.map((c, i) => <ChunkCard key={c.chunk.id} c={c} index={i} dim={!c.selected} />)}</div></TabsContent>
              <TabsContent value="context" className="pt-4"><pre className="scrollbar-thin max-h-[28rem] overflow-auto rounded-xl border bg-card p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">{res.context || "(empty: nothing passed the filters)"}</pre><p className="mt-2 text-[12px] text-muted-foreground">{res.context.length} characters ≈ {Math.round(res.context.length / 4)} tokens. This is exactly what the model reads.</p></TabsContent>
              <TabsContent value="prompt" className="pt-4"><div className="space-y-3">{res.answer?.messages?.map((m, i) => <div key={i}><Kicker className="mb-1">{m.role}</Kicker><pre className="scrollbar-thin max-h-72 overflow-auto rounded-xl border bg-card p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">{m.content}</pre></div>) ?? <p className="text-sm text-muted-foreground">Enable “Generate an answer” to see the prompt.</p>}</div></TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </div>
  )
}
