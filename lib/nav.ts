import {
  BookOpenText, Boxes, Braces, Brain, CircuitBoard, Code2, FlaskConical, GitCompareArrows, Layers, LayoutGrid, Radar,
  ShieldAlert, Sparkles, Store, TestTubeDiagonal, Wrench, type LucideIcon,
} from "lucide-react"

export type NavItem = { n: string; title: string; blurb: string; href: string; icon: LucideIcon; verb: string }
export type NavGroup = { label: string; verb: string; items: NavItem[] }

/** The whole product is one journey: START -> UNDERSTAND -> BUILD -> WATCH -> BREAK -> IMPROVE -> ADVANCE -> EVALUATE -> ATTACK -> SHIP */
export const JOURNEY: NavGroup[] = [
  {
    label: "Understand", verb: "Start",
    items: [
      { n: "00", title: "Start here", blurb: "What is RAG, from zero", href: "/start", icon: Sparkles, verb: "start" },
      { n: "01", title: "Fundamentals", blurb: "12 concepts, each with a live demo", href: "/fundamentals", icon: BookOpenText, verb: "understand" },
    ],
  },
  {
    label: "Build", verb: "Build",
    items: [
      { n: "02", title: "Build your first RAG", blurb: "Run each stage on a real PDF", href: "/build", icon: Wrench, verb: "build" },
      { n: "03", title: "Playground", blurb: "Turn every knob, see the trace", href: "/playground", icon: FlaskConical, verb: "improve" },
    ],
  },
  {
    label: "Observe", verb: "Watch",
    items: [
      { n: "04", title: "Watch RAG", blurb: "Click through the pipeline", href: "/watch", icon: Radar, verb: "watch" },
      { n: "05", title: "Break RAG", blurb: "Break it, then fix it", href: "/break", icon: TestTubeDiagonal, verb: "break" },
    ],
  },
  {
    label: "Advance", verb: "Advance",
    items: [
      { n: "06", title: "Advanced RAG", blurb: "Hybrid to agentic to graph", href: "/advanced", icon: Layers, verb: "advance" },
      { n: "07", title: "Evaluate", blurb: "Is it actually good?", href: "/eval", icon: GitCompareArrows, verb: "evaluate" },
      { n: "08", title: "Security lab", blurb: "Attack your own RAG", href: "/security", icon: ShieldAlert, verb: "attack" },
    ],
  },
  {
    label: "Apply", verb: "Apply",
    items: [
      { n: "09", title: "Applications", blurb: "Six domains, six retrieval problems", href: "/apps", icon: LayoutGrid, verb: "apply" },
      { n: "10", title: "Code RAG", blurb: "Ask questions of a repository", href: "/code-rag", icon: Code2, verb: "apply" },
      { n: "11", title: "RAGPAY", blurb: "The flagship support console", href: "/ragpay", icon: Store, verb: "ship" },
    ],
  },
]

export const TOOLS: NavItem[] = [
  { n: "", title: "Technology map", blurb: "What each library is for", href: "/stack", icon: CircuitBoard, verb: "" },
  { n: "", title: "Source explorer", blurb: "Open the code, diff the lessons", href: "/source", icon: Braces, verb: "" },
]

export const ALL_ITEMS: NavItem[] = [...JOURNEY.flatMap((g) => g.items), ...TOOLS]
export const ICONS = { Brain, Boxes }
