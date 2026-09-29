import { PageHeader } from "@/components/kit/scaffold"
import { EvalLab } from "@/components/eval/eval-lab"

export const metadata = { title: "Evaluate" }

export default function EvalPage() {
  return (
    <div>
      <PageHeader n="07" kicker="Evaluate" title="Is it actually good?"
        lead="A RAG system that produces an answer is not necessarily a good RAG system. Measure retrieval and generation separately, then compare Basic, Hybrid and Reranked on the same questions." />
      <blockquote className="mb-10 border-l-2 border-primary pl-5 font-display text-2xl leading-snug sm:text-3xl">“It gave an answer” is not a metric.</blockquote>
      <EvalLab />
    </div>
  )
}
