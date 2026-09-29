/** Technology map: every library has one job. Learn the job, then the library is easy to swap. */
export type Tech = { name: string; layer: string; role: string; when: string; lesson?: string; installed?: string; note?: string }

export const LAYERS: { id: string; label: string; question: string }[] = [
  { id: "ingest", label: "Ingest", question: "How do documents become clean text?" },
  { id: "chunk", label: "Chunk", question: "How do we cut them into pieces?" },
  { id: "embed", label: "Embed", question: "How does text become numbers?" },
  { id: "store", label: "Store", question: "Where do the vectors live?" },
  { id: "retrieve", label: "Retrieve & rerank", question: "How do we find and order the best chunks?" },
  { id: "orchestrate", label: "Orchestrate", question: "How do the steps fit together?" },
  { id: "generate", label: "Generate & serve", question: "Who writes the answer, and how is it exposed?" },
  { id: "evaluate", label: "Evaluate", question: "How do we know it is good?" },
  { id: "graph", label: "Graph RAG", question: "What if relationships matter?" },
]

export const TECH: Tech[] = [
  { name: "PyMuPDF4LLM", layer: "ingest", role: "Turns PDFs into Markdown, keeping headings, lists and tables.", when: "Fast, dependable default for text-based PDFs.", lesson: "01_basic_rag", installed: "PyMuPDF4LLM" },
  { name: "Docling", layer: "ingest", role: "Layout-model document parsing: tables, figures, reading order, many formats.", when: "Complex PDFs, scanned pages, tables that matter. Heavier (downloads models).", installed: "Docling", note: "optional: requirements-extra.txt" },
  { name: "Crawl4AI", layer: "ingest", role: "Crawls websites and returns clean Markdown for LLMs.", when: "Your knowledge lives on web pages or docs sites.", installed: "Crawl4AI", note: "optional: needs a browser" },
  { name: "Chonkie", layer: "chunk", role: "Lightweight chunking library with token, sentence, recursive and semantic strategies.", when: "You want good chunkers without a whole framework.", lesson: "core/docs.py", installed: "Chonkie" },
  { name: "LangChain splitters", layer: "chunk", role: "RecursiveCharacterTextSplitter and friends.", when: "You are already inside LangChain.", lesson: "02_langchain_rag", installed: "LangChain" },
  { name: "Sentence Transformers", layer: "embed", role: "Runs embedding models (bi-encoders) and cross-encoders locally.", when: "Open models, no per-token cost, full control.", lesson: "core/embeddings.py", installed: "Sentence Transformers" },
  { name: "NumPy", layer: "store", role: "A matrix of vectors and a dot product. The simplest vector store there is.", when: "Thousands of chunks, learning, prototypes.", lesson: "01_basic_rag" },
  { name: "Chroma", layer: "store", role: "Friendly embedded vector database with metadata filtering.", when: "Prototypes and small apps that want persistence with almost no setup.", lesson: "02_langchain_rag · 08 · 09", installed: "Chroma" },
  { name: "FAISS", layer: "store", role: "Meta’s library for fast nearest-neighbour search.", when: "Raw speed and control; you manage metadata yourself.", lesson: "03_hybrid_rag", installed: "FAISS" },
  { name: "Qdrant", layer: "store", role: "Vector engine with strong payload filtering. Runs in-process in local mode.", when: "You need rich filters and a path to a production server.", lesson: "04_reranking", installed: "Qdrant" },
  { name: "sqlite-vec", layer: "store", role: "Vector search as a SQLite extension. Runs anywhere SQLite runs.", when: "Edge, desktop or tiny apps; one file, zero servers.", lesson: "06_multihop_rag", installed: "sqlite-vec" },
  { name: "pgvector", layer: "store", role: "Vector similarity inside PostgreSQL.", when: "You already run Postgres and want vectors next to your data.", note: "external: know it" },
  { name: "Pinecone · Weaviate · Milvus", layer: "store", role: "Managed or distributed vector databases built for large scale.", when: "Millions of vectors, multi-tenant, managed operations.", note: "external: know them" },
  { name: "BM25 (rank-bm25)", layer: "retrieve", role: "Classic keyword ranking. Rewards rare, exact terms.", when: "Identifiers, names, codes. Always pair with vectors.", lesson: "03 · 08 · 09" },
  { name: "Cross-encoder", layer: "retrieve", role: "Reads (query, chunk) together and scores relevance. Used for reranking.", when: "After first-stage retrieval, to lift precision.", lesson: "04_reranking", installed: "Sentence Transformers" },
  { name: "rerankers (library)", layer: "retrieve", role: "One API over many reranker models.", when: "You want to try several rerankers quickly.", note: "external: know it" },
  { name: "LangChain", layer: "orchestrate", role: "RAG orchestration: loaders, splitters, retrievers, prompts and model wrappers you compose.", when: "You want ready-made components and a huge ecosystem.", lesson: "02_langchain_rag", installed: "LangChain" },
  { name: "LlamaIndex", layer: "orchestrate", role: "Data framework focused on indexing and query engines.", when: "Indexing-heavy apps; many data connectors.", lesson: "05_query_rewriting", installed: "LlamaIndex" },
  { name: "LangGraph", layer: "orchestrate", role: "Stateful, cyclic workflows as graphs: routing, loops, verification, human-in-the-loop.", when: "The flow needs decisions and retries (agentic RAG).", lesson: "07_agentic_rag", installed: "LangGraph" },
  { name: "CrewAI · Agno · AutoGen", layer: "orchestrate", role: "Multi-agent frameworks: several role-playing agents cooperating.", when: "Genuinely separate roles or tools. Often more than RAG needs.", note: "external: know them" },
  { name: "GroqCloud", layer: "generate", role: "Very fast LLM inference behind a chat API. The model is chosen in .env.", when: "Low-latency answers; swap models without code changes.", lesson: "core/llm.py" },
  { name: "FastAPI", layer: "generate", role: "The Python backend that exposes each lesson as an API and keeps the key server-side.", when: "Any AI service with a web or mobile front end.", lesson: "backend/main.py" },
  { name: "RAGAS", layer: "evaluate", role: "Evaluation framework: context precision/recall, faithfulness, answer relevancy.", when: "Reference metrics and datasets for RAG.", lesson: "10_evaluation", installed: "RAGAS", note: "optional cross-check" },
  { name: "DeepEval", layer: "evaluate", role: "Unit-test style LLM/RAG evaluation with many metrics.", when: "You want evals in CI, like pytest.", installed: "DeepEval", note: "optional cross-check" },
  { name: "RAGChecker · Giskard · BeyondLLM", layer: "evaluate", role: "Fine-grained diagnosis, testing suites and all-in-one toolkits.", when: "Deeper diagnosis after basic metrics.", note: "external: know them" },
  { name: "GraphRAG · nano-graphrag · Fast GraphRAG", layer: "graph", role: "Build a knowledge graph from documents and retrieve through it.", when: "Relationship-heavy or ‘global summary’ questions.", note: "external: see Advanced → Graph RAG" },
]
