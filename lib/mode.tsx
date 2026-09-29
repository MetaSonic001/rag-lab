"use client"

import * as React from "react"

/**
 * Global learning mode.
 * newbie = true  -> plain-language explanations, analogies first, technical panels collapsed.
 * newbie = false -> full technical detail, "Go deeper" panels expanded.
 */
type ModeCtx = { newbie: boolean; setNewbie: (v: boolean) => void }
const ModeContext = React.createContext<ModeCtx>({ newbie: true, setNewbie: () => {} })
const KEY = "raglab.newbie"

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [newbie, setState] = React.useState(true)
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v !== null) setState(v === "1")
    } catch {
      /* private mode */
    }
  }, [])
  const setNewbie = React.useCallback((v: boolean) => {
    setState(v)
    try {
      localStorage.setItem(KEY, v ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [])
  return <ModeContext.Provider value={{ newbie, setNewbie }}>{children}</ModeContext.Provider>
}

export const useMode = () => React.useContext(ModeContext)

/** Shown only in "I'm new to RAG" mode. */
export function Simple({ children }: { children: React.ReactNode }) {
  const { newbie } = useMode()
  return newbie ? <>{children}</> : null
}

/** Shown only when the student has switched beginner mode off. */
export function Technical({ children }: { children: React.ReactNode }) {
  const { newbie } = useMode()
  return newbie ? null : <>{children}</>
}
