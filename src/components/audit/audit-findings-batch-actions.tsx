"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { checkboxVariants } from "@/components/ui/field-variants"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import {
  auditFindingSelectAllState,
  runAuditFindingBatchReview,
  toggleAllAuditFindings,
  toggleAuditFindingSelection,
  type AuditFindingBatchReviewBody,
} from "@/lib/audit-finding-batch-review"
import type { AuditFindingReviewFailureReason } from "@/lib/audit-finding-review-results"
import { formatCount } from "@/lib/display-format"
import { maxLength, required } from "@/lib/validation-rules"

/** A finding on the page that can be ticked (Task 2's row.reviewable), and what the result names it by. */
export type AuditFindingSelectable = {
  id: string
  /** The asset tag, or the round number of a finding with no asset. */
  code: string
  /** The table's เรื่อง word (P4-R2). */
  topic: string
  /** This page with the finding open in the panel (?finding=), filters and page kept. */
  panelHref: string
}

type BatchAction = "approve" | "reject"

type BatchReport = {
  succeeded: number
  failed: Array<AuditFindingSelectable & { reason: AuditFindingReviewFailureReason }>
}

// The dialog's one field, keyed like the request body, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  reviewRemark: "audit-batch-review-remark",
} as const
type BatchField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BatchField[]
// The limit for its message: the textarea has no maxLength, so a long text can be typed (v-track U-R7).
const FIELD_PARAMS = { reviewRemark: { max: 4000 } }

