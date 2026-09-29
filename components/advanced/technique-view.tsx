"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Braces, Scale } from "lucide-react"

import { cn } from "@/lib/utils"
import { TECHNIQUES, type Technique } from "@/content/advanced"
import { Callout, GoDeeper, PageHeader } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { FlowDiagram } from "@/components/viz/flow"
import { ADV_DEMOS } from "@/components/advanced/demos"
import { buttonVariants } from "@/components/ui/button"
import { Simple, Technical } from "@/lib/mode"

export function TechniqueRail({ current }: { current?: string }) {
  return (
    <div className="scrollbar-thin -mx-1 mb-8 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max items-center gap-1">
        {TECHNIQUES.map((t, i) => (
          <React.Fragment key={t.slug}>
            <Link href={`/advanced/${t.slug}`} className={cn("flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] transition-colors", current === t.slug ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <span className="font-mono text-[10px] text-primary">{t.n}</span>{t.title}
            </Link>
            {i < TECHNIQUES.length - 1 && <ArrowRight className="size-3 text-muted-foreground/40" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export function TechniqueView({ t }: { t: Technique }) {
  const i = TECHNIQUES.findIndex((x) => x.slug === t.slug)
  const prev = TECHNIQUES[i - 1], next = TECHNIQUES[i + 1]
  const Demo = ADV_DEMOS[t.demo]
  return (
    <div>
      <TechniqueRail current={t.slug} />
      <PageHeader n={t.n} kicker={`Advanced RAG · step ${i + 1} of ${TECHNIQUES.length}`} title={t.title} />

      <div className="mb-8 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-bad/30 bg-bad/[0.05] p-5"><div className="mb-1 font-mono text-[10.5px] tracking-[0.16em] text-bad uppercase">Which problem does this solve?</div><p className="font-display text-2xl leading-snug">{t.solves}</p><p className="mt-2 text-[13.5px] text-muted-foreground">Symptom: {t.symptom}</p></div>
        <div className="rounded-2xl border border-good/30 bg-good/[0.05] p-5"><div className="mb-1 font-mono text-[10.5px] tracking-[0.16em] text-good uppercase">The idea</div>
          <p className="text-[15px] leading-relaxed"><Simple>{t.idea.simple}</Simple><Technical>{t.idea.simple} <span className="text-muted-foreground">{t.idea.tech}</span></Technical></p></div>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-3"><h2 className="font-mono text-[12px] tracking-[0.18em] uppercase">Architecture</h2>{t.flow.added.length > 0 ? <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><span className="size-2 rounded-full bg-primary" />glowing boxes are new in this step</span> : <span className="text-[12px] text-muted-foreground">the baseline everything else builds on</span>}</div>
        <div className="rounded-2xl border bg-card p-3 sm:p-5"><FlowDiagram nodes={t.flow.nodes} edges={t.flow.edges} width={t.flow.w} height={t.flow.h} active={t.flow.added} visited={t.flow.nodes.map((n) => n.id)} minWidth={760} /></div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center gap-3"><h2 className="font-mono text-[12px] tracking-[0.18em] uppercase">Try it, for real</h2><div className="h-px flex-1 bg-border" /></div>
        {Demo && <Demo />}
      </section>

      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <Callout tone="idea" title="Trade-off"><span className="flex items-start gap-2"><Scale className="mt-0.5 size-4 shrink-0" />{t.tradeoff}</span></Callout>
        <div className="rounded-xl border bg-card p-4"><div className="mb-2 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">Technology used</div><div className="flex flex-wrap gap-1.5">{t.stack.map((s) => <Chip key={s} tone="accent">{s}</Chip>)}</div>
          {t.lesson && <Link href={`/source?module=${t.lesson}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"><Braces className="size-3.5" />Open backend/{t.lesson}</Link>}</div>
      </div>
      <GoDeeper>{t.deeper}</GoDeeper>

      <div className="mt-12 flex items-center justify-between gap-3 border-t pt-6">
        {prev ? <Link href={`/advanced/${prev.slug}`} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}><ArrowLeft className="size-4" />{prev.title}</Link> : <span />}
        {next ? <Link href={`/advanced/${next.slug}`} className={cn(buttonVariants(), "gap-2")}>{next.title}<ArrowRight className="size-4" /></Link> : <Link href="/eval" className={cn(buttonVariants(), "gap-2")}>07 Evaluate<ArrowRight className="size-4" /></Link>}
      </div>
    </div>
  )
}
