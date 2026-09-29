import { PageHeader, Callout } from "@/components/kit/scaffold"
import { Playground } from "@/components/playground/playground"

export const metadata = { title: "Playground" }

export default function PlaygroundPage() {
  return (
    <div className="xl:-mx-6">
      <PageHeader n="03" kicker="Playground" title="Turn every knob. See what changes."
        lead="Same engine, every setting exposed. Change one thing at a time and watch the chunks, scores, context, answer and timings move. The lecture rule: change one variable, predict the effect, then run." />
      <Playground />
      <div className="mt-8"><Callout tone="idea" title="How to run a good experiment">Ask a question the document can answer, note the retrieved chunks, then change <em>one</em> knob (say Top-K 2 → 6, or Vector → Hybrid) and run again. The “vs last run” deltas make the effect visible.</Callout></div>
    </div>
  )
}
