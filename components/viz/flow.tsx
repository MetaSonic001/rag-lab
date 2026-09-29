"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export type FlowTone = "neutral" | "embed" | "retrieve" | "rerank" | "generate" | "good" | "bad" | "primary"
export type FlowNode = { id: string; label: string; sub?: string; x: number; y: number; w?: number; h?: number; tone?: FlowTone; icon?: React.ReactNode }
export type FlowEdge = { from: string; to: string; label?: string; dashed?: boolean; curve?: number }

const TONE: Record<FlowTone, string> = {
  neutral: "var(--muted-foreground)", embed: "var(--embed)", retrieve: "var(--retrieve)", rerank: "var(--rerank)",
  generate: "var(--generate)", good: "var(--good)", bad: "var(--bad)", primary: "var(--primary)",
}

/**
 * Generic animated pipeline / graph diagram.
 * Nodes are positioned in a W x H design space; the diagram scales with its container.
 * `active` nodes glow and the edges between consecutive active nodes carry a moving packet.
 */
export function FlowDiagram({
  nodes, edges, width, height, active = [], visited = [], selected, onSelect, className, minWidth = 720,
}: {
  nodes: FlowNode[]; edges: FlowEdge[]; width: number; height: number
  active?: string[]; visited?: string[]; selected?: string | null; onSelect?: (id: string) => void; className?: string; minWidth?: number
}) {
  const byId = React.useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, { w: 150, h: 56, ...n }])), [nodes])
  const uid = React.useId().replace(/:/g, "")

  function anchor(a: (typeof byId)[string], b: (typeof byId)[string]) {
    const dx = b.x - a.x, dy = b.y - a.y
    if (Math.abs(dx) * 0.6 >= Math.abs(dy)) {
      const s = dx >= 0 ? 1 : -1
      return { p1: [a.x + (s * a.w!) / 2, a.y], p2: [b.x - (s * b.w!) / 2, b.y], horizontal: true }
    }
    const s = dy >= 0 ? 1 : -1
    return { p1: [a.x, a.y + (s * a.h!) / 2], p2: [b.x, b.y - (s * b.h!) / 2], horizontal: false }
  }

  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <div className="relative mx-auto" style={{ minWidth, aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <marker id={`arr-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" fill="currentColor" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = byId[e.from], b = byId[e.to]
            if (!a || !b) return null
            const { p1, p2, horizontal } = anchor(a, b)
            const c = e.curve ?? 0.5
            const d = horizontal
              ? `M${p1[0]} ${p1[1]} C${p1[0] + (p2[0] - p1[0]) * c} ${p1[1]}, ${p2[0] - (p2[0] - p1[0]) * c} ${p2[1]}, ${p2[0]} ${p2[1]}`
              : `M${p1[0]} ${p1[1]} C${p1[0]} ${p1[1] + (p2[1] - p1[1]) * c}, ${p2[0]} ${p2[1] - (p2[1] - p1[1]) * c}, ${p2[0]} ${p2[1]}`
            const live = active.includes(e.from) && active.includes(e.to)
            const done = visited.includes(e.from) && visited.includes(e.to)
            const color = live || done ? TONE[a.tone ?? "primary"] : "var(--border)"
            return (
              <g key={i} style={{ color }}>
                <path id={`p-${uid}-${i}`} d={d} fill="none" stroke="currentColor" strokeWidth={live || done ? 1.8 : 1.3} strokeDasharray={e.dashed ? "5 5" : undefined} opacity={live || done ? 0.95 : 0.85} markerEnd={`url(#arr-${uid})`} />
                {live && (
                  <circle r="3.5" fill="currentColor">
                    <animateMotion dur="1.1s" repeatCount="indefinite"><mpath href={`#p-${uid}-${i}`} /></animateMotion>
                  </circle>
                )}
                {e.label && (
                  <text x={(p1[0] + p2[0]) / 2} y={(p1[1] + p2[1]) / 2 - 6} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">{e.label}</text>
                )}
              </g>
            )
          })}
        </svg>
        {nodes.map((n0) => {
          const n = byId[n0.id]
          const isActive = active.includes(n.id), isVisited = visited.includes(n.id), isSel = selected === n.id
          const color = TONE[n.tone ?? "neutral"]
          return (
            <motion.button
              key={n.id}
              type="button"
              onClick={() => onSelect?.(n.id)}
              initial={false}
              animate={{ scale: isActive ? 1.04 : 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border bg-card px-2 text-center shadow-sm transition-colors",
                onSelect ? "cursor-pointer hover:bg-accent" : "cursor-default",
                isSel && "ring-2 ring-primary",
              )}
              style={{
                left: `${(n.x / width) * 100}%`, top: `${(n.y / height) * 100}%`, width: `${(n.w! / width) * 100}%`, height: `${(n.h! / height) * 100}%`,
                borderColor: isActive || isVisited || isSel ? color : undefined,
                boxShadow: isActive ? `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)` : undefined,
              }}
            >
              <span className="flex items-center gap-1.5 text-[12.5px] leading-tight font-medium">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                {n.label}
              </span>
              {n.sub && <span className="mt-0.5 line-clamp-1 font-mono text-[10px] text-muted-foreground">{n.sub}</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
