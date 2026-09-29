import { PageHeader, Callout } from "@/components/kit/scaffold"
import { StackMap } from "@/components/stack/stack-map"

export const metadata = { title: "Technology map" }

export default function StackPage() {
  return (
    <div>
      <PageHeader kicker="Reference" title="Not a tech stack. A map of jobs."
        lead="Every library here has one job. Learn the job first (chunk, embed, store, retrieve, rerank, orchestrate, generate, evaluate) and the library becomes a swappable detail. Cards marked “installed” are running in this project; the rest are worth knowing." />
      <StackMap />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Callout tone="idea" title="LangChain vs LangGraph">LangChain composes <em>components</em> in a line. LangGraph adds <em>state, decisions and loops</em>. Use LangGraph when the workflow has branches or retries.</Callout>
        <Callout tone="idea" title="Bi-encoder vs cross-encoder">A bi-encoder embeds texts separately (fast, coarse). A cross-encoder reads the pair together (slow, precise). Use the first to shortlist and the second to reorder.</Callout>
        <Callout tone="idea" title="GroqCloud everywhere">All generation goes through one small LLM abstraction (<code>core/llm.py</code>). The model is set in <code>.env</code>; no lesson hard-codes it.</Callout>
      </div>
    </div>
  )
}
