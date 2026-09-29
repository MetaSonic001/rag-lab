"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ShieldAlert, ShieldCheck, Skull } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Callout, ErrorNote, Kicker, Provenance } from "@/components/kit/scaffold"
import { Chip } from "@/components/kit/hero"
import { Cited, Spinner } from "@/components/viz/rag-parts"

type Attack = { id: string; title: string; risk: string; question: string; explain: string; docs: { id: string; title: string; text: string; meta: Record<string, string> }[] }
type Row = { doc: string; section: string; origin: string; acl: string; text: string; poisoned: boolean; relevance: number | null; action: "kept" | "dropped"; why: string }
type Run = {
  retrieval: Row[]; poison_retrieved: boolean; poison_reached_model: boolean; breached: boolean; live_llm: boolean; illustration: string | null; note: string | null
  relevance_gate: { best_relevance: number; threshold: number; unknown_terms: string[]; passed: boolean } | null; output_flags: string[]
  answer: { answer: string; mode: string; model: string }
}

const DEFENCES = [
  ["Provenance", "Trust comes from how a document entered the system, never from what it says about itself."],
  ["Access control", "ACL metadata is enforced at retrieval time, not in the prompt."],
  ["Injection scanner", "Regexes flag instruction-like text and unknown links in retrieved chunks."],
  ["Data fencing", "Passages are wrapped in <data> tags and the model is told never to obey them."],
  ["Relevance gate", "Cross-encoder threshold plus an unknown-term check refuses to answer without evidence."],
  ["Output scan", "Blocks unknown URLs and secret-looking strings before the user sees them."],
]

function Side({ defended, run, loading }: { defended: boolean; run: Run | null; loading: boolean }) {
  const tone = defended ? "good" : "bad"
  const Icon = defended ? ShieldCheck : Skull
  return (
    <div className={cn("space-y-4 rounded-2xl border p-4", defended ? "border-good/30 bg-good/[0.04]" : "border-bad/30 bg-bad/[0.04]")}>
      <div className="flex items-center justify-between"><span className={cn("flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase", defended ? "text-good" : "text-bad")}><Icon className="size-4" />{defended ? "Defended pipeline" : "Vulnerable pipeline"}</span>{run && <Provenance kind="real" />}</div>
      {loading && <Spinner label="Running" />}
      {!loading && !run && <p className="py-10 text-center text-[13px] text-muted-foreground">Not run yet.</p>}
      {run && (
        <>
          <div className="space-y-1.5"><Kicker>Retrieved chunks</Kicker>
            {run.retrieval.map((r, i) => (
              <div key={i} className={cn("rounded-lg border bg-background p-2.5 text-[12px]", r.poisoned && "border-bad/50")}>
                <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-medium">{r.doc}</span>{r.poisoned && <Chip tone="danger">untrusted</Chip>}<Chip tone={r.origin === "official-kb" ? "success" : "warning"}>{r.origin}</Chip><Chip>{r.acl}</Chip>
                  <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase", r.action === "kept" ? "bg-good/15 text-good" : "bg-bad/15 text-bad")}>{r.action}</span></div>
                {r.why && <p className="mt-1 text-[11.5px] text-bad">{r.why}</p>}
              </div>
            ))}</div>
          {run.relevance_gate && <div className="flex flex-wrap items-center gap-2 text-[12px]"><Kicker>Relevance gate</Kicker><Chip tone={run.relevance_gate.passed ? "success" : "danger"}>{run.relevance_gate.passed ? "passed" : "refused"}</Chip><span className="text-muted-foreground">best {run.relevance_gate.best_relevance.toFixed(2)} vs threshold {run.relevance_gate.threshold}</span>{run.relevance_gate.unknown_terms.length > 0 && <span className="text-bad">unknown terms: {run.relevance_gate.unknown_terms.join(", ")}</span>}</div>}
          {run.output_flags.length > 0 && <Chip tone="danger">output filter triggered</Chip>}
          <div className="rounded-xl border bg-background p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2"><Kicker>Answer</Kicker>{run.answer.mode === "llm" ? <Provenance kind="llm" /> : run.answer.mode === "gate" ? <Provenance kind="real" /> : <Provenance kind="extractive" />}
              {run.live_llm && (run.breached ? <Chip tone="danger">BREACHED: attacker content in the answer</Chip> : <Chip tone="success">held: no attacker content</Chip>)}</div>
            <div className="text-[14px] leading-relaxed"><Cited text={run.answer.answer} /></div>
            {run.illustration && !defended && <div className="mt-2 rounded-lg border border-dashed border-generate/40 bg-generate/[0.06] p-2.5 text-[12.5px]"><Provenance kind="simulated" className="mb-1" /><p>What a naive live model typically outputs here: “{run.illustration}”</p></div>}
            {run.note && <p className="mt-2 text-[11.5px] text-generate">{run.note}</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]"><Chip tone={run.poison_retrieved ? "warning" : "default"}>poison retrieved: {run.poison_retrieved ? "yes" : "no"}</Chip><Chip tone={run.poison_reached_model ? "danger" : "success"}>reached the model: {run.poison_reached_model ? "yes" : "no"}</Chip></div>
        </>
      )}
      <span className="hidden">{tone}</span>
    </div>
  )
}

