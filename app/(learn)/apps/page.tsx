import { PageHeader } from "@/components/kit/scaffold"
import { AppsLab } from "@/components/apps/apps-lab"

export const metadata = { title: "Applications" }

export default function AppsPage() {
  return (
    <div>
      <PageHeader n="09" kicker="Apply" title="Six domains, six different retrieval problems."
        lead="RAG is not one problem. Each domain below breaks basic retrieval in a different way, and each demo runs the real engine on a small corpus and counts whether the facts needed to answer reached the model." />
      <AppsLab />
    </div>
  )
}
