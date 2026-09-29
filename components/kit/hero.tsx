"use client"

/**
 * HeroUI primitives (Chip, Meter, Kbd), used sparingly and scoped: `.heroui-scope` in globals.css maps
 * HeroUI's tokens onto our palette so nothing else on the page is affected.
 */
import { Chip as HChip, Kbd as HKbd, Meter as HMeter } from "@heroui/react"

import { cn } from "@/lib/utils"

type Tone = "default" | "accent" | "success" | "warning" | "danger"

export function Chip({ children, tone = "default", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("heroui-scope inline-flex", className)}>
      <HChip color={tone} variant="soft" size="sm">
        {children}
      </HChip>
    </span>
  )
}

export function MeterBar({
  value, label, tone = "accent", display, className,
}: { value: number; label: string; tone?: "accent" | "success" | "warning" | "danger"; display?: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <span className={cn("heroui-scope block", className)}>
      <HMeter aria-label={label} value={pct} color={tone} size="sm" className="w-full">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <HMeter.Output className="font-mono text-foreground">{display ?? `${pct}%`}</HMeter.Output>
        </div>
        <HMeter.Track>
          <HMeter.Fill />
        </HMeter.Track>
      </HMeter>
    </span>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="heroui-scope inline-flex">
      <HKbd>{children}</HKbd>
    </span>
  )
}
