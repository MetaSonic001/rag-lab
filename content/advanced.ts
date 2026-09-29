/** 06 · Advanced RAG. Each technique exists because of a specific failure of the one before it. */
import type { FlowEdge, FlowNode } from "@/components/viz/flow"

export type Technique = {
  slug: string
  n: string
  title: string
  solves: string // WHICH PROBLEM does this fix?
  symptom: string
  idea: { simple: string; tech: string }
  flow: { nodes: FlowNode[]; edges: FlowEdge[]; added: string[]; w: number; h: number }
  demo: string
  lesson?: string // backend folder
  stack: string[]
  deeper: string
  tradeoff: string
}

const N = (id: string, label: string, x: number, y: number, tone: FlowNode["tone"] = "neutral", sub?: string): FlowNode => ({ id, label, x, y, tone, sub, w: 128, h: 54 })
const chain = (ids: string[]): FlowEdge[] => ids.slice(1).map((to, i) => ({ from: ids[i], to }))

// The plain query lane every technique starts from.
const base = (y = 150, x0 = 80): FlowNode[] => [
  N("q", "Question", x0, y, "primary"), N("emb", "Embed", x0 + 150, y, "embed", "MiniLM"), N("vs", "Vector search", x0 + 300, y, "retrieve", "top-K"),
  N("ctx", "Context", x0 + 450, y, "retrieve"), N("llm", "LLM", x0 + 600, y, "generate", "Groq"), N("ans", "Answer", x0 + 750, y, "good"),
]
const baseEdges = chain(["q", "emb", "vs", "ctx", "llm", "ans"])
const W = 900, H = 250

