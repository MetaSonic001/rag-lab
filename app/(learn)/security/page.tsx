import { PageHeader } from "@/components/kit/scaffold"
import { SecurityLab } from "@/components/security/security-lab"

export const metadata = { title: "Security lab" }

export default function SecurityPage() {
  return (
    <div>
      <PageHeader n="08" kicker="Attack" title="Attack your own RAG."
        lead="Five attacks against the RAGPAY knowledge base: prompt injection, untrusted documents, hallucination, source spoofing and data leakage. Each runs against a vulnerable and a defended pipeline, so you can see whether the poison reached the model." />
      <SecurityLab />
    </div>
  )
}
