import { Suspense } from "react"

import { PageHeader } from "@/components/kit/scaffold"
import { SourceExplorer } from "@/components/source/source-explorer"

export const metadata = { title: "Source explorer" }

export default function SourcePage() {
  return (
    <div>
      <PageHeader kicker="Reference" title="Open the code. Diff the lessons."
        lead="Eleven backend lessons, one idea each. Read a lesson’s README and code here, or diff it against the previous lesson to show students exactly what changed." />
      <Suspense fallback={null}><SourceExplorer /></Suspense>
    </div>
  )
}