export const TECHNIQUES: Technique[] = [
  {
    slug: "basic", n: "A", title: "Basic RAG", solves: "The model does not know your documents.",
    symptom: "Works on easy questions, then falls apart on real ones.",
    idea: { simple: "Cut documents into pieces, find the pieces closest in meaning to the question, and let the AI answer from them.", tech: "Single-pass dense retrieval: embed the query, cosine top-K over chunk vectors, stuff into a prompt, generate." },
    flow: { nodes: base(), edges: baseEdges, added: [], w: W, h: H },
    demo: "basic", lesson: "01_basic_rag", stack: ["PyMuPDF4LLM", "Sentence Transformers", "NumPy", "Groq"],
    deeper: "Everything below is a fix for a specific way this pipeline fails. Keep this diagram in mind and watch which box changes.",
    tradeoff: "Simple and fast; fragile on exact identifiers, multi-part questions and messy queries.",
  },
  {
    slug: "chunking", n: "B", title: "Better chunking", solves: "Facts are cut in half, or buried in huge chunks.",
    symptom: "The right document is retrieved but the answer is incomplete.",
    idea: { simple: "Cut along the document’s own structure (headings, paragraphs) instead of every N characters.", tech: "Structure-aware or recursive splitting, sized to the embedding model, with a ‘Title > Section’ prefix (contextual chunks) so each chunk is self-explanatory." },
    flow: { nodes: [N("docs", "Documents", 80, 60, "primary"), N("chunk", "Structure-aware chunking", 270, 60, "primary", "NEW"), N("emb2", "Embed", 470, 60, "embed"), N("idx", "Index", 620, 60, "retrieve"),
        N("q", "Question", 80, 190, "primary"), N("emb", "Embed", 270, 190, "embed"), N("vs", "Vector search", 470, 190, "retrieve"), N("llm", "LLM", 650, 190, "generate"), N("ans", "Answer", 800, 190, "good")],
      edges: [...chain(["docs", "chunk", "emb2", "idx"]), ...chain(["q", "emb", "vs", "llm", "ans"]), { from: "idx", to: "vs", dashed: true }], added: ["chunk"], w: W, h: H },
    demo: "chunking", lesson: "03_hybrid_rag", stack: ["Chonkie", "LangChain splitters", "Markdown headings"],
    deeper: "Try semantic chunking (split where embedding similarity between sentences drops) and parent-child chunking (retrieve a small chunk, send its larger parent to the LLM). Both trade complexity for coherence.",
    tradeoff: "Costs nothing at query time; needs a look at your documents. Often the cheapest big win.",
  },
  {
    slug: "metadata", n: "C", title: "Metadata filtering", solves: "Right words, wrong document (wrong product, year, department, or permission).",
    symptom: "Answers mix rules from different categories or leak restricted content.",
    idea: { simple: "Give each chunk labels (category, date, owner) and only search the ones that qualify.", tech: "Payload/where-filters executed inside the vector store before or during ANN search: category, version, tenant, ACL." },
    flow: { nodes: [...base(150).slice(0, 2), N("flt", "Metadata filter", 380, 150, "primary", "category = refunds"), N("vs", "Vector search", 530, 150, "retrieve", "filtered"), N("llm", "LLM", 680, 150, "generate"), N("ans", "Answer", 820, 150, "good")],
      edges: chain(["q", "emb", "flt", "vs", "llm", "ans"]), added: ["flt"], w: W, h: H },
    demo: "metadata", lesson: "04_reranking", stack: ["Qdrant (local)", "payload filters"],
    deeper: "Filters are also your security boundary: enforce ACLs at retrieval time, never in the prompt. Pre-filtering is exact; post-filtering can return fewer than K results.",
    tradeoff: "Requires clean metadata at ingestion; too-strict filters cause empty results.",
  },
  {
    slug: "hybrid", n: "D", title: "Hybrid search", solves: "Vectors blur exact tokens: error codes, endpoints, part numbers, names.",
    symptom: "Searching for `payment.captured` returns the Capture API instead of the webhook event.",
    idea: { simple: "Search two ways at once, by meaning and by exact words, then merge the results.", tech: "Dense (FAISS) + sparse (BM25) retrieval, fused with Reciprocal Rank Fusion. RRF ignores raw score scales, which are incomparable." },
    flow: { nodes: [N("q", "Question", 80, 125, "primary"), N("emb", "Embed", 230, 60, "embed"), N("vs", "Vector search", 400, 60, "retrieve", "FAISS"), N("bm", "BM25", 400, 190, "embed", "keywords"), N("rrf", "Fusion (RRF)", 570, 125, "primary", "NEW"), N("llm", "LLM", 720, 125, "generate"), N("ans", "Answer", 850, 125, "good")],
      edges: [{ from: "q", to: "emb" }, { from: "emb", to: "vs" }, { from: "q", to: "bm" }, { from: "vs", to: "rrf" }, { from: "bm", to: "rrf" }, { from: "rrf", to: "llm" }, { from: "llm", to: "ans" }], added: ["bm", "rrf"], w: W, h: H },
    demo: "hybrid", lesson: "03_hybrid_rag", stack: ["FAISS", "rank-bm25", "RRF"],
    deeper: "Weighted score fusion needs normalisation and tuning; RRF needs neither. SPLADE and BGE-M3 learn sparse representations, blurring the line between lexical and semantic.",
    tradeoff: "Two indexes to maintain; slightly more latency. Almost always worth it for technical corpora.",
  },
  {
    slug: "bm25", n: "E", title: "BM25 (the lexical half)", solves: "You need to be certain an exact word was matched.",
    symptom: "Rare, precise terms are ignored by semantic search.",
    idea: { simple: "Old-school keyword search that rewards rare words. Not glamorous, still essential.", tech: "score(q,d) = Σ IDF(t) · f(t,d)(k1+1) / (f(t,d) + k1(1 − b + b·|d|/avgdl)). Rare terms weigh more; repetition saturates; long documents are normalised." },
    flow: { nodes: [N("q", "Question", 100, 125, "primary"), N("tok", "Tokenise", 270, 125, "embed", "split identifiers"), N("inv", "Inverted index", 450, 125, "embed", "word → chunks"), N("bm", "BM25 scoring", 630, 125, "retrieve", "NEW"), N("top", "Top-K", 800, 125, "good")],
      edges: chain(["q", "tok", "inv", "bm", "top"]), added: ["tok", "inv", "bm"], w: W, h: H },
    demo: "bm25", lesson: "03_hybrid_rag", stack: ["rank-bm25"],
    deeper: "Tokenisation matters: for code, split snake_case and camelCase (verify_token → verify, token). For codes like PAY_ERR_3DS_FAILED keep the whole token too.",
    tradeoff: "No understanding of synonyms or paraphrase; that is what the vector half is for.",
  },
  {
    slug: "rerank", n: "F", title: "Reranking", solves: "The right chunk is retrieved but ranked 7th; the LLM sees noise.",
    symptom: "Precision is low: half the context is irrelevant.",
    idea: { simple: "Fetch a generous shortlist cheaply, then let a stronger model read each candidate next to the question and reorder them.", tech: "Cross-encoder (ms-marco-MiniLM) scores [query, passage] jointly. Retrieve 15–50 with a bi-encoder, rerank, keep 3–5." },
    flow: { nodes: [N("q", "Question", 70, 150, "primary"), N("ret", "Retrieve top-15", 220, 150, "retrieve", "fast & wide"), N("ce", "Cross-encoder", 390, 150, "rerank", "NEW"), N("keep", "Keep top-5", 550, 150, "rerank"), N("llm", "LLM", 690, 150, "generate"), N("ans", "Answer", 820, 150, "good")],
      edges: chain(["q", "ret", "ce", "keep", "llm", "ans"]), added: ["ce", "keep"], w: W, h: H },
    demo: "rerank", lesson: "04_reranking", stack: ["Sentence Transformers CrossEncoder", "Qdrant"],
    deeper: "Latency scales with candidates × passage length. Cache, batch, or use a distilled reranker. Hosted rerankers (Cohere, Jina) trade latency for zero infra.",
    tradeoff: "+50–400 ms per query on CPU. Best precision gain per line of code after hybrid.",
  },
  {
    slug: "query-rewriting", n: "G", title: "Query rewriting", solves: "Users do not write search-friendly queries.",
    symptom: "“The money never came back” retrieves nothing about refunds.",
    idea: { simple: "Before searching, have the AI rewrite the question the way the documentation would say it.", tech: "LLM rewrite into a standalone, vocabulary-aligned query (also resolves pronouns from chat history). Related: HyDE embeds a hypothetical answer." },
    flow: { nodes: [N("q", "Messy question", 70, 150, "primary"), N("rw", "LLM rewrite", 220, 150, "generate", "NEW"), N("emb", "Embed", 370, 150, "embed"), N("vs", "Search", 510, 150, "retrieve"), N("ctx", "Context", 650, 150, "retrieve"), N("llm", "LLM", 780, 150, "generate")],
      edges: chain(["q", "rw", "emb", "vs", "ctx", "llm"]), added: ["rw"], w: W, h: H },
    demo: "rewrite", lesson: "05_query_rewriting", stack: ["LlamaIndex", "Groq (fast model)"],
    deeper: "Keep the original query as a fallback and log both: rewriting can drift. For chat, rewrite with the last few turns so ‘what about the fee?’ becomes a complete query.",
    tradeoff: "One extra LLM call (~200–500 ms) and a small drift risk.",
  },
  {
    slug: "multi-query", n: "H", title: "Multi-query", solves: "One phrasing finds one slice of the answer.",
    symptom: "Results are sensitive to exact wording.",
    idea: { simple: "Ask the same question three different ways, search each, and merge.", tech: "LLM generates N paraphrases/sub-aspects; retrieve per query; fuse with RRF; deduplicate." },
    flow: { nodes: [N("q", "Question", 70, 125, "primary"), N("gen", "Generate 3 queries", 230, 125, "generate", "NEW"), N("q1", "Query 1", 420, 55, "retrieve"), N("q2", "Query 2", 420, 125, "retrieve"), N("q3", "Query 3", 420, 195, "retrieve"), N("rrf", "Fusion", 590, 125, "primary"), N("llm", "LLM", 730, 125, "generate"), N("ans", "Answer", 850, 125, "good")],
      edges: [{ from: "q", to: "gen" }, { from: "gen", to: "q1" }, { from: "gen", to: "q2" }, { from: "gen", to: "q3" }, { from: "q1", to: "rrf" }, { from: "q2", to: "rrf" }, { from: "q3", to: "rrf" }, ...chain(["rrf", "llm", "ans"])], added: ["gen", "q1", "q2", "q3"], w: W, h: H },
    demo: "multi", lesson: "05_query_rewriting", stack: ["LlamaIndex", "RRF"],
    deeper: "Diversity matters more than count. Three good, different queries beat ten paraphrases. Run the per-query searches in parallel.",
    tradeoff: "N× retrieval cost, one extra LLM call. Improves recall, may hurt precision (so add reranking).",
  },
  {
    slug: "multi-hop", n: "I", title: "Multi-hop RAG", solves: "The answer needs facts from several documents.",
    symptom: "“Why is my settlement lower?” needs fee rules + refund rules + the formula.",
    idea: { simple: "Break a big question into small ones, look up each, then combine the findings.", tech: "Decompose into sub-questions (or iterate: retrieve → read → new query), accumulate evidence, then synthesise." },
    flow: { nodes: [N("q", "Question", 70, 125, "primary"), N("dec", "Decompose", 220, 125, "generate", "NEW"), N("h1", "Hop 1: formula", 410, 50, "retrieve"), N("h2", "Hop 2: fees", 410, 125, "retrieve"), N("h3", "Hop 3: refunds", 410, 200, "retrieve"), N("mrg", "Merge evidence", 590, 125, "primary"), N("llm", "LLM", 730, 125, "generate"), N("ans", "Answer", 850, 125, "good")],
      edges: [{ from: "q", to: "dec" }, { from: "dec", to: "h1" }, { from: "dec", to: "h2" }, { from: "dec", to: "h3" }, { from: "h1", to: "mrg" }, { from: "h2", to: "mrg" }, { from: "h3", to: "mrg" }, ...chain(["mrg", "llm", "ans"])], added: ["dec", "h1", "h2", "h3", "mrg"], w: W, h: H },
    demo: "multihop", lesson: "06_multihop_rag", stack: ["sqlite-vec", "Groq"],
    deeper: "Static decomposition (this page) is cheap. Iterative retrieval lets each hop’s findings shape the next query, at the price of unbounded loops: always cap the hop count.",
    tradeoff: "Multiple searches and LLM calls: slower and pricier, but the only thing that works for compositional questions.",
  },
  {
    slug: "agentic", n: "J", title: "Agentic RAG", solves: "A fixed pipeline cannot decide, check or recover.",
    symptom: "Wrong retriever for the question, no self-check, no second attempt.",
    idea: { simple: "Turn the pipeline into a flowchart with decisions: pick where to look, check the answer, and try again if it looks shaky.", tech: "LangGraph state machine: classify → route to specialised retrievers → rerank → synthesise → verify → conditional retry with a widened search." },
    flow: { nodes: [N("q", "Question", 70, 125, "primary"), N("cls", "Classify", 210, 125, "generate", "route"), N("r1", "Payments", 380, 50, "retrieve"), N("r2", "Refunds", 380, 125, "retrieve"), N("r3", "Settlements", 380, 200, "retrieve"), N("rr", "Rerank", 540, 125, "rerank"), N("syn", "Synthesise", 670, 125, "generate"), N("ver", "Verify", 800, 125, "good", "loop back?")],
      edges: [{ from: "q", to: "cls" }, { from: "cls", to: "r1" }, { from: "cls", to: "r2" }, { from: "cls", to: "r3" }, { from: "r1", to: "rr" }, { from: "r2", to: "rr" }, { from: "r3", to: "rr" }, ...chain(["rr", "syn", "ver"])], added: ["cls", "r1", "r2", "r3", "ver"], w: W, h: H },
    demo: "agentic", lesson: "07_agentic_rag", stack: ["LangGraph", "cross-encoder", "Groq"],
    deeper: "LangGraph earns its keep once you need shared state, conditional edges, loops, human-in-the-loop or persistence. For a straight line, plain Python is clearer.",
    tradeoff: "More moving parts to test and evaluate; unbounded loops need budgets. Use when decisions genuinely change the outcome.",
  },
  {
    slug: "graph-rag", n: "K", title: "Graph RAG", solves: "Answers depend on relationships between entities, not just similar text.",
    symptom: "“Which fees affect settlements that include refunded payments?” spans many chunks that never mention each other.",
    idea: { simple: "Build a map of things and how they connect, then follow the connections to find related facts.", tech: "Extract entities and relations into a knowledge graph (LLM-assisted), optionally detect communities and summarise them; retrieve by graph traversal plus vector search. Libraries: GraphRAG, nano-graphrag, Fast GraphRAG." },
    flow: { nodes: [N("docs", "Documents", 70, 60, "primary"), N("ext", "Extract entities & relations", 260, 60, "generate", "NEW"), N("kg", "Knowledge graph", 470, 60, "embed"), N("comm", "Community summaries", 660, 60, "embed"), N("q", "Question", 70, 190, "primary"), N("trav", "Graph traversal + vectors", 320, 190, "retrieve", "NEW"), N("llm", "LLM", 560, 190, "generate"), N("ans", "Answer", 730, 190, "good")],
      edges: [...chain(["docs", "ext", "kg", "comm"]), ...chain(["q", "trav", "llm", "ans"]), { from: "kg", to: "trav", dashed: true }], added: ["ext", "kg", "comm", "trav"], w: W, h: H },
    demo: "graph", stack: ["GraphRAG", "nano-graphrag", "Neo4j / networkx"],
    deeper: "Indexing is the expensive part (many LLM calls to extract entities). It shines for ‘global’ questions (‘what are the main themes?’) where top-K chunks cannot see the whole corpus.",
    tradeoff: "Heavy indexing cost and complexity. Reach for it after hybrid + rerank + multi-hop stop being enough.",
  },
  {
    slug: "multimodal", n: "L", title: "Multimodal RAG", solves: "Knowledge lives in images, charts, tables and scanned pages.",
    symptom: "The answer is in a diagram; text-only RAG never saw it.",
    idea: { simple: "Teach the system to ‘read’ pictures and tables too, by describing them in words or embedding them directly.", tech: "Parse layout, caption images, linearise tables, or embed page images with vision-language retrievers (ColPali); retrieve across modalities and pass images/text to a multimodal LLM." },
    flow: { nodes: [N("pdf", "PDF / images", 70, 125, "primary"), N("lay", "Layout parsing", 230, 125, "embed", "Docling"), N("cap", "Caption / OCR / table → text", 420, 60, "generate", "NEW"), N("vis", "Page-image embeddings", 420, 190, "embed", "NEW"), N("idx", "Multi-modal index", 620, 125, "retrieve"), N("mm", "Multimodal LLM", 780, 125, "generate")],
      edges: [{ from: "pdf", to: "lay" }, { from: "lay", to: "cap" }, { from: "lay", to: "vis" }, { from: "cap", to: "idx" }, { from: "vis", to: "idx" }, { from: "idx", to: "mm" }], added: ["cap", "vis"], w: W, h: H },
    demo: "multimodal", stack: ["Docling", "PyMuPDF4LLM", "ColPali", "vision LLM"],
    deeper: "Two strategies: (1) convert everything to text early (simple, lossy); (2) keep images and embed them (faithful, needs a vision model). Tables are the most common quiet failure.",
    tradeoff: "Parsing quality dominates. Start with good table/heading extraction before adding vision.",
  },
]
