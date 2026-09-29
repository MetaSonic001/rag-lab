export type Chunk = {
  id: string; doc_id: string; title: string; section: string; text: string; start: number; meta: Record<string, string>
}
export type Scores = { vector?: number; bm25?: number; rrf?: number; rerank?: number; rerank_prob?: number }
export type Candidate = { rank: number; selected: boolean; chunk: Chunk; scores: Scores }
export type TraceStep = { stage: string; label: string; ms: number; measured: boolean; detail: string }
export type Answer = {
  answer: string; mode: "llm" | "extractive-fallback" | "gate"; model: string; provider: string; latency_ms: number
  prompt_tokens: number; completion_tokens: number; citations: number[]; error: string | null
  messages?: { role: string; content: string }[]
}
export type LabResult = {
  question: string
  config: Record<string, unknown>
  stats: { documents: number; chunks: number; avg_chunk_chars: number }
  trace: TraceStep[]
  candidates: Candidate[]
  context: string
  answer: Answer | null
  measured: { fact_coverage?: { found: string[]; total: number; missing: string[] }; top_score: number }
  latency_ms: { total: number; retrieval: number; rerank: number; generation: number; embed_index: number }
  tokens: { prompt: number; completion: number }
}
export type LabConfig = {
  corpus: string; chunk_strategy: string; chunk_size: number; chunk_overlap: number; contextual: boolean
  embedding_model: string; top_k: number; retriever: "vector" | "bm25" | "hybrid"; rerank: boolean; rerank_candidates: number
  prompt: string; generate: boolean; min_score: number | null; llm_model: string | null; filters?: Record<string, string> | null
}
export const DEFAULT_LAB: LabConfig = {
  corpus: "attendance", chunk_strategy: "recursive", chunk_size: 500, chunk_overlap: 50, contextual: true,
  embedding_model: "minilm", top_k: 4, retriever: "vector", rerank: false, rerank_candidates: 12,
  prompt: "strict", generate: true, min_score: null, llm_model: null,
}
