import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PageHeader, Section } from "@/components/kit/scaffold"
import { Term } from "@/components/kit/term"
import { TracingBeam } from "@/components/ui/tracing-beam"
import { ArchitectureDemo, CompareDemo, JourneyDemo, KnowsDemo, StartCallouts, UseCases } from "@/components/start/story"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Simple, Technical } from "@/lib/mode"

export const metadata = { title: "Start here" }

export default function StartPage() {
  return (
    <TracingBeam className="pl-6 sm:pl-2">
      <div className="pl-2 sm:pl-10">
        <PageHeader n="00" kicker="Start here · no knowledge assumed" title={<>Why can’t an AI just <em className="text-primary not-italic">answer</em> from your documents?</>}
          lead="Five minutes, no jargon. By the end you will know what RAG is, why it exists, and how a question travels through it." />

        <Section kicker="Step 1" title="What a language model knows, and what it doesn’t" lead={<>An <Term k="llm">LLM</Term> is impressive, but it learned from public text up to a cutoff date. Try asking it things.</>}>
          <KnowsDemo />
        </Section>

        <Section kicker="Step 2" title="Retrieval plus generation" lead="Follow the idea one box at a time. Press play, or click any box.">
          <JourneyDemo />
        </Section>

        <Section kicker="Step 3" title="So, what is RAG?">
          <div className="mb-5 max-w-2xl text-[16px] leading-relaxed">
            <Simple><Term k="rag">RAG</Term> means <strong>look it up, then answer</strong>. First the system searches your documents for the few passages relevant to the question. Then the language model writes an answer using only those passages, and shows where they came from.</Simple>
            <Technical><Term k="rag">Retrieval-Augmented Generation</Term> conditions an LLM on passages retrieved at query time from an external corpus. The corpus is updatable without retraining, and each claim can be attributed to a source.</Technical>
          </div>
          <StartCallouts />
        </Section>

        <Section kicker="Step 4" title="Why RAG exists" lead="Three problems, one idea.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Knowledge is frozen", "Models cannot know last week. Documents can be updated in seconds."], ["Your data is private", "Policies, manuals and tickets were never in the training set."], ["Answers must be checkable", "Citations let a human verify instead of trusting."]].map(([t, d]) => (
              <div key={t} className="rounded-xl border bg-card p-4"><div className="mb-1 font-display text-xl">{t}</div><p className="text-[13.5px] text-muted-foreground">{d}</p></div>
            ))}
          </div>
        </Section>

        <Section kicker="Step 5" title="RAG vs a normal LLM vs fine-tuning" lead="Three tools, three jobs. Then a quick test.">
          <CompareDemo />
        </Section>

        <Section kicker="Step 6" title="Where RAG is useful" lead="Any time answers should come from a body of text you own.">
          <UseCases />
        </Section>

        <Section kicker="Step 7" title="The basic architecture" lead={<>Two phases: prepare the documents once, then answer questions all day. Click any box.</>}>
          <ArchitectureDemo />
        </Section>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-5">
          <div className="min-w-0 flex-1"><div className="font-display text-2xl">Ready to open the box?</div><p className="text-[14px] text-muted-foreground">Next: twelve small concepts, each with a live demo: documents, tokens, chunking, embeddings and more.</p></div>
          <Link href="/fundamentals" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>01 Fundamentals <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </TracingBeam>
  )
}
