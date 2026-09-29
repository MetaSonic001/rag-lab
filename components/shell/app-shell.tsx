"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Baby, Check, Menu, Moon, Search, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { ALL_ITEMS, JOURNEY, TOOLS, type NavItem } from "@/lib/nav"
import { useMode } from "@/lib/mode"
import { useBackend } from "@/lib/api"
import { Brand } from "@/components/shell/brand"
import { Kbd } from "@/components/kit/hero"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { FUNDAMENTALS } from "@/content/fundamentals"
import { TECHNIQUES } from "@/content/advanced"

const VISITED_KEY = "raglab.visited"

function useVisited() {
  const pathname = usePathname()
  const [visited, setVisited] = React.useState<string[]>([])
  React.useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(VISITED_KEY) ?? "[]") as string[]
      const root = "/" + (pathname.split("/")[1] ?? "")
      const next = v.includes(root) ? v : [...v, root]
      if (next !== v) localStorage.setItem(VISITED_KEY, JSON.stringify(next))
      setVisited(next)
    } catch {
      /* ignore */
    }
  }, [pathname])
  return visited
}

function NavLink({ item, active, visited, onNavigate }: { item: NavItem; active: boolean; visited: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      {active && <span className="absolute top-2 bottom-2 -left-0.5 w-[3px] rounded-full bg-primary" />}
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-md border font-mono text-[10px]", active ? "border-primary/50 bg-primary/10 text-primary" : "bg-card")}>
        {item.n || <Icon className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-tight font-medium">{item.title}</span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground/80">{item.blurb}</span>
      </span>
      {visited && !active && <Check className="size-3 text-good/80" />}
    </Link>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const visited = useVisited()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  const done = JOURNEY.flatMap((g) => g.items).filter((i) => visited.includes(i.href)).length
  const total = JOURNEY.flatMap((g) => g.items).length
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3"><Brand /></div>
      <div className="px-4 pb-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <span>Your journey</span><span>{done}/{total}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
        {JOURNEY.map((g) => (
          <div key={g.label}>
            <div className="mb-1 px-2.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} visited={visited.includes(i.href)} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1 px-2.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">Reference</div>
          <div className="space-y-0.5">
            {TOOLS.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} visited={false} onNavigate={onNavigate} />)}
          </div>
        </div>
      </nav>
    </div>
  )
}

export function ModeToggle({ compact }: { compact?: boolean }) {
  const { newbie, setNewbie } = useMode()
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <label className={cn("flex cursor-pointer items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-3 text-[12.5px] transition-colors", newbie && "border-primary/50 bg-primary/10")} />
        }
      >
        <Baby className={cn("size-3.5", newbie ? "text-primary" : "text-muted-foreground")} />
        {!compact && <span className="hidden font-medium whitespace-nowrap sm:inline">I&apos;m new to RAG</span>}
        <Switch checked={newbie} onCheckedChange={setNewbie} aria-label="I'm new to RAG mode" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{newbie ? "Beginner mode: plain language, analogies first. Turn off for technical detail." : "Technical mode. Turn on for simpler explanations."}</TooltipContent>
    </Tooltip>
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid size-8 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

export function StatusPill() {
  const { status, online } = useBackend()
  const llm = status?.llm
  const label = online === null ? "connecting" : !online ? "backend offline" : llm?.configured ? "Groq live" : "no API key"
  const tone = online === null ? "bg-muted-foreground" : !online ? "bg-bad" : llm?.configured ? "bg-good" : "bg-generate"
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1 text-[12px] whitespace-nowrap text-muted-foreground xl:flex" />}>
        <span className={cn("size-1.5 rounded-full", tone, online === null && "animate-pulse-soft")} />
        {label}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {!online ? "Start the Python API: `bun run api` (see README)." : llm?.configured ? `Answers come from ${llm.model} on GroqCloud.` : "Add GROQ_API_KEY to .env and restart the API. Until then answers use an extractive fallback (retrieval is still real)."}
      </TooltipContent>
    </Tooltip>
  )
}

export function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter()
  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Jump to…" description="Search lessons, concepts and techniques">
      <CommandInput placeholder="Jump to a lesson, concept or technique…" />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Journey">
          {ALL_ITEMS.map((i) => (
            <CommandItem key={i.href} value={`${i.n} ${i.title} ${i.blurb}`} onSelect={() => go(i.href)}>
              <i.icon className="size-4" />
              <span>{i.title}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{i.n}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Fundamentals concepts">
          {FUNDAMENTALS.map((c) => (
            <CommandItem key={c.slug} value={`concept ${c.title} ${c.tagline}`} onSelect={() => go(`/fundamentals/${c.slug}`)}>
              <span className="font-mono text-[10px] text-muted-foreground">{c.n}</span>
              <span>{c.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Advanced techniques">
          {TECHNIQUES.map((t) => (
            <CommandItem key={t.slug} value={`technique ${t.title} ${t.solves}`} onSelect={() => go(`/advanced/${t.slug}`)}>
              <span className="font-mono text-[10px] text-muted-foreground">{t.n}</span>
              <span>{t.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = React.useState(false)
  const [palette, setPalette] = React.useState(false)
  const pathname = usePathname()
  const current = ALL_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="min-h-svh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[290px] bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" className="grid size-8 place-items-center rounded-md border lg:hidden" onClick={() => setMenu(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </button>
          <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
            {current?.n && <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{current.n}</span>}
            <span className="truncate font-medium">{current?.title ?? "RAG LAB"}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPalette(true)}
              aria-label="Jump to…"
              className="flex h-8 items-center gap-2 rounded-full border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground md:w-56 md:px-3"
            >
              <Search className="size-3.5" />
              <span className="hidden flex-1 text-left md:inline">Jump to…</span>
              <span className="hidden md:inline"><Kbd>⌘K</Kbd></span>
            </button>
            <StatusPill />
            <ModeToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-8 sm:py-14">{children}</main>
      </div>
      <CommandMenu open={palette} setOpen={setPalette} />
    </div>
  )
}
