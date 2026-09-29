import { PageHeader } from "@/components/kit/scaffold"
import { BreakLab } from "@/components/break/break-lab"

export const metadata = { title: "Break RAG" }

export default function BreakPage() {
  return (
    <div>
      <PageHeader n="05" kicker="Break" title="Break it. Then fix it."
        lead="Six deliberately broken systems. Run each one, read the measured symptom, learn the cause, then apply the fix and compare. Facts found in the context are counted by the code, not judged by an AI." />
      <BreakLab />
    </div>
  )
}
