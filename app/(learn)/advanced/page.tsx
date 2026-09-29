import Link from "next/link"
import { ArrowDown } from "lucide-react"

import { TECHNIQUES } from "@/content/advanced"
import { PageHeader } from "@/components/kit/scaffold"

export const metadata = { title: "Advanced RAG" }

export default function AdvancedPage() {
  return (
    <div>
      <PageHeader n="06" kicker="Advanced" title="Every technique is a fix for something that broke."
        lead="Start from basic RAG and climb the ladder. Each rung names the problem it solves, redraws the architecture so you can see what changed, and lets you run it on real data." />
      <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-[19px] before:w-px before:bg-border">
        {TECHNIQUES.map((t, i) => (
          <li key={t.slug} className="relative pl-14">
            <span className="absolute top-3 left-0 grid size-10 place-items-center rounded-full border bg-card font-display text-xl text-primary">{t.n}</span>
            <Link href={`/advanced/${t.slug}`} className="group block rounded-2xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-[0_14px_40px_-24px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
              <div className="flex flex-wrap items-baseline gap-x-3"><h2 className="font-display text-2xl group-hover:text-primary">{t.title}</h2>{t.lesson && <span className="font-mono text-[11px] text-muted-foreground">{t.lesson}</span>}</div>
              <p className="mt-1 text-[14px]"><span className="text-bad">Problem:</span> {t.solves}</p>
              <p className="text-[13px] text-muted-foreground">Symptom: {t.symptom}</p>
            </Link>
            {i < TECHNIQUES.length - 1 && <ArrowDown className="mx-auto hidden" />}
          </li>
        ))}
      </ol>
    </div>
  )
}
