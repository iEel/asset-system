"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { CheckCheck, ClipboardCheck } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Notice } from "@/components/ui/notice"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import {
  inspectionBlockedMessageKeys,
  inspectionSelectionSummary,
  isInspectionRowSelectable,
  selectAllInspectionRows,
  type InspectionPageRow,
} from "@/lib/inspection-confirm-page-model"
import {
  INSPECTION_CONFIRM_MAX_ASSETS,
  inspectionConfirmTabs,
  type InspectionConfirmTab,
  type InspectionTargetStatusName,
} from "@/lib/inspection-confirm-rules"
import { cn } from "@/lib/utils"
import { InspectionConfirmDialog, type InspectionBlockedEntry } from "./inspection-confirm-dialog"
import { InspectionRowCard, InspectionTableRow } from "./inspection-row"

export type InspectionConfirmWorkspaceProps = {
  locale: string
  roundId: string
  auditNo: string
  tab: InspectionConfirmTab
  counts: Record<InspectionConfirmTab, number>
  /** The rows of the current tab only. */
  rows: InspectionPageRow[]
  canConfirm: boolean
  statusLabels: Record<InspectionTargetStatusName, string>
  links: { round: string; pendingFindings: string; pendingItems: string }
}

const bannerLinkClasses = cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")
const tickLabelClasses = "flex min-h-11 w-11 cursor-pointer items-center justify-center"

/** The ticks belong to the tab they were made on: another tab reads an empty selection (ids only come from ready). */
type Selection = { tab: InspectionConfirmTab; ids: ReadonlySet<string>; capped: boolean }
/** The last answer, for the tab it ran on: a 200's count, or a 409's blocked entries. */
type ConfirmResult = { tab: InspectionConfirmTab } & ({ kind: "success"; confirmed: number } | { kind: "changed"; blocked: InspectionBlockedEntry[] })

const EMPTY_IDS: ReadonlySet<string> = new Set()

/** The id of a row's handoverUnclear text in one of its two renders (card below md, table row from md). */
function unclearIdFor(view: "card" | "table", assetId: string) {
  return `inspection-unclear-${view}-${assetId}`
}

