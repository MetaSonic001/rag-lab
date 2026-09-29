"use client"

import * as React from "react"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Call the FastAPI backend through the /backend proxy. */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/backend${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail
    throw new ApiError(typeof detail === "string" ? detail : `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export type BackendStatus = {
  llm: { provider: string; configured: boolean; model: string; fast_model: string }
  lessons: Record<string, string>
  libraries: Record<string, boolean>
  embedding_models: Record<string, { label: string; dim: number; note: string }>
}

type StatusCtx = { status: BackendStatus | null; online: boolean | null; refresh: () => void }
const StatusContext = React.createContext<StatusCtx>({ status: null, online: null, refresh: () => {} })

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<BackendStatus | null>(null)
  const [online, setOnline] = React.useState<boolean | null>(null)
  const refresh = React.useCallback(() => {
    api<BackendStatus>("/api/status")
      .then((s) => {
        setStatus(s)
        setOnline(true)
      })
      .catch(() => setOnline(false))
  }, [])
  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])
  return <StatusContext.Provider value={{ status, online, refresh }}>{children}</StatusContext.Provider>
}

export const useBackend = () => React.useContext(StatusContext)

/** Small helper for "run something on the backend" buttons. */
export function useRunner<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [data, setData] = React.useState<R | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const run = React.useCallback(
    async (...args: A) => {
      setLoading(true)
      setError(null)
      try {
        const r = await fn(...args)
        setData(r)
        return r
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
        return null
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn]
  )
  return { data, error, loading, run, setData }
}
