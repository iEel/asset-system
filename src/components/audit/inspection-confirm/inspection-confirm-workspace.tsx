"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CheckCheck, ClipboardCheck, SearchX } from "lucide-react"
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
import { waitForDialogToClose } from "@/lib/field-focus"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import {
  damagedDisposalHref,
  damagedRepairHref,
  inspectionBlockedMessageKeys,
  inspectionSelectionSummary,
  isInspectionRowSelectable,
  lostDisposalHref,
  selectAllInspectionRows,
  type InspectionPageRow,
} from "@/lib/inspection-confirm-page-model"
import {
  INSPECTION_CONFIRM_MAX_ASSETS,
  inspectionConfirmTabs,
  type InspectionConfirmOutcome,
  type InspectionConfirmTab,
  type InspectionTargetStatusName,
} from "@/lib/inspection-confirm-rules"
import { cn } from "@/lib/utils"
import { InspectionConfirmDialog, type InspectionBlockedEntry } from "./inspection-confirm-dialog"
import { useInspectionConfirmResult, type InspectionConfirmResult } from "./inspection-confirm-result"
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
  /** maintenance:create: the damaged row's "ยืนยันแล้วบันทึกซ่อม" (plan 4 task 3). */
  canRepair: boolean
  /** disposal:create: the damaged row's "ยืนยันแล้วขอตัดจำหน่าย" and the not-found tab's lost-disposal block. */
  canDispose: boolean
  /** The round's หาไม่พบ assets with no open disposal request (loadRoundDisposalSummary), by tag. */
  missingForDisposal: Array<{ assetId: string; assetTag: string }>
  statusLabels: Record<InspectionTargetStatusName, string>
  links: { round: string; pendingFindings: string; pendingItems: string }
  /** The round page's way back when the page was opened with one: the tab links and the refresh after a confirm keep it. */
  returnTo?: string | null
}

const bannerLinkClasses = cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")
const tickLabelClasses = "flex min-h-11 w-11 cursor-pointer items-center justify-center"

/** The ticks belong to the tab they were made on: another tab reads an empty selection (ids come from ready or notFound). */
type Selection = { tab: InspectionConfirmTab; ids: ReadonlySet<string>; capped: boolean }
/** A 200's count or a 409's blocked entries, before the round, the tab and focused are added. */
type ConfirmAnswer = { kind: "success"; confirmed: number; outcome: "confirm" | "missing" } | { kind: "changed"; blocked: InspectionBlockedEntry[] }
/**
 * The dialog: a new key per opening, its outcome, and for a damaged row its one asset, that asset's line and the form a
 * 200 goes on to (assetIds, summary and next are null for the bulk outcomes, which read the ticks).
 */
type DialogState = {
  open: boolean
  key: number
  outcome: InspectionConfirmOutcome
  assetIds: string[] | null
  summary: Partial<Record<InspectionTargetStatusName, number>> | null
  next: string | null
}

const EMPTY_IDS: ReadonlySet<string> = new Set()

/** The id of a row's handoverUnclear text in one of its two renders (card below md, table row from md). */
function unclearIdFor(view: "card" | "table", assetId: string) {
  return `inspection-unclear-${view}-${assetId}`
}

