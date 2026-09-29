"use client"

import * as React from "react"
import { motion } from "motion/react"
import { CheckCircle2, FileText, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Answer, Candidate, LabResult, TraceStep } from "@/lib/types"
import { Provenance } from "@/components/kit/scaffold"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"

export const fmtMs = (ms: number) => (ms < 1 ? "<1 ms" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`)

/** One horizontal score bar. `max` normalises raw scores (BM25 is unbounded). */
export function ScoreBar({ label, value, max = 1, color = "var(--retrieve)", digits = 2 }: { label: string; value: number | undefined; max?: number; color?: string; digits?: number }) {
  if (value === undefined) return null
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 shrink-0 font-mono text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
      <span className="w-10 text-right font-mono text-foreground/80">{value.toFixed(digits)}</span>
    </div>
  )
}

export function ChunkCard({ c, index, dim, highlight }: { c: Candidate; index?: number; dim?: boolean; highlight?: string[] }) {
  const s = c.scores
  const text = c.chunk.text
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: dim ? 0.5 : 1, y: 0 }} transition={{ delay: (index ?? 0) * 0.05 }}
      className={cn("rounded-xl border bg-card p-3.5", c.selected ? "border-primary/40 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_18%,transparent)]" : "border-border")}>
      <div className="mb-2 flex items-start gap-2.5">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-semibold", c.selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{c.rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium"><FileText className="size-3 shrink-0 text-muted-foreground" /><span className="truncate">{c.chunk.doc_id}</span></div>
          <div className="truncate text-[11px] text-muted-foreground">§ {c.chunk.section}</div>
        </div>
        {c.selected ? <span className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-good uppercase"><CheckCircle2 className="size-3" />in context</span> : <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">candidate</span>}
      </div>
      <p className="mb-2.5 line-clamp-4 text-[12.5px] leading-relaxed whitespace-pre-line text-foreground/80">{markFacts(text.replace(/^.*?>.*?\n/, ""), highlight)}</p>
      <div className="space-y-1">
        <ScoreBar label="vector" value={s.vector} color="var(--retrieve)" />
        <ScoreBar label="bm25" value={s.bm25} max={Math.max(12, s.bm25 ?? 0)} color="var(--embed)" digits={1} />
        <ScoreBar label="rrf" value={s.rrf} max={0.034} color="var(--generate)" digits={3} />
        <ScoreBar label="rerank" value={s.rerank_prob} color="var(--rerank)" />
      </div>
    </motion.div>
  )
}

function markFacts(text: string, facts?: string[]) {
  if (!facts?.length) return text
  const re = new RegExp(`(${facts.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded bg-good/25 px-0.5 text-foreground">{part}</mark> : part))
}

/** Stacked bar of where the time went. Every value is measured. */
export function LatencyStrip({ trace }: { trace: TraceStep[] }) {
  const steps = trace.filter((t) => t.ms > 0.5 && t.stage !== "load")
  const total = steps.reduce((a, b) => a + b.ms, 0) || 1
  const colors: Record<string, string> = { chunk: "var(--muted-foreground)", index: "var(--embed)", "retrieve-vector": "var(--retrieve)", "retrieve-bm25": "var(--embed)", rerank: "var(--rerank)", generate: "var(--generate)" }
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-foreground/10">
        {steps.map((s) => (
          <motion.div key={s.stage} title={`${s.label}: ${fmtMs(s.ms)}`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: colors[s.stage] ?? "var(--primary)" }} initial={{ width: 0 }} animate={{ width: `${(s.ms / total) * 100}%` }} transition={{ duration: 0.7 }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {steps.map((s) => (
          <span key={s.stage} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: colors[s.stage] ?? "var(--primary)" }} />{s.label} <span className="font-mono text-foreground/80">{fmtMs(s.ms)}</span></span>
        ))}
      </div>
    </div>
  )
}

/** The generated answer with clickable [n] citations. */
export function AnswerView({ answer, animate = true, sources }: { answer: Answer; animate?: boolean; sources?: { n: number; label: string }[] }) {
  const text = answer.answer
  const isLLM = answer.mode === "llm"
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {isLLM ? <Provenance kind="llm" /> : answer.mode === "gate" ? <Provenance kind="real" /> : <Provenance kind="extractive" />}
        {isLLM && <span className="font-mono text-[11px] text-muted-foreground">{answer.model} · {fmtMs(answer.latency_ms)} · {answer.prompt_tokens}+{answer.completion_tokens} tok</span>}
      </div>
      <div className="text-[15px] leading-relaxed">
        {animate && isLLM ? <TextGenerateEffect words={text.replace(/\[(\d+)\]/g, "[$1]")} duration={0.25} filter={false} className="font-normal" /> : <Cited text={text} sources={sources} />}
      </div>
      {answer.error && !isLLM && <p className="mt-2 text-[12px] text-generate">{answer.error}</p>}
    </div>
  )
}

/** Text with [n] citation chips and light inline Markdown (**bold**, `code`, fenced blocks). */
export function Cited({ text, sources }: { text: string; sources?: { n: number; label: string }[] }) {
  return (
    <span className="whitespace-pre-line">
      {text.split(/(```[\s\S]*?```)/g).map((block, bi) => {
        if (block.startsWith("```") && block.endsWith("```") && block.length > 6) {
          return <code key={bi} className="my-2 block overflow-x-auto rounded-lg border bg-background p-3 font-mono text-[12px] leading-relaxed whitespace-pre">{block.replace(/^```\w*\n?/, "").replace(/```$/, "").trimEnd()}</code>
        }
        return block.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\[\d+\])/g).map((p, i) => {
          const cite = p.match(/^\[(\d+)\]$/)
          if (cite) {
            const src = sources?.find((s) => s.n === +cite[1])
            return <sup key={`${bi}-${i}`} title={src?.label} className="mx-0.5 rounded bg-primary/15 px-1 py-px font-mono text-[10px] font-semibold text-primary">{cite[1]}</sup>
          }
          if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={`${bi}-${i}`} className="font-semibold">{p.slice(2, -2)}</strong>
          if (p.startsWith("`") && p.endsWith("`") && p.length > 2) return <code key={`${bi}-${i}`} className="rounded bg-foreground/10 px-1 font-mono text-[0.86em]">{p.slice(1, -1)}</code>
          return <React.Fragment key={`${bi}-${i}`}>{p}</React.Fragment>
        })
      })}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{label}</span>
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "good" | "bad" | "primary" }) {
  return (
    <div className="rounded-xl border bg-card px-3.5 py-3">
      <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</div>
      <div className={cn("mt-0.5 font-display text-[1.7rem] leading-tight", tone === "good" && "text-good", tone === "bad" && "text-bad", tone === "primary" && "text-primary")}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function labSources(r: LabResult) {
  return r.candidates.filter((c) => c.selected).map((c, i) => ({ n: i + 1, label: `${c.chunk.doc_id} § ${c.chunk.section}` }))
}
