"use client"

import * as React from "react"
import { Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErrorNote } from "@/components/kit/scaffold"
import { Spinner } from "@/components/viz/rag-parts"

export function DemoFrame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      <div className="flex items-center gap-2 border-b bg-surface/60 px-4 py-2.5">
        <span className="size-1.5 animate-pulse-soft rounded-full bg-primary" />
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-primary uppercase">Live demo</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

export function RunButton({ onClick, loading, children = "Run", disabled }: { onClick: () => void; loading?: boolean; children?: React.ReactNode; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={loading || disabled} size="sm" className="gap-1.5">
      {loading ? <Spinner /> : <><Play className="size-3.5 fill-current" />{children}</>}
    </Button>
  )
}

export function Presets({ items, onPick, active }: { items: string[]; onPick: (s: string) => void; active?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((p) => (
        <button key={p} type="button" onClick={() => onPick(p)}
          className={cn("rounded-full border px-2.5 py-1 text-[12px] transition-colors hover:bg-accent", active === p ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground")}>
          {p}
        </button>
      ))}
    </div>
  )
}

export function Labeled({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

export { ErrorNote }
