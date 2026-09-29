"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export type PlotPoint = { id: string | number; x: number; y: number; label?: string; rank?: number; kind?: "chunk" | "hit" | "query" | "other" }

/** A 2-D map of embedding space. Points near each other mean similar texts. */
export function VectorPlot({ points, height = 300, className, onHover }: { points: PlotPoint[]; height?: number; className?: string; onHover?: (p: PlotPoint | null) => void }) {
  const [hover, setHover] = React.useState<PlotPoint | null>(null)
  const { pts, W } = React.useMemo(() => {
    const W = 640
    if (!points.length) return { pts: [] as (PlotPoint & { px: number; py: number })[], W }
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const pad = 34
    const sx = (v: number) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - pad * 2)
    const sy = (v: number) => pad + (1 - (v - y0) / (y1 - y0 || 1)) * (height - pad * 2)
    return { pts: points.map((p) => ({ ...p, px: sx(p.x), py: sy(p.y) })), W }
  }, [points, height])
  const query = pts.find((p) => p.kind === "query")

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-dots bg-card", className)}>
      <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-label="2D projection of chunk embeddings">
        {query &&
          pts.filter((p) => p.kind === "hit").map((p) => (
            <motion.line key={`l-${p.id}`} x1={query.px} y1={query.py} x2={p.px} y2={p.py} stroke="var(--primary)" strokeWidth="1.2" strokeDasharray="3 4" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.7 }} transition={{ duration: 0.6 }} />
          ))}
        {pts.filter((p) => p.kind !== "query").map((p, i) => {
          const hit = p.kind === "hit"
          return (
            <motion.g key={p.id} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i * 0.015, 0.5), type: "spring", stiffness: 300, damping: 20 }} style={{ transformOrigin: `${p.px}px ${p.py}px` }}
              onMouseEnter={() => { setHover(p); onHover?.(p) }} onMouseLeave={() => { setHover(null); onHover?.(null) }}>
              <circle cx={p.px} cy={p.py} r={hit ? 9 : 6.5} fill={hit ? "var(--retrieve)" : "var(--muted-foreground)"} opacity={hit ? 0.95 : 0.5} className="cursor-pointer" />
              {hit && p.rank && <text x={p.px} y={p.py + 3.5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--background)">{p.rank}</text>}
            </motion.g>
          )
        })}
        {query && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ transformOrigin: `${query.px}px ${query.py}px` }}>
            <circle cx={query.px} cy={query.py} r="14" fill="var(--primary)" opacity="0.18" className="animate-pulse-soft" />
            <path d={`M${query.px} ${query.py - 9} l3 6.5 7 .8 -5.3 4.6 1.6 7 -6.3 -3.8 -6.3 3.8 1.6 -7 -5.3 -4.6 7 -.8z`} fill="var(--primary)" />
            <text x={query.px + 14} y={query.py - 10} fontSize="11" fontWeight="600" fill="var(--primary)">question</text>
          </motion.g>
        )}
      </svg>
      {hover?.label && (
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <span className="line-clamp-2">{hover.label}</span>
        </div>
      )}
    </div>
  )
}
