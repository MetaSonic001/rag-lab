"use client"

import type { ComponentType } from "react"

import { ChunkingDemo, DocumentsDemo, EmbeddingsDemo, ExtractionDemo, SimilarityDemo, TokensDemo } from "@/components/demos/demos-a"
import { CitationsDemo, ContextDemo, LlmDemo, PromptingDemo, RetrievalDemo, VectorDbDemo } from "@/components/demos/demos-b"

export const DEMOS: Record<string, ComponentType> = {
  documents: DocumentsDemo, extraction: ExtractionDemo, tokens: TokensDemo, chunking: ChunkingDemo,
  embeddings: EmbeddingsDemo, similarity: SimilarityDemo, vectordb: VectorDbDemo, retrieval: RetrievalDemo,
  context: ContextDemo, prompting: PromptingDemo, llm: LlmDemo, citations: CitationsDemo,
}
