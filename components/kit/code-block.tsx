"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

type Lang = "python" | "typescript" | "tsx" | "bash" | "json" | "markdown" | "text"

let highlighterPromise: Promise<import("shiki/core").HighlighterCore> | null = null
function getHighlighter() {
  highlighterPromise ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ])
    return createHighlighterCore({
      themes: [import("@shikijs/themes/vitesse-dark"), import("@shikijs/themes/vitesse-light")],
      langs: [
        import("@shikijs/langs/python"), import("@shikijs/langs/typescript"), import("@shikijs/langs/tsx"),
        import("@shikijs/langs/bash"), import("@shikijs/langs/json"), import("@shikijs/langs/markdown"),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return highlighterPromise
}

/** Syntax-highlighted code with optional filename, line numbers and highlighted lines. */
export function CodeBlock({
  code, lang = "python", title, highlight = [], lineNumbers = true, className, maxHeight,
}: {
  code: string; lang?: Lang; title?: string; highlight?: number[]; lineNumbers?: boolean; className?: string; maxHeight?: number
}) {
  const [html, setHtml] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const src = code.replace(/\n$/, "")

  React.useEffect(() => {
    let live = true
    if (lang === "text") return
    getHighlighter().then((h) => {
      if (!live) return
      setHtml(
        h.codeToHtml(src, {
          lang,
          themes: { light: "vitesse-light", dark: "vitesse-dark" },
          defaultColor: false,
          transformers: [
            {
              line(node, line) {
                this.addClassToHast(node, "line")
                if (highlight.includes(line)) this.addClassToHast(node, "line-hl")
              },
            },
          ],
        })
      )
    })
    return () => {
      live = false
    }
  }, [src, lang, highlight])

  return (
    <div className={cn("group/code relative overflow-hidden rounded-xl border bg-[color-mix(in_oklch,var(--card)_60%,var(--background))]", className)}>
      {title && (
        <div className="flex items-center justify-between border-b bg-surface/60 px-3.5 py-2">
          <span className="font-mono text-[11.5px] text-muted-foreground">{title}</span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground/70 uppercase">{lang}</span>
        </div>
      )}
      <button
        type="button"
        aria-label="Copy code"
        onClick={() => {
          navigator.clipboard?.writeText(src)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        }}
        className="absolute top-2 right-2 z-10 rounded-md border bg-card/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition group-hover/code:opacity-100 hover:text-foreground"
        style={title ? { top: 40 } : undefined}
      >
        {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
      </button>
      <div className={cn("code-scroll scrollbar-thin overflow-auto text-[12.5px] leading-[1.65]", lineNumbers && "with-lines")} style={{ maxHeight }}>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="px-4 py-3.5 font-mono whitespace-pre text-foreground/80">{src}</pre>
        )}
      </div>
    </div>
  )
}

/** A terminal-style panel: commands and their output. */
export function Terminal({ lines, title = "terminal", className }: { lines: { kind: "cmd" | "out" | "ok" | "warn"; text: string }[]; title?: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-[oklch(0.14_0.006_265)] text-[oklch(0.92_0.005_265)]", className)}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2">
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="ml-2 font-mono text-[11px] text-white/50">{title}</span>
      </div>
      <div className="scrollbar-thin max-h-72 space-y-0.5 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={cn("whitespace-pre-wrap", l.kind === "out" && "text-white/60", l.kind === "ok" && "text-[oklch(0.8_0.15_158)]", l.kind === "warn" && "text-[oklch(0.83_0.13_88)]")}>
            {l.kind === "cmd" && <span className="mr-2 text-[oklch(0.78_0.14_52)] select-none">$</span>}
            {l.text}
          </div>
        ))}
      </div>
    </div>
  )
}
