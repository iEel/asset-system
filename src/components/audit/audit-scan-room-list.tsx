"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { getAuditItemBadge, type AuditItemBadge, type AuditScanItemRow, type AuditScanListTab } from "@/lib/audit-scan-session"
import { cn } from "@/lib/utils"

const badgeTone: Record<AuditItemBadge | "queued", StatusTone> = {
  found: "success",
  mismatch: "warning",
  not_found: "danger",
  out_of_scope: "info",
  queued: "muted",
}
const badgeLabelKey = {
  found: "badgeFound",
  mismatch: "badgeMismatch",
  not_found: "badgeNotFound",
  out_of_scope: "badgeOutOfScope",
  queued: "badgeQueued",
} as const
const tabLabelKey = { pending: "tabPending", checked: "tabChecked", all: "tabAll" } as const
const emptyLabelKey = { pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" } as const

export function AuditScanRoomList({
  rows,
  total,
  counts,
  tab,
  onTabChange,
  onShowMore,
  onOpen,
  queuedAssetIds,
  custodianLabels,
  locationLabels,
  showLocation,
  pendingHref,
}: {
  rows: AuditScanItemRow[]
  total: number
  counts: Record<AuditScanListTab, number>
  tab: AuditScanListTab
  onTabChange: (tab: AuditScanListTab) => void
  onShowMore: () => void
  onOpen: (item: AuditScanItemRow) => void
  queuedAssetIds: ReadonlySet<string>
  custodianLabels: ReadonlyMap<string, string>
  locationLabels: ReadonlyMap<string, string>
  showLocation: boolean
  pendingHref: string | null
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const timeFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })

  function secondLine(item: AuditScanItemRow) {
    if (item.scannedByName && item.lastScanAt) {
      return t("checkedBy", { name: item.scannedByName, time: timeFormat.format(new Date(item.lastScanAt)) })
    }
    const place = showLocation ? locationLabels.get(item.expectedLocationId) : null
    const custodian = item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) : null
    return [item.name, place ?? custodian].filter(Boolean).join(" · ")
  }

  return (
    <section data-audit-scan-room-list aria-label={t("roomListLabel")}>
      <div role="group" aria-label={t("roomListTabs")} className="flex gap-1 rounded-md bg-muted p-1">
        {(["pending", "checked", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => onTabChange(key)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
              tab === key ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tabLabelKey[key])}
            <span className="tabular-nums">{counts[key]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t(emptyLabelKey[tab])}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {rows.map((item) => {
            const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
            return (
              <li key={item.itemId}>
                <button
                  type="button"
                  data-audit-scan-row
                  onClick={() => onOpen(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{secondLine(item)}</span>
                  </span>
                  {badge ? (
                    <StatusBadge size="xs" label={t(badgeLabelKey[badge])} tone={badgeTone[badge]} className="shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {total > rows.length ? (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("showMore")}
        </button>
      ) : null}

      {tab === "pending" && pendingHref ? (
        <Link
          href={pendingHref}
          className="mt-3 inline-flex min-h-11 items-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("pendingLink")}
        </Link>
      ) : null}
    </section>
  )
}
