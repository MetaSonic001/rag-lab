"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"

import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/viz/flow"

const nodes: FlowNode[] = [
  { id: "q", label: "Question", sub: "“Refund not received”", x: 70, y: 100, w: 124, h: 52, tone: "primary" },
  { id: "e", label: "Embed", sub: "384 numbers", x: 235, y: 100, w: 108, h: 52, tone: "embed" },
  { id: "r", label: "Retrieve", sub: "top-K chunks", x: 395, y: 100, w: 118, h: 52, tone: "retrieve" },
  { id: "k", label: "Rerank", sub: "cross-encoder", x: 555, y: 100, w: 118, h: 52, tone: "rerank" },
  { id: "l", label: "LLM", sub: "GroqCloud", x: 700, y: 100, w: 96, h: 52, tone: "generate" },
  { id: "a", label: "Answer", sub: "with sources", x: 835, y: 100, w: 108, h: 52, tone: "good" },
]
const edges: FlowEdge[] = ["q-e", "e-r", "r-k", "k-l", "l-a"].map((s) => ({ from: s[0], to: s[2] }))
const order = ["q", "e", "r", "k", "l", "a"]
const captions = [
  "A question arrives in plain language.",
  "It is turned into numbers that capture meaning.",
  "The closest chunks of your documents are found.",
  "A stronger model re-orders them by real relevance.",
  "The LLM writes an answer using only those chunks.",
  "You get an answer with sources you can check.",
]

export function HeroPipeline() {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % order.length), 1700)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="rounded-2xl border bg-card/70 p-3 shadow-[0_30px_80px_-40px_color-mix(in_oklch,var(--primary)_50%,transparent)] backdrop-blur sm:p-5">
      <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">
        <span>retrieval-augmented generation</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse-soft rounded-full bg-good" />live</span>
      </div>
      <FlowDiagram nodes={nodes} edges={edges} width={900} height={200} active={[order[i], order[Math.max(i - 1, 0)]].filter((v, k, a) => a.indexOf(v) === k)} visited={order.slice(0, i + 1)} minWidth={640} />
      <div className="h-6 px-1 text-[13px] text-muted-foreground">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <span className="mr-2 font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>{captions[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
