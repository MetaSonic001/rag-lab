"use client"

import * as React from "react"
import { motion } from "motion/react"
import { FileCode2, FolderTree, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErrorNote, Kicker, Panel, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { CodeBlock } from "@/components/kit/code-block"
import { Cited, ScoreBar, Spinner, fmtMs } from "@/components/viz/rag-parts"

type FileEntry = { path: string; content: string }
type Fn = { n: number; file: string; name: string; kind: string; start: number; end: number; doc: string; code: string; score: number; citation: string }
type Res = { answer: { answer: string; mode: string; model: string; latency_ms: number }; functions: Fn[]; files: string[]; citations: string[]; trace: { stage: string; label: string; ms: number; detail: string }[] }

const QUESTIONS = ["Where is authentication implemented?", "What happens when /login is called?", "Which file handles database connections?", "Which files would I modify to add OAuth?"]

export function CodeRag() {
  const [files, setFiles] = React.useState<FileEntry[]>([])
  const [open, setOpen] = React.useState("auth/routes.py")
  const [q, setQ] = React.useState(QUESTIONS[1])
  const [res, setRes] = React.useState<Res | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => { api<FileEntry[]>("/api/coderag/files").then(setFiles).catch((e) => setError(e.message)) }, [])
  const ask = async (question = q) => {
    setLoading(true); setError(null)
    try { const r = await api<Res>("/api/coderag/ask", { question, k: 5 }); setRes(r); const first = r.functions.find((f) => r.citations.includes(f.citation)) ?? r.functions[0]; if (first) setOpen(first.file) }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }
  const file = files.find((f) => f.path === open)
  const hl = React.useMemo(() => {
    if (!res) return []
    const out: number[] = []
    res.functions.filter((f) => f.file === open && res.citations.includes(f.citation) && f.kind !== "module").forEach((f) => { for (let i = f.start; i <= f.end; i++) out.push(i) })
    return out
  }, [res, open])
  const cited = res ? res.functions.filter((f) => res.citations.includes(f.citation)) : []

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <Panel kicker="Repository" title="taskboard-api (sample Flask app)" bodyClassName="p-0">
          <div className="grid md:grid-cols-[170px_1fr]">
            <div className="scrollbar-thin max-h-[26rem] overflow-y-auto border-b p-2 md:border-r md:border-b-0"><div className="mb-1 flex items-center gap-1.5 px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"><FolderTree className="size-3" />files</div>
              {files.map((f) => { const isCited = res?.files.includes(f.path); return (
                <button key={f.path} onClick={() => setOpen(f.path)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono text-[11.5px]", open === f.path ? "bg-primary/12 text-foreground" : "text-muted-foreground hover:bg-accent")}><FileCode2 className="size-3 shrink-0" /><span className="truncate">{f.path}</span>{isCited && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />}</button>) })}
            </div>
            <div className="min-w-0 p-3">{file ? <CodeBlock code={file.content} lang={file.path.endsWith(".md") ? "markdown" : "python"} title={file.path} highlight={hl} maxHeight={380} /> : <Spinner label="Loading repository" />}</div>
          </div>
        </Panel>
        <p className="text-[12.5px] text-muted-foreground">Highlighted lines are the code the answer cites. The repository is bundled in <code>backend/data/code_repo</code>.</p>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">{QUESTIONS.map((x) => <button key={x} onClick={() => { setQ(x); ask(x) }} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition-colors hover:bg-accent", q === x ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground")}>{x}</button>)}</div>
          <div className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask about the code…" /><Button onClick={() => ask()} disabled={loading} className="gap-1.5">{loading ? <Spinner /> : <><Search className="size-4" />Ask</>}</Button></div>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {res && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
              <div className="mb-2 flex items-center gap-2"><Kicker>Answer</Kicker>{res.answer.mode === "llm" ? <Provenance kind="llm" /> : <Provenance kind="extractive" />}</div>
              <div className="text-[14.5px] leading-relaxed"><Cited text={res.answer.answer} sources={res.functions.map((f) => ({ n: f.n, label: `${f.file}:${f.start}-${f.end}` }))} /></div>
              <div className="mt-3 space-y-2"><Kicker>Relevant files</Kicker><div className="flex flex-wrap gap-1.5">{res.files.map((f) => <Chip key={f} tone="accent">{f}</Chip>)}</div></div>
              <div className="mt-3 space-y-2"><Kicker>Line citations</Kicker><div className="flex flex-wrap gap-1.5">{cited.map((f) => <button key={f.citation} onClick={() => setOpen(f.file)} className="rounded-md border bg-background px-2 py-1 font-mono text-[11.5px] hover:border-primary/40">{f.citation}</button>)}</div></div>
            </div>
            <Panel kicker="Retrieved" title="Relevant functions" bodyClassName="space-y-2">
              {res.functions.map((f) => (
                <button key={f.citation} onClick={() => setOpen(f.file)} className="w-full rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40">
                  <div className="mb-1.5 flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-primary/15 font-mono text-[10px] font-semibold text-primary">{f.n}</span><span className="font-mono text-[12.5px] font-medium">{f.name}</span><Chip>{f.kind}</Chip><span className="ml-auto font-mono text-[11px] text-muted-foreground">{f.citation}</span></div>
                  {f.doc && <p className="mb-1.5 line-clamp-1 text-[12px] text-muted-foreground">{f.doc}</p>}
                  <ScoreBar label="rerank" value={f.score} color="var(--rerank)" />
                </button>
              ))}
            </Panel>
            <Panel kicker="Retrieval trace" title="How it found them" bodyClassName="space-y-2.5">
              {res.trace.map((t) => <div key={t.stage} className="flex items-start gap-3 text-[12.5px]"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><span className="font-medium">{t.label}</span> <span className="font-mono text-[11px] text-muted-foreground">{fmtMs(t.ms)}</span><p className="text-muted-foreground">{t.detail}</p></div></div>)}
              <div className="flex items-center gap-2 pt-1"><Provenance kind="real" /><span className="text-[11.5px] text-muted-foreground">Chroma (meaning) + BM25 on split identifiers → RRF → cross-encoder</span></div>
            </Panel>
          </motion.div>
        )}
      </div>
    </div>
  )
}