export function SecurityLab() {
  const [attacks, setAttacks] = React.useState<Attack[]>([])
  const [id, setId] = React.useState("prompt-injection")
  const [vuln, setVuln] = React.useState<Run | null>(null)
  const [def, setDef] = React.useState<Run | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => { api<Attack[]>("/api/security/attacks").then(setAttacks).catch((e) => setError(e.message)) }, [])
  React.useEffect(() => { setVuln(null); setDef(null) }, [id])
  const a = attacks.find((x) => x.id === id)
  const go = async () => {
    if (!a) return
    setLoading(true); setError(null)
    try { const [v, d] = await Promise.all([api<Run>("/api/security/run", { attack_id: id, defended: false }), api<Run>("/api/security/run", { attack_id: id, defended: true })]); setVuln(v); setDef(d) }
    catch (e) { setError(e instanceof Error ? e.message : "failed") } finally { setLoading(false) }
  }
  if (!a) return <div>{error ? <ErrorNote>{error}</ErrorNote> : <Spinner label="Loading attacks" />}</div>
  const doc = a.docs[0]
  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border bg-card p-5">
          <Kicker className="mb-2 text-bad">The rule</Kicker>
          <p className="font-display text-3xl leading-tight">Retrieved text is <em className="text-primary not-italic">data</em>, not instructions.</p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">A RAG system pastes documents into a prompt. To the model, your instructions and a stranger’s document are the same kind of thing: text. Anything that can get into the index can try to steer the model.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]"><div className="rounded-lg border border-good/40 bg-good/[0.06] p-3"><b className="text-good">Trusted</b><br />system prompt, your code, the user’s question</div><div className="rounded-lg border border-bad/40 bg-bad/[0.06] p-3"><b className="text-bad">Untrusted</b><br />every retrieved chunk, uploaded file, web page</div></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">{DEFENCES.map(([t, d], i) => <div key={t} className="rounded-xl border bg-card p-3"><div className="mb-0.5 flex items-center gap-2 text-[13px] font-medium"><span className="grid size-5 place-items-center rounded bg-primary/15 font-mono text-[10px] text-primary">{i + 1}</span>{t}</div><p className="text-[12px] leading-relaxed text-muted-foreground">{d}</p></div>)}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1.5 lg:sticky lg:top-20 lg:self-start">{attacks.map((x) => <button key={x.id} onClick={() => setId(x.id)} className={cn("w-full rounded-xl border p-3 text-left transition-colors", id === x.id ? "border-bad/40 bg-bad/[0.07]" : "bg-card hover:bg-accent")}><div className="text-[13.5px] font-medium">{x.title}</div><div className="text-[11.5px] text-muted-foreground">{x.risk}</div></button>)}</nav>
        <div className="min-w-0 space-y-5">
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2"><ShieldAlert className="size-5 text-bad" /><h2 className="font-display text-3xl">{a.title}</h2></div>
            <p className="text-[14.5px] leading-relaxed text-muted-foreground">{a.explain}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              <div><Kicker className="mb-1.5">Question the user asks</Kicker><div className="rounded-xl border bg-background px-4 py-3 text-[14.5px]">{a.question}</div></div>
              <div><Kicker className="mb-1.5 text-bad">The attacker’s document {doc ? `(${doc.meta.origin})` : ""}</Kicker>{doc ? <pre className="scrollbar-thin max-h-40 overflow-auto rounded-xl border border-bad/30 bg-bad/[0.04] p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{doc.text}</pre> : <div className="rounded-xl border border-dashed bg-background px-4 py-3 text-[13px] text-muted-foreground">No document needed: the knowledge base simply has nothing on this topic.</div>}</div>
            </div>
            <Button onClick={go} disabled={loading} variant="destructive" className="gap-2">{loading ? <Spinner /> : "Launch the attack against both pipelines"}</Button>
          </motion.div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="grid gap-4 xl:grid-cols-2"><Side defended={false} run={vuln} loading={loading} /><Side defended run={def} loading={loading} /></div>
          <Callout tone="deeper" title="No defence is complete">Regex scanners are easy to evade, and models can still be steered by cleverly worded text. That is why the strongest controls are structural: provenance, access control, least privilege for any tools the model can call, and never letting retrieved text trigger actions without a human.</Callout>
        </div>
      </div>
    </div>
  )
}