// ยืนยันผลตรวจ (inspection-confirm plan 3): the five tabs and the list; on the ready tab, with asset:edit, the ticks, the
// selection bars and the confirm dialog (task 3).
export function InspectionConfirmWorkspace({ locale, roundId, auditNo, tab, counts, rows, canConfirm, statusLabels, links }: InspectionConfirmWorkspaceProps) {
  const t = useTranslations("inspectionConfirmPage")
  const tCommon = useTranslations("common")
  const total = inspectionConfirmTabs.reduce((sum, key) => sum + counts[key], 0)

  const [selection, setSelection] = useState<Selection>({ tab, ids: EMPTY_IDS, capped: false })
  const [result, setResult] = useState<ConfirmResult | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; key: number }>({ open: false, key: 0 })
  const openerRef = useRef<HTMLElement | null>(null)
  const selectAllTickRef = useRef<HTMLInputElement | null>(null)

  // Another tab resets the selection and the last answer (React's adjust-state-on-prop-change pattern, no effect), so
  // coming back to the ready tab starts empty.
  if (selection.tab !== tab) {
    setSelection({ tab, ids: EMPTY_IDS, capped: false })
    if (result) setResult(null)
  }

  const ticking = canConfirm && tab === "ready"
  const selectableRows = useMemo(() => (ticking ? rows.filter(isInspectionRowSelectable) : []), [ticking, rows])
  // A tab change resets the selection; after a refresh only rows still selectable count.
  const tabIds = selection.tab === tab ? selection.ids : EMPTY_IDS
  const selectedIds = useMemo(() => selectableRows.filter((row) => tabIds.has(row.assetId)).map((row) => row.assetId), [selectableRows, tabIds])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const summary = useMemo(() => inspectionSelectionSummary(selectableRows, selectedSet), [selectableRows, selectedSet])
  const capped = selection.tab === tab && selection.capped
  const count = selectedIds.length
  const tickLimit = Math.min(selectableRows.length, INSPECTION_CONFIRM_MAX_ASSETS)
  const headerState = count === 0 ? "none" : count >= tickLimit ? "all" : "some"
  const shownResult = result?.tab === tab ? result : null

  useEffect(() => {
    if (selectAllTickRef.current) selectAllTickRef.current.indeterminate = headerState === "some"
  }, [headerState])

  function selectAll() {
    const next = selectAllInspectionRows(selectableRows)
    setResult(null)
    setSelection({ tab, ids: new Set(next.ids), capped: next.capped })
  }

  function clear() {
    setSelection({ tab, ids: EMPTY_IDS, capped: false })
  }

  // The header tick: none or some ticked selects the tab (capped as select-all is); all ticked clears.
  function toggleAll() {
    if (headerState === "all") clear()
    else selectAll()
  }

  function toggle(assetId: string) {
    setResult(null)
    const ids = new Set(selectedIds)
    if (ids.has(assetId)) {
      ids.delete(assetId)
      setSelection({ tab, ids, capped: false })
      return
    }
    // The route takes at most INSPECTION_CONFIRM_MAX_ASSETS: past it the tick is refused and the cap notice says why.
    if (ids.size >= INSPECTION_CONFIRM_MAX_ASSETS) {
      setSelection({ tab, ids, capped: true })
      return
    }
    ids.add(assetId)
    setSelection({ tab, ids, capped: capped })
  }

  function openDialog(event: React.MouseEvent<HTMLElement>) {
    openerRef.current = event.currentTarget
    setResult(null)
    setDialog((current) => ({ open: true, key: current.key + 1 }))
  }

  function closeDialog() {
    setDialog((current) => ({ ...current, open: false }))
  }

  function handleConfirmed(confirmed: number) {
    closeDialog()
    clear()
    setResult({ tab, kind: "success", confirmed })
  }

  // A 409: keep only the ticks the route did not name, and list what changed.
  function handleChanged(blocked: InspectionBlockedEntry[]) {
    closeDialog()
    const blockedIds = new Set(blocked.map((entry) => entry.assetId))
    setSelection({ tab, ids: new Set(selectedIds.filter((id) => !blockedIds.has(id))), capped: false })
    setResult({ tab, kind: "changed", blocked })
  }

  // The polite live region stays mounted in both shapes below, so the success line is read even when it empties the round.
  const liveRegion = (
    <div role="status" aria-live="polite" className={cn(!shownResult && "sr-only")}>
      {shownResult?.kind === "success" ? <Notice tone="success">{t("successNotice", { count: shownResult.confirmed })}</Notice> : null}
      {shownResult?.kind === "changed" ? (
        <Notice tone="warning" title={t("changedNotice")}>
          <ul className="space-y-0.5">
            {shownResult.blocked.map((entry) => (
              <li key={entry.assetId}>
                <span className="tag">{entry.assetTag ?? entry.assetId}</span>: {t(inspectionBlockedMessageKeys[entry.code] ?? "errorFallback")}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </div>
  )

  // Nothing of this round is still under inspection: no tabs, just the way back.
  if (total === 0) {
    return (
      <div className="space-y-4">
        {liveRegion}
        <ContentPanel>
          <ActionEmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            actionHref={links.round}
            actionLabel={t("backToRound")}
            actionVariant="secondary"
          />
        </ContentPanel>
      </div>
    )
  }

  const confirmPath = `/${locale}/audit/rounds/${roundId}/confirm`
  const tabItems = inspectionConfirmTabs.map((key) => ({
    key,
    label: t(`tab_${key}`),
    count: formatCount(counts[key]),
    href: `${confirmPath}?tab=${key}`,
  }))
  const columnCount = canConfirm ? 6 : 5

  // A ready row's tick: live when it has a target, disabled and described by its handoverUnclear text when not.
  function tickFor(row: InspectionPageRow, view: "card" | "table") {
    if (!ticking) return undefined
    const name = `${row.assetTag} ${row.assetName}`
    if (!isInspectionRowSelectable(row)) {
      return (
        <label className={cn(tickLabelClasses, "cursor-not-allowed")}>
          <input type="checkbox" disabled checked={false} readOnly aria-label={name} aria-describedby={unclearIdFor(view, row.assetId)} className={checkboxVariants()} />
        </label>
      )
    }
    return (
      <label className={tickLabelClasses}>
        <input type="checkbox" checked={selectedSet.has(row.assetId)} onChange={() => toggle(row.assetId)} aria-label={name} className={checkboxVariants()} />
      </label>
    )
  }

  // The header tick of the ready tab; elsewhere the column keeps its hidden name.
  const headerTickShown = ticking && selectableRows.length > 0
  const selectAllHeader = headerTickShown ? (
    <label className={tickLabelClasses}>
      <input
        ref={selectAllTickRef}
        type="checkbox"
        checked={headerState === "all"}
        onChange={toggleAll}
        aria-label={t("selectAll")}
        className={checkboxVariants()}
      />
    </label>
  ) : (
    t("selectAll")
  )
  const summaryText = t("selectionSummary", { inUse: summary["In Use"] ?? 0, ready: summary.Ready ?? 0, checkedOut: summary["Checked Out"] ?? 0 })
  const confirmButton = (
    <Button size="md" onClick={openDialog}>
      <CheckCheck aria-hidden="true" />
      {t("confirmOpen")}
    </Button>
  )

  return (
    <div className="space-y-4">
      {liveRegion}
      <section className="space-y-4">
        <TabNav aria-label={t("title")} items={tabItems} current={tab} />

        {!canConfirm ? <Notice tone="info">{t("noEditNotice")}</Notice> : null}

        {tab === "awaitingReview" && rows.length > 0 ? (
          <Notice tone="warning" action={<Link href={links.pendingFindings} className={bannerLinkClasses}>{t("awaitingReviewLink")}</Link>}>
            {t("awaitingReviewBanner")}
          </Notice>
        ) : null}
        {tab === "notScanned" && rows.length > 0 ? (
          <Notice tone="warning" action={<Link href={links.pendingItems} className={bannerLinkClasses}>{t("notScannedLink")}</Link>}>
            {t("notScannedBanner")}
          </Notice>
        ) : null}
        {/* Plan 4 replaces this note with the damaged and not-found actions. */}
        {(tab === "damaged" || tab === "notFound") && rows.length > 0 ? <Notice tone="neutral">{t("laterTabNote")}</Notice> : null}

        {headerTickShown ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="outline" size="md" onClick={selectAll}>
              {t("selectAll")}
            </Button>
            {capped ? <Notice tone="info">{t("cappedNotice", { max: INSPECTION_CONFIRM_MAX_ASSETS })}</Notice> : null}
          </div>
        ) : null}

        <div className="min-w-0">
          <ContentPanel divided flush>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {rows.length === 0 ? (
                <ActionEmptyState title={t("emptyTabTitle")} />
              ) : (
                rows.map((row) => (
                  <InspectionRowCard key={row.assetId} locale={locale} row={row} canConfirm={canConfirm} statusLabels={statusLabels} tick={tickFor(row, "card")} unclearId={unclearIdFor("card", row.assetId)} />
                ))
              )}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t(`tab_${tab}`)} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  {canConfirm ? <DataTableHead className="w-10" hideLabel={!headerTickShown}>{selectAllHeader}</DataTableHead> : null}
                  <DataTableHead>{t("col_asset")}</DataTableHead>
                  <DataTableHead>{t("col_result")}</DataTableHead>
                  <DataTableHead>{t("col_location")}</DataTableHead>
                  <DataTableHead>{t("col_holder")}</DataTableHead>
                  <DataTableHead>{t("col_target")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow colSpan={columnCount} emptyState={{ title: t("emptyTabTitle") }} />
                ) : (
                  rows.map((row) => (
                    <InspectionTableRow key={row.assetId} locale={locale} row={row} canConfirm={canConfirm} statusLabels={statusLabels} tick={tickFor(row, "table")} unclearId={unclearIdFor("table", row.assetId)} />
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </ContentPanel>

          {count > 0 ? (
            <>
              <DesktopSelectionBar
                label={t("title")}
                countLabel={t("selectedCount", { count })}
                clearLabel={t("clear")}
                onClear={clear}
                actions={confirmButton}
              >
                <p className="text-meta text-muted-foreground">{summaryText}</p>
              </DesktopSelectionBar>
              {/* The phone bar: the same offset as DesktopSelectionBar, above the Mobile Field Navigation. */}
              <div
                role="group"
                aria-label={t("title")}
                className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex min-w-0 flex-col gap-2 border-t border-border bg-canvas py-3 md:hidden"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm font-medium text-foreground">{t("selectedCount", { count })}</span>
                  <Button variant="ghost" size="md" onClick={clear}>
                    {t("clear")}
                  </Button>
                </div>
                <p className="text-meta text-muted-foreground">{summaryText}</p>
                <Button size="md" className="w-full" onClick={openDialog}>
                  <CheckCheck aria-hidden="true" />
                  {t("confirmOpen")}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {ticking ? (
        <InspectionConfirmDialog
          key={dialog.key}
          open={dialog.open}
          roundId={roundId}
          auditNo={auditNo}
          assetIds={selectedIds}
          summary={summary}
          returnFocusRef={openerRef}
          onClose={closeDialog}
          onConfirmed={handleConfirmed}
          onChanged={handleChanged}
        />
      ) : null}
    </div>
  )
}
