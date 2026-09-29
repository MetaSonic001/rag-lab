"use client"

import * as React from "react"
import { CheckCircle2, CircleSlash, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RResult } from "@/lib/ragpay"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Chip, MeterBar } from "@/components/kit/hero"
import { Kicker, Provenance } from "@/components/kit/scaffold"
import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/viz/flow"
import { ScoreBar, fmtMs } from "@/components/viz/rag-parts"

const PIPE: FlowNode[] = [
  { id: "understand", label: "Understand", sub: "intent · rewrite", x: 75, y: 60, tone: "generate", w: 120, h: 48 },
  { id: "vector", label: "Vector", sub: "Chroma", x: 235, y: 28, tone: "retrieve", w: 84, h: 40 },
  { id: "bm25", label: "BM25", sub: "keywords", x: 235, y: 92, tone: "embed", w: 84, h: 40 },
  { id: "fusion", label: "Fusion", sub: "RRF", x: 360, y: 60, tone: "primary", w: 84, h: 48 },
  { id: "rerank", label: "Rerank", sub: "cross-enc.", x: 480, y: 60, tone: "rerank", w: 90, h: 48 },
  { id: "filter", label: "Filter", sub: "threshold", x: 595, y: 60, tone: "rerank", w: 84, h: 48 },
  { id: "generate", label: "Groq", sub: "grounded", x: 705, y: 60, tone: "generate", w: 84, h: 48 },
  { id: "ground", label: "Ground", sub: "signals", x: 810, y: 28, tone: "good", w: 84, h: 40 },
  { id: "escalate", label: "Escalate?", sub: "policy", x: 810, y: 92, tone: "bad", w: 84, h: 40 },
]
const PIPE_EDGES: FlowEdge[] = [
  { from: "understand", to: "vector" }, { from: "understand", to: "bm25" }, { from: "vector", to: "fusion" }, { from: "bm25", to: "fusion" },
  { from: "fusion", to: "rerank" }, { from: "rerank", to: "filter" }, { from: "filter", to: "generate" }, { from: "generate", to: "ground" }, { from: "generate", to: "escalate" },
]
export const PIPE_ORDER = ["understand", "vector", "bm25", "fusion", "rerank", "filter", "generate", "ground", "escalate"]

export function PipelineStrip({ done, active }: { done: string[]; active?: string[] }) {
  return <FlowDiagram nodes={PIPE} edges={PIPE_EDGES} width={900} height={120} active={active ?? []} visited={done} minWidth={720} />
}

const bandTone = { high: "success", medium: "warning", low: "danger" } as const