// ConfirmTextDialog's form is noValidate, so this restates the review schema (Task 1): rejecting needs one shared
// reason for every ticked finding (decision 5), approving takes an optional remark, both at most 4,000 characters.
function validate(values: { action: BatchAction; reviewRemark: string }): Partial<Record<BatchField, string>> {
  const errors: Partial<Record<BatchField, string>> = {}
  const check = (key: BatchField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reviewRemark", values.action === "reject" ? (required(values.reviewRemark) ?? maxLength(values.reviewRemark, 4000)) : maxLength(values.reviewRemark, 4000))
  return errors
}

async function sendReview(findingId: string, body: AuditFindingBatchReviewBody) {
  const response = await fetch(`/api/audit-findings/${findingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

// No ref travels in the context (react-hooks/refs): the header tick and the result each own their element, and a
// request for focus from one to the other is state that the owner's effect acts on.
type SelectionContextValue = {
  tickableIds: readonly string[]
  findingById: ReadonlyMap<string, AuditFindingSelectable>
  selectedIds: readonly string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  running: BatchAction | null
  progress: number
  report: BatchReport | null
  /** The result has not taken focus yet: it does once, when it first shows. */
  reportNeedsFocus: boolean
  reportFocused: () => void
  run: (action: BatchAction, reviewRemark: string) => Promise<void>
  dismissReport: () => void
  /** Counts the requests for the header tick to take focus (closing the result). */
  selectAllFocusRequest: number
}

const AuditFindingsSelectionContext = createContext<SelectionContextValue | null>(null)

function useAuditFindingsSelection() {
  const context = useContext(AuditFindingsSelectionContext)
  if (!context) throw new Error("Audit finding ticks and the selection bar must be rendered within AuditFindingsSelectionProvider")
  return context
}

// The last result, for the tab and filter it ran on. focused: it has taken focus, so a later mount (another page of
// the filter, the refresh's redirect to the last page) takes it again only when focus fell to the body.
type StoredBatchReport = { filterKey: string; report: BatchReport; focused: boolean }
const AuditFindingsBatchReportContext = createContext<{ stored: StoredBatchReport | null; setStored: Dispatch<SetStateAction<StoredBatchReport | null>> } | null>(null)

// The last batch's result, held by findings/layout.tsx above the page segment (P4-R34): a batch that empties the last
// page past page 1 makes the refresh redirect (Task 3), and the redirect boundary unmounts all the page renders.
export function AuditFindingsBatchReportProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredBatchReport | null>(null)
  return <AuditFindingsBatchReportContext.Provider value={{ stored, setStored }}>{children}</AuditFindingsBatchReportContext.Provider>
}

// The ticks of one page of one filter: the page mounts this with key={selectionKey}, so another page or filter starts
// empty (DESIGN.md Data Tables). A refresh keeps the ticks; only rows still tickable count, so a finding decided in the
// panel or in another tab leaves the selection with the refresh. The result is kept above the page
// (AuditFindingsBatchReportProvider), for this tab and filter only (filterKey: the selection key without the page).
export function AuditFindingsSelectionProvider({ filterKey, findings, children }: { filterKey: string; findings: readonly AuditFindingSelectable[]; children: ReactNode }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [running, setRunning] = useState<BatchAction | null>(null)
  const [progress, setProgress] = useState(0)
  const [selectAllFocusRequest, setSelectAllFocusRequest] = useState(0)
  const reportStore = useContext(AuditFindingsBatchReportContext)
  if (!reportStore) throw new Error("The findings selection must be rendered within AuditFindingsBatchReportProvider")
  const { setStored } = reportStore
  // Only this tab and filter's result: another tab or filter starts without one.
  const stored = reportStore.stored?.filterKey === filterKey ? reportStore.stored : null
  const report = stored?.report ?? null
  const setReport = (next: BatchReport | null) => setStored(next ? { filterKey, report: next, focused: false } : null)
  // A second submit before the next render must not start a second run (spec: one decision per finding).
  const runningRef = useRef(false)
  const tickableIds = useMemo(() => findings.map((finding) => finding.id), [findings])
  const findingById = useMemo(() => new Map(findings.map((finding) => [finding.id, finding])), [findings])
  const selectedIds = useMemo(() => tickableIds.filter((id) => selected.has(id)), [tickableIds, selected])

  // Another tab or filter forgets the last result, so coming back to the one it ran on shows none. A mount with the same
  // filterKey (another page of it, or the refresh's redirect to the last page after a batch) keeps it (P4-R34).
  useEffect(() => {
    setStored((current) => (current && current.filterKey !== filterKey ? null : current))
  }, [setStored, filterKey])

  function reportFocused() {
    setStored((current) => (current && current.filterKey === filterKey && !current.focused ? { ...current, focused: true } : current))
  }

  function toggle(id: string) {
    if (runningRef.current) return
    setReport(null)
    setSelected((current) => toggleAuditFindingSelection(current, id))
  }

  function toggleAll() {
    if (runningRef.current) return
    setReport(null)
    setSelected((current) => toggleAllAuditFindings(current, tickableIds))
  }

  function clear() {
    if (runningRef.current) return
    setSelected(new Set())
  }

  async function run(action: BatchAction, reviewRemark: string) {
    if (runningRef.current || selectedIds.length === 0) return
    runningRef.current = true
    const ids = selectedIds
    setRunning(action)
    setProgress(0)
    setReport(null)
    try {
      const result = await runAuditFindingBatchReview(ids, { action, reviewRemark }, sendReview, setProgress)
      setReport({
        succeeded: result.succeeded.length,
        failed: result.failed.flatMap((failure) => {
          const finding = findingById.get(failure.id)
          return finding ? [{ ...finding, reason: failure.reason }] : []
        }),
      })
      setSelected(new Set())
    } finally {
      runningRef.current = false
      setRunning(null)
      // Bugs 17-18: the page shows what was decided, whatever answered.
      router.refresh()
    }
  }

  // Closing the result leaves focus on the header tick, or on main when no row is left to tick. The header tick owns
  // its input, so the request goes to it as a count that its effect acts on.
  function dismissReport() {
    setReport(null)
    if (tickableIds.length > 0) setSelectAllFocusRequest((count) => count + 1)
    else document.getElementById("main")?.focus()
  }

  const value: SelectionContextValue = {
    tickableIds,
    findingById,
    selectedIds,
    isSelected: (id) => selected.has(id),
    toggle,
    toggleAll,
    clear,
    running,
    progress,
    report,
    reportNeedsFocus: stored !== null && !stored.focused,
    reportFocused,
    run,
    dismissReport,
    selectAllFocusRequest,
  }
  return <AuditFindingsSelectionContext.Provider value={value}>{children}</AuditFindingsSelectionContext.Provider>
}

/** The header tick: every row of the page that can be ticked, with the mixed state while some are (spec §10). */
export function AuditFindingSelectAllTick() {
  const t = useTranslations("auditFinding")
  const selection = useAuditFindingsSelection()
  const state = auditFindingSelectAllState(selection.selectedIds, selection.tickableIds)
  const { selectAllFocusRequest } = selection
  // The input is this component's own: the mixed state is a DOM property, and closing the result asks it for focus.
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some"
  }, [state])
  useEffect(() => {
    if (selectAllFocusRequest > 0) ref.current?.focus()
  }, [selectAllFocusRequest])
  if (selection.tickableIds.length === 0) return <span className="sr-only">{t("selectColumn")}</span>
  return (
    // The label fills the 44px column (O1, K16); the box draws its own focus outline.
    <label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={state === "all"}
        onChange={selection.toggleAll}
        disabled={selection.running !== null}
        aria-label={t("selectAllOnPage")}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** A row's tick, or nothing for a row that cannot be ticked (its own finding, a decided one, a read-only round). */
export function AuditFindingSelectTick({ findingId }: { findingId: string }) {
  const t = useTranslations("auditFinding")
  const selection = useAuditFindingsSelection()
  const finding = selection.findingById.get(findingId)
  if (!finding) return null
  return (
    // ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click beside the box
    // from opening the panel (spec 2B §7.8.3).
    <label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={selection.isSelected(findingId)}
        onChange={() => selection.toggle(findingId)}
        disabled={selection.running !== null}
        aria-label={t("selectFinding", { name: `${finding.code} ${finding.topic}` })}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** The last batch's details under the bar: each failure and its reason, then "ปิดผลการพิจารณา". */
function AuditFindingsBatchResult({ report }: { report: BatchReport }) {
  const t = useTranslations("auditFinding")
  const { reportNeedsFocus, reportFocused, dismissReport } = useAuditFindingsSelection()
  // The button is this component's own. The result takes focus once, when it first shows: the buttons that started the
  // batch are gone with the selection. A later mount (another page of the filter, the redirect) takes it again only when
  // the remount dropped focus to the body; a tab or filter link outside the provider keeps it. The second check runs on
  // mount only: a later render never pulls focus back from the body a click left it on.
  const dismissRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!reportNeedsFocus) return
    dismissRef.current?.focus()
    reportFocused()
  }, [reportNeedsFocus, reportFocused])
  useEffect(() => {
    if (document.activeElement === document.body) dismissRef.current?.focus()
  }, [])
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {report.failed.length > 0 ? (
        <ul className="space-y-1 text-sm text-foreground">
          {report.failed.map((failure) => (
            <li key={failure.id}>
              <span className="tag">{failure.code}</span> {failure.topic}: {t(`reviewFailure_${failure.reason}`)}
              {failure.reason === "assetChanged" ? (
                <>
                  {" "}
                  <Link href={failure.panelHref} className={linkVariants({ size: "inherit" })}>{t("batchOpenInPanel")}</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Button ref={dismissRef} variant="outline" size="sm" onClick={dismissReport}>
        {t("batchResultDismiss")}
      </Button>
    </div>
  )
}

/** The bar under the table (spec §10): "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ", then the result. */
export function AuditFindingsSelectionBar() {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const selection = useAuditFindingsSelection()
  const [dialogAction, setDialogAction] = useState<BatchAction | null>(null)
  const fieldErrors = useFieldErrors<BatchField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const count = selection.selectedIds.length
  const countText = formatCount(count)

  function openDialog(action: BatchAction) {
    fieldErrors.setErrors({})
    setDialogAction(action)
  }

  // The next opening starts with no errors.
  function closeDialog() {
    setDialogAction(null)
    fieldErrors.setErrors({})
  }

  // The dialog closes before the run: the bar shows the progress, and focus goes back to the button that opened it.
  function confirm(action: BatchAction, reviewRemark: string) {
    fieldErrors.setErrors(validate({ action, reviewRemark }))
    if (focusFirstError()) return
    setDialogAction(null)
    void selection.run(action, reviewRemark)
  }

  if (count === 0 && !selection.report && !selection.running) return null
  const status = selection.running
    ? t("batchRunning", { done: formatCount(selection.progress), total: countText })
    : selection.report
      ? t("reviewResultSummary", { succeeded: formatCount(selection.report.succeeded), failed: formatCount(selection.report.failed.length) })
      : null

  return (
    <>
      <DesktopSelectionBar
        label={t("selectionBarLabel")}
        countLabel={count > 0 ? t("selectedCount", { count: countText }) : null}
        clearLabel={t("clearSelection")}
        onClear={selection.clear}
        clearDisabled={selection.running !== null}
        actions={
          <>
            <Button variant="danger" size="md" onClick={() => openDialog("reject")} busy={selection.running === "reject"} disabled={selection.running === "approve"}>
              <X aria-hidden="true" />
              {t("rejectSelected")}
            </Button>
            <Button size="md" onClick={() => openDialog("approve")} busy={selection.running === "approve"} disabled={selection.running === "reject"}>
              <Check aria-hidden="true" />
              {t("approveSelected", { count: countText })}
            </Button>
          </>
        }
        status={status}
      >
        {selection.report ? <AuditFindingsBatchResult report={selection.report} /> : null}
      </DesktopSelectionBar>
      <ConfirmTextDialog
        open={dialogAction !== null}
        title={dialogAction === "reject" ? t("batchRejectTitle", { count: countText }) : t("batchApproveTitle", { count: countText })}
        description={dialogAction === "reject" ? t("batchRejectHelp") : t("batchApproveHelp")}
        fieldLabel={dialogAction === "reject" ? t("batchRejectReason") : t("batchApproveRemark")}
        inputId={FIELD_IDS.reviewRemark}
        required={dialogAction === "reject"}
        error={fieldErrors.errors.reviewRemark === "required" ? t("reviewReasonRequired") : fieldErrors.message("reviewRemark")}
        onValueChange={() => fieldErrors.clear("reviewRemark")}
        confirmLabel={dialogAction === "reject" ? t("batchRejectConfirm", { count: countText }) : t("batchApproveConfirm", { count: countText })}
        cancelLabel={tCommon("cancel")}
        tone={dialogAction === "reject" ? "danger" : "default"}
        onClose={closeDialog}
        onConfirm={(reviewRemark) => {
          if (dialogAction) confirm(dialogAction, reviewRemark)
        }}
      />
    </>
  )
}
