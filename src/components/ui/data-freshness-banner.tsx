"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

type DataFreshnessLabels = {
  freshTitle: string
  freshHelp: string
  staleTitle: string
  staleHelp: string
  refresh: string
  refreshing: string
}

export function DataFreshnessBanner({
  loadedAtIso,
  loadedAtLabel,
  staleAfterMs = 5 * 60 * 1000,
  labels,
}: {
  loadedAtIso: string
  loadedAtLabel: string
  staleAfterMs?: number
  labels: DataFreshnessLabels
}) {
  const router = useRouter()
  const [stale, setStale] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const loadedAt = new Date(loadedAtIso).getTime()
    const checkFreshness = () => {
      if (!Number.isFinite(loadedAt)) return
      setStale(Date.now() - loadedAt >= staleAfterMs)
    }

    checkFreshness()
    const interval = window.setInterval(checkFreshness, 30_000)
    window.addEventListener("focus", checkFreshness)
    document.addEventListener("visibilitychange", checkFreshness)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", checkFreshness)
      document.removeEventListener("visibilitychange", checkFreshness)
    }
  }, [loadedAtIso, staleAfterMs])

  function refreshData() {
    setRefreshing(true)
    router.refresh()
    window.setTimeout(() => setRefreshing(false), 800)
  }

  const freshHelpText = `${labels.freshHelp}${loadedAtLabel ? ` ${loadedAtLabel}` : ""}`
  const staleHelpText = `${labels.staleHelp}${loadedAtLabel ? ` (${loadedAtLabel})` : ""}`

  if (!stale) {
    return (
      <section className="mb-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          <span className="truncate">{freshHelpText}</span>
        </span>
        <button
          type="button"
          onClick={refreshData}
          disabled={refreshing}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? labels.refreshing : labels.refresh}
        </button>
      </section>
    )
  }

  return (
    <section className="mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-warning/30 bg-surface text-warning">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-sm">
            <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-2">
              <span className="font-semibold text-foreground">{labels.staleTitle}</span>
              <span className="truncate text-xs text-muted-foreground lg:text-sm">{staleHelpText}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshData}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60 sm:h-8 sm:min-h-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? labels.refreshing : labels.refresh}
        </button>
      </div>
    </section>
  )
}
