import Link from "next/link"
import { ArrowRight, Code2, FlaskConical, GitCompareArrows, Layers, ShieldAlert, Sparkles, Store, TestTubeDiagonal } from "lucide-react"

import { JOURNEY } from "@/lib/nav"
import { Brand } from "@/components/shell/brand"
import { ModeToggle, ThemeToggle } from "@/components/shell/app-shell"
import { HeroPipeline } from "@/components/site/hero-pipeline"
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid"
import { Spotlight } from "@/components/ui/spotlight"
import { BeamCard } from "@/components/spectrumui/beam-card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STACK = ["Sentence Transformers", "FAISS", "Chroma", "Qdrant", "sqlite-vec", "BM25", "Cross-encoder", "LangChain", "LlamaIndex", "LangGraph", "PyMuPDF4LLM", "Chonkie", "FastAPI", "GroqCloud"]

export default function Landing() {
  return (
    <div className="relative min-h-svh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-5">
          <Brand />
          <nav className="ml-8 hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
            <Link href="/fundamentals" className="hover:text-foreground">Fundamentals</Link>
            <Link href="/playground" className="hover:text-foreground">Playground</Link>
            <Link href="/advanced" className="hover:text-foreground">Advanced</Link>
            <Link href="/ragpay" className="hover:text-foreground">RAGPAY</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2"><ModeToggle /><ThemeToggle /></div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="bg-grid mask-radial pointer-events-none absolute inset-0 -z-10 opacity-70" />
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-40" fill="oklch(0.75 0.16 52)" />
        <div className="mx-auto max-w-[1180px] px-5 pt-20 pb-10 sm:pt-28">
          <div className="animate-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3 pl-1.5 text-[12px] text-muted-foreground backdrop-blur">
              <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-primary-foreground uppercase">guest lecture</span>
              An interactive textbook you can break
            </div>
            <h1 className="font-display max-w-4xl text-[3.1rem] leading-[0.98] tracking-tight sm:text-[5.5rem]">
              From zero to hero in <em className="text-primary not-italic">RAG</em>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Start with “what is an LLM?” and finish with an agentic support system that cites its sources, knows when to escalate, and survives an attack. Every idea has a live demo, and every demo runs real code.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "glow-primary h-11 gap-2 px-5 text-[14px]")}>Start here <ArrowRight className="size-4" /></Link>
              <Link href="/ragpay" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 px-5 text-[14px]")}><Store className="size-4" />Jump to RAGPAY</Link>
              <span className="ml-1 text-[13px] text-muted-foreground">No prior knowledge needed.</span>
            </div>
          </div>
          <div className="mt-14 animate-rise [animation-delay:150ms]"><HeroPipeline /></div>
        </div>
      </section>

      {/* Journey */}
      <section className="mx-auto max-w-[1180px] px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <div className="mb-2 font-mono text-[11px] tracking-[0.18em] text-primary uppercase">One coherent journey</div>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Understand it. Build it. Break it. Ship it.</h2>
          <p className="mt-3 text-muted-foreground">Twelve stops, in dependency order. A lecturer can jump to any of them (⌘K); a beginner can simply follow the line.</p>
        </div>
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {JOURNEY.flatMap((g) => g.items).map((i) => (
            <Link key={i.href} href={i.href} className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-card">
              <span className="font-display text-4xl leading-none text-muted-foreground/40 transition-colors group-hover:text-primary">{i.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{i.title}</span>
                <span className="block text-[13px] text-muted-foreground">{i.blurb}</span>
              </span>
              <ArrowRight className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      {/* What's inside */}
      <section className="mx-auto max-w-[1180px] px-5 pb-20">
        <BentoGrid className="max-w-none md:auto-rows-[15rem]">
          <BentoGridItem className="md:col-span-2" icon={<FlaskConical className="size-5 text-retrieve" />} title="A playground with a real trace"
            description="Change chunk size, embedding model, retriever, Top-K, reranking and the prompt. See retrieved chunks, scores, the exact context, the answer and where every millisecond went."
            header={<div className="flex h-24 items-end gap-1.5 rounded-lg bg-muted/50 p-3">{[38, 62, 45, 88, 52, 70, 30, 95, 58].map((h, i) => <div key={i} className="flex-1 rounded-sm bg-retrieve/70" style={{ height: `${h}%`, opacity: 0.4 + (h / 160) }} />)}</div>} />
          <BentoGridItem icon={<TestTubeDiagonal className="size-5 text-bad" />} title="Break it, then fix it"
            description="Bad chunking, wrong retrieval, hallucination. Each failure is a real configuration you can run, with measured numbers, not slides."
            header={<div className="flex h-24 items-center justify-center gap-2 rounded-lg bg-bad/10 font-mono text-[12px] text-bad"><span>coverage 1/2</span><ArrowRight className="size-3.5" /><span className="text-good">2/2</span></div>} />
          <BentoGridItem icon={<Layers className="size-5 text-rerank" />} title="Eleven implementations"
            description="Open the code live. Each folder is one idea, and the app shows a diff between any two lessons."
            header={<div className="flex h-24 flex-col justify-center gap-1 rounded-lg bg-muted/50 px-3 font-mono text-[11px] text-muted-foreground"><span>01_basic_rag</span><span className="text-foreground">03_hybrid_rag</span><span>07_agentic_rag</span></div>} />
          <BentoGridItem icon={<GitCompareArrows className="size-5 text-good" />} title="Evaluation that measures"
            description="Context precision and recall computed against gold labels, plus LLM-judged faithfulness. Basic vs Hybrid vs Reranked."
            header={<div className="flex h-24 items-end justify-around rounded-lg bg-muted/50 p-3">{[["0.81", 55], ["0.93", 78], ["0.95", 92]].map(([v, h]) => <div key={String(v)} className="flex flex-col items-center gap-1"><span className="font-mono text-[10px] text-muted-foreground">{v}</span><div className="w-8 rounded-sm bg-good/70" style={{ height: `${h}%` }} /></div>)}</div>} />
          <BentoGridItem icon={<ShieldAlert className="size-5 text-generate" />} title="Attack your own RAG"
            description="Prompt injection, poisoned documents, spoofed sources, leaked secrets. Watch a naive prompt get hijacked and a defended pipeline hold."
            header={<div className="flex h-24 items-center rounded-lg bg-muted/50 px-3 font-mono text-[11px] leading-relaxed text-muted-foreground"><span><span className="text-bad">“ignore previous instructions…”</span> → blocked by provenance filter</span></div>} />
          <BentoGridItem icon={<Code2 className="size-5 text-embed" />} title="Code RAG"
            description="Ask “what happens when /login is called?” of a real repository and get file and line citations."
            header={<div className="h-24 rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-5 text-muted-foreground">auth/routes.py:17-25<br /><span className="text-foreground">login()</span> → issue_token()</div>} />
        </BentoGrid>
      </section>

      {/* Flagship */}
      <section className="mx-auto max-w-[1180px] px-5 pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <div className="mb-2 font-mono text-[11px] tracking-[0.18em] text-primary uppercase">The finale</div>
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">RAGPAY: a support console that cites its sources.</h2>
            <p className="mt-4 text-muted-foreground">A fictional payments platform with 26 documents and 8 support cases. Hybrid retrieval, reranking, grounding signals computed from the evidence, a visible reasoning trace (no hidden chain-of-thought), and automatic escalation when the knowledge base cannot answer.</p>
            <Link href="/ragpay" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 gap-2 px-5")}>Open the console <ArrowRight className="size-4" /></Link>
            <p className="mt-4 text-[12px] text-muted-foreground">Inspired by real-world payment-platform documentation. All data is fictional; not affiliated with any company.</p>
          </div>
          <BeamCard eyebrow="case #003 · settlements" title="Why did I receive ₹47,932 instead of ₹48,820?" description="One question, four documents. Basic RAG finds one of them." colorVariant="sunset" size="md">
            <div className="space-y-2 font-mono text-[12px]">
              {[["settlement-reconciliation.md", "0.99"], ["settlement-fees-and-tax.md", "0.92"], ["refunds.md", "0.87"]].map(([d, s]) => (
                <div key={d} className="flex items-center gap-3"><span className="flex-1 truncate text-foreground/80">{d}</span><span className="h-1.5 w-24 overflow-hidden rounded-full bg-foreground/10"><span className="block h-full rounded-full bg-rerank" style={{ width: `${Number(s) * 100}%` }} /></span><span className="w-8 text-right text-muted-foreground">{s}</span></div>
              ))}
              <p className="pt-2 font-sans text-[13px] leading-relaxed text-foreground/80">₹50,000 − fee ₹1,000 − GST ₹180 − refund ₹888 = <strong className="text-primary">₹47,932</strong></p>
            </div>
          </BeamCard>
        </div>
      </section>

      {/* Stack */}
      <section className="border-t bg-surface/50">
        <div className="mx-auto max-w-[1180px] px-5 py-14">
          <div className="mb-5 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"><Sparkles className="size-3.5 text-primary" />Each library has one job. Learn which.</div>
          <div className="flex flex-wrap gap-2">{STACK.map((s) => <span key={s} className="rounded-full border bg-card px-3 py-1 text-[13px]">{s}</span>)}</div>
          <Link href="/stack" className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline">See the technology map <ArrowRight className="size-3.5" /></Link>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-[12px] text-muted-foreground">RAG LAB · built for a live lecture · RAGPAY is a fictional company with fictional data</footer>
    </div>
  )
}
