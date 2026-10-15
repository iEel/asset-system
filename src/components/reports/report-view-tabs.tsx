"use client"

import { useEffect, useRef } from "react"
import { TabNav } from "@/components/ui/tab-nav"
import { parseAssetListParams } from "@/lib/asset-list-query"
import { buildReportHref, reportViews, type ReportView } from "@/lib/report-view"

type ReportViewTabsProps = {
  locale: string
  activeView: ReportView
  filters: ReturnType<typeof parseAssetListParams>
  labels: Record<ReportView, string>
  navigationLabel: string
}

// The client wrapper that owns the scrolling of the shared TabNav (spec 2B I9): the row snaps link by link, and below
// md a direct link to a later view brings its tab into the row. TabNav draws the underline and sets aria-current.
export function ReportViewTabs({ locale, activeView, filters, labels, navigationLabel }: ReportViewTabsProps) {
  const tabsRef = useRef<HTMLElement>(null)
  // TabNav renders the links, so the current one is looked up in the row after each view change.
  const activeTabRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const tabs = tabsRef.current
    activeTabRef.current = tabs?.querySelector<HTMLElement>('[aria-current="page"]') ?? null
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
    <TabNav
      ref={tabsRef}
      data-report-tabs
      aria-label={navigationLabel}
      current={activeView}
      className="snap-x snap-mandatory"
      linkClassName="snap-start"
      items={reportViews.map((view) => ({ key: view, label: labels[view], href: buildReportHref(locale, view, filters) }))}
    />
  )
}
