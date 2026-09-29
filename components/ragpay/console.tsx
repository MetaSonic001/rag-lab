"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { AlertOctagon, BadgeCheck, BookOpenCheck, CircleHelp, LifeBuoy, Send, ShieldCheck, Sparkles, Ticket } from "lucide-react"

import { cn } from "@/lib/utils"
import { api, useBackend } from "@/lib/api"
import type { RCase, RMessage, RResult } from "@/lib/ragpay"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Chip, MeterBar } from "@/components/kit/hero"
import { Kicker, Provenance } from "@/components/kit/scaffold"
import { Cited } from "@/components/viz/rag-parts"
import { Inspector, PIPE_ORDER, PipelineStrip } from "@/components/ragpay/inspector"
import { SourceDrawer } from "@/components/ragpay/source-drawer"

const SUGGESTIONS = ["Which API should I use for recurring payments?", "When will my settlement arrive?", "How do I issue a refund?", "What documents are required for merchant verification?", "What is the weather in Mumbai today?"]
const PRIORITY: Record<string, string> = { high: "bg-bad/15 text-bad", medium: "bg-generate/15 text-generate", low: "bg-muted text-muted-foreground" }
const uid = () => Math.random().toString(36).slice(2, 9)

function Decision({ r }: { r: RResult }) {
  const map = {
    answered: { icon: BadgeCheck, cls: "border-good/30 bg-good/[0.07] text-good", text: "Answered from the knowledge base" },
    answered_with_escalation: { icon: AlertOctagon, cls: "border-generate/40 bg-generate/[0.08] text-generate", text: "Answered, and a human should also review" },
    escalated: { icon: LifeBuoy, cls: "border-bad/40 bg-bad/[0.07] text-bad", text: "Escalated: the knowledge base cannot answer this safely" },
  }[r.decision]
  const Icon = map.icon
  return <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium", map.cls)}><Icon className="size-4" />{map.text}</div>
}

