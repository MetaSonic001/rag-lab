"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, Ghost, ListMinus, FileQuestion, Scissors, SearchX, ShieldAlert, Sigma, Wrench } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { runLab, type LabRunOptions } from "@/lib/lab"
import type { LabResult } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ErrorNote, Kicker, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { AnswerView, ChunkCard, Spinner, labSources } from "@/components/viz/rag-parts"

type Scenario = {
  id: string; title: string; icon: string; symptom: string; question: string; facts: string[] | null; corpus: string
  broken: LabRunOptions; fixed: LabRunOptions; diagnosis: string; fix: string; llm_dependent: boolean; simulated_broken?: string
}
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { scissors: Scissors, "search-x": SearchX, "list-minus": ListMinus, sigma: Sigma, "file-question": FileQuestion, ghost: Ghost }

function Coverage({ r }: { r: LabResult }) {
  const fc = r.measured.fact_coverage
  if (!fc) {
    const kept = r.candidates.filter((c) => c.selected).length
    return <div className="flex flex-wrap items-center gap-2 text-[12.5px]"><Chip tone={kept ? "warning" : "success"}>{kept} chunk{kept === 1 ? "" : "s"} reached the model</Chip><Chip>best score {r.measured.top_score.toFixed(2)}</Chip></div>
  }
  const ok = fc.found.length === fc.total
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3"><span className={cn("font-display text-3xl", ok ? "text-good" : "text-bad")}>{fc.found.length}/{fc.total}</span><span className="text-[13px] text-muted-foreground">required facts present in the retrieved context</span></div>
      <div className="flex flex-wrap gap-1.5">{fc.found.map((f) => <Chip key={f} tone="success">✓ {f}</Chip>)}{fc.missing.map((f) => <Chip key={f} tone="danger">✕ {f}</Chip>)}</div>
    </div>
  )
}

function Side({ tone, title, result, loading, s }: { tone: "bad" | "good"; title: string; result: LabResult | null; loading: boolean; s: Scenario }) {
  const kept = result?.candidates.filter((c) => c.selected) ?? []
  const noKey = result?.answer && result.answer.mode !== "llm"
  return (
    <div className={cn("space-y-4 rounded-2xl border p-4", tone === "bad" ? "border-bad/30 bg-bad/[0.04]" : "border-good/30 bg-good/[0.04]")}>
      <div className="flex items-center justify-between"><span className={cn("font-mono text-[11px] tracking-[0.16em] uppercase", tone === "bad" ? "text-bad" : "text-good")}>{title}</span>{result && <Provenance kind="real" />}</div>
      {loading && <Spinner label="Running" />}
      {!loading && !result && <p className="py-8 text-center text-[13px] text-muted-foreground">Not run yet.</p>}
      {result && (
        <>
          <Coverage r={result} />
          {result.answer && (
            <div className="rounded-xl border bg-background p-3.5">
              <Kicker className="mb-1.5">Answer</Kicker>
              {noKey && s.simulated_broken && tone === "bad" ? (
                <div><p className="text-[14px] leading-relaxed">{s.simulated_broken}</p><div className="mt-2 flex items-center gap-2"><Provenance kind="simulated" /><span className="text-[11.5px] text-muted-foreground">Illustration: add GROQ_API_KEY to see the real model behaviour.</span></div></div>
              ) : <AnswerView answer={result.answer} sources={labSources(result)} animate={false} />}
            </div>
          )}
          <div className="space-y-2">
            <Kicker>Retrieved context ({kept.length})</Kicker>
            {kept.length === 0 && <p className="rounded-lg border border-dashed bg-background p-3 text-[13px] text-muted-foreground">Empty. Nothing passed the relevance threshold, so the model has nothing to hallucinate from.</p>}
            {kept.map((c, i) => <ChunkCard key={c.chunk.id} c={c} index={i} highlight={s.facts ?? undefined} />)}
          </div>
        </>
      )}
    </div>
  )
}

