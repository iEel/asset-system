"use client"

import { useEffect, useRef, useState, type UIEvent } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { TabNav } from "@/components/ui/tab-nav"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"
import { formatCount } from "@/lib/display-format"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"

type AssetDetailTabIndicator = {
  count?: number
  hasWarning?: boolean
}

// The client wrapper that owns the scrolling of the shared TabNav (spec 2B I9): it snaps the row, centres the
// current tab when the view changes and shows the phone overflow cue until the user reaches the end.
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
  const navRef = useRef<HTMLElement>(null)
  const [showOverflowCue, setShowOverflowCue] = useState(true)

  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [view])

  function handleScroll(event: UIEvent<HTMLElement>) {
    const container = event.currentTarget
    setShowOverflowCue(hasRemainingHorizontalContent(container))
  }

  return (
    <div className="relative">
      <TabNav
        ref={navRef}
        aria-label={label}
        current={view}
        onScroll={handleScroll}
        style={{ scrollSnapType: "x mandatory" }}
        linkClassName="snap-start"
        className="scrollbar-none -mx-4 px-4 pe-12 sm:mx-0 sm:px-0"
        items={assetDetailViews.map((item) => {
          const indicator = indicators?.[item]

          return {
            key: item,
            label: labels[item],
            href: buildAssetDetailViewHref(locale, assetId, item, returnTo),
            count: indicator?.count === undefined ? undefined : formatCount(indicator.count),
            icon: indicator?.hasWarning ? (
              <span className="inline-flex text-warning">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{warningLabel}</span>
              </span>
            ) : undefined,
          }
        })}
      />
      {showOverflowCue ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end border-r border-border bg-canvas/95 pr-1 text-muted-foreground sm:hidden"
        >
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : null}
    </div>
  )
}
