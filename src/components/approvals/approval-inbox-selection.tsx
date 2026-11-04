"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ListChecks, Loader2 } from "lucide-react"
import type { DisposalBulkApprovalCode, DisposalBulkApprovalItem, DisposalBulkApprovalSummary } from "@/lib/disposal-bulk-approval"
import type { DisposalSodReason } from "@/lib/disposal-policy"
import { runAuditFindingBatchReview, type AuditFindingBatchReviewBody } from "@/lib/audit-finding-batch-review"
import {
  approvalInboxSeenStorageKey,
  approvalInboxSelectionStorageKey,
  parseApprovalInboxSeen,
  parseStoredSelection,
  restoreSelection,
  selectAll,
  toggleSelection,
  unopened,
  type ApprovalInboxSelectionKind,
  type StoredSelection,
} from "@/lib/approval-inbox-selection"
import { formatCount } from "@/lib/display-format"
import { readFieldErrors } from "@/lib/field-error-client"
import { maxLength } from "@/lib/validation-rules"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"

/**
 * The words of the selection, built by the page from the `approvalInboxPage` messages with `t.raw`: the templates keep
 * their {placeholders}, filled here with formatCount.
 */
export type ApprovalInboxSelectionCopy = {
  barLabel: string
  /** {count} {kind} */
  count: string
  kind: Record<ApprovalInboxSelectionKind, string>
  clear: string
  note: string
  /** {count} */
  selectAll: string
  /** {count} */
  review: string
  /** {kind} */
  restarted: string
  limit: string
  /** {count} */
  capped: string
  /** {count} */
  confirmTitle: string
  previewLoading: string
  /** {eligible} {blocked} */
  previewCounts: string
  /** {count} */
  notOpened: string
  /** {count} */
  notOpenedMore: string
  remark: string
  remarkHint: string
  zeroEligible: string
  /** {count} */
  confirm: string
  /** {count} */
  committing: string
  /** {done} {total} */
  running: string
  requestFailed: string
  approvalFailed: string
  /** {count} */
  done: string
  /** {count} */
  skipped: string
  /** {count} */
  toPanel: string
  /** A blocked disposal request's reason: its separation-of-duties line, or the bulk-decision code's words. */
  sodReasons: Record<DisposalSodReason, string>
  errors: Record<DisposalBulkApprovalCode, string>
}

type Titles = Record<string, { title: string; codes: string }>
type TickableIds = { disposal: string[]; finding: string[] }

type DisposalPreview = { summary: DisposalBulkApprovalSummary; items: DisposalBulkApprovalItem[] }

type ConfirmState =
  | { stage: "previewing" }
  | { stage: "ready"; preview: DisposalPreview | null }
  | { stage: "failed"; message: string }
  | { stage: "committing"; preview: DisposalPreview | null }

// The dialog's one field, keyed like the request body, with the id focus moves to (v-track M-R1).
const FIELD_IDS = { approvalRemark: "approval-inbox-bulk-remark" } as const
type BulkField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BulkField[]
const FIELD_PARAMS = { approvalRemark: { max: 4000 } }
// At most 8 names in the not-opened list; the rest are counted (spec §7.4).
const NOT_OPENED_SHOWN = 8

// The form is noValidate: this restates the remark's limit (bulk-decision schema and the findings review schema).
function validate(values: { approvalRemark: string }): Partial<Record<BulkField, string>> {
  const errors: Partial<Record<BulkField, string>> = {}
  const code = maxLength(values.approvalRemark, 4000)
  if (code) errors.approvalRemark = code
  return errors
}

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined) return `{${key}}`
    return typeof value === "number" ? formatCount(value) : value
  })
}

// sessionStorage can be missing or blocked (a private window, a cleared site): that is "no selection", never an error.
function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSelection(selection: StoredSelection | null) {
  try {
    if (selection) window.sessionStorage.setItem(approvalInboxSelectionStorageKey, JSON.stringify(selection))
    else window.sessionStorage.removeItem(approvalInboxSelectionStorageKey)
  } catch {
    // Storage blocked: the selection lives for this page only.
  }
}

function isBulkApprovalCode(value: unknown): value is DisposalBulkApprovalCode {
  return typeof value === "string" && [
    "DISPOSAL_REQUEST_NOT_FOUND",
    "DISPOSAL_INVALID_STAGE",
    "DISPOSAL_SOD_CONFLICT",
    "DISPOSAL_ASSET_INELIGIBLE",
    "DISPOSAL_CONCURRENT_UPDATE",
    "DISPOSAL_FORBIDDEN",
    "DISPOSAL_APPROVAL_FAILED",
  ].includes(value)
}

