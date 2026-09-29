"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { FUNDAMENTALS, type Concept } from "@/content/fundamentals"
import { Callout, PageHeader } from "@/components/kit/scaffold"
import { CodeBlock } from "@/components/kit/code-block"
import { DemoSlot } from "@/components/demos/slot"
import { Simple, Technical } from "@/lib/mode"
import { buttonVariants } from "@/components/ui/button"

const DOT: Record<Concept["color"], string> = { embed: "bg-embed", retrieve: "bg-retrieve", rerank: "bg-rerank", generate: "bg-generate", good: "bg-good", primary: "bg-primary" }

function Part({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 scroll-mt-24">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-6 place-items-center rounded-md border border-primary/40 bg-primary/10 font-mono text-[11px] text-primary">{n}</span>
        <h2 className="font-mono text-[12px] tracking-[0.18em] uppercase">{label}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  )
}

export function Stepper({ current }: { current?: string }) {
  return (
    <div className="scrollbar-thin -mx-1 mb-8 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max items-center gap-1">
        {FUNDAMENTALS.map((c, i) => (
          <React.Fragment key={c.slug}>
            <Link href={`/fundamentals/${c.slug}`} className={cn("group flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] transition-colors", current === c.slug ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <span className={cn("size-1.5 rounded-full", DOT[c.color])} />{c.title}
            </Link>
            {i < FUNDAMENTALS.length - 1 && <span className="h-px w-3 bg-border" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export function ConceptView({ c }: { c: Concept }) {
  const i = FUNDAMENTALS.findIndex((x) => x.slug === c.slug)
  const prev = FUNDAMENTALS[i - 1], next = FUNDAMENTALS[i + 1]
  return (
    <div>
      <Stepper current={c.slug} />
      <PageHeader n={c.n} kicker={`Fundamentals · concept ${c.n} of 12`} title={c.title} lead={c.tagline} />

      <Part n={1} label="What is it?">
        <div className="max-w-2xl text-[16px] leading-relaxed">
          <Simple>{c.what.simple}</Simple>
          <Technical><p>{c.what.simple}</p><p className="mt-3 border-l-2 border-primary/50 pl-3 text-[14.5px] text-muted-foreground">{c.what.tech}</p></Technical>
        </div>
      </Part>

      <Part n={2} label="Why do we need it?">
        <div className="max-w-2xl text-[16px] leading-relaxed">
          <Simple>{c.why.simple}</Simple>
          <Technical><p>{c.why.simple}</p><p className="mt-3 border-l-2 border-primary/50 pl-3 text-[14.5px] text-muted-foreground">{c.why.tech}</p></Technical>
        </div>
      </Part>

      <Part n={3} label="Visual example">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {c.visual.steps.map((s, k) => (
              <React.Fragment key={k}>
                <div className="min-w-0 flex-1 rounded-xl border bg-background p-3.5">
                  <div className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{s.label}</div>
                  <div className={cn("text-[13px] leading-relaxed whitespace-pre-wrap", s.mono && "font-mono text-[12px]")}>{s.text}</div>
                </div>
                {k < c.visual.steps.length - 1 && <ArrowRight className="mx-auto size-4 shrink-0 rotate-90 text-primary md:rotate-0" />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">{c.visual.caption}</p>
        </div>
      </Part>

      <Part n={4} label="Tiny interactive demo"><DemoSlot name={c.demo} /></Part>

      <Part n={5} label="Code example">
        <CodeBlock code={c.code.code} lang={c.code.lang} title={c.code.title} highlight={c.code.highlight} />
      </Part>

      <Part n={6} label="Common mistake"><Callout tone="warn" title={c.mistake.title}>{c.mistake.body}</Callout></Part>

      <div className="mt-12 flex items-center justify-between gap-3 border-t pt-6">
        {prev ? <Link href={`/fundamentals/${prev.slug}`} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}><ArrowLeft className="size-4" />{prev.title}</Link> : <span />}
        {next ? <Link href={`/fundamentals/${next.slug}`} className={cn(buttonVariants(), "gap-2")}>{next.title}<ArrowRight className="size-4" /></Link>
          : <Link href="/build" className={cn(buttonVariants(), "gap-2")}>02 Build your first RAG<ArrowRight className="size-4" /></Link>}
      </div>
    </div>
  )
}
