"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type UIEvent } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"

type AssetDetailTabIndicator = {
  count?: number
  hasWarning?: boolean
}

export function AssetDetailTabs({
  locale,
  assetId,
  view,
  returnTo,
  label,
  labels,
  indicators,
  warningLabel,
}: {
  locale: string
  assetId: string
  view: AssetDetailView
  returnTo?: string | null
  label: string
  labels: Record<AssetDetailView, string>
  indicators?: Partial<Record<AssetDetailView, AssetDetailTabIndicator>>
  warningLabel: string
}) {
  const activeTabRef = useRef<HTMLAnchorElement>(null)
  const [showOverflowCue, setShowOverflowCue] = useState(true)

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [view])

  function handleScroll(event: UIEvent<HTMLElement>) {
    const container = event.currentTarget
    setShowOverflowCue(hasRemainingHorizontalContent(container))
  }

  return (
    <div className="relative">
    <nav
      aria-label={label}
      onScroll={handleScroll}
      style={{ scrollSnapType: "x mandatory" }}
      className="scrollbar-none -mx-4 overflow-x-auto px-4 pe-12 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max gap-2">
        {assetDetailViews.map((item) => {
          const indicator = indicators?.[item]

          return (
            <Link
              key={item}
              ref={view === item ? activeTabRef : undefined}
              href={buildAssetDetailViewHref(locale, assetId, item, returnTo)}
              aria-current={view === item ? "page" : undefined}
              style={{ scrollSnapAlign: "start" }}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors sm:h-9 sm:min-h-0 ${
                view === item
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{labels[item]}</span>
              {indicator?.count ? (
                <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${view === item ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {indicator.count}
                </span>
              ) : null}
              {indicator?.hasWarning ? (
                <span className={`inline-flex ${view === item ? "text-white" : "text-warning"}`}>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{warningLabel}</span>
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
    {showOverflowCue ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end border-r border-border bg-background/95 pr-1 text-muted-foreground sm:hidden"
      >
        <ChevronRight className="h-5 w-5" />
      </span>
    ) : null}
    </div>
  )
}