function TicketCard({ r }: { r: RResult }) {
  const [created, setCreated] = React.useState<string | null>(null)
  const t = r.escalation.ticket
  if (!r.escalation.needed || !t) return null
  return (
    <div className="rounded-xl border border-bad/30 bg-bad/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2"><Ticket className="size-4 text-bad" /><span className="text-[13.5px] font-medium">Escalate to a human agent</span><Chip tone={t.priority === "high" ? "danger" : "warning"}>{t.priority} priority · {t.sla}</Chip></div>
      <ul className="mb-3 list-disc space-y-0.5 pl-5 text-[12.5px]">{r.escalation.reasons?.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="mb-3 grid gap-2 rounded-lg border bg-background p-3 text-[12px] sm:grid-cols-2">
        <div><Kicker className="mb-0.5">Draft ticket summary</Kicker>{t.summary}</div>
        <div><Kicker className="mb-0.5">Intent</Kicker>{t.intent}</div>
        <div><Kicker className="mb-0.5">Identifiers found</Kicker><span className="font-mono">{t.identifiers.length ? t.identifiers.join(", ") : "none: ask the merchant for a payment id"}</span></div>
        <div><Kicker className="mb-0.5">Attach</Kicker>{t.attach.join(" · ")}</div>
      </div>
      {created ? <div className="flex items-center gap-2 text-[12.5px] text-good"><BadgeCheck className="size-4" />Ticket {created} created <Provenance kind="simulated" /></div>
        : <Button size="sm" variant="destructive" onClick={() => setCreated(`RP-${Math.floor(4000 + Math.random() * 5000)}`)} className="gap-1.5"><Ticket className="size-3.5" />Create ticket (demo)</Button>}
    </div>
  )
}

function AssistantMessage({ m, selected, onSelect, onSource }: { m: RMessage; selected: boolean; onSelect: () => void; onSource: (doc: string, section?: string) => void }) {
  const r = m.result
  const [why, setWhy] = React.useState(false)
  if (m.pending) return (
    <div className="max-w-[92%] rounded-2xl rounded-tl-sm border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-[12.5px] text-muted-foreground"><Sparkles className="size-3.5 animate-pulse-soft text-primary" />Investigating the knowledge base…</div>
      <PipelineStrip done={[]} active={[]} />
    </div>
  )
  if (m.error || !r) return <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-bad/30 bg-bad/[0.05] p-4 text-[13px] text-bad">{m.error ?? "No result"}</div>
  const sources = r.kept.map((k) => ({ n: k.n, label: `${k.doc} § ${k.section}` }))
  const g = r.grounding
  const cited = r.citations.map((n) => r.kept[n - 1]).filter(Boolean)
  const uncited = r.kept.filter((k) => !r.citations.includes(k.n))
  const noAnswer = !r.answer || r.answer.answer.includes("I don't have enough information")
  return (
    <div className={cn("max-w-[94%] space-y-3 rounded-2xl rounded-tl-sm border bg-card p-4 transition-shadow", selected && "shadow-[0_0_0_2px_color-mix(in_oklch,var(--primary)_35%,transparent)]")} onClick={onSelect}>
      <Decision r={r} />
      {r.answer && !noAnswer && (
        <div className="text-[14.5px] leading-relaxed">
          <Cited text={r.answer.answer} sources={sources} />
          <div className="mt-2 flex flex-wrap items-center gap-2">{r.answer.mode === "llm" ? <Provenance kind="llm" /> : <Provenance kind="extractive" />}{r.answer.mode === "llm" && <span className="font-mono text-[10.5px] text-muted-foreground">{r.answer.model}</span>}</div>
        </div>
      )}
      {noAnswer && <p className="text-[14px] text-muted-foreground">I can’t answer this reliably from the RagPay documentation, so I have not guessed.</p>}

      {g && (
        <div className="grid gap-3 rounded-xl border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <MeterBar value={g.score} label="Grounding" tone={g.band === "high" ? "success" : g.band === "medium" ? "warning" : "danger"} display={`${g.score.toFixed(2)} · ${g.band}`} />
          <div className="flex gap-2 text-[11px] text-muted-foreground"><span>{g.signals.source_count} source{g.signals.source_count === 1 ? "" : "s"}</span><span>·</span><span>{Math.round(g.signals.citation_coverage * 100)}% cited</span></div>
        </div>
      )}

      {cited.length > 0 && (
        <div className="space-y-1.5"><Kicker>Sources</Kicker>
          {cited.map((k) => (
            <button key={k.n} onClick={(e) => { e.stopPropagation(); onSource(k.doc, k.section) }} className="flex w-full items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-left text-[12.5px] transition-colors hover:border-primary/40 hover:bg-accent">
              <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/15 font-mono text-[10.5px] font-semibold text-primary">{k.n}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{k.doc}</span><span className="block truncate text-[11px] text-muted-foreground">§ {k.section}</span></span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{k.relevance.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}

      {r.kept.length > 0 && (
        <div>
          <button onClick={(e) => { e.stopPropagation(); setWhy((w) => !w) }} className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"><CircleHelp className="size-3.5" />Why this answer?</button>
          <AnimatePresence>
            {why && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 space-y-2 rounded-xl border bg-background p-3 text-[12.5px] leading-relaxed">
                  <p>The assistant retrieved <strong>{r.candidates.length}</strong> candidate passages, kept the <strong>{r.kept.length}</strong> most relevant, and wrote its answer only from them.</p>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {cited.map((k) => <li key={k.n}><strong>[{k.n}] {k.doc}</strong> § {k.section}: relevance {k.relevance.toFixed(2)}{k.vector_rank ? `, vector rank #${k.vector_rank}` : ""}{k.bm25_rank ? `, keyword rank #${k.bm25_rank}` : ""}.</li>)}
                    {uncited.length > 0 && <li className="text-muted-foreground">Retrieved but not cited: {uncited.map((k) => k.doc).join(", ")}.</li>}
                  </ul>
                  <p className="text-muted-foreground">Confidence comes from measurable signals (retrieval score, sentence-level evidence, citations, numbers matching the sources). See the Grounding tab.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <TicketCard r={r} />
    </div>
  )
}

export function RagpayConsole() {
  const { status } = useBackend()
  const [cases, setCases] = React.useState<RCase[]>([])
  const [messages, setMessages] = React.useState<RMessage[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [activeCase, setActiveCase] = React.useState<RCase | null>(null)
  const [input, setInput] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [drawer, setDrawer] = React.useState<{ doc: string; section?: string } | null>(null)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { api<RCase[]>("/api/ragpay/cases").then(setCases).catch(() => {}) }, [])
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [messages])

  const send = React.useCallback(async (text: string, c: RCase | null = activeCase) => {
    if (!text.trim() || busy) return
    const history = messages.filter((m) => !m.pending && !m.error).map((m) => ({ role: m.role, content: m.text }))
    const userMsg: RMessage = { id: uid(), role: "user", text }
    const pending: RMessage = { id: uid(), role: "assistant", text: "", pending: true }
    setMessages((ms) => [...ms, userMsg, pending]); setInput(""); setBusy(true)
    try {
      const result = await api<RResult>("/api/ragpay/ask", { question: text, history, case_id: c && messages.length === 0 ? c.id : null })
      setMessages((ms) => ms.map((m) => (m.id === pending.id ? { ...m, pending: false, text: result.answer?.answer ?? "", result } : m)))
      setSelectedId(pending.id)
    } catch (e) {
      setMessages((ms) => ms.map((m) => (m.id === pending.id ? { ...m, pending: false, error: e instanceof Error ? e.message : "failed" } : m)))
    } finally { setBusy(false) }
  }, [activeCase, busy, messages])

  const openCase = (c: RCase) => { setActiveCase(c); setMessages([]); setSelectedId(null); setTimeout(() => send(c.message, c), 0) }
  const reset = () => { setActiveCase(null); setMessages([]); setSelectedId(null) }
  const selected = messages.find((m) => m.id === selectedId)?.result ?? null

  return (
    <div className="grid h-[calc(100svh-3.5rem)] grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_380px]">
      {/* cases inbox */}
      <aside className="hidden overflow-y-auto border-r bg-sidebar lg:block scrollbar-thin">
        <div className="sticky top-0 z-10 border-b bg-sidebar/95 p-4 backdrop-blur"><div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold">Support cases</h2><Chip tone="accent">{cases.length} open</Chip></div><p className="mt-1 text-[11.5px] text-muted-foreground">Fictional tickets. Pick one and the assistant investigates.</p></div>
        <div className="space-y-1.5 p-2.5">
          {cases.map((c) => (
            <button key={c.id} onClick={() => openCase(c)} className={cn("w-full rounded-xl border p-3 text-left transition-colors", activeCase?.id === c.id ? "border-primary/50 bg-primary/[0.08]" : "bg-card hover:bg-accent")}>
              <div className="mb-1 flex items-center gap-2"><span className="font-mono text-[11px] text-muted-foreground">#{c.id}</span><span className={cn("rounded px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider uppercase", PRIORITY[c.priority])}>{c.priority}</span>{c.hard && <span className="rounded bg-rerank/15 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider text-rerank uppercase">multi-doc</span>}</div>
              <div className="text-[13px] leading-snug font-medium">{c.title}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{c.customer} · {c.category}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* conversation */}
      <section className="flex min-h-0 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8 scrollbar-thin">
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl pt-6 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div>
              <h1 className="font-display text-4xl">RagPay support engineer</h1>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">Ask about payments, refunds, settlements, webhooks, KYC and APIs. Answers come only from the RagPay knowledge base, with sources, or the case is escalated.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-[12.5px] hover:border-primary/40 hover:bg-accent">{s}</button>)}</div>
              <p className="mt-6 text-[11.5px] text-muted-foreground lg:hidden">Open the Cases inbox on a wider screen for the 8 example tickets.</p>
            </div>
          )}
          {activeCase && messages.length > 0 && (
            <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2"><Kicker>Case #{activeCase.id}</Kicker><span className={cn("rounded px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider uppercase", PRIORITY[activeCase.priority])}>{activeCase.priority}</span><span className="text-[13px] font-medium">{activeCase.title}</span><button onClick={reset} className="ml-auto text-[11.5px] text-muted-foreground hover:text-foreground">close case</button></div>
              <div className="flex flex-wrap gap-2">{activeCase.facts.map((f) => <div key={f.label} className="rounded-lg border bg-background px-3 py-1.5"><div className="font-mono text-[9.5px] tracking-widest text-muted-foreground uppercase">{f.label}</div><div className="font-display text-xl leading-tight">{f.value}</div></div>)}</div>
            </div>
          )}
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m) => m.role === "user" ? (
              <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14px] text-primary-foreground">{m.text}</div></div>
            ) : (
              <div key={m.id} className="flex gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><BookOpenCheck className="size-4" /></span>
                <AssistantMessage m={m} selected={selectedId === m.id} onSelect={() => m.result && setSelectedId(m.id)} onSource={(doc, section) => setDrawer({ doc, section })} /></div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
        <div className="border-t bg-background/80 p-3 backdrop-blur sm:px-8">
          <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }} placeholder="Describe the issue, e.g. “Why did this payment fail?”" className="max-h-32 min-h-11 flex-1 resize-none" />
            <Button type="submit" disabled={busy || !input.trim()} size="icon" className="size-11" aria-label="Send"><Send className="size-4" /></Button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-muted-foreground">Inspired by real-world payment-platform documentation. Fictional company and data; not affiliated with any real business.{status && !status.llm.configured ? " No GROQ_API_KEY: answers use the extractive fallback." : ""}</p>
        </div>
      </section>

      {/* inspector */}
      <aside className="hidden min-h-0 overflow-y-auto border-l bg-sidebar xl:block scrollbar-thin">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-sidebar/95 px-4 py-3 backdrop-blur"><h2 className="text-[13px] font-semibold">Inspector</h2><span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{selected ? "selected answer" : "idle"}</span></div>
        <Inspector r={selected} onOpenSource={(doc, section) => setDrawer({ doc, section })} />
      </aside>
      <SourceDrawer open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)} doc={drawer?.doc ?? null} section={drawer?.section} />
    </div>
  )
}
export { PIPE_ORDER }
