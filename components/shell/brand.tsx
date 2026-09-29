import Link from "next/link"

import { cn } from "@/lib/utils"

/** A small mark: a document being cut into chunks, with one chunk lit (retrieved). */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--foreground)" />
      <rect x="7" y="8" width="18" height="3.4" rx="1.7" fill="var(--background)" opacity="0.5" />
      <rect x="7" y="14.3" width="18" height="3.4" rx="1.7" fill="var(--primary)" />
      <rect x="7" y="20.6" width="11" height="3.4" rx="1.7" fill="var(--background)" opacity="0.5" />
    </svg>
  )
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      <Mark />
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[1.35rem] leading-none tracking-tight">RAG&nbsp;LAB</span>
      </span>
    </Link>
  )
}
