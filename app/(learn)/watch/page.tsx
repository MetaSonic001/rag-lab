import { PageHeader } from "@/components/kit/scaffold"
import { WatchRag } from "@/components/watch/watch-rag"

export const metadata = { title: "Watch RAG" }

export default function WatchPage() {
  return (
    <div>
      <PageHeader n="04" kicker="Watch" title="Make retrieval visible."
        lead="Run a question and watch it travel through nine stages. Every node is clickable: what it does, why it exists, what can go wrong, which technology is behind it, and the real data from this run." />
      <WatchRag />
    </div>
  )
}
