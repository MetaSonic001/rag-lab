export type RCase = {
  id: string; title: string; category: string; priority: string; customer: string; message: string
  facts: { label: string; value: string }[]; expected_docs: string[]; hard: boolean
}
export type RCandidate = {
  rank: number; doc: string; title: string; section: string; category: string; text: string; kept: boolean
  vector_rank: number | null; vector_score: number | null; bm25_rank: number | null; bm25_score: number | null
  rrf_score: number; rerank_score: number; relevance: number
}
export type RKept = RCandidate & { n: number }
export type RStep = { id: string; label: string; ms: number; summary: string; detail: unknown }
export type RGround = {
  signals: { retrieval_confidence: number; evidence_support: number; citation_coverage: number; numeric_consistency: number; source_count: number }
  score: number; band: "high" | "medium" | "low"; weights: Record<string, number>
  evidence_map: { sentence: string; supported: boolean; overlap: number; best_source: { doc: string; section: string } | null }[]
}
export type REscalation = {
  needed: boolean; blocking?: boolean; reasons?: string[]
  ticket?: { priority: string; sla: string; summary: string; identifiers: string[]; intent: string; attach: string[] }
}
export type RResult = {
  question: string
  understanding: { intent: string; entities: Record<string, string[]>; escalation_flags: string[]; rewritten: string; by: string; error: string | null }
  steps: RStep[]; candidates: RCandidate[]; kept: RKept[]
  answer: { answer: string; mode: string; model: string; latency_ms: number; prompt_tokens: number; completion_tokens: number; error: string | null } | null
  citations: number[]; grounding: RGround | null; escalation: REscalation
  decision: "answered" | "answered_with_escalation" | "escalated"; latency_ms: number
}
export type RMessage = { id: string; role: "user" | "assistant"; text: string; result?: RResult; error?: string; pending?: boolean }