export function BreakLab() {
  const [list, setList] = React.useState<Scenario[]>([])
  const [id, setId] = React.useState("bad-chunking")
  const [broken, setBroken] = React.useState<LabResult | null>(null)
  const [fixed, setFixed] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState<"broken" | "fixed" | null>(null)
  const [showWhy, setShowWhy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => { api<Scenario[]>("/api/lab/scenarios").then(setList).catch((e) => setError(e.message)) }, [])
  const s = list.find((x) => x.id === id)
  React.useEffect(() => { setBroken(null); setFixed(null); setShowWhy(false) }, [id])

  const exec = async (which: "broken" | "fixed") => {
    if (!s) return
    setLoading(which); setError(null)
    try {
      const cfg = { corpus: s.corpus, ...(which === "broken" ? s.broken : s.fixed), facts: s.facts, generate: s.llm_dependent }
      const r = await runLab(s.question, cfg as LabRunOptions)
      which === "broken" ? setBroken(r) : setFixed(r)
    } catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setLoading(null) }
  }
  if (!s) return <div className="text-sm text-muted-foreground">{error ?? <Spinner label="Loading scenarios" />}</div>

  const keys = Array.from(new Set([...Object.keys(s.broken), ...Object.keys(s.fixed)]))
  const changed = keys.filter((k) => JSON.stringify(s.broken[k as keyof LabRunOptions]) !== JSON.stringify(s.fixed[k as keyof LabRunOptions]))

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <nav className="space-y-1.5 lg:sticky lg:top-20 lg:self-start">
        {list.map((x) => { const Icon = ICONS[x.icon] ?? Wrench; return (
          <button key={x.id} onClick={() => setId(x.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", id === x.id ? "border-bad/40 bg-bad/[0.07]" : "bg-card hover:bg-accent")}>
            <Icon className={cn("size-4 shrink-0", id === x.id ? "text-bad" : "text-muted-foreground")} /><span className="text-[13.5px] font-medium">{x.title}</span>
          </button>) })}
        <Link href="/security" className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-[13px] text-muted-foreground hover:bg-accent"><ShieldAlert className="size-4" />Prompt injection<ArrowRight className="ml-auto size-3.5" /></Link>
      </nav>

      <div className="min-w-0 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border bg-card p-5">
            <Kicker className="mb-1 text-bad">Symptom</Kicker>
            <h2 className="font-display text-3xl">{s.title}</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">{s.symptom}</p>
            <div className="mt-4 rounded-xl border bg-background px-4 py-3 text-[15px]"><span className="mr-2 font-mono text-[10.5px] tracking-widest text-muted-foreground uppercase">Question</span>{s.question}</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => exec("broken")} disabled={!!loading} variant="destructive" className="gap-1.5">{loading === "broken" ? <Spinner /> : "1 · Run the broken system"}</Button>
              <Button onClick={() => setShowWhy(true)} disabled={!broken} variant="outline">2 · Why did it break?</Button>
              <Button onClick={() => exec("fixed")} disabled={!!loading || !broken} className="gap-1.5">{loading === "fixed" ? <Spinner /> : <><Wrench className="size-4" />3 · Apply the fix</>}</Button>
            </div>
          </motion.div>
        </AnimatePresence>
        {error && <ErrorNote>{error}</ErrorNote>}

        {showWhy && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-bad/30 bg-bad/[0.05] p-4"><Kicker className="mb-1 text-bad">Diagnosis</Kicker><p className="text-[14px] leading-relaxed">{s.diagnosis}</p></div>
            <div className="rounded-2xl border border-good/30 bg-good/[0.05] p-4"><Kicker className="mb-1 text-good">The fix</Kicker><p className="text-[14px] leading-relaxed">{s.fix}</p></div>
          </motion.div>
        )}

        {(broken || fixed) && changed.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <Kicker className="mb-2">What changed in the configuration</Kicker>
            <div className="flex flex-wrap gap-2 font-mono text-[12px]">{changed.map((k) => <span key={k} className="rounded-lg border bg-background px-2.5 py-1"><span className="text-muted-foreground">{k}: </span><span className="text-bad line-through">{String(s.broken[k as keyof LabRunOptions] ?? "default")}</span> <ArrowRight className="mx-0.5 inline size-3" /> <span className="text-good">{String(s.fixed[k as keyof LabRunOptions] ?? "default")}</span></span>)}</div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Side tone="bad" title="Broken" result={broken} loading={loading === "broken"} s={s} />
          <Side tone="good" title="Fixed" result={fixed} loading={loading === "fixed"} s={s} />
        </div>
        <p className="text-[12px] text-muted-foreground">Green badges mean the number was produced by running the real pipeline just now. Anything labelled “Simulated” is an illustration and never a measurement.</p>
      </div>
    </div>
  )
}
