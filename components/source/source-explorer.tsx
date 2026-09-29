"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileCode2, GitCompare } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Chip } from "@/components/kit/hero"
import { CodeBlock } from "@/components/kit/code-block"
import { ErrorNote, Kicker } from "@/components/kit/scaffold"
import { Spinner } from "@/components/viz/rag-parts"

type Module = { name: string; readme: string; files: string[] }

function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith("```")) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++])
      blocks.push(<pre key={i} className="scrollbar-thin my-2 overflow-auto rounded-lg border bg-background p-3 font-mono text-[12px] leading-relaxed">{buf.join("\n")}</pre>)
    } else if (l.startsWith("# ")) blocks.push(<h2 key={i} className="mb-2 font-display text-3xl">{l.slice(2)}</h2>)
    else if (l.startsWith("## ")) blocks.push(<h3 key={i} className="mt-5 mb-1 font-mono text-[11px] tracking-[0.16em] text-primary uppercase">{l.slice(3)}</h3>)
    else if (l.startsWith("|")) {
      const rows: string[] = [l]
      while (lines[i + 1]?.startsWith("|")) rows.push(lines[++i])
      blocks.push(<div key={i} className="scrollbar-thin my-2 overflow-x-auto"><table className="text-[12.5px]"><tbody>{rows.filter((r) => !/^\|[-| ]+\|$/.test(r)).map((r, k) => <tr key={k} className="border-b">{r.split("|").slice(1, -1).map((c, j) => <td key={j} className={cn("px-2.5 py-1.5", k === 0 && "font-medium")}>{c.trim()}</td>)}</tr>)}</tbody></table></div>)
    } else if (l.startsWith("- ")) {
      const items = [l]
      while (lines[i + 1]?.startsWith("- ")) items.push(lines[++i])
      blocks.push(<ul key={i} className="my-1.5 list-disc space-y-0.5 pl-5 text-[14px]">{items.map((x, k) => <li key={k}>{x.slice(2).replace(/[`*]/g, "")}</li>)}</ul>)
    } else if (l.trim()) blocks.push(<p key={i} className="my-1.5 text-[14px] leading-relaxed">{l.replace(/[`*]/g, "")}</p>)
  }
  return <div>{blocks}</div>
}

function Diff({ diff }: { diff: string }) {
  return (
    <div className="scrollbar-thin max-h-[32rem] overflow-auto rounded-xl border bg-card font-mono text-[12px] leading-[1.65]">
      {diff.split("\n").map((l, i) => (
        <div key={i} className={cn("px-3 whitespace-pre", l.startsWith("+") && !l.startsWith("+++") && "bg-good/12 text-good", l.startsWith("-") && !l.startsWith("---") && "bg-bad/12 text-bad", l.startsWith("@@") && "bg-primary/10 text-primary", (l.startsWith("+++") || l.startsWith("---")) && "text-muted-foreground")}>{l || " "}</div>
      ))}
    </div>
  )
}

export function SourceExplorer() {
  const router = useRouter()
  const params = useSearchParams()
  const [mods, setMods] = React.useState<Module[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const current = params.get("module") ?? "01_basic_rag"
  const [file, setFile] = React.useState<string | null>(null)
  const [content, setContent] = React.useState<string | null>(null)
  const [diffTo, setDiffTo] = React.useState<string>("")
  const [diff, setDiff] = React.useState<{ diff: string; added: number; removed: number; a: string; b: string } | null>(null)

  React.useEffect(() => { api<Module[]>("/api/code/modules").then(setMods).catch((e) => setError(e.message)) }, [])
  const mod = mods.find((m) => m.name === current)
  const idx = mods.findIndex((m) => m.name === current)
  const mainFile = (m?: Module) => m?.files.find((f) => /(rag|pipeline)\.py$/.test(f)) ?? m?.files.find((f) => f.endsWith(".py"))

  React.useEffect(() => { if (mod) { setFile(mainFile(mod) ?? null); setDiff(null); setDiffTo(idx > 0 ? mods[idx - 1].name : "") } }, [mod, idx, mods])
  React.useEffect(() => { if (!file) return; setContent(null); api<{ content: string }>(`/api/code/file?path=${encodeURIComponent(file)}`).then((r) => setContent(r.content)).catch(() => setContent("# could not load file")) }, [file])

  const runDiff = React.useCallback(async (toMod: string) => {
    const other = mods.find((m) => m.name === toMod); const a = mainFile(other); const b = mainFile(mod)
    if (!a || !b) return
    setDiff(await api(`/api/code/diff?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`))
  }, [mods, mod])
  React.useEffect(() => { if (diffTo && mod) runDiff(diffTo) }, [diffTo, mod, runDiff])

  if (error) return <ErrorNote>{error}</ErrorNote>
  if (!mods.length) return <Spinner label="Loading lessons" />
  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <nav className="space-y-1 lg:sticky lg:top-20 lg:self-start">
        {mods.map((m) => (
          <button key={m.name} onClick={() => router.replace(`/source?module=${m.name}`)} className={cn("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left font-mono text-[12.5px] transition-colors", current === m.name ? "border-primary/50 bg-primary/10 text-foreground" : "bg-card text-muted-foreground hover:bg-accent")}>
            <span className="text-primary">{m.name.slice(0, 2)}</span>{m.name.slice(3)}
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-4">
        {mod && (
          <Tabs defaultValue="readme" key={mod.name}>
            <TabsList variant="line" className="border-b"><TabsTrigger value="readme">README</TabsTrigger><TabsTrigger value="code">Code</TabsTrigger><TabsTrigger value="diff" disabled={idx === 0}><GitCompare className="size-3.5" />Diff vs previous lesson</TabsTrigger></TabsList>
            <TabsContent value="readme" className="pt-4"><div className="rounded-2xl border bg-card p-6"><Markdown text={mod.readme || "No README."} /></div></TabsContent>
            <TabsContent value="code" className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-1.5">{mod.files.map((f) => <button key={f} onClick={() => setFile(f)} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11.5px]", file === f ? "border-primary/50 bg-primary/10" : "text-muted-foreground hover:bg-accent")}><FileCode2 className="size-3" />{f.split("/").slice(1).join("/")}</button>)}</div>
              {content !== null ? <CodeBlock code={content} lang={file?.endsWith(".md") ? "markdown" : "python"} title={file ?? ""} maxHeight={560} /> : <Spinner />}
            </TabsContent>
            <TabsContent value="diff" className="space-y-3 pt-4">
              <div className="flex flex-wrap items-center gap-3"><Kicker>Compare</Kicker>
                <Select value={diffTo} onValueChange={(v) => setDiffTo(v as string)}><SelectTrigger className="w-56"><SelectValue placeholder="lesson" /></SelectTrigger><SelectContent>{mods.filter((m) => m.name !== mod.name).map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select>
                <span className="text-muted-foreground">→</span><Chip tone="accent">{mod.name}</Chip>
                {diff && <><Chip tone="success">+{diff.added}</Chip><Chip tone="danger">−{diff.removed}</Chip></>}</div>
              {diff ? <Diff diff={diff.diff} /> : <Spinner />}
              <p className="text-[12.5px] text-muted-foreground">Red lines exist only in the earlier lesson, green lines only in this one. This is the “how it differs from the previous version” view for the lecture.</p>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
