"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { api, useBackend } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Callout, ErrorNote, Kicker, Panel, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { Term } from "@/components/kit/term"
import { Spinner, fmtMs } from "@/components/viz/rag-parts"

type Row = { question: string; gold: string[]; retrieved: string[]; context_precision: number; context_recall: number; faithfulness?: number; answer_relevancy?: number; latency_ms: number; tokens?: number; answer?: string; judge_method?: string }
type Sys = { system: string; label: string; note: string; n: number; aggregate: Record<string, number>; rows: Row[]; generation_method: string | null; answer_mode: string | null }
type Cfg = { systems: Record<string, { label: string; note: string }>; questions: number; llm_available: boolean; frameworks: { ragas: boolean; deepeval: boolean } }

const ORDER = ["basic", "hybrid", "reranked"] as const
const METRICS = [
  { key: "context_precision", label: "Context precision", term: "precision", higher: true, fmt: (v: number) => v.toFixed(2), how: "exact, vs gold labels", llm: false, ragas: "context_precision", deepeval: "ContextualPrecisionMetric" },
  { key: "context_recall", label: "Context recall", term: "recall", higher: true, fmt: (v: number) => v.toFixed(2), how: "exact, vs gold labels", llm: false, ragas: "context_recall", deepeval: "ContextualRecallMetric" },
  { key: "faithfulness", label: "Faithfulness", term: "faithfulness", higher: true, fmt: (v: number) => v.toFixed(2), how: "LLM judge", llm: true, ragas: "faithfulness", deepeval: "FaithfulnessMetric" },
  { key: "answer_relevancy", label: "Answer relevancy", term: "", higher: true, fmt: (v: number) => v.toFixed(2), how: "LLM judge", llm: true, ragas: "answer_relevancy", deepeval: "AnswerRelevancyMetric" },
  { key: "latency_ms", label: "Latency / question", term: "", higher: false, fmt: (v: number) => fmtMs(v), how: "measured", llm: false, ragas: "-", deepeval: "-" },
  { key: "tokens", label: "Tokens / question", term: "", higher: false, fmt: (v: number) => Math.round(v).toLocaleString(), how: "measured (answer + judge)", llm: true, ragas: "-", deepeval: "-" },
] as const

