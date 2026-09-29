"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, BookOpen, Briefcase, Code2, Factory, Headset, Landmark, Scale } from "lucide-react"

import { cn } from "@/lib/utils"
import { runLab, type LabRunOptions } from "@/lib/lab"
import type { LabResult } from "@/lib/types"
import { APPS, type AppScenario } from "@/content/apps"
import { Button } from "@/components/ui/button"
import { Callout, ErrorNote, Kicker, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { ChunkCard, Spinner } from "@/components/viz/rag-parts"

const ICON: Record<string, React.ComponentType<{ className?: string }>> = { education: BookOpen, code: Code2, finance: Landmark, legal: Scale, manufacturing: Factory, support: Headset }

function Side({ label, tone, res, facts }: { label: string; tone: "bad" | "good"; res: LabResult | null; facts: string[] }) {
  const fc = res?.measured.fact_coverage
  const ok = fc && fc.found.length === fc.total
  return (
    <div className={cn("space-y-3 rounded-2xl border p-4", res ? (ok ? "border-good/35 bg-good/[0.04]" : "border-bad/35 bg-bad/[0.04]") : "bg-card")}>
      <div className="flex items-center justify-between"><span className={cn("font-mono text-[11px] tracking-[0.16em] uppercase", tone === "good" ? "text-good" : "text-bad")}>{label}</span>{res && <Provenance kind="real" />}</div>
      {!res && <p className="py-8 text-center text-[13px] text-muted-foreground">Run the comparison.</p>}
      {res && fc && (
        <>
          <div className="flex items-center gap-3"><span className={cn("font-display text-4xl", ok ? "text-good" : "text-bad")}>{fc.found.length}/{fc.total}</span><span className="text-[12.5px] text-muted-foreground">facts needed to answer are in the retrieved context</span></div>
          <div className="flex flex-wrap gap-1.5">{fc.found.map((f) => <Chip key={f} tone="success">✓ {f}</Chip>)}{fc.missing.map((f) => <Chip key={f} tone="danger">✕ {f}</Chip>)}</div>
          <div className="space-y-2">{res.candidates.filter((c) => c.selected).map((c, i) => <ChunkCard key={c.chunk.id} c={c} index={i} highlight={facts} />)}
            {res.candidates.every((c) => !c.selected) && <p className="rounded-lg border border-dashed bg-background p-3 text-[12.5px] text-muted-foreground">Nothing retrieved: no shared words with the question.</p>}</div>
        </>
      )}
    </div>
  )
}

export function AppsLab() {
  const [id, setId] = React.useState(APPS[0].id)
  const [ra, setRa] = React.useState<LabResult | null>(null)
  const [rb, setRb] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showDocs, setShowDocs] = React.useState(false)
  const s = APPS.find((x) => x.id === id) as AppScenario

  const run = React.useCallback(async (sc: AppScenario) => {
    setLoading(true); setError(null)
    const cfg = (o: LabRunOptions, docs?: unknown) => ({ corpus: sc.corpus ?? "attendance", inline_docs: docs ?? sc.docs ?? null, generate: false, facts: sc.facts, ...o }) as LabRunOptions
    try { const [a, b] = await Promise.all([runLab(sc.question, cfg(sc.a)), runLab(sc.question, cfg(sc.b))]); setRa(a); setRb(b) }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }, [])
  React.useEffect(() => { setRa(null); setRb(null); setShowDocs(false); run(s) }, [s, run])

  const docs = s.docs ?? (s.a.inline_docs as { id: string; title: string; text: string }[] | undefined)
  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <nav className="space-y-1.5 lg:sticky lg:top-20 lg:self-start">
        {APPS.map((x) => { const Icon = ICON[x.id] ?? Briefcase; return (
          <button key={x.id} onClick={() => setId(x.id)} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors", id === x.id ? "border-primary/50 bg-primary/10" : "bg-card hover:bg-accent")}>
            <Icon className={cn("mt-0.5 size-4 shrink-0", id === x.id ? "text-primary" : "text-muted-foreground")} />
            <span><span className="block text-[13.5px] font-medium">{x.domain}</span><span className="block text-[11.5px] text-muted-foreground">{x.problem}</span></span>
          </button>) })}
      </nav>

      <div className="min-w-0 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2"><Kicker className="text-primary">Retrieval problem</Kicker><Chip tone="warning">{s.problem}</Chip><span className="text-[12px] text-muted-foreground">fixed by</span><Chip tone="success">{s.fixWith}</Chip></div>
            <h2 className="mt-2 font-display text-3xl">{s.domain}</h2>
            <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">{s.blurb}</p>
            <div className="mt-4 rounded-xl border bg-background px-4 py-3 text-[15px]"><span className="mr-2 font-mono text-[10.5px] tracking-widest text-muted-foreground uppercase">Question</span>{s.question}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={() => run(s)} disabled={loading} className="gap-2">{loading ? <Spinner label="Running both" /> : "Run both retrievers again"}</Button>
              {docs && <button onClick={() => setShowDocs((v) => !v)} className="text-[13px] text-primary hover:underline">{showDocs ? "Hide" : "Show"} the {docs.length} documents</button>}</div>
            {showDocs && docs && <div className="mt-3 grid gap-2 sm:grid-cols-2">{docs.map((dd) => <pre key={dd.id} className="scrollbar-thin max-h-32 overflow-auto rounded-lg border bg-background p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{dd.text}</pre>)}</div>}
          </motion.div>
        </AnimatePresence>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid gap-4 xl:grid-cols-2"><Side label={s.labelA} tone="bad" res={ra} facts={s.facts} /><Side label={s.labelB} tone="good" res={rb} facts={s.facts} /></div>
        <Callout tone="idea" title="What this shows">{s.takeaway}</Callout>
        <Link href={s.learnMore.href} className="inline-flex items-center gap-1.5 text-[13.5px] text-primary hover:underline">{s.learnMore.label}<ArrowRight className="size-3.5" /></Link>
      </div>
    </div>
  )
}
