"use client"

import * as React from "react"

import { api } from "@/lib/api"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/viz/rag-parts"

type Doc = { id: string; title: string; category: string; text: string }

/** Full knowledge-base document, with the cited section highlighted. */
export function SourceDrawer({ open, onOpenChange, doc, section }: { open: boolean; onOpenChange: (v: boolean) => void; doc: string | null; section?: string }) {
  const [data, setData] = React.useState<Doc | null>(null)
  React.useEffect(() => {
    if (!doc || !open) return
    setData(null)
    api<Doc>(`/api/ragpay/docs/${doc}`).then(setData).catch(() => setData(null))
  }, [doc, open])
  const blocks = React.useMemo(() => (data ? data.text.split(/\n(?=#{1,3} )/) : []), [data])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{data?.title ?? doc}</SheetTitle>
          <SheetDescription>{doc}{data && <> · category <span className="font-mono">{data.category}</span></>} · fictional documentation</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          {!data && <Spinner label="Loading document" />}
          {blocks.map((b, i) => {
            const head = b.match(/^#{1,3} (.+)/)?.[1]
            const hit = !!section && head === section
            return (
              <div key={i} className={hit ? "my-2 rounded-lg border border-primary/40 bg-primary/[0.07] p-3" : "my-2 p-1"}>
                {hit && <div className="mb-1 font-mono text-[10px] tracking-widest text-primary uppercase">cited section</div>}
                <pre className="font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap">{b.replace(/^#{1,3} (.+)/, "").trim() && head ? <><strong className="mb-1 block text-[15px]">{head}</strong>{b.replace(/^#{1,3} .+\n?/, "")}</> : b}</pre>
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
