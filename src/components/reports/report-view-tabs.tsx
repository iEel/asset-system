"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { parseAssetListParams } from "@/lib/asset-list-query"
import { buildReportHref, reportViews, type ReportView } from "@/lib/report-view"

type ReportViewTabsProps = {
  locale: string
  activeView: ReportView
  filters: ReturnType<typeof parseAssetListParams>
  labels: Record<ReportView, string>
  navigationLabel: string
}

export function ReportViewTabs({ locale, activeView, filters, labels, navigationLabel }: ReportViewTabsProps) {
  const tabsRef = useRef<HTMLElement>(null)
  const activeTabRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const tabs = tabsRef.current
    const activeTab = activeTabRef.current
    if (!tabs || !activeTab || window.matchMedia("(min-width: 768px)").matches) return

    const tabsRect = tabs.getBoundingClientRect()
    const activeRect = activeTab.getBoundingClientRect()
    const isFullyVisible = activeRect.left >= tabsRect.left && activeRect.right <= tabsRect.right
    if (isFullyVisible) return

    tabs.scrollTo({
      left: tabs.scrollLeft + activeRect.left - tabsRect.left,
      behavior: "auto",
    })
  }, [activeView])

  return (
    <nav ref={tabsRef} data-report-tabs aria-label={navigationLabel} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
      {reportViews.map((view) => {
        const isActive = view === activeView
        return (
          <Link
            key={view}
            ref={isActive ? activeTabRef : undefined}
            href={buildReportHref(locale, view, filters)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 snap-start items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {isActive ? <Check aria-hidden="true" className="mr-1.5 h-4 w-4" /> : null}
            {labels[view]}
          </Link>
        )
      })}
    </nav>
  )
}
