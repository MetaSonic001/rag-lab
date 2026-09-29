"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { Check, Pause, Play, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Callout, GoDeeper, Provenance } from "@/components/kit/scaffold"
import { Term } from "@/components/kit/term"
import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/viz/flow"
import { Simple, Technical } from "@/lib/mode"

/* ── 1. What an LLM knows ────────────────────────────────────────────── */
const ASKS = [
  { q: "What is the capital of France?", knows: true, a: "Paris.", why: "This was everywhere in its training data." },
  { q: "What is the minimum attendance at Greenfield Institute of Technology?", knows: false, a: "I don’t have information about that institute’s specific policy. Many colleges require 75%, but you should check their handbook.", why: "A private document. The model never saw it." },
  { q: "What did our support team decide in yesterday’s meeting?", knows: false, a: "I can’t know that. I have no access to your meetings or anything after my training data ends.", why: "New and private information." },
  { q: "How much was invoice INV-20419 for?", knows: false, a: "I don’t have access to your invoices. (A careless model might invent a number here, which is called a hallucination.)", why: "Private data. Worse: models sometimes make something up." },
]
export function KnowsDemo() {
  const [i, setI] = React.useState(0)
  const cur = ASKS[i]
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="border-b p-5 md:border-r md:border-b-0">
          <div className="mb-3 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">Ask a plain LLM</div>
          <div className="mb-4 flex flex-col gap-1.5">
            {ASKS.map((a, k) => (
              <button key={a.q} onClick={() => setI(k)} className={cn("rounded-lg border px-3 py-2 text-left text-[13px] transition-colors", i === k ? "border-primary/50 bg-primary/10" : "hover:bg-accent")}>{a.q}</button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">{cur.q}</div>
              <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm border bg-background px-3.5 py-2 text-[13.5px] leading-relaxed">{cur.a}</div>
              <div className={cn("flex items-center gap-2 text-[12.5px]", cur.knows ? "text-good" : "text-bad")}>
                {cur.knows ? <Check className="size-4" /> : <X className="size-4" />}
                <span>{cur.knows ? "The model knows this." : "The model cannot know this."} <span className="text-muted-foreground">{cur.why}</span></span>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-3"><Provenance kind="simulated" /></div>
        </div>
        <div className="relative grid place-items-center bg-surface/50 p-5">
          <div className="relative grid aspect-square w-full max-w-[290px] place-items-center rounded-full border-2 border-dashed border-good/50 bg-good/[0.07] text-center">
            <div className="px-10 text-[13px] leading-snug"><div className="mb-1 font-display text-xl">What the LLM learned</div><span className="text-muted-foreground">public internet, books, code… up to a cutoff date</span></div>
            {[{ t: "Your handbook", c: "-top-3 -left-2" }, { t: "Yesterday’s news", c: "top-6 -right-4" }, { t: "Customer data", c: "-bottom-3 right-6" }].map((c) => (
              <span key={c.t} className={cn("absolute rounded-full border border-bad/40 bg-background px-2.5 py-1 text-[11.5px] text-bad", c.c)}>{c.t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 2. The journey diagram ──────────────────────────────────────────── */
const J_NODES: FlowNode[] = [
  { id: "llm", label: "LLM", sub: "smart, but frozen", x: 80, y: 60, tone: "generate", w: 130, h: 54 },
  { id: "knows", label: "What it knows", sub: "public, old", x: 260, y: 60, tone: "good", w: 130, h: 54 },
  { id: "not", label: "What it doesn’t", sub: "private, new", x: 440, y: 60, tone: "bad", w: 130, h: 54 },
  { id: "data", label: "Your data", sub: "documents", x: 620, y: 60, tone: "primary", w: 130, h: 54 },
  { id: "ret", label: "Retrieval", sub: "find relevant pieces", x: 260, y: 190, tone: "retrieve", w: 140, h: 54 },
  { id: "gen", label: "Generation", sub: "write the answer", x: 450, y: 190, tone: "generate", w: 140, h: 54 },
  { id: "rag", label: "RAG", sub: "retrieve + generate", x: 640, y: 190, tone: "primary", w: 130, h: 54 },
]
const J_EDGES: FlowEdge[] = [
  { from: "llm", to: "knows" }, { from: "knows", to: "not", label: "but…" }, { from: "not", to: "data" },
  { from: "data", to: "ret", curve: 0.6 }, { from: "ret", to: "gen" }, { from: "gen", to: "rag" },
]
const J_ORDER = ["llm", "knows", "not", "data", "ret", "gen", "rag"]
const J_TEXT: Record<string, { simple: string; tech: string }> = {
  llm: { simple: "A language model has read a huge amount of text and learned to write like a human.", tech: "A transformer trained to predict the next token on web-scale text." },
  knows: { simple: "It knows a lot about the public world, up to the day its training stopped.", tech: "Parametric memory: facts stored in weights, frozen at the training cutoff." },
  not: { simple: "It does not know your private documents or anything recent, and it may guess instead of admitting that.", tech: "No access to private/fresh data; will hallucinate plausible text when asked." },
  data: { simple: "But the answers you need are sitting in your own documents: policies, manuals, tickets, code.", tech: "The non-parametric memory: a corpus we control and can update instantly." },
  ret: { simple: "So first we search those documents and pull out only the few pieces that matter for this question.", tech: "Retrieval: embed the query and fetch the top-K relevant chunks (optionally hybrid + rerank)." },
  gen: { simple: "Then we hand those pieces to the model and ask it to answer using only them.", tech: "Generation conditioned on retrieved context via the prompt, with citations." },
  rag: { simple: "That is RAG: Retrieval-Augmented Generation. The model’s writing skill plus your documents’ facts.", tech: "RAG = retriever + generator. Freshness and attribution without retraining." },
}
export function JourneyDemo() {
  const [step, setStep] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  React.useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setStep((s) => { if (s >= J_ORDER.length - 1) { setPlaying(false); return s } return s + 1 }), 1600)
    return () => clearInterval(t)
  }, [playing])
  const id = J_ORDER[step]
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <FlowDiagram nodes={J_NODES} edges={J_EDGES} width={760} height={250} active={[id, J_ORDER[Math.max(step - 1, 0)]]} visited={J_ORDER.slice(0, step + 1)} selected={id} onSelect={(n) => { setPlaying(false); setStep(J_ORDER.indexOf(n)) }} minWidth={680} />
      <div className="mt-2 flex items-start gap-4 rounded-xl border bg-background p-4">
        <Button size="icon" variant="outline" onClick={() => { if (step >= J_ORDER.length - 1) setStep(0); setPlaying((p) => !p) }} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</Button>
        <AnimatePresence mode="wait">
          <motion.div key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="min-w-0 flex-1 text-[14.5px] leading-relaxed">
            <div className="mb-0.5 font-mono text-[10.5px] tracking-[0.14em] text-primary uppercase">Step {step + 1} of {J_ORDER.length} · {J_NODES.find((n) => n.id === id)?.label}</div>
            <Simple>{J_TEXT[id].simple}</Simple>
            <Technical>{J_TEXT[id].simple} <span className="text-muted-foreground">{J_TEXT[id].tech}</span></Technical>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── 3. RAG vs LLM vs fine-tuning ────────────────────────────────────── */
const ROWS = [
  ["Knows your private documents", "No", "Partly (baked in)", "Yes"],
  ["Stays current when documents change", "No", "No: retrain", "Yes: re-index"],
  ["Can show where an answer came from", "No", "No", "Yes: citations"],
  ["Risk of making things up", "High", "Medium", "Lower, if grounded"],
  ["Cost to update knowledge", "n/a", "High", "Low"],
  ["Best at", "General language tasks", "Style, format, behaviour", "Answering from your facts"],
]
const QUIZ = [
  { s: "Our refund policy changes every month and staff must always quote the latest version.", a: "rag", why: "Facts that change belong in documents, not in model weights. Re-index instead of retraining." },
  { s: "We want every reply to sound like our brand voice, in a fixed JSON format.", a: "ft", why: "This is about behaviour and style, which fine-tuning is good at." },
  { s: "Explain what a hash table is to a beginner.", a: "llm", why: "General public knowledge. A plain LLM is fine; no need for your documents." },
  { s: "Answer questions from 10,000 private PDFs and show the page each answer came from.", a: "rag", why: "Private data and citations: exactly what retrieval provides." },
]
export function CompareDemo() {
  const [picked, setPicked] = React.useState<Record<number, string>>({})
  const opts = [["llm", "Plain LLM"], ["ft", "Fine-tuning"], ["rag", "RAG"]]
  return (
    <div className="space-y-5">
      <div className="scrollbar-thin overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[620px] text-left text-[13.5px]">
          <thead><tr className="border-b bg-surface/60 font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase"><th className="px-4 py-2.5 font-normal" /><th className="px-4 py-2.5 font-normal">Plain LLM</th><th className="px-4 py-2.5 font-normal"><Term k="finetuning">Fine-tuning</Term></th><th className="px-4 py-2.5 font-normal text-primary">RAG</th></tr></thead>
          <tbody>{ROWS.map((r) => (
            <tr key={r[0]} className="border-b last:border-0 hover:bg-accent/40"><td className="px-4 py-3 font-medium">{r[0]}</td><td className="px-4 py-3 text-muted-foreground">{r[1]}</td><td className="px-4 py-3 text-muted-foreground">{r[2]}</td><td className="bg-primary/[0.05] px-4 py-3 font-medium">{r[3]}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 font-mono text-[10.5px] tracking-[0.16em] text-primary uppercase">Test yourself: which would you choose?</div>
        <div className="space-y-4">
          {QUIZ.map((q, i) => {
            const p = picked[i]
            return (
              <div key={i} className="rounded-xl border bg-background p-3.5">
                <p className="mb-2.5 text-[14px]">{q.s}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {opts.map(([k, l]) => (
                    <button key={k} onClick={() => setPicked((s) => ({ ...s, [i]: k }))} className={cn("rounded-full border px-3 py-1 text-[12.5px] transition-colors", p === k ? (k === q.a ? "border-good bg-good/15 text-good" : "border-bad bg-bad/10 text-bad") : "hover:bg-accent")}>{l}</button>
                  ))}
                </div>
                {p && <p className={cn("mt-2.5 text-[13px]", p === q.a ? "text-good" : "text-muted-foreground")}>{p === q.a ? "Correct. " : `Best answer: ${opts.find((o) => o[0] === q.a)?.[1]}. `}{q.why}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── 4. Basic architecture: two lanes ────────────────────────────────── */
const A_NODES: FlowNode[] = [
  { id: "docs", label: "Documents", x: 90, y: 55, tone: "primary", w: 124, h: 50 }, { id: "chunk", label: "Chunk", x: 250, y: 55, tone: "primary", w: 100, h: 50 },
  { id: "embed", label: "Embed", x: 390, y: 55, tone: "embed", w: 100, h: 50 }, { id: "store", label: "Vector store", x: 550, y: 55, tone: "embed", w: 124, h: 50 },
  { id: "q", label: "Question", x: 90, y: 200, tone: "primary", w: 124, h: 50 }, { id: "qe", label: "Embed", x: 250, y: 200, tone: "embed", w: 100, h: 50 },
  { id: "ret", label: "Retrieve", x: 400, y: 200, tone: "retrieve", w: 110, h: 50 }, { id: "prompt", label: "Prompt", x: 545, y: 200, tone: "generate", w: 100, h: 50 },
  { id: "llm", label: "LLM", x: 675, y: 200, tone: "generate", w: 90, h: 50 }, { id: "ans", label: "Answer + sources", x: 820, y: 200, tone: "good", w: 140, h: 50 },
]
const A_EDGES: FlowEdge[] = [
  ...[["docs", "chunk"], ["chunk", "embed"], ["embed", "store"], ["q", "qe"], ["qe", "ret"], ["ret", "prompt"], ["prompt", "llm"], ["llm", "ans"]].map(([from, to]) => ({ from, to })),
  { from: "store", to: "ret", dashed: true, curve: 0.5 },
]
const A_TEXT: Record<string, string> = {
  docs: "Your files: PDFs, web pages, code, tickets.", chunk: "Cut into small pieces so each can be searched on its own.", embed: "Each piece becomes a list of numbers that captures its meaning.",
  store: "Numbers are saved in a vector store, ready to be searched. All of this happens once, ahead of time.", q: "A user asks something in plain language.", qe: "The question is turned into numbers with the same model.",
  ret: "The store returns the pieces whose numbers are closest to the question’s.", prompt: "The pieces are pasted into a prompt with rules like ‘answer only from these’.", llm: "The language model writes the answer from the prompt.", ans: "The answer comes back with the sources it used, so a person can verify it.",
}
export function ArchitectureDemo() {
  const [sel, setSel] = React.useState<string>("ret")
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-1 flex justify-between px-2 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase"><span>Offline · done once</span></div>
      <FlowDiagram nodes={A_NODES} edges={A_EDGES} width={900} height={270} selected={sel} onSelect={setSel} visited={[sel]} minWidth={760} />
      <div className="-mt-3 mb-2 px-2 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">Online · every question</div>
      <div className="rounded-xl border bg-background p-4 text-[14.5px] leading-relaxed"><span className="mr-2 font-mono text-[10.5px] tracking-[0.14em] text-primary uppercase">{A_NODES.find((n) => n.id === sel)?.label}</span>{A_TEXT[sel]}</div>
    </div>
  )
}

export function UseCases() {
  const items = [["Customer support", "Answer from help articles and past tickets"], ["Education", "Answer from course notes and policies"], ["Code", "Answer from a repository"], ["Legal", "Find the clause and cite it"], ["Finance", "Answer from filings and reports"], ["Manufacturing", "Answer from manuals and part catalogues"]]
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([t, d]) => (
        <Link key={t} href="/apps" className="group rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40"><div className="text-[14px] font-medium group-hover:text-primary">{t}</div><div className="text-[12.5px] text-muted-foreground">{d}</div></Link>
      ))}
    </div>
  )
}

export function StartCallouts() {
  return (
    <>
      <Callout tone="analogy" title="Closed book vs open book"><Simple>A plain LLM sits an exam from memory. RAG lets it flip through your notes first. Same student, much better answers about <em>your</em> material.</Simple><Technical>Parametric vs non-parametric memory. RAG turns closed-book QA into open-book QA over a corpus you control.</Technical></Callout>
      <GoDeeper title="Why not just paste all the documents into the prompt?">Long-context models make this tempting for small corpora. It gets expensive (you pay for every token every time), slow, and accuracy drops as irrelevant text grows. Retrieval keeps the prompt small and relevant, and scales to millions of documents. Long context and RAG are complements, not rivals.</GoDeeper>
    </>
  )
}
