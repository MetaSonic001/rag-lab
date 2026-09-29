import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { FUNDAMENTALS } from "@/content/fundamentals"
import { PageHeader } from "@/components/kit/scaffold"

export const metadata = { title: "Fundamentals" }

const GROUPS: [string, string[]][] = [
  ["Prepare the knowledge", ["documents", "extraction", "tokens", "chunking"]],
  ["Make it searchable", ["embeddings", "similarity", "vector-databases"]],
  ["Find and answer", ["retrieval", "context", "prompting", "llm", "citations"]],
]

export default function FundamentalsPage() {
  return (
    <div>
      <PageHeader n="01" kicker="Fundamentals" title="Twelve ideas, in the order you need them."
        lead="Each concept follows the same six beats: what it is, why we need it, a visual example, a tiny live demo, code, and the classic mistake. Nothing assumes you know embeddings, vector databases or LangChain." />
      <div className="space-y-10">
        {GROUPS.map(([label, slugs]) => (
          <div key={label}>
            <div className="mb-3 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">{label}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {slugs.map((s) => {
                const c = FUNDAMENTALS.find((x) => x.slug === s)!
                return (
                  <Link key={s} href={`/fundamentals/${s}`} className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_40px_-22px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
                    <span className="absolute top-3 right-4 font-display text-6xl leading-none text-foreground/[0.06] transition-colors group-hover:text-primary/15">{c.n}</span>
                    <div className="font-display text-2xl">{c.title}</div>
                    <p className="mt-1 text-[14px] text-muted-foreground">{c.tagline}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-[12.5px] text-primary">Live demo: {c.demoTitle}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
