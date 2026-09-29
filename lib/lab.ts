"use client"

import * as React from "react"

import { api } from "@/lib/api"
import { DEFAULT_LAB, type LabConfig, type LabResult } from "@/lib/types"

export type LabRunOptions = Partial<LabConfig> & { facts?: string[] | null; inline_docs?: unknown[] | null }

export function runLab(question: string, cfg: LabRunOptions = {}) {
  return api<LabResult>("/api/lab/run", { ...DEFAULT_LAB, ...cfg, question })
}

/** Small state wrapper around a lab call, with loading and error state. */
export function useLab() {
  const [result, setResult] = React.useState<LabResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const run = React.useCallback(async (question: string, cfg: LabRunOptions = {}) => {
    setLoading(true)
    setError(null)
    try {
      const r = await runLab(question, cfg)
      setResult(r)
      return r
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
      return null
    } finally {
      setLoading(false)
    }
  }, [])
  return { result, loading, error, run, setResult }
}
