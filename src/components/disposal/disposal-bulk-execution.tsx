"use client"

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { useRouter } from "next/navigation"
import { CheckSquare2, ListChecks, Loader2, ShieldAlert } from "lucide-react"
import { CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT } from "@/lib/clickable-row-navigation"
import {
  MAX_DISPOSAL_BULK_EXECUTION_ITEMS,
  type DisposalBulkExecutionCode,
  type DisposalBulkExecutionResponse,
} from "@/lib/disposal-bulk-execution"
import {
  buildBulkExecutionCommitPayload,
  buildBulkExecutionPayload,
  getBangkokBusinessDate,
  getBulkExecutionUnresolvedIds,
  isHistoricalExceptionAvailable,
  mergeBulkExecutionResults,
  resolveBulkExecutionRecipientReview,
  setBulkExecutionSelectionMode,
  toggleBulkExecutionItem,
  toggleBulkExecutionPage,
  type BulkExecutionPreviewPayload,
  type BulkExecutionSelectionMessage,
  type BulkExecutionSelectionState,
} from "@/lib/disposal-bulk-execution-ui"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field, FieldError, FieldHint } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { formatCount } from "@/lib/display-format"
import { readFieldErrors } from "@/lib/field-error-client"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
import { cn } from "@/lib/utils"
import { maxLength, minLength, required } from "@/lib/validation-rules"

const BULK_EXECUTION_MODES = {
  preview: { mode: "preview" as const },
  commit: { mode: "commit" as const },
}

// The dialog's fields in visual order, keyed like the request body, with the id focus moves to (v-track M-R1). The first
// six are the review step's shared values, the last is the preview step's confirmation (client only).
const FIELD_IDS = {
  executionDate: "disposal-bulk-execution-date",
  executedById: "disposal-bulk-execution-executor",
  nextStatusId: "disposal-bulk-execution-status",
  sharedRecipientName: "disposal-bulk-execution-recipient",
  evidenceExceptionReason: "disposal-bulk-execution-exception-reason",
  evidenceExceptionAcknowledged: "disposal-bulk-execution-exception-acknowledged",
  permanentConfirmed: "disposal-bulk-execution-permanent",
} as const
type BulkExecutionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BulkExecutionField[]
type BulkExecutionFieldErrors = ReturnType<typeof useFieldErrors<BulkExecutionField>>

type BulkExecutionValues = {
  executionDate: string
  executedById: string
  nextStatusId: string
  sharedRecipientName: string
  evidenceExceptionReason: string
  evidenceExceptionAcknowledged: boolean
  permanentConfirmed: boolean
}

// The fields a step shows (spec §4.2: an error goes to the step that owns its field): the review step's shared values,
// with the recipient for the types that take one and the exception's two fields while it is chosen; the preview step's
// confirmation while something is eligible. A hidden field is neither checked nor focused (v-track D-R4).
function shownFields(step: "review" | "preview", options: { recipient: boolean; historical: boolean; confirm: boolean }): BulkExecutionField[] {
  return FIELD_ORDER.filter((key) => {
    if (key === "permanentConfirmed") return step === "preview" && options.confirm
    if (step !== "review") return false
    if (key === "sharedRecipientName") return options.recipient
    if (key === "evidenceExceptionReason" || key === "evidenceExceptionAcknowledged") return options.historical
    return true
  })
}

// noValidate turns the browser's check off, so this restates the controls' required, minLength and maxLength; the shared
// values, the exception's reason and acknowledgement and the confirmation were a disabled button or a silent return
// (v-track M-R2, D-R9).
function validate(values: BulkExecutionValues, shown: readonly BulkExecutionField[]): Partial<Record<BulkExecutionField, string>> {
  const errors: Partial<Record<BulkExecutionField, string>> = {}
  const check = (key: BulkExecutionField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("executionDate", required(values.executionDate))
  check("executedById", required(values.executedById))
  check("nextStatusId", required(values.nextStatusId))
  check("sharedRecipientName", maxLength(values.sharedRecipientName, 200))
  check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))
  check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))
  check("permanentConfirmed", required(values.permanentConfirmed))
  return errors
}

export type DisposalBulkExecutionSelectableItem = {
  requestId: string
  disposalNo: string
  assetLabel: string
  disposalType: string
  effectiveEvidenceCount: number
  approverId: string | null
  requestedById: string
  createdBy: string
  recipientName: string | null
  documentNo: string | null
  saleValue: string | null
  salvageValue: string | null
  executionRemark: string | null
}

type Option = { id: string; label: string }

export type DisposalBulkExecutionCopy = {
  toolbarLabel: string
  selectionMode: string
  cancelSelectionMode: string
  selectedCount: string
  selectionLimit: string
  mixedType: string
  selectPage: string
  clearSelection: string
  review: string
  selectItem: string
  incompatibleType: string
  previewTitle: string
  previewLoading: string
  preflightHelp: string
  executionDate: string
  executor: string
  finalStatus: string
  selectEmployee: string
  selectStatus: string
  historicalException: string
  historicalReason: string
  historicalReasonHelp: string
  historicalAcknowledgement: string
  historicalWarning: string
  permanentConfirmation: string
  permanentConfirmationRequired: string
  confirm: string
  committing: string
  resultTitle: string
  selected: string
  eligible: string
  executed: string
  blocked: string
  failed: string
  retry: string
  close: string
  cancel: string
  cancelPreview: string
  zeroEligible: string
  requestFailed: string
  commitFailed: string
  discardSelection: string
  discardSelectionAction: string
  sharedValues: string
  sharedRecipient: string
  sharedRecipientHelp: string
  reviewedValues: string
  recipient: string
  recipientSourceRequest: string
  recipientSourceShared: string
  documentNo: string
  saleValue: string
  salvageValue: string
  remark: string
  notProvided: string
  errors: Record<string, string>
}

