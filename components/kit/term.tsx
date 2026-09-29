"use client"

import { GLOSSARY } from "@/lib/glossary"
import { useMode } from "@/lib/mode"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Hover or click any jargon to get a plain-English definition (precise definition in the full mode). */
export function Term({ k, children }: { k: keyof typeof GLOSSARY | string; children?: React.ReactNode }) {
  const { newbie } = useMode()
  const e = GLOSSARY[k]
  if (!e) return <>{children}</>
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        nativeButton={false}
        delay={120}
        render={
          <span className="cursor-help rounded-[3px] underline decoration-primary/60 decoration-dotted decoration-[1.5px] underline-offset-[3px] transition-colors hover:bg-primary/10 hover:decoration-solid" />
        }
      >
        {children ?? e.term}
      </PopoverTrigger>
      <PopoverContent className="w-80 gap-1.5 p-3.5" side="top">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-primary uppercase">Term</span>
          <span className="font-medium">{e.term}</span>
        </div>
        <p className="text-[13px] leading-relaxed">{e.plain}</p>
        {!newbie && <p className="border-t pt-1.5 text-xs leading-relaxed text-muted-foreground">{e.precise}</p>}
      </PopoverContent>
    </Popover>
  )
}
