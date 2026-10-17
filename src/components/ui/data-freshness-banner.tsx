"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"

type DataFreshnessLabels = {
  freshTitle: string
  freshHelp: string
  staleTitle: string
  staleHelp: string
  refresh: string
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
      <section className="mb-3 flex flex-col gap-2 text-meta text-muted-foreground sm:flex-row sm:items-center sm:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          <span className="truncate">{freshHelpText}</span>
        </span>
        {/* The same busy Button as the stale state below: it keeps focus and its label while the page refreshes (2C K13). */}
        <Button variant="outline" size="sm" busy={refreshing} onClick={refreshData}>
          <RefreshCw />
          {labels.refresh}
        </Button>
      </section>
    )
  }

  // Stale data is something to act on now, so it is a warning Notice. busy keeps focus on the button while the page
  // refreshes, and its spinner (which takes the place of the refresh icon) stops under reduced motion.
  return (
    <Notice
      tone="warning"
      title={labels.staleTitle}
      action={(
        <Button variant="outline" size="md" busy={refreshing} onClick={refreshData}>
          <RefreshCw />
          {labels.refresh}
        </Button>
      )}
      className="mb-3"
    >
      {staleHelpText}
    </Notice>
  )
}
