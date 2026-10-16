"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { getAuditItemBadge, type AuditItemBadge, type AuditScanItemRow, type AuditScanListTab } from "@/lib/audit-scan-session"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
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
              <span className="num">{formatCount(counts[key])}</span>
            </>
          ),
        }))}
      />

      {rows.length === 0 ? (
        <EmptyNote tone={tab === "pending" ? "clear" : "empty"} className="justify-center px-2 py-6">{t(emptyLabelKey[tab])}</EmptyNote>
      ) : (
        <ul className={cn(getPanelClasses(), "mt-2 divide-y divide-border overflow-hidden")}>
          {rows.map((item) => {
            const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
            const active = item.itemId === activeItemId
            const place = showLocation ? locationLabels.get(item.expectedLocationId) ?? item.expectedLocationId : null
            const meta = metaLine(item)
            return (
              <li key={item.itemId}>
                {/* A raw button on purpose: the whole row of two to four lines opens the check sheet (2D-5 lists it). */}
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
                    <span className="block truncate text-sm text-foreground"><span className="tag font-medium">{item.assetTag}</span></span>
                    <span className="block truncate text-meta text-foreground">{item.name}</span>
                    {place ? <span data-audit-scan-row-room className="block break-words text-meta text-muted-foreground">{place}</span> : null}
                    {meta ? <span className="block truncate text-meta text-muted-foreground">{meta}</span> : null}
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
        <Button variant="outline" onClick={onShowMore} className="mt-2 w-full">
          {t("showMore")}
        </Button>
      ) : null}

      {tab === "pending" && pendingHref ? (
        <Link
          href={pendingHref}
          className={cn(linkVariants(), "mt-3 inline-flex min-h-11 items-center md:min-h-0")}
        >
          {t("pendingLink")}
        </Link>
      ) : null}
    </section>
  )
}
