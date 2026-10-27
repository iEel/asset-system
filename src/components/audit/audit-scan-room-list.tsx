"use client"

import Link from "next/link"
import { useId } from "react"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { getAuditItemBadge, type AuditItemBadge, type AuditScanItemRow, type AuditScanListScope, type AuditScanListTab } from "@/lib/audit-scan-session"
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
// The third tab names what it lists: the chosen room, or the whole round with none (spec §11, P3-R7).
const tabLabelKey = {
  room: { pending: "tabPending", checked: "tabChecked", all: "tabAllRoom" },
  round: { pending: "tabPending", checked: "tabChecked", all: "tabAllRound" },
} as const
const emptyLabelKey = {
  room: { pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" },
  round: { pending: "emptyPending", checked: "emptyChecked", all: "emptyAllRound" },
} as const
const pendingLinkKey = { room: "pendingLinkRoom", round: "pendingLinkRound" } as const

/** The chip row: "ทุกหมวดหมู่" (the tab's count, P3-R16) and each category of the room in the tab, named (decision 3, P3-R6). */
export type AuditScanCategoryRow = { all: number; chips: Array<{ id: string; label: string; count: number }> }

export function AuditScanRoomList({
  rows,
  total,
  counts,
  tab,
  scope,
  searching,
  onTabChange,
  categories,
  categoryId,
  onCategoryChange,
  onShowMore,
  onOpen,
  queuedAssetIds,
  custodianLabels,
  locationLabels,
  showLocation,
  pendingHref,
  pendingCount,
  recordedOutOfScope,
  onOpenRecorded,
  activeItemId = null,
}: {
  rows: AuditScanItemRow[]
  total: number
  counts: Record<AuditScanListTab, number>
  tab: AuditScanListTab
  scope: AuditScanListScope
  /** A search is running: only the switch shows, and the results sit under it (spec §11). */
  searching: boolean
  onTabChange: (tab: AuditScanListTab) => void
  /** null when the room and tab hold one category or none (hidden, P3-R6). */
  categories: AuditScanCategoryRow | null
  /** The chosen category; null is every category. */
  categoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  onShowMore: () => void
  onOpen: (item: AuditScanItemRow) => void
  queuedAssetIds: ReadonlySet<string>
  custodianLabels: ReadonlyMap<string, string>
  locationLabels: ReadonlyMap<string, string>
  showLocation: boolean
  pendingHref: string | null
  /** The room's pending own items by place, or the round's (P3-R14): the rows the pending list opens with. */
  pendingCount: number
  /** The round's recorded out-of-scope finds in the room (or the round), counted apart from the tabs (P3-R25). */
  recordedOutOfScope: AuditScanItemRow[]
  /** Opens a recorded find's out-of-scope form through the register lookup (Task 4). */
  onOpenRecorded: (item: AuditScanItemRow) => void
  /** The row whose check panel is open beside the list (wide screens). */
  activeItemId?: string | null
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const timeFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })
  const recordedHeadingId = useId()

  /** The custodian and the installed components (spec §11). */
  function detailLine(item: AuditScanItemRow) {
    const custodian = item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) ?? null : null
    const components = item.componentCount > 0 ? t("rowComponents", { count: formatCount(item.componentCount) }) : null
    return [custodian, components].filter(Boolean).join(" · ") || null
  }

  /** Who checked it and when (spec §11: kept for checked items). */
  function checkedLine(item: AuditScanItemRow) {
    return item.scannedByName && item.lastScanAt ? t("checkedBy", { name: item.scannedByName, time: timeFormat.format(new Date(item.lastScanAt)) }) : null
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
              {t(tabLabelKey[scope][key])}
              <span className="num">{formatCount(counts[key])}</span>
            </>
          ),
        }))}
      />

      {searching ? null : (
        <>
          {categories ? (
            // The room's categories in the tab, sideways inside their own row so the page never scrolls sideways
            // (spec §11, decision 3). State, not a URL, so Segmented (TabNav's rule: links only).
            <div data-audit-scan-categories className="mt-2 overflow-x-auto overscroll-x-contain">
              <Segmented
                aria-label={t("categoryChipsLabel")}
                value={categoryId ?? ""}
                onValueChange={(next) => onCategoryChange(next || null)}
                size="md"
                options={[
                  { value: "", label: <>{t("categoryAll")}<span className="num">{formatCount(categories.all)}</span></> },
                  ...categories.chips.map((chip) => ({ value: chip.id, label: <>{chip.label}<span className="num">{formatCount(chip.count)}</span></> })),
                ]}
              />
            </div>
          ) : null}

          {rows.length === 0 ? (
            <EmptyNote tone={tab === "pending" ? "clear" : "empty"} className="justify-center px-2 py-6">{t(emptyLabelKey[scope][tab])}</EmptyNote>
          ) : (
            <ul className={cn(getPanelClasses(), "mt-2 divide-y divide-border overflow-hidden")}>
              {rows.map((item) => {
                const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
                const active = item.itemId === activeItemId
                const place = showLocation ? locationLabels.get(item.expectedLocationId) ?? item.expectedLocationId : null
                const detail = detailLine(item)
                const checked = checkedLine(item)
                return (
                  <li key={item.itemId}>
                    {/* A raw button on purpose: the whole row of two to five lines opens the check sheet (2D-5 lists it). */}
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
                        <span className="block break-words text-sm font-semibold text-foreground">{item.name}</span>
                        <span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">{item.assetTag}</span></span>
                        {place ? <span data-audit-scan-row-room className="block break-words text-meta text-muted-foreground">{place}</span> : null}
                        {detail ? <span className="block truncate text-meta text-muted-foreground">{detail}</span> : null}
                        {checked ? <span className="block truncate text-meta text-muted-foreground">{checked}</span> : null}
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

          {tab === "checked" && recordedOutOfScope.length > 0 ? (
            <section data-audit-scan-recorded-out-of-scope className="mt-3" aria-labelledby={recordedHeadingId}>
              {/* P3-R25: the round's recorded out-of-scope finds, apart from every count (spec §5: the tabs count own
                  items), so the นอกขอบเขต badge of Appendix A §11 stays on the phone. */}
              <h2 id={recordedHeadingId} className="px-1 text-meta font-medium text-muted-foreground">
                {t("recordedOutOfScopeTitle", { count: formatCount(recordedOutOfScope.length) })}
              </h2>
              <ul className={cn(getPanelClasses(), "mt-1 divide-y divide-border overflow-hidden")}>
                {recordedOutOfScope.map((item) => {
                  const checked = checkedLine(item)
                  return (
                    <li key={item.itemId}>
                      {/* A raw button on purpose: the whole row opens the find's out-of-scope form (P3-R25). */}
                      <button
                        type="button"
                        data-audit-scan-recorded-row
                        onClick={() => onOpenRecorded(item)}
                        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-foreground">{item.name}</span>
                          <span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">{item.assetTag}</span></span>
                          {checked ? <span className="block truncate text-meta text-muted-foreground">{checked}</span> : null}
                        </span>
                        <StatusBadge label={t(badgeLabelKey.out_of_scope)} tone={badgeTone.out_of_scope} className="shrink-0" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {tab === "pending" && pendingHref && pendingCount > 0 ? (
            <Link
              href={pendingHref}
              className={cn(linkVariants(), "mt-3 inline-flex min-h-11 items-center md:min-h-0")}
            >
              {t(pendingLinkKey[scope], { count: formatCount(pendingCount) })}
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}