export function Inspector({ r, onOpenSource }: { r: RResult | null; onOpenSource: (doc: string, section?: string) => void }) {
  if (!r) return <div className="grid h-full min-h-72 place-items-center px-6 text-center text-[13px] text-muted-foreground">Ask a question. The inspector shows the pipeline’s trace, every retrieved chunk with its scores, and the evidence behind the answer.</div>
  const g = r.grounding
  return (
    <Tabs defaultValue="trace" className="gap-0">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b px-2">
        <TabsTrigger value="trace">Trace</TabsTrigger><TabsTrigger value="retrieved">Retrieved ({r.candidates.length})</TabsTrigger><TabsTrigger value="grounding">Grounding</TabsTrigger>
      </TabsList>

      <TabsContent value="trace" className="space-y-4 p-4">
        <div className="rounded-xl border bg-background p-2"><PipelineStrip done={PIPE.map((n) => n.id)} /></div>
        <p className="text-[11.5px] text-muted-foreground">This is the pipeline’s own trace: what each step did and measured. It is not a model’s hidden reasoning.</p>
        <ol className="space-y-0">
          {r.steps.map((s, i) => (
            <li key={s.id} className="relative flex gap-3 pb-3.5 last:pb-0">
              {i < r.steps.length - 1 && <span className="absolute top-5 bottom-0 left-[8px] w-px bg-border" />}
              <span className="relative mt-1 size-[17px] shrink-0 rounded-full border-2 border-primary bg-card" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px] font-medium">{s.label}<span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">{fmtMs(s.ms)}</span></div>
                <div className="text-[12px] text-muted-foreground">{s.summary}</div>
                {s.id === "understand" && (
                  <div className="mt-1.5 space-y-1 rounded-lg border bg-background p-2.5 text-[11.5px]">
                    <div><span className="text-muted-foreground">intent</span> <Chip tone="accent">{r.understanding.intent}</Chip> <span className="text-muted-foreground">via</span> {r.understanding.by}</div>
                    <div><span className="text-muted-foreground">search query</span> <span className="font-mono">{r.understanding.rewritten}</span></div>
                    {Object.entries(r.understanding.entities).filter(([, v]) => v.length).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k.replace("_", " ")}</span> <span className="font-mono">{v.join(", ")}</span></div>)}
                    {r.understanding.escalation_flags.length > 0 && <div className="text-bad">sensitive: {r.understanding.escalation_flags.join(", ")}</div>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between border-t pt-3 text-[12px]"><span className="text-muted-foreground">Total pipeline latency</span><span className="font-mono">{fmtMs(r.latency_ms)}</span></div>
      </TabsContent>

      <TabsContent value="retrieved" className="space-y-2 p-4">
        <div className="mb-1 flex items-center justify-between"><Kicker>Reranked candidates</Kicker><Provenance kind="real" /></div>
        {r.candidates.map((c) => (
          <button key={c.rank} onClick={() => onOpenSource(c.doc, c.section)} className={cn("w-full rounded-xl border p-3 text-left transition-colors hover:bg-accent", c.kept ? "border-primary/40 bg-primary/[0.05]" : "bg-background opacity-70")}>
            <div className="mb-1.5 flex items-center gap-2"><span className={cn("grid size-5 place-items-center rounded font-mono text-[10px] font-semibold", c.kept ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{c.rank}</span><FileText className="size-3 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{c.doc}</span>{c.kept ? <CheckCircle2 className="size-3.5 text-good" /> : <CircleSlash className="size-3.5 text-muted-foreground" />}</div>
            <div className="mb-1.5 truncate text-[11px] text-muted-foreground">§ {c.section}</div>
            <div className="space-y-1"><ScoreBar label="rerank" value={c.relevance} color="var(--rerank)" />
              <div className="flex gap-3 font-mono text-[10.5px] text-muted-foreground"><span>vector #{c.vector_rank ?? "–"}</span><span>bm25 #{c.bm25_rank ?? "–"}</span><span>rrf {c.rrf_score.toFixed(3)}</span></div></div>
          </button>
        ))}
        <p className="text-[11.5px] text-muted-foreground">Highlighted chunks passed the context filter (rerank probability ≥ 0.12) and were sent to the model.</p>
      </TabsContent>

      <TabsContent value="grounding" className="space-y-4 p-4">
        {!g ? <p className="text-[13px] text-muted-foreground">No grounding check: the model declined to answer or nothing relevant was retrieved.</p> : (
          <>
            <div className="rounded-xl border bg-background p-4">
              <div className="mb-2 flex items-baseline justify-between"><Kicker>Grounding score</Kicker><span className="font-display text-3xl">{g.score.toFixed(2)}</span></div>
              <MeterBar value={g.score} label={`${g.band} confidence`} tone={bandTone[g.band] === "success" ? "success" : bandTone[g.band] === "warning" ? "warning" : "danger"} />
            </div>
            <div className="space-y-3 rounded-xl border bg-background p-4">
              <Kicker>Signals (each is computed, none guessed)</Kicker>
              <MeterBar value={g.signals.retrieval_confidence} label={`Retrieval confidence · weight ${g.weights.retrieval_confidence}`} tone="accent" display={g.signals.retrieval_confidence.toFixed(2)} />
              <MeterBar value={g.signals.evidence_support} label={`Evidence support · weight ${g.weights.evidence_support}`} tone="accent" display={`${Math.round(g.signals.evidence_support * 100)}%`} />
              <MeterBar value={g.signals.citation_coverage} label={`Citation coverage · weight ${g.weights.citation_coverage}`} tone="accent" display={`${Math.round(g.signals.citation_coverage * 100)}%`} />
              <MeterBar value={g.signals.numeric_consistency} label={`Numeric consistency · weight ${g.weights.numeric_consistency}`} tone="accent" display={`${Math.round(g.signals.numeric_consistency * 100)}%`} />
              <p className="text-[11.5px] text-muted-foreground">{g.signals.source_count} distinct source document(s). Numeric consistency checks that every number in the answer also appears in the sources.</p>
            </div>
            <div className="space-y-2"><Kicker>Evidence map: sentence → source</Kicker>
              {g.evidence_map.map((e, i) => (
                <div key={i} className="rounded-lg border bg-background p-2.5 text-[12px]"><div className="mb-1 flex items-center gap-1.5"><Chip tone={e.supported ? "success" : "danger"}>{e.supported ? "supported" : "weak support"}</Chip><span className="font-mono text-[10.5px] text-muted-foreground">overlap {Math.round(e.overlap * 100)}%</span></div><p className="leading-relaxed">{e.sentence}</p>{e.best_source && <button className="mt-1 font-mono text-[10.5px] text-primary hover:underline" onClick={() => onOpenSource(e.best_source!.doc, e.best_source!.section)}>↳ {e.best_source.doc} § {e.best_source.section}</button>}</div>
              ))}</div>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
