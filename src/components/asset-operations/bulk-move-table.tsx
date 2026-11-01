"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Nil } from "@/components/ui/nil"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge } from "@/components/ui/status-badge"
import { getBulkMovePageState, getBulkMoveRowLock, type BulkMoveSelection } from "@/lib/bulk-move-form-rules"
import { bulkMoveMaxAssets, type BulkMoveListPage, type BulkMoveListRow } from "@/lib/bulk-move-list-rules"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"

export type BulkMoveTableProps = {
  listPage: BulkMoveListPage
  selection: BulkMoveSelection
  disabled: boolean // while saving
  /** While another query loads: the table is busy, and the header box and the pager wait (plan 4 final review ui-4). */
  loading: boolean
  onToggleRow: (row: BulkMoveListRow, checked: boolean) => void
  onTogglePage: (checked: boolean) => void
  onPage: (page: number) => void
}

// The one description of every box the cap locks (P4-R10); a box locked because its row is refused reads that row's reason.
const CAP_REASON_ID = "bulk-move-cap-reason"
/** The header box; focus lands on it when the selection empties (plan 4 final review ui-1). */
export const BULK_MOVE_SELECT_PAGE_ID = "bulk-move-select-page"

// ย้ายที่ตั้งหลายรายการ's table (group 3 spec §10.1; plan 4 P4-R1, P4-R2, P4-R9, P4-R10, P4-R22): the page's rows with a
// native box each in a 44px label, the header box for the page (mixed while some are ticked), and the shared pager in
// button mode. It draws only what its props say: which box is locked and why comes from Task 5's rules.
export function BulkMoveTable({ listPage, selection, disabled, loading, onToggleRow, onTogglePage, onPage }: BulkMoveTableProps) {
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const { rows, total, page, pageSize } = listPage
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pageState = getBulkMovePageState(selection, rows)
  const headerRef = useRef<HTMLInputElement | null>(null)
  const footer =
    total > 0 ? (
      // While loading, the bounds say there is no other page, so previous and next are both disabled and the displayed
      // page never overwrites the pending query's (plan 4 final review ui-4).
      <Pagination
        page={loading ? 1 : page}
        totalPages={loading ? 1 : totalPages}
        onPrevious={() => onPage(page - 1)}
        onNext={() => onPage(page + 1)}
        labels={{
          navigation: tCommon("pagination"),
          previous: tCommon("previous"),
          next: tCommon("next"),
          pageOf: tCommon("pageOf", { page: formatCount(page), total: formatCount(totalPages) }),
          range: tCommon("showingRange", { from: formatCount(from), to: formatCount(to), total: formatCount(total) }),
        }}
      />
    ) : null

  // indeterminate is a property, never an attribute: the header box shows the mixed mark through it.
  useEffect(() => {
    const input = headerRef.current
    if (input) input.indeterminate = pageState === "some"
  }, [pageState])

  return (
    <div className="grid min-w-0 gap-2">
      {selection.size >= bulkMoveMaxAssets ? <p id={CAP_REASON_ID} className="sr-only">{t("capReached", { max: formatCount(bulkMoveMaxAssets) })}</p> : null}
      <DataTable caption={t("tableCaption")} footer={footer} minWidth={960} scrollHint={tCommon("tableScrollHint")} aria-busy={loading || undefined}>
        <DataTableHeader>
          <tr>
            <DataTableHead className="w-14 py-0">
              <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center" data-no-row-click>
                <input
                  ref={headerRef}
                  id={BULK_MOVE_SELECT_PAGE_ID}
                  type="checkbox"
                  className={checkboxVariants()}
                  aria-label={t("selectPage")}
                  aria-checked={pageState === "some" ? "mixed" : pageState === "all"}
                  checked={pageState === "all"}
                  disabled={disabled || loading || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))}
                  onChange={() => onTogglePage(pageState !== "all")}
                />
              </label>
            </DataTableHead>
            <DataTableHead>{t("colTag")}</DataTableHead>
            <DataTableHead>{t("colName")}</DataTableHead>
            <DataTableHead>{t("colCategory")}</DataTableHead>
            <DataTableHead>{t("colLocation")}</DataTableHead>
            <DataTableHead>{t("colHolder")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.length === 0 ? <TableEmptyRow colSpan={6}>{tAll("asset.noResultsTitle")}</TableEmptyRow> : null}
          {rows.map((row) => {
            const lock = getBulkMoveRowLock(selection, row)
            return (
              <DataTableRow key={row.id} data-bulk-move-row={row.assetTag}>
                <DataTableCell className="w-14 py-0">
                  <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center" data-no-row-click>
                    <input
                      type="checkbox"
                      className={checkboxVariants()}
                      aria-label={t("selectRow", { tag: row.assetTag })}
                      aria-describedby={lock === "cap" ? CAP_REASON_ID : !row.eligible && row.reasonKey ? `bulk-move-row-reason-${row.id}` : undefined}
                      checked={selection.has(row.id)}
                      disabled={disabled || lock !== null}
                      onChange={(event) => onToggleRow(row, event.target.checked)}
                    />
                  </label>
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap font-mono">{row.assetTag}</DataTableCell>
                <DataTableCell>
                  <div className="grid min-w-0 justify-items-start gap-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-medium text-foreground">{row.name}</span>
                      <StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.statusName)} />
                    </span>
                    {row.travellingComponents.length > 0 ? <p data-bulk-move-follow className="text-meta text-muted-foreground">{t("componentsFollow", { count: row.travellingComponents.length })}</p> : null}
                    {row.componentOf ? <p data-bulk-move-component-of className="text-meta text-muted-foreground">{t("componentOf", { tag: row.componentOf.parentTag })}</p> : null}
                    {!row.eligible && row.reasonKey ? <p id={`bulk-move-row-reason-${row.id}`} data-bulk-move-reason className="text-meta text-warning">{tAll(row.reasonKey)}</p> : null}
                  </div>
                </DataTableCell>
                <DataTableCell>{row.categoryLabel ?? <Nil />}</DataTableCell>
                <DataTableCell>{row.locationLabel ?? <Nil />}</DataTableCell>
                <DataTableCell>{row.holderLabel ?? <span className="text-muted-foreground">{t("noHolder")}</span>}</DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
