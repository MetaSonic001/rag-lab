"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { useBackend } from "@/lib/api"
import { LAYERS, TECH } from "@/content/stack"
import { Chip } from "@/components/kit/hero"
import { Kicker } from "@/components/kit/scaffold"

const LAYER_TINT: Record<string, string> = { ingest: "var(--primary)", chunk: "var(--primary)", embed: "var(--embed)", store: "var(--embed)", retrieve: "var(--retrieve)", orchestrate: "var(--rerank)", generate: "var(--generate)", evaluate: "var(--good)", graph: "var(--rerank)" }

export function StackMap() {
  const { status } = useBackend()
  const [layer, setLayer] = React.useState<string>("all")
  const shown = TECH.filter((t) => layer === "all" || t.layer === layer)
  return (
    <div className="space-y-8">
      <div className="scrollbar-thin overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-1.5">
          <button onClick={() => setLayer("all")} className={cn("rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-medium", layer === "all" ? "border-primary/60 bg-primary/10" : "bg-card hover:bg-accent")}>All layers</button>
          {LAYERS.map((l, i) => (
            <React.Fragment key={l.id}>
              <ArrowRight className="my-auto size-3.5 shrink-0 text-muted-foreground/40" />
              <button onClick={() => setLayer(l.id)} className={cn("w-40 rounded-xl border px-3.5 py-2.5 text-left transition-colors", layer === l.id ? "border-primary/60 bg-primary/10" : "bg-card hover:bg-accent")}>
                <div className="mb-0.5 flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: LAYER_TINT[l.id] }} /><span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span></div>
                <div className="text-[13px] font-medium">{l.label}</div><div className="text-[11px] leading-snug text-muted-foreground">{l.question}</div>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => {
          const installed = t.installed ? status?.libraries[t.installed] : undefined
          const tint = LAYER_TINT[t.layer]
          return (
            <div key={t.name} className="flex flex-col rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/25" style={{ borderTopColor: `color-mix(in oklch, ${tint} 55%, var(--border))`, borderTopWidth: 2 }}>
              <div className="mb-2 flex items-start justify-between gap-2"><h3 className="font-display text-xl leading-tight">{t.name}</h3><Kicker className="mt-1 shrink-0">{LAYERS.find((l) => l.id === t.layer)?.label}</Kicker></div>
              <p className="text-[13.5px] leading-relaxed"><span className="mr-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Role</span>{t.role}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground"><span className="mr-1 font-mono text-[10px] tracking-widest uppercase">Pick it when</span>{t.when}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                {t.lesson && <Link href="/source" className="rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-primary hover:underline">{t.lesson}</Link>}
                {installed !== undefined && <Chip tone={installed ? "success" : "default"}>{installed ? "installed" : "not installed"}</Chip>}
                {t.note && <Chip tone="warning">{t.note}</Chip>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
