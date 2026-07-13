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
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { useRouter } from "next/navigation"
import { CheckSquare2, ListChecks, Loader2, ShieldAlert, X } from "lucide-react"
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
  setBulkExecutionSelectionMode,
  toggleBulkExecutionItem,
  toggleBulkExecutionPage,
  validateHistoricalException,
  type BulkExecutionPreviewPayload,
  type BulkExecutionSelectionMessage,
  type BulkExecutionSelectionState,
} from "@/lib/disposal-bulk-execution-ui"

const BULK_EXECUTION_MODES = {
  preview: { mode: "preview" as const },
  commit: { mode: "commit" as const },
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
  sharedValues: string
  reviewedValues: string
  recipient: string
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
  setUseHistoricalEvidenceException: (value: boolean) => void
  setEvidenceExceptionReason: (value: string) => void
  setEvidenceExceptionAcknowledged: (value: boolean) => void
  setPermanentConfirmed: (value: boolean) => void
  openReview: () => void
  preview: (requestIds?: string[], previousPayload?: BulkExecutionPreviewPayload) => Promise<void>
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
      throw new Error(typeof code === "string" ? copy.errors[code] ?? fallback : fallback)
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
          useHistoricalEvidenceException: previousPayload.useHistoricalEvidenceException,
          evidenceExceptionReason: previousPayload.evidenceExceptionReason,
          evidenceExceptionAcknowledged: previousPayload.evidenceExceptionAcknowledged,
        }
      : getCurrentValues()

    if (!values.executionDate || !values.executedById || !values.nextStatusId) return
    const historicalError = validateHistoricalException({
      enabled: values.useHistoricalEvidenceException,
      reason: values.evidenceExceptionReason ?? "",
      acknowledged: values.evidenceExceptionAcknowledged,
    })
    if (historicalError) {
      const code = historicalError === "reason"
        ? "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
        : "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
      setError(copy.errors[code] ?? copy.requestFailed)
      return
    }

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
      setResponse(result)
      setPreviewPayload(payload)
      setSelection((current) => ({ ...current, selectedIds: [...requestIds] }))
      setPermanentConfirmed(false)
      setDialogState("preview")
    } catch (caught) {
      if (!currentRequest("preview", controller, selectionGeneration, requestGeneration)) return
      setError(caught instanceof Error ? caught.message : copy.requestFailed)
      setDialogState("review")
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
  }

  function confirmDiscard() {
    if (selection.selectedIds.length === 0) return true
    const confirmed = window.confirm(copy.discardSelection)
    if (confirmed) clear()
    return confirmed
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement | null)?.closest("a") && !confirmDiscard()) {
      event.preventDefault()
    }
  }

  function onSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement | null
    if (!form?.dataset.disposalBulkDialog && !confirmDiscard()) event.preventDefault()
  }

  function onBeforeNavigate(event: Event) {
    if (!confirmDiscard()) event.preventDefault()
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
        className={className}
        onClickCapture={onClickCapture}
        onSubmitCapture={onSubmitCapture}
      >
        {children}
        {dialogState !== "closed" ? (
          <Dialog employees={employees} executionStatuses={executionStatuses} />
        ) : null}
      </div>
    </Context.Provider>
  )
}