// ยืนยันผลตรวจ (inspection-confirm plan 3): the five tabs and the list; on the ready tab, with asset:edit, the ticks, the
// selection bars and the confirm dialog (task 3). No pagination: the page passes the whole tab (see the page's note).
// Plan 4 task 3: the not-found tab ticks too and sets หาไม่พบ in bulk, with the lost-disposal block under it; a damaged
// row confirms alone and goes on to the repair or the disposal form.
export function InspectionConfirmWorkspace({
  locale,
  roundId,
  auditNo,
  tab,
  counts,
  rows,
  canConfirm,
  canRepair,
  canDispose,
  missingForDisposal,
  statusLabels,
  links,
  returnTo = null,
}: InspectionConfirmWorkspaceProps) {
  const t = useTranslations("inspectionConfirmPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const total = inspectionConfirmTabs.reduce((sum, key) => sum + counts[key], 0)

  const [selection, setSelection] = useState<Selection>({ tab, ids: EMPTY_IDS, capped: false })
  // The last answer is kept above the page (confirm/layout.tsx), so the refresh's remount does not drop it.
  const { result, setResult } = useInspectionConfirmResult()
  const [dialog, setDialog] = useState<DialogState>({ open: false, key: 0, outcome: "confirm", assetIds: null, summary: null, next: null })
  const openerRef = useRef<HTMLElement | null>(null)
  const selectAllTickRef = useRef<HTMLInputElement | null>(null)
  // The result region: always mounted, so it is the dialog's fallback when the bar that opened it is gone, and focus
  // moves to it once the answer shows (it scrolls into view and is read).
  const resultRegionRef = useRef<HTMLDivElement | null>(null)

  // Another tab resets the selection (React's adjust-state-on-prop-change pattern, no effect), so coming back to the
  // ready tab starts empty. The last answer is the layout's state, so the effect below drops it.
  if (selection.tab !== tab) {
    setSelection({ tab, ids: EMPTY_IDS, capped: false })
  }
  useEffect(() => {
    setResult((current) => (current && (current.roundId !== roundId || current.tab !== tab) ? null : current))
  }, [setResult, roundId, tab])

  const ticking = canConfirm && (tab === "ready" || tab === "notFound")
  const damagedActions = canConfirm && tab === "damaged" && (canRepair || canDispose)
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
  const shownResult = result?.roundId === roundId && result.tab === tab ? result : null

  useEffect(() => {
    if (selectAllTickRef.current) selectAllTickRef.current.indeterminate = headerState === "some"
  }, [headerState])

  // The answer takes focus once, when it first shows; a later mount (the refresh's remount) takes it again only when
  // focus fell to the body.
  useEffect(() => {
    if (!shownResult) return
    if (shownResult.focused && document.activeElement !== document.body) return
    resultRegionRef.current?.focus()
    if (!shownResult.focused) setResult((current) => (current && !current.focused ? { ...current, focused: true } : current))
  }, [shownResult, setResult])

  const confirmPath = `/${locale}/audit/rounds/${roundId}/confirm`
  // A tab's URL: ?tab= always, and the round page's way back when the page has one.
  function tabHref(key: InspectionConfirmTab) {
    const params = new URLSearchParams({ tab: key })
    if (returnTo) params.set("returnTo", returnTo)
    return `${confirmPath}?${params.toString()}`
  }

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

  // The bar's dialog: the ticked rows, confirmed (ready) or set to หาไม่พบ (notFound).
  function openBulk(event: React.MouseEvent<HTMLElement>, outcome: "confirm" | "missing") {
    openerRef.current = event.currentTarget
    setResult(null)
    setDialog((current) => ({ open: true, key: current.key + 1, outcome, assetIds: null, summary: null, next: null }))
  }

  // A damaged row's button: that one asset (the route takes exactly one), then next once the route answers 200.
  function openDamaged(event: React.MouseEvent<HTMLElement>, row: InspectionPageRow, next: string) {
    openerRef.current = event.currentTarget
    setResult(null)
    const summary: Partial<Record<InspectionTargetStatusName, number>> = row.targetStatusName ? { [row.targetStatusName]: 1 } : {}
    setDialog((current) => ({ open: true, key: current.key + 1, outcome: "damaged", assetIds: [row.assetId], summary, next }))
  }

  function closeDialog() {
    setDialog((current) => ({ ...current, open: false }))
  }

  // After a 200 or a 409: close the dialog, read the page again on the same tab (an emptied tab stays shown, not the
  // next one parseInspectionTab would pick), and show the answer only once the dialog has fully closed. Until then the
  // app root is aria-hidden under the modal, and a live region filled there is never read (bulk-move-form.tsx's pattern).
  async function settle(answer: ConfirmAnswer) {
    const closed = waitForDialogToClose()
    closeDialog()
    router.replace(tabHref(tab), { scroll: false })
    await closed
    setResult({ ...answer, roundId, tab, focused: false } as InspectionConfirmResult)
  }

  // A 200. A damaged confirm goes on to its form (router.push only here, after the route said yes); the bulk outcomes
  // settle on their tab.
  function handleConfirmed(confirmed: number) {
    const next = dialog.outcome === "damaged" ? dialog.next : null
    if (next) {
      closeDialog()
      router.push(next)
      return
    }
    clear()
    void settle({ kind: "success", confirmed, outcome: dialog.outcome === "missing" ? "missing" : "confirm" })
  }

  // A 409: keep only the ticks the route did not name, and list what changed.
  function handleChanged(blocked: InspectionBlockedEntry[]) {
    const blockedIds = new Set(blocked.map((entry) => entry.assetId))
    setSelection({ tab, ids: new Set(selectedIds.filter((id) => !blockedIds.has(id))), capped: false })
    void settle({ kind: "changed", blocked })
  }

  // The polite live region stays mounted in both shapes below, so the success line is read even when it empties the round.
  // It takes focus once the answer shows (tabIndex -1, as bulk-move-form.tsx's result).
  const liveRegion = (
    <div
      ref={resultRegionRef}
      role="status"
      aria-live="polite"
      tabIndex={-1}
      className={cn("rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", !shownResult && "sr-only")}
    >
      {shownResult?.kind === "success" ? (
        <Notice tone="success">
          {shownResult.outcome === "missing" ? t("missingSuccess", { count: shownResult.confirmed }) : t("successNotice", { count: shownResult.confirmed })}
        </Notice>
      ) : null}
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

  // The lost-disposal block (plan 4 task 3): the round's หาไม่พบ assets with no open request, with disposal:create. Under
  // the not-found tab, empty or not, and on the empty page too, since once set they have left Under Inspection.
  const lostHref = canDispose ? lostDisposalHref(locale, roundId, missingForDisposal, tabHref("notFound")) : null
  const lostBlock = lostHref ? (
    <Notice tone="neutral" action={<Link href={lostHref} className={bannerLinkClasses}>{t("lostLink")}</Link>}>
      {t("lostBlock", { count: missingForDisposal.length })}
    </Notice>
  ) : null

  // Nothing of this round is still under inspection: no tabs, just the way back.
  if (total === 0) {
    return (
      <div className="space-y-4">
        {liveRegion}
        {lostBlock}
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

  const tabItems = inspectionConfirmTabs.map((key) => ({
    key,
    label: t(`tab_${key}`),
    count: formatCount(counts[key]),
    href: tabHref(key),
  }))
  // The tick column only where ticking is possible (ready or not found, with asset:edit); the actions column on damaged.
  const columnCount = 5 + (ticking ? 1 : 0) + (damagedActions ? 1 : 0)

  // A ready row's tick: live when it has a target, disabled and described by its handoverUnclear text when not. A
  // not-found row's is always live (its target is Missing).
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

  // The header tick of the ready tab; a ready tab with nothing to tick keeps the column's hidden name.
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
    t("selectColumn")
  )
  const summaryText = t("selectionSummary", { inUse: summary["In Use"] ?? 0, ready: summary.Ready ?? 0, checkedOut: summary["Checked Out"] ?? 0 })
  const openBulkDialog = (event: React.MouseEvent<HTMLElement>) => openBulk(event, tab === "notFound" ? "missing" : "confirm")
  const bulkIcon = tab === "notFound" ? <SearchX aria-hidden="true" /> : <CheckCheck aria-hidden="true" />
  const bulkLabel = tab === "notFound" ? t("missingOpen") : t("confirmOpen")
  // The status split reads In use / Ready / Checked out: the ready tab's only (every not-found row becomes หาไม่พบ).
  const summaryLine = tab === "ready" ? <p className="text-meta text-muted-foreground">{summaryText}</p> : null
  const confirmButton = (
    <Button size="md" onClick={openBulkDialog}>
      {bulkIcon}
      {bulkLabel}
    </Button>
  )

  // The damaged row's two ways on, each confirming the one asset first; a missing permission hides its button.
  function damagedActionsFor(row: InspectionPageRow) {
    if (!damagedActions) return undefined
    const back = tabHref("damaged")
    return (
      <div className="flex min-w-0 flex-wrap gap-2">
        {canRepair ? (
          <Button variant="outline" size="md" onClick={(event) => openDamaged(event, row, damagedRepairHref(locale, row.assetId, back))}>
            {t("damagedRepair")}
          </Button>
        ) : null}
        {canDispose ? (
          <Button variant="outline" size="md" onClick={(event) => openDamaged(event, row, damagedDisposalHref(locale, roundId, row.assetId, back))}>
            {t("damagedDispose")}
          </Button>
        ) : null}
      </div>
    )
  }

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

        {headerTickShown ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="outline" size="md" onClick={selectAll}>
              {t("selectAll")}
            </Button>
            {/* Always mounted while ticking, so a refused tick or a capped select-all is announced. */}
            <div role="status" aria-live="polite" className="min-w-0">
              {capped ? <Notice tone="info">{t("cappedNotice", { max: INSPECTION_CONFIRM_MAX_ASSETS })}</Notice> : null}
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          <ContentPanel divided flush>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {rows.length === 0 ? (
                <ActionEmptyState title={t("emptyTabTitle")} />
              ) : (
                rows.map((row) => (
                  <InspectionRowCard key={row.assetId} locale={locale} roundId={roundId} row={row} canConfirm={ticking} statusLabels={statusLabels} tick={tickFor(row, "card")} unclearId={unclearIdFor("card", row.assetId)} actions={damagedActionsFor(row)} />
                ))
              )}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t(`tab_${tab}`)} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  {ticking ? <DataTableHead className="w-10" hideLabel={!headerTickShown}>{selectAllHeader}</DataTableHead> : null}
                  <DataTableHead>{t("col_asset")}</DataTableHead>
                  <DataTableHead>{t("col_result")}</DataTableHead>
                  <DataTableHead>{t("col_location")}</DataTableHead>
                  <DataTableHead>{t("col_holder")}</DataTableHead>
                  <DataTableHead>{t("col_target")}</DataTableHead>
                  {damagedActions ? <DataTableHead>{tCommon("actions")}</DataTableHead> : null}
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow colSpan={columnCount} emptyState={{ title: t("emptyTabTitle") }} />
                ) : (
                  rows.map((row) => (
                    <InspectionTableRow key={row.assetId} locale={locale} roundId={roundId} row={row} canConfirm={ticking} statusLabels={statusLabels} tick={tickFor(row, "table")} unclearId={unclearIdFor("table", row.assetId)} actions={damagedActionsFor(row)} />
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </ContentPanel>

          {tab === "notFound" && lostHref ? <div className="mt-4">{lostBlock}</div> : null}

          {count > 0 ? (
            <>
              <DesktopSelectionBar
                label={t("title")}
                countLabel={t("selectedCount", { count })}
                clearLabel={t("clear")}
                onClear={clear}
                actions={confirmButton}
              >
                {summaryLine}
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
                {summaryLine}
                <Button size="md" className="w-full" onClick={openBulkDialog}>
                  {bulkIcon}
                  {bulkLabel}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {ticking || damagedActions ? (
        <InspectionConfirmDialog
          key={dialog.key}
          open={dialog.open}
          roundId={roundId}
          auditNo={auditNo}
          outcome={dialog.outcome}
          assetIds={dialog.assetIds ?? selectedIds}
          summary={dialog.summary ?? summary}
          returnFocusRef={openerRef}
          fallbackFocusRef={resultRegionRef}
          onClose={closeDialog}
          onConfirmed={handleConfirmed}
          onChanged={handleChanged}
        />
      ) : null}
    </div>
  )
}