type DialogState = "closed" | "review" | "previewing" | "preview" | "committing" | "result"

type ContextValue = {
  items: DisposalBulkExecutionSelectableItem[]
  copy: DisposalBulkExecutionCopy
  selection: BulkExecutionSelectionState
  selectedType: string | null
  dialogState: DialogState
  response: DisposalBulkExecutionResponse | null
  previewPayload: BulkExecutionPreviewPayload | null
  busy: boolean
  historicalAvailable: boolean
  executionDate: string
  executedById: string
  nextStatusId: string
  sharedRecipientName: string
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason: string
  evidenceExceptionAcknowledged: boolean
  permanentConfirmed: boolean
  selectionMessage: string | null
  error: string | null
  triggerRef: RefObject<HTMLButtonElement | null>
  restoreTargetRef: RefObject<HTMLDivElement | null>
  toggle: (id: string) => void
  togglePageSelection: () => void
  clear: () => void
  setSelectionMode: (active: boolean) => void
  setExecutionDate: (value: string) => void
  setExecutedById: (value: string) => void
  setNextStatusId: (value: string) => void
  setSharedRecipientName: (value: string) => void
  setUseHistoricalEvidenceException: (value: boolean) => void
  setEvidenceExceptionReason: (value: string) => void
  setEvidenceExceptionAcknowledged: (value: boolean) => void
  setPermanentConfirmed: (value: boolean) => void
  openReview: () => void
  // Resolves to a body that names fields of the review step (a refusal, or a preview whose every row such a field blocks);
  // the dialog shows them under their fields there. Otherwise resolves to nothing.
  preview: (requestIds?: string[], previousPayload?: BulkExecutionPreviewPayload) => Promise<unknown>
  commit: () => Promise<void>
  retry: () => void
  closeDialog: () => void
  getErrorLabel: (code: DisposalBulkExecutionCode | null) => string
}

const Context = createContext<ContextValue | null>(null)