export function DisposalBulkExecutionSelectionToggle() {
  const { copy, selection, busy, setSelectionMode } = useBulk()
  return (
    <button
      type="button"
      onClick={() => setSelectionMode(!selection.selectionMode)}
      disabled={busy}
      aria-pressed={selection.selectionMode}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <ListChecks className="h-4 w-4" aria-hidden="true" />
      {selection.selectionMode ? copy.cancelSelectionMode : copy.selectionMode}
    </button>
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
    <div
      className="mt-3 flex flex-col gap-3 border-y border-border bg-muted/40 p-3 md:flex-row md:items-center md:justify-between"
      aria-label={copy.toolbarLabel}
    >
      <span className="sr-only" aria-live="polite">
        {format(copy.selectedCount, { count: selection.selectedIds.length })}
      </span>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckSquare2 className="h-4 w-4 text-primary" aria-hidden="true" />
        {format(copy.selectedCount, { count: selection.selectedIds.length })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {copy.clearSelection}
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={openReview}
          disabled={busy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {copy.review}
        </button>
      </div>
      {selectionMessage ? <p className="text-xs text-muted-foreground">{selectionMessage}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
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
        className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
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
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${variant === "mobile" ? "px-2 text-xs" : ""}`}
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        {variant === "mobile" ? <span>{copy.incompatibleType}</span> : null}
      </span>
    )
  }

  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-primary">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
      />
    </label>
  )
}

function Dialog({ employees, executionStatuses }: { employees: Option[]; executionStatuses: Option[] }) {
  const {
    copy,
    items,
    selection,
    dialogState,
    response,
    previewPayload,
    historicalAvailable,
    executionDate,
    executedById,
    nextStatusId,
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
  const titleId = useId()
  const descriptionId = useId()
  const historicalWarningId = useId()
  const historicalHelpId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
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
  const hasSharedValues = Boolean(executionDate && executedById && nextStatusId)
  const title = dialogState === "result" ? copy.resultTitle : copy.previewTitle
  const description = previewing
    ? copy.previewLoading
    : committing
      ? copy.committing
      : copy.preflightHelp

  useEffect(() => {
    const fallbackTarget = restoreTargetRef.current
    restoreFocusRef.current = triggerRef.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    closeRef.current?.focus()
    return () => {
      const target = restoreFocusRef.current
      if (target?.isConnected) target.focus()
      else fallbackTarget?.focus()
    }
  }, [restoreTargetRef, triggerRef])

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !committing) {
      event.preventDefault()
      closeDialog()
      return
    }
    if (event.key !== "Tab") return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dialogState === "review") void preview()
    if (dialogState === "preview") void commit()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !committing) closeDialog()
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        data-disposal-bulk-dialog
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-border bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDialog}
            disabled={committing}
            aria-label={previewing ? copy.cancelPreview : copy.close}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div aria-live="polite" className="min-h-5 text-sm">
            {previewing ? <BusyLabel label={copy.previewLoading} /> : null}
            {committing ? <BusyLabel label={copy.committing} /> : null}
            {error ? <p role="alert" className="font-medium text-danger">{error}</p> : null}
          </div>

          {dialogState === "review" || previewing ? (
            <SharedValueFields
              copy={copy}
              employees={employees}
              executionStatuses={executionStatuses}
              executionDate={executionDate}
              executedById={executedById}
              nextStatusId={nextStatusId}
              disabled={previewing}
              onExecutionDateChange={setExecutionDate}
              onExecutedByChange={setExecutedById}
              onNextStatusChange={setNextStatusId}
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
            <section className="space-y-3 rounded-md border border-warning/50 bg-warning/10 p-3">
              <p id={historicalWarningId} className="text-sm font-medium text-foreground">
                {copy.historicalWarning}
              </p>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={useHistoricalEvidenceException}
                  onChange={(event) => setUseHistoricalEvidenceException(event.target.checked)}
                  aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                  className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
                />
                {copy.historicalException}
              </label>
              {useHistoricalEvidenceException ? (
                <>
                  <label className="block text-sm font-medium text-foreground">
                    {copy.historicalReason}
                    <textarea
                      value={evidenceExceptionReason}
                      onChange={(event) => setEvidenceExceptionReason(event.target.value)}
                      minLength={20}
                      maxLength={2000}
                      required
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="mt-2 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <p id={historicalHelpId} className="text-xs text-muted-foreground">
                    {copy.historicalReasonHelp}
                  </p>
                  <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={evidenceExceptionAcknowledged}
                      onChange={(event) => setEvidenceExceptionAcknowledged(event.target.checked)}
                      required
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    {copy.historicalAcknowledgement}
                  </label>
                </>
              ) : (
                <p id={historicalHelpId} className="text-xs text-muted-foreground">
                  {copy.historicalReasonHelp}
                </p>
              )}
            </section>
          ) : null}

          <AuthoritativeItems copy={copy} items={reviewedItems} />

          {response && dialogState !== "review" && !previewing ? (
            <ResponseSummary
              copy={copy}
              response={response}
              getErrorLabel={getErrorLabel}
            />
          ) : null}

          {dialogState === "preview" && eligible.length > 0 ? (
            <label className="flex min-h-11 items-start gap-3 border-t border-border pt-4 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={permanentConfirmed}
                onChange={(event) => setPermanentConfirmed(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
              />
              {copy.permanentConfirmation}
            </label>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          {dialogState !== "committing" ? (
            <button
              type="button"
              onClick={closeDialog}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent"
            >
              {previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}
            </button>
          ) : null}
          {dialogState === "review" ? (
            <button
              type="submit"
              disabled={!hasSharedValues}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {copy.confirm}
            </button>
          ) : null}
          {dialogState === "preview" ? (
            <button
              type="submit"
              disabled={eligible.length === 0 || !permanentConfirmed}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {eligible.length === 0 ? copy.zeroEligible : copy.confirm}
            </button>
          ) : null}
          {dialogState === "committing" ? (
            <div className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {copy.committing}
            </div>
          ) : null}
          {dialogState === "result" && blocked.length + failed.length > 0 ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              {copy.retry}
            </button>
          ) : null}
        </footer>
      </form>
    </div>
  )
}

function BusyLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
  disabled,
  onExecutionDateChange,
  onExecutedByChange,
  onNextStatusChange,
}: {
  copy: DisposalBulkExecutionCopy
  employees: Option[]
  executionStatuses: Option[]
  executionDate: string
  executedById: string
  nextStatusId: string
  disabled: boolean
  onExecutionDateChange: (value: string) => void
  onExecutedByChange: (value: string) => void
  onNextStatusChange: (value: string) => void
}) {
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium text-foreground">
        {copy.executionDate}
        <input
          type="date"
          value={executionDate}
          onChange={(event) => onExecutionDateChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </label>
      <label className="text-sm font-medium text-foreground">
        {copy.executor}
        <select
          value={executedById}
          onChange={(event) => onExecutedByChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          <option value="">{copy.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-foreground">
        {copy.finalStatus}
        <select
          value={nextStatusId}
          onChange={(event) => onNextStatusChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          <option value="">{copy.selectStatus}</option>
          {executionStatuses.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </label>
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
      <dl className="mt-2 grid gap-3 border border-border bg-muted/30 p-3 text-sm sm:grid-cols-3">
        <ReviewValue label={copy.executionDate} value={payload.executionDate} />
        <ReviewValue label={copy.executor} value={employee ?? copy.notProvided} />
        <ReviewValue label={copy.finalStatus} value={status ?? copy.notProvided} />
      </dl>
    </section>
  )
}

function AuthoritativeItems({
  copy,
  items,
}: {
  copy: DisposalBulkExecutionCopy
  items: DisposalBulkExecutionSelectableItem[]
}) {
  return (
    <section aria-labelledby="bulk-authoritative-values">
      <h3 id="bulk-authoritative-values" className="text-sm font-semibold text-foreground">
        {copy.reviewedValues}
      </h3>
      <div className="mt-2 divide-y divide-border border border-border">
        {items.map((item) => (
          <article key={item.requestId} className="space-y-3 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">{item.disposalNo}</h4>
              <span className="text-xs text-muted-foreground">{item.assetLabel}</span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <ReviewValue label={copy.recipient} value={item.recipientName ?? copy.notProvided} />
              <ReviewValue label={copy.documentNo} value={item.documentNo ?? copy.notProvided} />
              <ReviewValue label={copy.saleValue} value={item.saleValue ?? copy.notProvided} />
              <ReviewValue label={copy.salvageValue} value={item.salvageValue ?? copy.notProvided} />
              <ReviewValue label={copy.remark} value={item.executionRemark ?? copy.notProvided} />
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  )
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
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryValue label={copy.selected} value={response.selectedCount} />
        <SummaryValue label={copy.eligible} value={response.eligibleCount} />
        <SummaryValue label={copy.executed} value={response.executedCount} />
        <SummaryValue label={copy.blocked} value={response.blockedCount} />
        <SummaryValue label={copy.failed} value={response.failedCount} />
      </dl>
      <ul className="mt-3 divide-y divide-border border border-border">
        {response.items.map((item) => (
          <li key={item.requestId} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:justify-between">
            <span className="font-medium text-foreground">
              {item.disposalNo ?? item.requestId}
              {item.assetLabel ? ` · ${item.assetLabel}` : ""}
            </span>
            <span className={item.outcome === "executed" || item.outcome === "eligible"
              ? "text-success"
              : "text-danger"}
            >
              {item.outcome === "eligible" ? copy.eligible
                : item.outcome === "executed" ? copy.executed
                  : item.outcome === "blocked" ? `${copy.blocked}: ${getErrorLabel(item.code)}`
                    : `${copy.failed}: ${getErrorLabel(item.code)}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-muted/30 p-3 text-center">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  )
}
