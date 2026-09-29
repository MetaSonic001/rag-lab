import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ModeToggle, StatusPill, ThemeToggle } from "@/components/shell/app-shell"

/** RAGPAY is a product, not a tutorial page: its own chrome, a cooler accent, no lecture sidebar. */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ragpay min-h-svh">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-[12.5px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />RAG LAB</Link>
        <span className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-7" aria-hidden><rect width="32" height="32" rx="9" fill="var(--primary)" /><path d="M9 22V10h7.2a4.1 4.1 0 010 8.2H9m5.6 0L20 22" stroke="var(--primary-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          <div className="leading-tight"><div className="text-[14px] font-semibold tracking-tight">RagPay</div><div className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">Merchant console · fictional</div></div>
        </div>
        <nav className="ml-6 hidden items-center gap-1 text-[13px] md:flex">
          {["Overview", "Payments", "Settlements", "Developers"].map((n) => <span key={n} className="cursor-default rounded-md px-2.5 py-1 text-muted-foreground/60">{n}</span>)}
          <span className="rounded-md bg-primary/12 px-2.5 py-1 font-medium text-primary">Support assistant</span>
        </nav>
        <div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full border border-generate/40 bg-generate/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-generate uppercase sm:inline">Test mode</span><StatusPill /><ModeToggle compact /><ThemeToggle /></div>
      </header>
      {children}
    </div>
  )
}