async function sendBulkDecision(body: { mode: "preview" | "commit"; requestIds: string[]; approvalRemark?: string | null }, copy: ApprovalInboxSelectionCopy) {
  const response = await fetch("/api/disposal-requests/bulk-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as DisposalPreview | { code?: unknown; error?: unknown } | null
  if (!response.ok || !payload || !("items" in payload)) {
    if (payload && "code" in payload && isBulkApprovalCode(payload.code)) throw new Error(copy.errors[payload.code])
    if (payload && "error" in payload && isBulkApprovalCode(payload.error)) throw new Error(copy.errors[payload.error])
    // The body rides along as the cause, so a refusal of the remark goes back to its field.
    throw new Error(body.mode === "preview" ? copy.requestFailed : copy.approvalFailed, { cause: payload })
  }
  return payload
}

async function sendFindingReview(findingId: string, body: AuditFindingBatchReviewBody) {
  const response = await fetch(`/api/audit-findings/${findingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

type SelectionContextValue = {
  copy: ApprovalInboxSelectionCopy
  titles: Titles
  tickable: TickableIds
  selection: StoredSelection | null
  isSelected: (kind: ApprovalInboxSelectionKind, id: string) => boolean
  toggle: (kind: ApprovalInboxSelectionKind, id: string) => void
  selectAllOfKind: () => void
  clear: () => void
  /** One line for the bar's status: a restart, the limit, the cap, or the findings run's progress. */
  status: string | null
  running: boolean
  openConfirm: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) throw new Error("Approval inbox ticks and the selection bar must be rendered within ApprovalInboxSelectionProvider")
  return context
}

/**
 * The approvals page's selection (spec §7.4): one kind at a time, up to 200, kept in sessionStorage across pages and
 * restored against the list now shown (scope: the tab, search and overdue filter; tickable: the filtered list's
 * tickable ids, all pages). It holds the bar's confirm and runs the bulk approve.
 */
export function ApprovalInboxSelectionProvider({
  scope,
  tickable,
  titles,
  copy,
  children,
}: {
  scope: string
  tickable: TickableIds
  titles: Titles
  copy: ApprovalInboxSelectionCopy
  children: ReactNode
}) {
  const router = useRouter()
  const [selection, setSelection] = useState<StoredSelection | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const runningRef = useRef(false)
  // The server sends a new object on every render; the restore runs when the ids change, not on each identity.
  const tickableKey = JSON.stringify(tickable)

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is read after mount: the server render has none. */
  useEffect(() => {
    const restored = restoreSelection(parseStoredSelection(readStorage(approvalInboxSelectionStorageKey)), scope, JSON.parse(tickableKey) as TickableIds)
    writeSelection(restored)
    setSelection(restored)
    setStatus(null)
  }, [scope, tickableKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  function update(next: StoredSelection | null) {
    writeSelection(next)
    setSelection(next)
  }

  function toggle(kind: ApprovalInboxSelectionKind, id: string) {
    if (runningRef.current) return
    const result = toggleSelection(selection, kind, id, scope)
    update(result.next)
    setStatus(result.refused === "limit" ? copy.limit : result.restarted ? fill(copy.restarted, { kind: copy.kind[kind] }) : null)
  }

  function selectAllOfKind() {
    if (runningRef.current || !selection) return
    const result = selectAll(selection.kind, tickable[selection.kind], scope)
    update(result.next)
    setStatus(result.capped ? fill(copy.capped, { count: result.next.ids.length }) : null)
  }

  function clear() {
    if (runningRef.current) return
    update(null)
    setStatus(null)
  }

  function finish(approved: number, skipped: number, toPanel: number) {
    update(null)
    setStatus(null)
    router.refresh()
    const parts = [fill(copy.done, { count: approved })]
    if (skipped > 0) parts.push(fill(copy.skipped, { count: skipped }))
    if (toPanel > 0) parts.push(fill(copy.toPanel, { count: toPanel }))
    const message = parts.join(" · ")
    if (approved > 0) toast.success(message)
    else toast.warning(message)
  }

  // Findings: the dialog has closed; the bar shows the progress (the client loop, one review at a time).
  async function runFindings(ids: string[], reviewRemark: string) {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    setStatus(fill(copy.running, { done: 0, total: ids.length }))
    try {
      const result = await runAuditFindingBatchReview(ids, { action: "approve", reviewRemark }, sendFindingReview, (done) =>
        setStatus(fill(copy.running, { done, total: ids.length })),
      )
      // A 409 (the asset changed after the report) or an already-decided finding is decided in the panel, not a failure.
      const toPanel = result.failed.filter((failure) => failure.reason === "assetChanged" || failure.reason === "alreadyDecided").length
      finish(result.succeeded.length, result.failed.length - toPanel, toPanel)
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }

  const value: SelectionContextValue = {
    copy,
    titles,
    tickable,
    selection,
    isSelected: (kind, id) => selection?.kind === kind && selection.ids.includes(id),
    toggle,
    selectAllOfKind,
    clear,
    status,
    running,
    openConfirm: () => {
      if (selection && !runningRef.current) setConfirmOpen(true)
    },
  }

  return (
    <SelectionContext.Provider value={value}>
      {children}
      {confirmOpen && selection ? (
        <ApprovalInboxBulkConfirm
          selection={selection}
          onClose={() => setConfirmOpen(false)}
          onFindings={(ids, remark) => {
            setConfirmOpen(false)
            void runFindings(ids, remark)
          }}
          onDisposalDone={(approved, skipped) => {
            setConfirmOpen(false)
            finish(approved, skipped, 0)
          }}
        />
      ) : null}
    </SelectionContext.Provider>
  )
}

/** A row's tick in the first column: from md only; a blocked row's is disabled with its reason as the title. */
export function ApprovalInboxTick({ kind, id, label, disabled = false, reason }: { kind: ApprovalInboxSelectionKind; id: string; label: string; disabled?: boolean; reason?: string }) {
  const selection = useSelection()
  return (
    // ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click beside the box
    // from opening the panel.
    <label data-no-row-click title={disabled ? reason : undefined} className={`hidden min-h-11 w-11 items-center justify-center md:flex ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        data-approval-tick={`${kind}:${id}`}
        checked={!disabled && selection.isSelected(kind, id)}
        onChange={() => selection.toggle(kind, id)}
        disabled={disabled || selection.running}
        aria-label={disabled && reason ? `${label} (${reason})` : label}
        title={disabled ? reason : undefined}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** The bar under the list while something is ticked (spec §7.4): from md only, sticky, one kind, across pages. */
export function ApprovalInboxSelectionBar() {
  const { copy, selection, tickable, status, running, clear, selectAllOfKind, openConfirm } = useSelection()
  if (!selection && !running) return null
  const count = selection?.ids.length ?? 0
  const kind = selection?.kind ?? "finding"
  const approvable = tickable[kind].length
  const allSelected = count > 0 && count >= Math.min(approvable, 200)
  return (
    <DesktopSelectionBar
      label={copy.barLabel}
      countLabel={selection ? fill(copy.count, { count, kind: copy.kind[kind] }) : null}
      clearLabel={copy.clear}
      onClear={clear}
      clearDisabled={running}
      actions={
        <>
          <Button variant="outline" size="md" onClick={selectAllOfKind} disabled={running || allSelected}>
            <ListChecks aria-hidden="true" />
            {fill(copy.selectAll, { count: approvable })}
          </Button>
          <Button size="md" onClick={openConfirm} busy={running} data-approval-bulk-review>
            <Check aria-hidden="true" />
            {fill(copy.review, { count })}
          </Button>
        </>
      }
      status={status}
    >
      <p className="text-meta text-muted-foreground">{copy.note}</p>
    </DesktopSelectionBar>
  )
}

function ApprovalInboxBulkConfirm({
  selection,
  onClose,
  onFindings,
  onDisposalDone,
}: {
  selection: StoredSelection
  onClose: () => void
  onFindings: (ids: string[], remark: string) => void
  onDisposalDone: (approved: number, skipped: number) => void
}) {
  const { copy, titles } = useSelection()
  const isDisposal = selection.kind === "disposal"
  const [state, setState] = useState<ConfirmState>(isDisposal ? { stage: "previewing" } : { stage: "ready", preview: null })
  const [remark, setRemark] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fieldErrors = useFieldErrors<BulkField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  // Read when the dialog opens: the panel (Task 4) records an item each time it shows one.
  const [seen] = useState(() => parseApprovalInboxSeen(readStorage(approvalInboxSeenStorageKey)))
  const ids = selection.ids

  useEffect(() => {
    if (!isDisposal) return
    let cancelled = false
    sendBulkDecision({ mode: "preview", requestIds: ids }, copy)
      .then((preview) => {
        if (!cancelled) setState({ stage: "ready", preview })
      })
      .catch((caught: unknown) => {
        if (!cancelled) setState({ stage: "failed", message: caught instanceof Error ? caught.message : copy.requestFailed })
      })
    return () => {
      cancelled = true
    }
  }, [isDisposal, ids, copy])

  const preview = state.stage === "ready" || state.stage === "committing" ? state.preview : null
  const eligibleIds = useMemo(
    () => (isDisposal ? (preview?.items.filter((item) => item.outcome === "eligible").map((item) => item.requestId) ?? []) : ids),
    [isDisposal, preview, ids],
  )
  const blocked = preview?.items.filter((item) => item.outcome !== "eligible") ?? []
  const notOpened = unopened(eligibleIds, seen, selection.kind)
  const nameOf = (id: string) => {
    const entry = titles[`${selection.kind}:${id}`]
    return entry ? `${entry.title} · ${entry.codes}` : id
  }
  const blockedReason = (item: DisposalBulkApprovalItem) =>
    item.sodReason ? copy.sodReasons[item.sodReason] : item.code ? copy.errors[item.code] : copy.approvalFailed
  const ready = state.stage === "ready"
  const committing = state.stage === "committing"
  const nothingEligible = (ready || committing) && eligibleIds.length === 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || nothingEligible) return
    fieldErrors.setErrors(validate({ approvalRemark: remark }))
    if (focusFirstError()) return
    if (!isDisposal) {
      onFindings(eligibleIds, remark.trim())
      return
    }
    setError(null)
    setState({ stage: "committing", preview })
    try {
      const result = await sendBulkDecision({ mode: "commit", requestIds: eligibleIds, approvalRemark: remark.trim() || null }, copy)
      const approved = result.items.filter((item) => item.outcome === "approved").length
      onDisposalDone(approved, blocked.length + result.items.length - approved)
    } catch (caught) {
      setState({ stage: "ready", preview })
      // A refusal of the shared remark goes back under its field.
      if (caught instanceof Error && readFieldErrors(caught.cause)?.approvalRemark) {
        if (fieldErrors.applyServer(caught.cause) && focusFirstError()) return
      }
      setError(caught instanceof Error ? caught.message : copy.approvalFailed)
    }
  }

  return (
    <AccessibleDialog open title={fill(copy.confirmTitle, { count: ids.length })} busy={committing} size="lg" onClose={onClose}>
      <form data-approval-bulk-dialog onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="space-y-4">
          {error ? <Notice tone="danger" role="alert">{error}</Notice> : null}
          {state.stage === "failed" ? <Notice tone="danger" role="alert">{state.message}</Notice> : null}
          <p role="status" className={state.stage === "previewing" || committing ? "flex items-center gap-2 text-sm text-muted-foreground" : "sr-only"}>
            {state.stage === "previewing" ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
                {copy.previewLoading}
              </>
            ) : committing ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
                {fill(copy.committing, { count: eligibleIds.length })}
              </>
            ) : null}
          </p>
          {preview ? (
            <div data-approval-bulk-preview className="space-y-2">
              <p className="text-sm font-medium text-foreground">{fill(copy.previewCounts, { eligible: eligibleIds.length, blocked: blocked.length })}</p>
              {blocked.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                  {blocked.map((item) => (
                    <li key={item.requestId} className="break-words">
                      <span className="text-foreground">{nameOf(item.requestId)}</span>
                      {`: ${blockedReason(item)}`}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {nothingEligible ? <Notice tone="warning" role="alert" id="approval-inbox-bulk-zero-eligible">{copy.zeroEligible}</Notice> : null}
          {(ready || committing) && notOpened.length > 0 ? (
            <Notice tone="warning" title={fill(copy.notOpened, { count: notOpened.length })} data-approval-not-opened>
              <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
                {notOpened.slice(0, NOT_OPENED_SHOWN).map((id) => (
                  <li key={id} className="break-words">{nameOf(id)}</li>
                ))}
              </ul>
              {notOpened.length > NOT_OPENED_SHOWN ? <p className="mt-1">{fill(copy.notOpenedMore, { count: notOpened.length - NOT_OPENED_SHOWN })}</p> : null}
            </Notice>
          ) : null}
          {ready || committing ? (
            <Field
              label={copy.remark}
              id={FIELD_IDS.approvalRemark}
              hint={copy.remarkHint}
              error={fieldErrors.message("approvalRemark")}
            >
              <Textarea
                value={remark}
                rows={3}
                disabled={committing}
                onChange={(event) => {
                  setRemark(event.target.value)
                  fieldErrors.clear("approvalRemark")
                }}
              />
            </Field>
          ) : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          {state.stage !== "failed" ? (
            <Button
              type="submit"
              busy={committing || state.stage === "previewing"}
              aria-disabled={nothingEligible || undefined}
              aria-describedby={nothingEligible ? "approval-inbox-bulk-zero-eligible" : undefined}
            >
              <Check aria-hidden="true" />
              {fill(copy.confirm, { count: eligibleIds.length })}
            </Button>
          ) : null}
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
