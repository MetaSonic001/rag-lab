"use client"

import * as React from "react"
import { AlertTriangle, ChevronDown, Lightbulb, Sparkles, Telescope } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMode } from "@/lib/mode"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function PageHeader({
  n, kicker, title, lead, children, className,
}: { n?: string; kicker?: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("relative mb-10 animate-rise", className)}>
      <div className="mb-4 flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {n && <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-primary">{n}</span>}
        {kicker && <span>{kicker}</span>}
      </div>
      <h1 className="font-display text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl">{title}</h1>
      {lead && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{lead}</p>}
      {children && <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  )
}

export function Section({
  id, title, kicker, lead, children, className,
}: { id?: string; title?: React.ReactNode; kicker?: string; lead?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("mb-14 scroll-mt-24", className)}>
      {(title || kicker) && (
        <div className="mb-5">
          {kicker && <div className="mb-1.5 font-mono text-[11px] tracking-[0.16em] text-primary uppercase">{kicker}</div>}
          {title && <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h2>}
          {lead && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{lead}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

const TONES = {
  idea: { icon: Lightbulb, cls: "border-retrieve/30 bg-retrieve/[0.07]", ic: "text-retrieve", label: "Key idea" },
  analogy: { icon: Sparkles, cls: "border-generate/30 bg-generate/[0.07]", ic: "text-generate", label: "Think of it like this" },
  warn: { icon: AlertTriangle, cls: "border-bad/30 bg-bad/[0.07]", ic: "text-bad", label: "Common mistake" },
  deeper: { icon: Telescope, cls: "border-rerank/30 bg-rerank/[0.07]", ic: "text-rerank", label: "Go deeper" },
} as const

export function Callout({
  tone = "idea", title, children, className,
}: { tone?: keyof typeof TONES; title?: string; children: React.ReactNode; className?: string }) {
  const t = TONES[tone]
  const Icon = t.icon
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 text-[14px] leading-relaxed", t.cls, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.ic)} />
      <div className="min-w-0">
        <div className={cn("mb-1 font-mono text-[10.5px] tracking-[0.16em] uppercase", t.ic)}>{title ?? t.label}</div>
        <div className="text-foreground/90 [&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px]">{children}</div>
      </div>
    </div>
  )
}

/**
 * Progressive disclosure for intermediate students.
 * Collapsed when "I'm new to RAG" is on; open by default when it is off.
 */
export function GoDeeper({ title = "Go deeper", children }: { title?: string; children: React.ReactNode }) {
  const { newbie } = useMode()
  const [open, setOpen] = React.useState<boolean | null>(null)
  const isOpen = open ?? !newbie
  return (
    <Collapsible open={isOpen} onOpenChange={setOpen} className="rounded-xl border border-rerank/25 bg-rerank/[0.05]">
      <CollapsibleTrigger className="group flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium">
        <Telescope className="size-4 text-rerank" />
        <span>{title}</span>
        <span className="ml-1 rounded bg-rerank/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-rerank uppercase">intermediate</span>
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 text-[14px] leading-relaxed text-foreground/85">{children}</CollapsibleContent>
    </Collapsible>
  )
}

/** Where a number comes from. The lecture rule: never blur real measurements with demo values. */
const KINDS = {
  real: { label: "Measured", cls: "border-good/40 bg-good/10 text-good", tip: "Computed by running the real code on your machine right now." },
  llm: { label: "Live LLM", cls: "border-good/40 bg-good/10 text-good", tip: "Produced by a real call to the Groq model configured in .env." },
  proxy: { label: "Proxy", cls: "border-generate/40 bg-generate/10 text-generate", tip: "A cheap stand-in for the real metric (used when no API key is set)." },
  simulated: { label: "Simulated", cls: "border-generate/40 bg-generate/10 text-generate", tip: "Illustration only. Not produced by running the system." },
  extractive: { label: "Extractive fallback", cls: "border-generate/40 bg-generate/10 text-generate", tip: "No GROQ_API_KEY: the answer is stitched from source sentences, not written by an LLM." },
} as const

export function Provenance({ kind, className }: { kind: keyof typeof KINDS; className?: string }) {
  const k = KINDS[kind]
  return (
    <span title={k.tip} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-[1px] font-mono text-[10px] tracking-wider uppercase", k.cls, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {k.label}
    </span>
  )
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase", className)}>{children}</div>
}

export function Panel({
  title, kicker, right, children, className, bodyClassName,
}: { title?: React.ReactNode; kicker?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b bg-surface/60 px-4 py-2.5">
          <div className="min-w-0">
            {kicker && <Kicker>{kicker}</Kicker>}
            {title && <div className="truncate text-sm font-medium">{title}</div>}
          </div>
          {right}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  )
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/[0.07] px-3 py-2 text-[13px] text-bad">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