function useBulk() {
  const value = useContext(Context)
  if (!value) {
    throw new Error("Disposal bulk execution controls must be rendered within DisposalBulkExecutionProvider")
  }
  return value
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

function selectedTypeFor(items: DisposalBulkExecutionSelectableItem[], selectedIds: string[]) {
  const selected = new Set(selectedIds)
  return items.find((item) => selected.has(item.requestId))?.disposalType ?? null
}

function messageLabel(copy: DisposalBulkExecutionCopy, message: BulkExecutionSelectionMessage) {
  if (message === "mixed") return copy.mixedType
  if (message === "limit") return copy.selectionLimit
  return null
}

export function DisposalBulkExecutionProvider({
  items,
  selectionKey,
  copy,
  executionStatuses,
  employees,
  canUseHistoricalEvidenceException,
  className,
  children,
}: {
  items: DisposalBulkExecutionSelectableItem[]
  selectionKey: string
  copy: DisposalBulkExecutionCopy
  executionStatuses: Option[]
  employees: Option[]
  canUseHistoricalEvidenceException: boolean
  className?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [selection, setSelection] = useState<BulkExecutionSelectionState>({
    selectionMode: false,
    selectedIds: [],
  })
  const [dialogState, setDialogState] = useState<DialogState>("closed")
  const [response, setResponse] = useState<DisposalBulkExecutionResponse | null>(null)
  const [previewPayload, setPreviewPayload] = useState<BulkExecutionPreviewPayload | null>(null)
  const [executionDate, setExecutionDate] = useState(getBangkokBusinessDate)
  const [executedById, setExecutedById] = useState("")
  const [nextStatusId, setNextStatusId] = useState("")
  const [sharedRecipientName, setSharedRecipientName] = useState("")
  const [useHistoricalEvidenceException, setUseHistoricalEvidenceException] = useState(false)
  const [evidenceExceptionReason, setEvidenceExceptionReason] = useState("")
  const [evidenceExceptionAcknowledged, setEvidenceExceptionAcknowledged] = useState(false)
  const [permanentConfirmed, setPermanentConfirmed] = useState(false)
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreTargetRef = useRef<HTMLDivElement | null>(null)
  const selectionGenerationRef = useRef(0)
  const requestGenerationRef = useRef(0)
  const previewControllerRef = useRef<AbortController | null>(null)
  const commitControllerRef = useRef<AbortController | null>(null)
  const confirm = useConfirm()
  const bypassGuardRef = useRef(false)
  const busy = dialogState === "previewing" || dialogState === "committing"
  const selectedType = selectedTypeFor(items, selection.selectedIds)
  const capabilityRoles = canUseHistoricalEvidenceException ? ["system_admin"] : []
  const historicalAvailable = isHistoricalExceptionAvailable(
    capabilityRoles,
    selection.selectedIds,
    items,
  )

  function resetReviewedState() {
    setResponse(null)
    setPreviewPayload(null)
    setPermanentConfirmed(false)
    setError(null)
  }

  function clearHistoricalException() {
    setUseHistoricalEvidenceException(false)
    setEvidenceExceptionReason("")
    setEvidenceExceptionAcknowledged(false)
  }

  function abortPreview() {
    requestGenerationRef.current += 1
    previewControllerRef.current?.abort()
    previewControllerRef.current = null
  }

  /* eslint-disable react-hooks/set-state-in-effect -- Server queue identity invalidates local selection. */
  useEffect(() => {
    selectionGenerationRef.current += 1
    abortPreview()
    commitControllerRef.current?.abort()
    commitControllerRef.current = null
    setSelection({ selectionMode: false, selectedIds: [] })
    setDialogState("closed")
    resetReviewedState()
    clearHistoricalException()
    setSharedRecipientName("")
    setSelectionMessage(null)
  }, [selectionKey])

  useEffect(() => {
    if (!historicalAvailable) clearHistoricalException()
  }, [historicalAvailable])
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateSelection(next: BulkExecutionSelectionState, message: BulkExecutionSelectionMessage) {
    const changed = next.selectedIds.join("\0") !== selection.selectedIds.join("\0")
    setSelection(next)
    setSelectionMessage(messageLabel(copy, message))
    if (changed) {
      selectionGenerationRef.current += 1
      abortPreview()
      resetReviewedState()
      setSharedRecipientName("")
    }
  }

  function clear() {
    updateSelection({ ...selection, selectedIds: [] }, null)
  }

  function setSelectionMode(active: boolean) {
    updateSelection(setBulkExecutionSelectionMode(selection, active), null)
  }

  function toggle(id: string) {
    if (busy) return
    const result = toggleBulkExecutionItem(items, selection, id)
    updateSelection(result.state, result.message)
  }

  function togglePageSelection() {
    if (busy) return
    const result = toggleBulkExecutionPage(items, selection)
    updateSelection(result.state, result.message)
  }

  function currentRequest(
    mode: "preview" | "commit",
    controller: AbortController,
    selectionGeneration: number,
    requestGeneration: number,
  ) {
    const activeController = mode === "preview" ? previewControllerRef.current : commitControllerRef.current
    return activeController === controller
      && !controller.signal.aborted
      && selectionGeneration === selectionGenerationRef.current
      && requestGeneration === requestGenerationRef.current
  }

  async function send(
    payload: BulkExecutionPreviewPayload | ReturnType<typeof buildBulkExecutionCommitPayload>,
    controller: AbortController,
  ) {
    const result = await fetch("/api/disposal-requests/bulk-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const body = await result.json().catch(() => null) as
      | DisposalBulkExecutionResponse
      | { code?: unknown; error?: unknown }
      | null
    if (!result.ok || !body || !("items" in body)) {
      const code = body && ("code" in body ? body.code : "error" in body ? body.error : null)
      const fallback = payload.mode === "preview" ? copy.requestFailed : copy.commitFailed
      // The body rides along as the cause, so a refusal that names a field can go back to it (v-track D-R9).
      throw new Error(typeof code === "string" ? copy.errors[code] ?? fallback : fallback, { cause: body })
    }
    return body
  }

  function openReview() {
    if (selection.selectedIds.length === 0 || busy) return
    resetReviewedState()
    setDialogState("review")
  }

  function getCurrentValues() {
    return {
      executionDate,
      executedById,
      nextStatusId,
      sharedRecipientName: sharedRecipientName.trim() || null,
      useHistoricalEvidenceException: historicalAvailable && useHistoricalEvidenceException,
      evidenceExceptionReason: historicalAvailable && useHistoricalEvidenceException
        ? evidenceExceptionReason.trim() || null
        : null,
      evidenceExceptionAcknowledged: historicalAvailable
        && useHistoricalEvidenceException
        && evidenceExceptionAcknowledged,
    }
  }

  async function preview(
    requestIds = selection.selectedIds,
    previousPayload?: BulkExecutionPreviewPayload,
  ) {
    if (requestIds.length === 0 || dialogState === "committing") return
    const values = previousPayload
      ? {
          executionDate: previousPayload.executionDate,
          executedById: previousPayload.executedById,
          nextStatusId: previousPayload.nextStatusId,
          sharedRecipientName: previousPayload.sharedRecipientName ?? null,
          useHistoricalEvidenceException: previousPayload.useHistoricalEvidenceException,
          evidenceExceptionReason: previousPayload.evidenceExceptionReason,
          evidenceExceptionAcknowledged: previousPayload.evidenceExceptionAcknowledged,
        }
      : getCurrentValues()

    // The dialog's validate() checked the shared values before this preview; a retry sends values that passed it.
    abortPreview()
    const controller = new AbortController()
    const selectionGeneration = selectionGenerationRef.current
    const requestGeneration = ++requestGenerationRef.current
    previewControllerRef.current = controller
    const payload = buildBulkExecutionPayload(BULK_EXECUTION_MODES.preview.mode, requestIds, values)
    setResponse(null)
    setPreviewPayload(null)
    setError(null)
    setDialogState("previewing")
    try {
      const result = await send(payload, controller)
      if (!currentRequest("preview", controller, selectionGeneration, requestGeneration)) return
      // Every row blocked by a field of the review step (v-track D1): back to that step, where the field shows it.
      if (!previousPayload && result.eligibleCount === 0 && result.fieldErrors) {
        setDialogState("review")
        return result
      }
      setResponse(result)
      setPreviewPayload(payload)
      setSelection((current) => ({ ...current, selectedIds: [...requestIds] }))
      setPermanentConfirmed(false)
      setDialogState("preview")
    } catch (caught) {
      if (!currentRequest("preview", controller, selectionGeneration, requestGeneration)) return
      setDialogState("review")
      // A refusal that names a field of the review step goes back to the dialog, which shows it there (spec §4.1); any
      // other keeps the dialog's danger Notice.
      const named = caught instanceof Error ? readFieldErrors(caught.cause) : null
      if (!previousPayload && named && FIELD_ORDER.some((key) => key in named)) return { fieldErrors: named }
      setError(caught instanceof Error ? caught.message : copy.requestFailed)
    } finally {
      if (previewControllerRef.current === controller) previewControllerRef.current = null
    }
  }

  async function commit() {
    if (!response || !previewPayload || dialogState !== "preview" || !permanentConfirmed) return
    const eligibleIds = response.items
      .filter((item) => item.outcome === "eligible")
      .map((item) => item.requestId)
    if (eligibleIds.length === 0) return

    const controller = new AbortController()
    const selectionGeneration = selectionGenerationRef.current
    const requestGeneration = ++requestGenerationRef.current
    commitControllerRef.current = controller
    const payload = buildBulkExecutionCommitPayload(previewPayload, eligibleIds)
    const previewResponse = response
    setError(null)
    setDialogState("committing")
    try {
      const commitResponse = await send(payload, controller)
      if (!currentRequest("commit", controller, selectionGeneration, requestGeneration)) return
      const merged = mergeBulkExecutionResults(previewResponse, commitResponse)
      const unresolved = getBulkExecutionUnresolvedIds(merged)
      setResponse(merged)
      setSelection((current) => ({ ...current, selectedIds: unresolved }))
      setDialogState("result")
      if (merged.executedCount > 0) router.refresh()
    } catch (caught) {
      if (!currentRequest("commit", controller, selectionGeneration, requestGeneration)) return
      setError(caught instanceof Error ? caught.message : copy.commitFailed)
      setDialogState("preview")
    } finally {
      if (commitControllerRef.current === controller) commitControllerRef.current = null
    }
  }

  function retry() {
    if (!response || !previewPayload) return
    const unresolved = getBulkExecutionUnresolvedIds(response)
    setSelection((current) => ({ ...current, selectedIds: unresolved }))
    void preview(unresolved, previewPayload)
  }

  function closeDialog() {
    if (dialogState === "committing") return
    if (dialogState === "previewing") abortPreview()
    setDialogState("closed")
    setSharedRecipientName("")
  }

  async function discardSelectionThen(proceed: () => void) {
    const confirmed = await confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })
    if (!confirmed) return
    clear()
    bypassGuardRef.current = true
    try {
      proceed()
    } finally {
      bypassGuardRef.current = false
    }
  }

  function hasGuardedSelection() {
    return !bypassGuardRef.current && selection.selectedIds.length > 0
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!hasGuardedSelection()) return
    const link = (event.target as HTMLElement | null)?.closest("a")
    if (!link || !shouldGuardLinkClick(event, link)) return
    event.preventDefault()
    event.stopPropagation()
    const href = link.getAttribute("href") ?? ""
    void discardSelectionThen(() => router.push(href))
  }

  function onSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement | null
    if (!form || form.dataset.disposalBulkDialog || !hasGuardedSelection()) return
    event.preventDefault()
    event.stopPropagation()
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const submitButton = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined
    void discardSelectionThen(() => form.requestSubmit(submitButton))
  }

  function onBeforeNavigate(event: Event) {
    if (!hasGuardedSelection()) return
    event.preventDefault()
    const href = (event as CustomEvent<{ href?: string }>).detail?.href
    if (href) void discardSelectionThen(() => router.push(href))
  }

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    wrapper.addEventListener(CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT, onBeforeNavigate)
    return () => wrapper.removeEventListener(CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT, onBeforeNavigate)
  })

  const value: ContextValue = {
    items,
    copy,
    selection,
    selectedType,
    dialogState,
    response,
    previewPayload,
    busy,
    historicalAvailable,
    executionDate,
    executedById,
    nextStatusId,
    sharedRecipientName,
    useHistoricalEvidenceException,
    evidenceExceptionReason,
    evidenceExceptionAcknowledged,
    permanentConfirmed,
    selectionMessage,
    error,
    triggerRef,
    restoreTargetRef,
    toggle,
    togglePageSelection,
    clear,
    setSelectionMode,
    setExecutionDate,
    setExecutedById,
    setNextStatusId,
    setSharedRecipientName,
    setUseHistoricalEvidenceException,
    setEvidenceExceptionReason,
    setEvidenceExceptionAcknowledged,
    setPermanentConfirmed,
    openReview,
    preview,
    commit,
    retry,
    closeDialog,
    getErrorLabel: (code) => code ? copy.errors[code] ?? copy.commitFailed : copy.commitFailed,
  }

  return (
    <Context.Provider value={value}>
      <div
        ref={(element) => {
          wrapperRef.current = element
          restoreTargetRef.current = element
        }}
        tabIndex={-1}
        className={cn("outline-none", className)}
        onClickCapture={onClickCapture}
        onSubmitCapture={onSubmitCapture}
      >
        {children}
        {dialogState !== "closed" ? (
          <BulkExecutionDialog employees={employees} executionStatuses={executionStatuses} />
        ) : null}
      </div>
    </Context.Provider>
  )
}

