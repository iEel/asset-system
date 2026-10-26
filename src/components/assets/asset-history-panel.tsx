"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceChip } from "@/components/ui/choice-card"
import { ContentPanelRows } from "@/components/ui/content-panel"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  TableEmptyRow,
} from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { formatCount } from "@/lib/display-format"
import type { AssetHistoryCategory } from "@/lib/asset-history-rules"
import {
  ASSET_HISTORY_PAGE_SIZE,
  assetHistoryChipCounts,
  filterAssetHistoryRows,
  groupAssetHistoryByMonth,
  pageAssetHistoryRows,
  visibleAssetHistoryChips,
  type AssetHistoryPeriod,
  type AssetHistoryRow,
} from "@/lib/asset-history-view"

// A phone card the person may open is one link to the event's document: the row hover, the inset focus ring, 56px.
const phoneCardLinkClasses =
  "-mx-4 -my-3 block min-h-14 px-4 py-3 transition-colors hover:bg-row-hover hover:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

// The asset page's history (group 1 spec §7.6): radio chips with counts and the period filter the rows in place
// (choosing does not navigate), the desktop table groups them by month, the phone lists them as cards, and
// "แสดงเพิ่ม" shows 50 more at a time. Every date and time comes from the server, in Bangkok.
export function AssetHistoryPanel({
  rows,
  total,
  counts,
  capped,
  initialType,
}: {
  rows: AssetHistoryRow[]
  total: number
  counts: Record<AssetHistoryCategory, number>
  capped: boolean
  initialType: AssetHistoryCategory | null
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const chipName = useId()
  const [type, setType] = useState<AssetHistoryCategory | "all">(initialType ?? "all")
  const [period, setPeriod] = useState<AssetHistoryPeriod>("all")
  const [visible, setVisible] = useState(ASSET_HISTORY_PAGE_SIZE)
  const rangeRef = useRef<HTMLParagraphElement>(null)
  const focusRangeNext = useRef(false)

  useEffect(() => {
    // The last "แสดงเพิ่ม" unmounts its button, so focus goes to the range line instead of falling to <body>.
    if (!focusRangeNext.current) return
    focusRangeNext.current = false
    rangeRef.current?.focus()
  }, [visible])

  if (rows.length === 0) return <EmptyNote padded>{t("history.empty")}</EmptyNote>

  const chipCounts = assetHistoryChipCounts(rows, period, { total, counts })
  const chips = visibleAssetHistoryChips(counts, initialType)
  const filtered = filterAssetHistoryRows(rows, type, period)
  const { shown, remaining } = pageAssetHistoryRows(filtered, visible)
  const groups = groupAssetHistoryByMonth(shown)

  const chooseType = (next: AssetHistoryCategory | "all") => {
    setType(next)
    setVisible(ASSET_HISTORY_PAGE_SIZE)
  }
  const choosePeriod = (next: AssetHistoryPeriod) => {
    setPeriod(next)
    setVisible(ASSET_HISTORY_PAGE_SIZE)
  }
  const showMore = () => {
    focusRangeNext.current = remaining <= ASSET_HISTORY_PAGE_SIZE
    setVisible((current) => current + ASSET_HISTORY_PAGE_SIZE)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-soft px-4 py-3 md:px-5">
        <fieldset className="min-w-0">
          <legend className="sr-only">{t("history.typeLegend")}</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              type="radio"
              name={chipName}
              checked={type === "all"}
              onChange={() => chooseType("all")}
              label={t("movementFilters.all")}
              detail={formatCount(chipCounts.total)}
            />
            {chips.map((category) => (
              <ChoiceChip
                key={category}
                type="radio"
                name={chipName}
                checked={type === category}
                onChange={() => chooseType(category)}
                label={t(`history.types.${category}`)}
                detail={formatCount(chipCounts.counts[category])}
              />
            ))}
          </div>
        </fieldset>
        <FilterSelect
          label={t("history.period")}
          fieldSize="md"
          className="max-md:hidden"
          value={period}
          onChange={(event) => choosePeriod(event.target.value === "year" ? "year" : "all")}
          options={[
            { value: "all", label: t("movementFilters.all") },
            { value: "year", label: t("history.periodYear") },
          ]}
        />
      </div>

      {capped ? (
        <Notice tone="info" className="px-4 pt-3 md:px-5">
          {t("history.capped", { shown: formatCount(rows.length), total: formatCount(total) })}
        </Notice>
      ) : null}

      <DataTable framed={false} className="hidden md:block" caption={t("history.title")} scrollHint={tCommon("tableScrollHint")}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("history.columns.at")}</DataTableHead>
            <DataTableHead>{t("history.columns.event")}</DataTableHead>
            <DataTableHead>{t("history.columns.detail")}</DataTableHead>
            <DataTableHead>{t("history.columns.actor")}</DataTableHead>
            <DataTableHead>{t("history.columns.document")}</DataTableHead>
          </tr>
        </DataTableHeader>
        {groups.length === 0 ? (
          <DataTableBody>
            <TableEmptyRow colSpan={5}>{t("history.emptyFiltered")}</TableEmptyRow>
          </DataTableBody>
        ) : (
          groups.map((group) => (
            <DataTableBody key={group.monthKey}>
              <DataTableGroupRow colSpan={5}>{group.monthLabel}</DataTableGroupRow>
              {group.rows.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground num">
                    <time dateTime={row.atIso}>{row.when}</time>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap font-medium text-foreground">{row.label}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">{orNil(row.detail)}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">{orNil(row.actor)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {row.document ? (
                      <Link href={row.document.href} className={linkVariants({ size: "inherit" })}>
                        <span className="tag">{row.document.code}</span>
                      </Link>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          ))
        )}
      </DataTable>

      <div className="md:hidden">
        {groups.length === 0 ? (
          <EmptyNote padded>{t("history.emptyFiltered")}</EmptyNote>
        ) : (
          groups.map((group) => (
            <div key={group.monthKey}>
              <h3 className="border-b border-border-soft px-4 pt-4 pb-2 text-meta font-semibold text-foreground">{group.monthLabel}</h3>
              <ContentPanelRows>
                {group.rows.map((row) => {
                  const card = (
                    <>
                      <span className="block text-sm text-foreground">
                        <span className="font-medium">{row.label}</span>
                        {" · "}
                        <span className="num text-muted-foreground">
                          <time dateTime={row.atIso}>{row.when}</time>
                        </span>
                      </span>
                      {row.detail ? <span className="mt-1 block break-words text-sm text-muted-foreground">{row.detail}</span> : null}
                      {row.actor || row.document ? (
                        <span className="mt-1 block text-meta text-muted-foreground">
                          {row.actor}
                          {row.actor && row.document ? " · " : null}
                          {row.document ? <span className="tag">{row.document.code}</span> : null}
                        </span>
                      ) : null}
                    </>
                  )
                  return (
                    <li key={row.id}>
                      {row.document ? (
                        <Link href={row.document.href} className={phoneCardLinkClasses}>
                          {card}
                        </Link>
                      ) : (
                        <div className="min-h-14">{card}</div>
                      )}
                    </li>
                  )
                })}
              </ContentPanelRows>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3 md:px-5">
        <p ref={rangeRef} tabIndex={-1} aria-live="polite" className="text-meta text-muted-foreground num focus-visible:outline-none">
          {t("history.range", { shown: formatCount(shown.length), total: formatCount(filtered.length) })}
        </p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={showMore}>
            {t("history.showMore", { count: formatCount(remaining) })}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
