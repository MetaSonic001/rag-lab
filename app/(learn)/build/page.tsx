import { PageHeader } from "@/components/kit/scaffold"
import { BuildLab } from "@/components/build/build-lab"
import { Callout } from "@/components/kit/scaffold"
import { Terminal } from "@/components/kit/code-block"

export const metadata = { title: "Build your first RAG" }

export default function BuildPage() {
  return (
    <div>
      <PageHeader n="02" kicker="Build" title="Build your first RAG, one stage at a time."
        lead="Every stage below runs real code on a real document. Run it, inspect the output, then run the next. Upload your own PDF and the same pipeline works on it." />
      <BuildLab />
      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <Callout tone="idea" title="No framework, on purpose">This lesson uses no LangChain and no vector database, so nothing is hidden. Lesson 02 in the backend (<code>02_langchain_rag</code>) rebuilds the same pipeline with LangChain and Chroma. Compare the two in the Source explorer.</Callout>
        <Terminal title="run it yourself" lines={[{ kind: "cmd", text: "bun run dev:all" }, { kind: "out", text: "api  → http://localhost:8000  (FastAPI, Groq key from .env)" }, { kind: "out", text: "web  → http://localhost:3000" }, { kind: "ok", text: "open backend/01_basic_rag/rag.py and follow along" }]} />
      </div>
    </div>
  )
}