export function DisposalBulkExecutionSelectionToggle() {
  const { copy, selection, busy, setSelectionMode } = useBulk()
  return (
    <Button
      variant="outline"
      onClick={() => setSelectionMode(!selection.selectionMode)}
      disabled={busy}
      aria-pressed={selection.selectionMode}
    >
      <ListChecks aria-hidden="true" />
      {selection.selectionMode ? copy.cancelSelectionMode : copy.selectionMode}
    </Button>
  )
}

export function DisposalBulkExecutionToolbar() {
  const {
    copy,
    selection,
    busy,
    selectionMessage,
    error,
    clear,
    openReview,
    triggerRef,
  } = useBulk()
  if (selection.selectedIds.length === 0) return null

  return (
    <>
      <div
        className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between"
        aria-label={copy.toolbarLabel}
      >
        <span className="sr-only" aria-live="polite">
          {format(copy.selectedCount, { count: selection.selectedIds.length })}
        </span>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckSquare2 className="size-4 text-muted-foreground" aria-hidden="true" />
          {format(copy.selectedCount, { count: selection.selectedIds.length })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={clear} disabled={busy}>
            {copy.clearSelection}
          </Button>
          <Button ref={triggerRef} onClick={openReview} disabled={busy}>
            <ListChecks aria-hidden="true" />
            {copy.review}
          </Button>
        </div>
        {selectionMessage ? <p className="text-meta text-muted-foreground">{selectionMessage}</p> : null}
      </div>
      {error ? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5">{error}</Notice> : null}
    </>
  )
}

export function DisposalBulkExecutionSelectPageControl() {
  const { items, copy, selection, busy, togglePageSelection } = useBulk()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectedType = selectedTypeFor(items, selection.selectedIds)
  const targetType = selectedType ?? items[0]?.disposalType
  const choices = items
    .filter((item) => item.disposalType === targetType)
    .slice(0, MAX_DISPOSAL_BULK_EXECUTION_ITEMS)
  const allSelected = choices.length > 0
    && choices.every((item) => selection.selectedIds.includes(item.requestId))
  const partiallySelected = !allSelected
    && choices.some((item) => selection.selectedIds.includes(item.requestId))

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  if (!selection.selectionMode) return null
  return (
    <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allSelected}
        disabled={busy || choices.length === 0}
        onChange={togglePageSelection}
        aria-label={copy.selectPage}
        aria-checked={partiallySelected ? "mixed" : allSelected}
        className={checkboxVariants()}
      />
    </label>
  )
}

export function DisposalBulkExecutionCheckbox({
  requestId,
  variant,
}: {
  requestId: string
  variant: "desktop" | "mobile"
}) {
  const { items, copy, selection, selectedType, busy, toggle } = useBulk()
  const item = items.find((candidate) => candidate.requestId === requestId)
  if (!item || !selection.selectionMode) return null

  const checked = selection.selectedIds.includes(item.requestId)
  const incompatible = Boolean(selectedType && item.disposalType !== selectedType)
  const atLimit = !checked && selection.selectedIds.length >= MAX_DISPOSAL_BULK_EXECUTION_ITEMS
  const disabled = busy || incompatible || atLimit
  const label = format(copy.selectItem, {
    disposalNo: item.disposalNo,
    assetTag: item.assetLabel,
  })

  if (incompatible) {
    return (
      <span
        role="note"
        tabIndex={0}
        title={copy.incompatibleType}
        aria-label={copy.incompatibleType}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${variant === "mobile" ? "px-2 text-meta" : ""}`}
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        {variant === "mobile" ? <span>{copy.incompatibleType}</span> : null}
      </span>
    )
  }

  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className={checkboxVariants({ size: variant === "mobile" ? "lg" : "md" })}
      />
    </label>
  )
}

function BulkExecutionDialog({ employees, executionStatuses }: { employees: Option[]; executionStatuses: Option[] }) {
  const {
    copy,
    items,
    selection,
    selectedType,
    dialogState,
    response,
    previewPayload,
    historicalAvailable,
    executionDate,
    executedById,
    nextStatusId,
    sharedRecipientName,
    useHistoricalEvidenceException,
    evidenceExceptionReason,
    evidenceExceptionAcknowledged,
    permanentConfirmed,
    error,
    triggerRef,
    restoreTargetRef,
    setExecutionDate,
    setExecutedById,
    setNextStatusId,
    setSharedRecipientName,
    setUseHistoricalEvidenceException,
    setEvidenceExceptionReason,
    setEvidenceExceptionAcknowledged,
    setPermanentConfirmed,
    preview,
    commit,
    retry,
    closeDialog,
    getErrorLabel,
  } = useBulk()
  const historicalWarningId = useId()
  const historicalHelpId = useId()
  const previewing = dialogState === "previewing"
  const committing = dialogState === "committing"
  const busy = previewing || committing
  const reviewedIds = previewPayload?.requestIds ?? selection.selectedIds
  const reviewedItems = useMemo(() => {
    const itemsById = new Map(items.map((item) => [item.requestId, item]))
    return reviewedIds.flatMap((id) => {
      const item = itemsById.get(id)
      return item ? [item] : []
    })
  }, [items, reviewedIds])
  const eligible = response?.items.filter((item) => item.outcome === "eligible") ?? []
  const blocked = response?.items.filter((item) => item.outcome === "blocked") ?? []
  const failed = response?.items.filter((item) => item.outcome === "failed") ?? []
  const recipientFallbackApplicable = selectedType != null
    && ["sell", "donate", "dispose"].includes(selectedType)
  const title = dialogState === "result" ? copy.resultTitle : copy.previewTitle
  const description = previewing
    ? copy.previewLoading
    : committing
      ? copy.committing
      : copy.preflightHelp
  const fieldErrors = useFieldErrors<BulkExecutionField>()
  // A prerequisite, not a field (spec §4.4): nothing to execute. The zero-eligible Notice says why.
  const nothingEligible = eligible.length === 0
  const fieldsOf = (step: "review" | "preview") => shownFields(step, {
    recipient: recipientFallbackApplicable,
    historical: historicalAvailable && useHistoricalEvidenceException,
    confirm: !nothingEligible,
  })
  const focusFirstError = (step: "review" | "preview") => fieldErrors.focusFirst(fieldsOf(step), { idFor: (key) => FIELD_IDS[key] })
  const values: BulkExecutionValues = {
    executionDate,
    executedById,
    nextStatusId,
    sharedRecipientName,
    evidenceExceptionReason,
    evidenceExceptionAcknowledged,
    permanentConfirmed,
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dialogState === "review") {
      fieldErrors.setErrors(validate(values, fieldsOf("review")))
      if (focusFirstError("review")) return
      const refusal = await preview()
      // A refusal, or a preview whose every row a shared value blocks, comes back to this step's fields (spec §4.2).
      if (fieldErrors.applyServer(refusal) && focusFirstError("review")) return
    } else if (dialogState === "preview") {
      if (nothingEligible) return
      fieldErrors.setErrors(validate(values, fieldsOf("preview")))
      if (focusFirstError("preview")) return
      void commit()
    }
  }

  return (
    <AccessibleDialog
      open
      title={title}
      description={description}
      busy={committing}
      size="xl"
      closeLabel={previewing ? copy.cancelPreview : copy.close}
      returnFocusRef={triggerRef}
      fallbackFocusRef={restoreTargetRef}
      onClose={closeDialog}
    >
      <form
        aria-busy={busy}
        data-disposal-bulk-dialog
        onSubmit={handleSubmit} noValidate
        className={accessibleDialogFormClasses}
      >
        <AccessibleDialogBody className="space-y-5">
          {error ? <Notice tone="danger" role="alert">{error}</Notice> : null}
          <div aria-live="polite" className="min-h-5 text-sm">
            {previewing ? <BusyLabel label={copy.previewLoading} /> : null}
            {committing ? <BusyLabel label={copy.committing} /> : null}
          </div>

          {dialogState === "review" || previewing ? (
            <SharedValueFields
              copy={copy}
              employees={employees}
              executionStatuses={executionStatuses}
              executionDate={executionDate}
              executedById={executedById}
              nextStatusId={nextStatusId}
              sharedRecipientName={sharedRecipientName}
              recipientFallbackApplicable={recipientFallbackApplicable}
              disabled={previewing}
              fieldErrors={fieldErrors}
              onExecutionDateChange={setExecutionDate}
              onExecutedByChange={setExecutedById}
              onNextStatusChange={setNextStatusId}
              onSharedRecipientNameChange={setSharedRecipientName}
            />
          ) : previewPayload ? (
            <ReviewedSharedValues
              copy={copy}
              payload={previewPayload}
              employees={employees}
              executionStatuses={executionStatuses}
            />
          ) : null}

          {dialogState === "review" && historicalAvailable ? (
            <section className="space-y-3">
              <Notice tone="warning" id={historicalWarningId}>
                {copy.historicalWarning}
              </Notice>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={useHistoricalEvidenceException}
                  onChange={(event) => {
                    setUseHistoricalEvidenceException(event.target.checked)
                    fieldErrors.clear("evidenceExceptionReason", "evidenceExceptionAcknowledged")
                  }}
                  aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                  className={checkboxVariants({ size: "lg" })}
                />
                {copy.historicalException}
              </label>
              {useHistoricalEvidenceException ? (
                <>
                  {/* The reason and the acknowledgement are errors on preview (spec §4.4), in the domain's words. */}
                  <Field
                    label={copy.historicalReason}
                    id="disposal-bulk-execution-exception-reason"
                    required
                    error={fieldErrors.errors.evidenceExceptionReason ? copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED : undefined}
                  >
                    <Textarea
                      value={evidenceExceptionReason}
                      onChange={(event) => {
                        setEvidenceExceptionReason(event.target.value)
                        fieldErrors.clear("evidenceExceptionReason")
                      }}
                      minLength={20}
                      maxLength={2000}
                      required
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="min-h-28"
                    />
                  </Field>
                  <FieldHint id={historicalHelpId}>
                    {format(copy.historicalReasonHelp, {
                      count: evidenceExceptionReason.length,
                      max: 2000,
                    })}
                  </FieldHint>
                  <div>
                    <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
                      <input
                        id="disposal-bulk-execution-exception-acknowledged"
                        type="checkbox"
                        checked={evidenceExceptionAcknowledged}
                        onChange={(event) => {
                          setEvidenceExceptionAcknowledged(event.target.checked)
                          fieldErrors.clear("evidenceExceptionAcknowledged")
                        }}
                        required
                        aria-invalid={fieldErrors.errors.evidenceExceptionAcknowledged ? true : undefined}
                        aria-describedby={fieldErrors.errors.evidenceExceptionAcknowledged ? `disposal-bulk-execution-exception-acknowledged-error ${historicalWarningId}` : `${historicalWarningId} ${historicalHelpId}`}
                        className={checkboxVariants({ size: "lg" })}
                      />
                      {copy.historicalAcknowledgement}
                    </label>
                    {fieldErrors.errors.evidenceExceptionAcknowledged ? (
                      <FieldError id="disposal-bulk-execution-exception-acknowledged-error" className="mt-1.5">{copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED}</FieldError>
                    ) : null}
                  </div>
                </>
              ) : (
                <FieldHint id={historicalHelpId}>
                  {format(copy.historicalReasonHelp, { count: 0, max: 2000 })}
                </FieldHint>
              )}
            </section>
          ) : null}

          <AuthoritativeItems copy={copy} items={reviewedItems} responseItems={response?.items ?? []} />

          {response && dialogState !== "review" && !previewing ? (
            <ResponseSummary
              copy={copy}
              response={response}
              getErrorLabel={getErrorLabel}
            />
          ) : null}

          {dialogState === "preview" && eligible.length === 0 ? (
            <Notice tone="warning" role="alert" id="disposal-bulk-execution-zero-eligible">{copy.zeroEligible}</Notice>
          ) : null}

          {dialogState === "preview" && eligible.length > 0 ? (
            <div className="border-t border-border pt-4">
              <label className="flex min-h-11 items-start gap-3 text-sm font-medium text-foreground">
                <input
                  id="disposal-bulk-execution-permanent"
                  type="checkbox"
                  checked={permanentConfirmed}
                  onChange={(event) => {
                    setPermanentConfirmed(event.target.checked)
                    fieldErrors.clear("permanentConfirmed")
                  }}
                  aria-invalid={fieldErrors.errors.permanentConfirmed ? true : undefined}
                  aria-describedby={fieldErrors.errors.permanentConfirmed ? "disposal-bulk-execution-permanent-error" : undefined}
                  className={cn(checkboxVariants({ size: "lg" }), "mt-0.5")}
                />
                {copy.permanentConfirmation}
              </label>
              {fieldErrors.errors.permanentConfirmed ? (
                <FieldError id="disposal-bulk-execution-permanent-error" className="mt-1.5">{copy.permanentConfirmationRequired}</FieldError>
              ) : null}
            </div>
          ) : null}
        </AccessibleDialogBody>

        <AccessibleDialogFooter>
          <AccessibleDialogCancel>
            {previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}
          </AccessibleDialogCancel>
          {dialogState === "review" || previewing ? (
            <Button type="submit" busy={previewing}>
              {format(copy.confirm, { count: reviewedItems.length })}
            </Button>
          ) : null}
          {dialogState === "preview" || committing ? (
            <Button
              type="submit"
              busy={committing}
              aria-disabled={nothingEligible || undefined}
              aria-describedby={nothingEligible ? "disposal-bulk-execution-zero-eligible" : undefined}
            >
              {format(copy.confirm, { count: eligible.length })}
            </Button>
          ) : null}
          {dialogState === "result" && blocked.length + failed.length > 0 ? (
            <Button onClick={retry}>{copy.retry}</Button>
          ) : null}
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}

function BusyLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </span>
  )
}

function SharedValueFields({
  copy,
  employees,
  executionStatuses,
  executionDate,
  executedById,
  nextStatusId,
  sharedRecipientName,
  recipientFallbackApplicable,
  disabled,
  fieldErrors,
  onExecutionDateChange,
  onExecutedByChange,
  onNextStatusChange,
  onSharedRecipientNameChange,
}: {
  copy: DisposalBulkExecutionCopy
  employees: Option[]
  executionStatuses: Option[]
  executionDate: string
  executedById: string
  nextStatusId: string
  sharedRecipientName: string
  recipientFallbackApplicable: boolean
  disabled: boolean
  fieldErrors: BulkExecutionFieldErrors
  onExecutionDateChange: (value: string) => void
  onExecutedByChange: (value: string) => void
  onNextStatusChange: (value: string) => void
  onSharedRecipientNameChange: (value: string) => void
}) {
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
      <Field label={copy.executionDate} id="disposal-bulk-execution-date" required error={fieldErrors.message("executionDate")}>
        <Input
          type="date"
          value={executionDate}
          onChange={(event) => {
            onExecutionDateChange(event.target.value)
            fieldErrors.clear("executionDate")
          }}
          required
        />
      </Field>
      <Field label={copy.executor} id="disposal-bulk-execution-executor" required error={fieldErrors.message("executedById")}>
        <NativeSelect
          value={executedById}
          onChange={(event) => {
            onExecutedByChange(event.target.value)
            fieldErrors.clear("executedById")
          }}
          required
        >
          <option value="">{copy.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={copy.finalStatus} id="disposal-bulk-execution-status" required error={fieldErrors.message("nextStatusId")}>
        <NativeSelect
          value={nextStatusId}
          onChange={(event) => {
            onNextStatusChange(event.target.value)
            fieldErrors.clear("nextStatusId")
          }}
          required
        >
          <option value="">{copy.selectStatus}</option>
          {executionStatuses.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </NativeSelect>
      </Field>
      {recipientFallbackApplicable ? (
        <Field
          label={copy.sharedRecipient}
          id="disposal-bulk-execution-recipient"
          hint={copy.sharedRecipientHelp}
          className="sm:col-span-3"
          error={fieldErrors.message("sharedRecipientName")}
        >
          <Input
            value={sharedRecipientName}
            onChange={(event) => {
              onSharedRecipientNameChange(event.target.value)
              fieldErrors.clear("sharedRecipientName")
            }}
            maxLength={200}
          />
        </Field>
      ) : null}
    </fieldset>
  )
}

function ReviewedSharedValues({
  copy,
  payload,
  employees,
  executionStatuses,
}: {
  copy: DisposalBulkExecutionCopy
  payload: BulkExecutionPreviewPayload
  employees: Option[]
  executionStatuses: Option[]
}) {
  const employee = employees.find((candidate) => candidate.id === payload.executedById)?.label
  const status = executionStatuses.find((candidate) => candidate.id === payload.nextStatusId)?.label
  return (
    <section aria-labelledby="bulk-shared-values">
      <h3 id="bulk-shared-values" className="text-sm font-semibold text-foreground">
        {copy.sharedValues}
      </h3>
      <KeyValueList
        className="mt-2"
        items={[
          { key: "executionDate", label: copy.executionDate, value: payload.executionDate },
          { key: "executor", label: copy.executor, value: employee, nilLabel: copy.notProvided },
          { key: "finalStatus", label: copy.finalStatus, value: status, nilLabel: copy.notProvided },
          ...(payload.sharedRecipientName ? [{ key: "sharedRecipient", label: copy.sharedRecipient, value: payload.sharedRecipientName }] : []),
        ]}
      />
    </section>
  )
}

function AuthoritativeItems({
  copy,
  items,
  responseItems,
}: {
  copy: DisposalBulkExecutionCopy
  items: DisposalBulkExecutionSelectableItem[]
  responseItems: DisposalBulkExecutionResponse["items"]
}) {
  const responseItemsById = new Map(responseItems.map((item) => [item.requestId, item]))
  return (
    <section aria-labelledby="bulk-authoritative-values">
      <h3 id="bulk-authoritative-values" className="text-sm font-semibold text-foreground">
        {copy.reviewedValues}
      </h3>
      <div className="mt-2 divide-y divide-border-soft rounded-md border border-border">
        {items.map((item) => {
          const responseItem = responseItemsById.get(item.requestId)
          const recipient = resolveBulkExecutionRecipientReview(item.recipientName, responseItem)
          const recipientSource = recipient.recipientSource === "shared"
            ? copy.recipientSourceShared
            : recipient.recipientSource === "request"
              ? copy.recipientSourceRequest
              : null
          return (
          <article key={item.requestId} className="space-y-3 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm text-foreground"><span className="tag font-medium">{item.disposalNo}</span></h4>
              <span className="text-meta text-muted-foreground">{item.assetLabel}</span>
            </div>
            <KeyValueList
              items={[
                { key: "recipient", label: copy.recipient, value: recipient.recipientName ? <>{recipient.recipientName}{recipientSource ? <span className="mt-1 block text-meta text-muted-foreground">{recipientSource}</span> : null}</> : null, nilLabel: copy.notProvided },
                { key: "documentNo", label: copy.documentNo, value: item.documentNo ? <span className="tag">{item.documentNo}</span> : null, nilLabel: copy.notProvided },
                { key: "saleValue", label: copy.saleValue, value: item.saleValue, nilLabel: copy.notProvided },
                { key: "salvageValue", label: copy.salvageValue, value: item.salvageValue, nilLabel: copy.notProvided },
                { key: "remark", label: copy.remark, value: item.executionRemark, nilLabel: copy.notProvided },
              ]}
            />
          </article>
          )
        })}
      </div>
    </section>
  )
}

// Each outcome is a state badge (plan 2D-4 R2): eligible and executed are the good results, blocked waits on the user,
// failed is an error; the reason follows the badge in words.
const outcomeTones: Record<DisposalBulkExecutionResponse["items"][number]["outcome"], StatusTone> = {
  eligible: "success",
  executed: "primary",
  blocked: "warning",
  failed: "danger",
}

function ResponseSummary({
  copy,
  response,
  getErrorLabel,
}: {
  copy: DisposalBulkExecutionCopy
  response: DisposalBulkExecutionResponse
  getErrorLabel: (code: DisposalBulkExecutionCode | null) => string
}) {
  return (
    <section aria-labelledby="bulk-response-summary">
      <h3 id="bulk-response-summary" className="sr-only">{copy.resultTitle}</h3>
      <StatStrip
        items={[
          { key: "selected", label: copy.selected, value: formatCount(response.selectedCount) },
          { key: "eligible", label: copy.eligible, value: formatCount(response.eligibleCount) },
          { key: "executed", label: copy.executed, value: formatCount(response.executedCount) },
          { key: "blocked", label: copy.blocked, value: formatCount(response.blockedCount) },
          { key: "failed", label: copy.failed, value: formatCount(response.failedCount) },
        ]}
      />
      <ul className="mt-3 divide-y divide-border-soft rounded-md border border-border">
        {response.items.map((item) => (
          <li key={item.requestId} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 text-foreground"><span className="tag font-medium">{item.disposalNo ?? item.requestId}</span>{item.assetLabel ? ` · ${item.assetLabel}` : ""}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><StatusBadge label={copy[item.outcome]} tone={outcomeTones[item.outcome]} />{item.outcome === "blocked" || item.outcome === "failed" ? <span className="text-meta text-muted-foreground">{getErrorLabel(item.code)}</span> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
