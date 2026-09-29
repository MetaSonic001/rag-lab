import { PageHeader, Callout } from "@/components/kit/scaffold"
import { CodeRag } from "@/components/coderag/code-rag"

export const metadata = { title: "Code RAG" }

export default function CodeRagPage() {
  return (
    <div>
      <PageHeader n="10" kicker="Apply" title="Ask questions of a codebase."
        lead="Code is not prose. Chunk by function, search by meaning and by identifier, and cite file and line numbers so every answer can be verified in the editor." />
      <CodeRag />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Callout tone="idea" title="1 · Chunk by syntax">Python’s <code>ast</code> module gives one chunk per function or class, with exact start and end lines.</Callout>
        <Callout tone="idea" title="2 · Two ways to search">Vectors find “where do we check passwords?”. BM25 on split identifiers finds <code>verify_token</code>.</Callout>
        <Callout tone="idea" title="3 · Cite lines">Answers point to <code>auth/routes.py:17-25</code>, so a developer can click and check.</Callout>
      </div>
    </div>
  )
}