export function EvalLab() {
  const { status } = useBackend()
  const [cfg, setCfg] = React.useState<Cfg | null>(null)
  const [n, setN] = React.useState(25)
  const [withLlm, setWithLlm] = React.useState(false)
  const [results, setResults] = React.useState<Partial<Record<string, Sys>>>({})
  const [running, setRunning] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState<number | null>(null)

  React.useEffect(() => { api<Cfg>("/api/eval/config").then((c) => { setCfg(c); setN(Math.min(25, c.questions)); setWithLlm(false) }).catch((e) => setError(e.message)) }, [])
  const run = async () => {
    setError(null); setResults({})
    try { for (const s of ORDER) { setRunning(s); const r = await api<Sys>("/api/eval/run", { system: s, n, with_llm: withLlm }); setResults((x) => ({ ...x, [s]: r })) } }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setRunning(null) }
  }
  const have = ORDER.filter((s) => results[s])
  const shown = METRICS.filter((m) => !m.llm || withLlm)
  const best = (key: string, higher: boolean) => { const vals = have.map((s) => results[s]!.aggregate[key]); return higher ? Math.max(...vals) : Math.min(...vals) }
  const judge = results.basic?.generation_method

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel kicker="Setup" title="Compare three RAG systems on a golden question set" bodyClassName="space-y-4">
          <div><Kicker className="mb-2">Questions · {n} of {cfg?.questions ?? 25}</Kicker><Slider value={[n]} min={5} max={cfg?.questions ?? 25} onValueChange={(v) => setN(Array.isArray(v) ? v[0] : v)} /></div>
          <label className="flex items-start justify-between gap-4 text-[13px]"><span><span className="font-medium">Also generate answers and judge them with the LLM</span><span className="block text-muted-foreground">Adds faithfulness, answer relevancy and token counts. Costs about {n * 3 * 2} Groq calls.</span></span><Switch checked={withLlm} onCheckedChange={setWithLlm} disabled={!status?.llm.configured} /></label>
          {!status?.llm.configured && <p className="text-[12px] text-generate">No GROQ_API_KEY: only the retrieval metrics (exact) can run.</p>}
          <Button onClick={run} disabled={!!running} className="gap-2">{running ? <Spinner label={`Evaluating ${cfg?.systems[running]?.label ?? ""}…`} /> : <><Play className="size-4 fill-current" />Run evaluation</>}</Button>
        </Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDER.map((s) => (
            <div key={s} className={cn("rounded-2xl border bg-card p-4 transition-colors", running === s && "border-primary/50 bg-primary/[0.05]")}>
              <div className="mb-1 flex items-center gap-2"><span className={cn("size-2 rounded-full", results[s] ? "bg-good" : running === s ? "animate-pulse-soft bg-primary" : "bg-muted-foreground/40")} /><span className="font-display text-xl">{cfg?.systems[s]?.label ?? s}</span></div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{cfg?.systems[s]?.note}</p>
            </div>
          ))}
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      {have.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-left text-[13.5px]">
              <thead><tr className="border-b bg-surface/60 font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase"><th className="px-4 py-3 font-normal">Metric</th>{ORDER.map((s) => <th key={s} className="px-4 py-3 font-normal">{cfg?.systems[s]?.label}</th>)}<th className="px-4 py-3 font-normal">How it is computed</th></tr></thead>
              <tbody>{shown.map((m) => (
                <tr key={m.key} className="border-b last:border-0">
                  <td className="px-4 py-3.5 font-medium">{m.term ? <Term k={m.term}>{m.label}</Term> : m.label}</td>
                  {ORDER.map((s) => { const v = results[s]?.aggregate[m.key]; const isBest = v !== undefined && have.length > 1 && v === best(m.key, m.higher); const max = m.key === "latency_ms" || m.key === "tokens" ? Math.max(...have.map((x) => results[x]!.aggregate[m.key])) : 1
                    return <td key={s} className="px-4 py-3.5">{v === undefined ? <span className="text-muted-foreground">…</span> : <div><div className={cn("font-mono text-[15px]", isBest && "text-good")}>{m.fmt(v)}{isBest && " ★"}</div><div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-foreground/10"><motion.div className={cn("h-full rounded-full", isBest ? "bg-good" : "bg-muted-foreground/60")} initial={{ width: 0 }} animate={{ width: `${(v / (max || 1)) * 100}%` }} transition={{ duration: 0.7 }} /></div></div>}</td> })}
                  <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{m.llm && judge === "proxy" ? <Provenance kind="proxy" /> : m.llm ? <Provenance kind="llm" /> : <Provenance kind="real" />}<span className="ml-1.5">{m.how}</span></td>
                </tr>))}</tbody>
            </table>
          </div>
          <Callout tone="idea" title="Read the table like this">Hybrid usually beats basic on both precision and recall because exact identifiers are no longer missed. Reranking often lifts <em>precision</em> (better order) but can lower <em>recall</em> at a small K: with K = 3 it cannot fit all three documents a multi-document question needs. Metrics tell you where to look, not just which system wins.</Callout>

          <div>
            <Kicker className="mb-3">Per question: gold documents vs what was retrieved (top-3)</Kicker>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {results[have[0]]!.rows.map((row, i) => (
                <div key={i} className="border-b last:border-0">
                  <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40">
                    <span className="w-6 font-mono text-[11px] text-muted-foreground">{i + 1}</span><span className="min-w-0 flex-1 truncate text-[13px]">{row.question}</span>
                    <div className="flex gap-1.5">{ORDER.map((s) => { const r = results[s]?.rows[i]; if (!r) return null; const ok = r.context_recall === 1; return <span key={s} title={`${cfg?.systems[s]?.label}: recall ${r.context_recall.toFixed(2)}`} className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase", ok ? "bg-good/15 text-good" : r.context_recall > 0 ? "bg-generate/15 text-generate" : "bg-bad/15 text-bad")}>{s.slice(0, 1)}</span> })}</div>
                  </button>
                  {open === i && (
                    <div className="grid gap-3 border-t bg-background p-4 md:grid-cols-3">
                      {ORDER.map((s) => { const r = results[s]?.rows[i]; if (!r) return null; return (
                        <div key={s} className="space-y-1.5 text-[12px]"><Kicker>{cfg?.systems[s]?.label}</Kicker>
                          <div className="flex flex-wrap gap-1">{r.retrieved.map((d, k) => <Chip key={k} tone={r.gold.includes(d) ? "success" : "danger"}>{d}</Chip>)}</div>
                          {r.gold.filter((g) => !r.retrieved.includes(g)).length > 0 && <div className="text-bad">missing: {r.gold.filter((g) => !r.retrieved.includes(g)).join(", ")}</div>}
                          {r.answer && <p className="rounded-lg border bg-card p-2 leading-relaxed">{r.answer.slice(0, 260)}</p>}
                        </div>) })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">Green = every needed document retrieved. Amber = some. Red = none. B / H / R = Basic / Hybrid / Reranked. Click a row for details.</p>
          </div>
        </motion.div>
      )}

      <Panel kicker="Frameworks" title="How these map to RAGAS and DeepEval" bodyClassName="space-y-3">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[13px]"><thead><tr className="font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase"><th className="py-2 font-normal">This page</th><th className="py-2 font-normal">RAGAS</th><th className="py-2 font-normal">DeepEval</th></tr></thead>
          <tbody>{METRICS.filter((m) => m.ragas !== "-").map((m) => <tr key={m.key} className="border-t"><td className="py-2">{m.label}</td><td className="py-2 font-mono text-[12px]">{m.ragas}</td><td className="py-2 font-mono text-[12px]">{m.deepeval}</td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">RAGAS installed: <Chip tone={cfg?.frameworks.ragas ? "success" : "default"}>{cfg?.frameworks.ragas ? "yes" : "no"}</Chip> DeepEval installed: <Chip tone={cfg?.frameworks.deepeval ? "success" : "default"}>{cfg?.frameworks.deepeval ? "yes" : "no"}</Chip></div>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">The metrics above are implemented from scratch in <code>backend/10_evaluation/metrics.py</code> so students can read the definitions. Retrieval metrics are computed exactly against gold labels; generation metrics use a Groq judge. Install RAGAS or DeepEval (<code>backend/requirements-extra.txt</code>) to cross-check the numbers with the reference implementations.</p>
      </Panel>
    </div>
  )
}
