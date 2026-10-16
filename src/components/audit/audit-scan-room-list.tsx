"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Segmented } from "@/components/ui/segmented"
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
  activeItemId = null,
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
  /** The row whose check panel is open beside the list (wide screens). */
  activeItemId?: string | null
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const timeFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })

  /** Who checked it, or (in a chosen room, where the room line is left out) the custodian. */
  function metaLine(item: AuditScanItemRow) {
    if (item.scannedByName && item.lastScanAt) {
      return t("checkedBy", { name: item.scannedByName, time: timeFormat.format(new Date(item.lastScanAt)) })
    }
    if (showLocation || !item.expectedCustodianId) return null
    return custodianLabels.get(item.expectedCustodianId) ?? null
  }

  return (
    <section data-audit-scan-room-list aria-label={t("roomListLabel")}>
      <Segmented
        aria-label={t("roomListTabs")}
        value={tab}
        onValueChange={onTabChange}
        size="md"
        fill
        options={(["pending", "checked", "all"] as const).map((key) => ({
          value: key,
          label: (
            <>
              {t(tabLabelKey[key])}
              <span className="tabular-nums">{counts[key]}</span>
            </>
          ),
        }))}
      />

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t(emptyLabelKey[tab])}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {rows.map((item) => {
            const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
            const active = item.itemId === activeItemId
            const place = showLocation ? locationLabels.get(item.expectedLocationId) ?? item.expectedLocationId : null
            const meta = metaLine(item)
            return (
              <li key={item.itemId}>
                <button
                  type="button"
                  data-audit-scan-row
                  aria-current={active ? "true" : undefined}
                  onClick={() => onOpen(item)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active && "bg-accent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.assetTag}</span>
                    <span className="block truncate text-xs text-foreground">{item.name}</span>
                    {place ? <span data-audit-scan-row-room className="block break-words text-xs text-muted-foreground">{place}</span> : null}
                    {meta ? <span className="block truncate text-xs text-muted-foreground">{meta}</span> : null}
                  </span>
                  {badge ? (
                    <StatusBadge label={t(badgeLabelKey[badge])} tone={badgeTone[badge]} className="shrink-0" />
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
