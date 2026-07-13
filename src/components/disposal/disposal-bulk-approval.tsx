"use client"

import {
  createContext,
  useContext,
  useEffect,
  useId,
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
import type {
  DisposalBulkApprovalCode,
  DisposalBulkApprovalItem,
  DisposalBulkApprovalSummary,
} from "@/lib/disposal-bulk-approval"

export const MAX_DISPOSAL_BULK_APPROVAL_ITEMS = 50

export type DisposalBulkSelectableItem = {
  requestId: string
  disposalNo: string
  assetTag: string
  selectable: boolean
  blockedCode: DisposalBulkApprovalCode | null
}

export type DisposalBulkApprovalCopy = {
  toolbarLabel: string
  selectionLabel: string
  selectionMode: string
  cancelSelectionMode: string
  selectedCount: string
  selectionLimit: string
  selectPage: string
  clearSelection: string
  reviewAndApprove: string
  selectItem: string
  requestFailed: string
  approvalFailed: string
  previewTitle: string
  previewLoading: string
  preflightHelp: string
  sharedRemark: string
  sharedRemarkHelp: string
  remarkLimit: string
  confirmApproval: string
  committing: string
  resultTitle: string
  selected: string
  eligible: string
  blocked: string
  approved: string
  failed: string
  retry: string
  close: string
  cancel: string
  zeroEligible: string
  discardSelection: string
  errors: Record<DisposalBulkApprovalCode, string>
}

type DisposalBulkApprovalResponse = {
  summary: DisposalBulkApprovalSummary
  items: DisposalBulkApprovalItem[]
}

type DialogState = "closed" | "previewing" | "preview" | "committing" | "result"

type BulkApprovalContextValue = {
  items: DisposalBulkSelectableItem[]
  copy: DisposalBulkApprovalCopy
  selected: Set<string>
  dialogState: DialogState
  approvalRemark: string
  response: DisposalBulkApprovalResponse | null
  mobileSelectionMode: boolean
  busy: boolean
  limitMessage: string | null
  error: string | null
  triggerRef: RefObject<HTMLButtonElement | null>
  toggle: (requestId: string) => void
  selectPage: () => void
  togglePageSelection: () => void
  clear: () => void
  setMobileSelectionMode: (value: boolean) => void
  setApprovalRemark: (value: string) => void
  preview: () => Promise<void>
  commit: () => Promise<void>
  closeDialog: () => void
  getErrorLabel: (code: DisposalBulkApprovalCode | null) => string
}

const DisposalBulkApprovalContext = createContext<BulkApprovalContextValue | null>(null)

function useDisposalBulkApproval() {
  const context = useContext(DisposalBulkApprovalContext)
  if (!context) throw new Error("Disposal bulk approval controls must be rendered within DisposalBulkApprovalProvider")
  return context
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

function getSelectablePageItems(items: DisposalBulkSelectableItem[]) {
  return items.filter((item) => item.selectable).slice(0, MAX_DISPOSAL_BULK_APPROVAL_ITEMS)
}

function isBulkApprovalCode(value: unknown): value is DisposalBulkApprovalCode {
  return typeof value === "string" && value in {
    DISPOSAL_REQUEST_NOT_FOUND: true,
    DISPOSAL_INVALID_STAGE: true,
    DISPOSAL_SOD_CONFLICT: true,
    DISPOSAL_ASSET_INELIGIBLE: true,
    DISPOSAL_CONCURRENT_UPDATE: true,
    DISPOSAL_APPROVAL_FAILED: true,
  }
}

export function DisposalBulkApprovalProvider({
  items,
  selectionKey,
  copy,
  children,
}: {
  items: DisposalBulkSelectableItem[]
  selectionKey: string
  copy: DisposalBulkApprovalCopy
  children: ReactNode
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialogState, setDialogState] = useState<DialogState>("closed")
  const [approvalRemark, setApprovalRemark] = useState("")
  const [response, setResponse] = useState<DisposalBulkApprovalResponse | null>(null)
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectionGenerationRef = useRef(0)
  const requestGenerationRef = useRef(0)
  const previewControllerRef = useRef<AbortController | null>(null)
  const commitControllerRef = useRef<AbortController | null>(null)
  const busy = dialogState === "previewing" || dialogState === "committing"

  /* eslint-disable react-hooks/set-state-in-effect -- A changed selection key represents a new server-rendered queue page. */
  useEffect(() => {
    selectionGenerationRef.current += 1
    requestGenerationRef.current += 1
    previewControllerRef.current?.abort()
    commitControllerRef.current?.abort()
    previewControllerRef.current = null
    commitControllerRef.current = null
    setSelected(new Set())
    setDialogState("closed")
    setResponse(null)
    setMobileSelectionMode(false)
    setApprovalRemark("")
    setLimitMessage(null)
    setError(null)
  }, [selectionKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  function clear() {
    setSelected(new Set())
    setLimitMessage(null)
  }

  function toggle(requestId: string) {
    const item = items.find((candidate) => candidate.requestId === requestId)
    if (!item || !item.selectable || busy) return
    setSelected((current) => {
      if (current.has(requestId)) {
        const next = new Set(current)
        next.delete(requestId)
        return next
      }
      if (current.size >= MAX_DISPOSAL_BULK_APPROVAL_ITEMS) {
        setLimitMessage(copy.selectionLimit)
        return current
      }
      const next = new Set(current)
      next.add(requestId)
      return next
    })
  }

  function selectPage() {
    const pageSelection = getSelectablePageItems(items)
    setSelected(new Set(pageSelection.map((item) => item.requestId)))
    setLimitMessage(items.filter((item) => item.selectable).length > MAX_DISPOSAL_BULK_APPROVAL_ITEMS ? copy.selectionLimit : null)
  }

  function togglePageSelection() {
    const pageSelection = getSelectablePageItems(items)
    if (pageSelection.length > 0 && pageSelection.every((item) => selected.has(item.requestId))) {
      clear()
      return
    }
    selectPage()
  }

  function abortActiveRequests() {
    previewControllerRef.current?.abort()
    commitControllerRef.current?.abort()
    previewControllerRef.current = null
    commitControllerRef.current = null
  }

  function isCurrentRequest(
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

  async function send(mode: "preview" | "commit", requestIds: string[], controller: AbortController) {
    const request = mode === "preview"
      ? { mode: "preview", requestIds }
      : { mode: "commit", requestIds, approvalRemark: approvalRemark.trim() || null }
    const fetchResponse = await fetch("/api/disposal-requests/bulk-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    const payload = await fetchResponse.json().catch(() => null) as DisposalBulkApprovalResponse | { code?: unknown; error?: unknown } | null
    if (!fetchResponse.ok || !payload || !("items" in payload)) {
      if (payload && "code" in payload && isBulkApprovalCode(payload.code)) throw new Error(copy.errors[payload.code])
      if (payload && "error" in payload && isBulkApprovalCode(payload.error)) throw new Error(copy.errors[payload.error])
      throw new Error(mode === "preview" ? copy.requestFailed : copy.approvalFailed)
    }
    return payload
  }

  async function preview() {
    if (selected.size === 0 || busy) return
    abortActiveRequests()
    const controller = new AbortController()
    const selectionGeneration = selectionGenerationRef.current
    const requestGeneration = ++requestGenerationRef.current
    previewControllerRef.current = controller
    setResponse(null)
    setDialogState("previewing")
    setError(null)
    try {
      const payload = await send("preview", [...selected], controller)
      if (!isCurrentRequest("preview", controller, selectionGeneration, requestGeneration)) return
      setResponse(payload)
      setDialogState("preview")
    } catch (caught) {
      if (!isCurrentRequest("preview", controller, selectionGeneration, requestGeneration)) return
      setError(caught instanceof Error ? caught.message : copy.requestFailed)
      setDialogState("closed")
    } finally {
      if (previewControllerRef.current === controller) previewControllerRef.current = null
    }
  }

  async function commit() {
    const eligibleIds = response?.items.filter((item) => item.outcome === "eligible").map((item) => item.requestId) ?? []
    if (eligibleIds.length === 0 || busy) return
    abortActiveRequests()
    const controller = new AbortController()
    const selectionGeneration = selectionGenerationRef.current
    const requestGeneration = ++requestGenerationRef.current
    commitControllerRef.current = controller
    setDialogState("committing")
    setError(null)
    try {
      const payload = await send("commit", eligibleIds, controller)
      if (!isCurrentRequest("commit", controller, selectionGeneration, requestGeneration)) return
      const unresolved = payload.items
        .filter((item) => item.outcome === "blocked" || item.outcome === "failed")
        .map((item) => item.requestId)
      setResponse(payload)
      setSelected(new Set(unresolved))
      setDialogState("result")
      if (payload.summary.approved > 0) router.refresh()
    } catch (caught) {
      if (!isCurrentRequest("commit", controller, selectionGeneration, requestGeneration)) return
      setError(caught instanceof Error ? caught.message : copy.approvalFailed)
      setDialogState("preview")
    } finally {
      if (commitControllerRef.current === controller) commitControllerRef.current = null
    }
  }

  function closeDialog() {
    if (!busy) setDialogState("closed")
  }

  function confirmDiscard() {
    if (selected.size === 0) return true
    const confirmed = window.confirm(copy.discardSelection)
    if (confirmed) clear()
    return confirmed
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null
    const link = target?.closest("a")
    if (!link) return
    if (!confirmDiscard()) event.preventDefault()
  }

  function handleSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement | null
    if (form?.dataset.disposalBulkDialog || !confirmDiscard()) event.preventDefault()
  }

  function getErrorLabel(code: DisposalBulkApprovalCode | null) {
    return code ? copy.errors[code] : copy.approvalFailed
  }

  const value: BulkApprovalContextValue = {
    items,
    copy,
    selected,
    dialogState,
    approvalRemark,
    response,
    mobileSelectionMode,
    busy,
    limitMessage,
    error,
    triggerRef,
    toggle,
    selectPage,
    togglePageSelection,
    clear,
    setMobileSelectionMode,
    setApprovalRemark,
    preview,
    commit,
    closeDialog,
    getErrorLabel,
  }

  return (
    <DisposalBulkApprovalContext.Provider value={value}>
      <div onClickCapture={handleClickCapture} onSubmitCapture={handleSubmitCapture}>
        {children}
        {dialogState !== "closed" ? <DisposalBulkApprovalDialog /> : null}
      </div>
    </DisposalBulkApprovalContext.Provider>
  )
}

export function DisposalBulkSelectionToggle() {
  const { copy, mobileSelectionMode, selected, busy, clear, setMobileSelectionMode } = useDisposalBulkApproval()
  const active = mobileSelectionMode || selected.size > 0

  function toggleMode() {
    if (active) {
      clear()
      setMobileSelectionMode(false)
      return
    }
    setMobileSelectionMode(true)
  }

  return (
    <button type="button" onClick={toggleMode} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 md:hidden">
      <ListChecks className="h-4 w-4" />
      {active ? copy.cancelSelectionMode : copy.selectionMode}
    </button>
  )
}

export function DisposalBulkApprovalToolbar() {
  const { copy, selected, busy, limitMessage, error, selectPage, clear, preview, triggerRef } = useDisposalBulkApproval()
  if (selected.size === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-3 border border-border bg-muted/40 p-3 sm:rounded-md md:flex-row md:items-center md:justify-between" aria-label={copy.toolbarLabel}>
      <span className="sr-only" aria-live="polite">{formatCopy(copy.selectedCount, { count: selected.size })}</span>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground"><CheckSquare2 className="h-4 w-4 text-primary" />{formatCopy(copy.selectedCount, { count: selected.size })}</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={selectPage} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.selectPage}</button>
        <button type="button" onClick={clear} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.clearSelection}</button>
        <button ref={triggerRef} type="button" onClick={() => void preview()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          {copy.reviewAndApprove}
        </button>
      </div>
      {limitMessage ? <p className="text-xs text-muted-foreground md:col-span-full">{limitMessage}</p> : null}
      {error ? <div className="flex items-center gap-3 text-sm text-danger" role="alert"><span>{error}</span><button type="button" onClick={() => void preview()} disabled={busy} className="font-medium text-primary underline underline-offset-2 disabled:opacity-50">{copy.retry}</button></div> : null}
    </div>
  )
}

export function DisposalBulkApprovalSelectPageControl() {
  const { items, copy, selected, busy, togglePageSelection } = useDisposalBulkApproval()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectableItems = getSelectablePageItems(items)
  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selected.has(item.requestId))
  const partiallySelected = !allSelected && selectableItems.some((item) => selected.has(item.requestId))
  const disabled = busy || selectableItems.length === 0

  useEffect(() => {
    const input = inputRef.current
    if (input) input.indeterminate = partiallySelected
  }, [partiallySelected])

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={allSelected}
      disabled={disabled}
      onChange={togglePageSelection}
      aria-label={copy.selectPage}
      aria-checked={partiallySelected ? "mixed" : allSelected}
      className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
    />
  )
}

export function DisposalBulkApprovalCheckbox({
  requestId,
  variant,
}: {
  requestId: string
  variant: "desktop" | "mobile"
}) {
  const { items, copy, selected, mobileSelectionMode, busy, toggle, getErrorLabel } = useDisposalBulkApproval()
  const item = items.find((candidate) => candidate.requestId === requestId)
  if (!item || (variant === "mobile" && !mobileSelectionMode)) return null
  const checked = selected.has(item.requestId)
  const disabled = !item.selectable || busy || (!checked && selected.size >= MAX_DISPOSAL_BULK_APPROVAL_ITEMS)

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => toggle(item.requestId)}
      aria-label={formatCopy(copy.selectItem, { disposalNo: item.disposalNo, assetTag: item.assetTag })}
      title={item.blockedCode ? getErrorLabel(item.blockedCode) : undefined}
      className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
    />
  )
}

function DisposalBulkApprovalDialog() {
  const {
    copy,
    dialogState,
    response,
    approvalRemark,
    busy,
    error,
    triggerRef,
    setApprovalRemark,
    commit,
    closeDialog,
    getErrorLabel,
  } = useDisposalBulkApproval()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const eligible = response?.items.filter((item) => item.outcome === "eligible") ?? []
  const blocked = response?.items.filter((item) => item.outcome === "blocked") ?? []
  const failed = response?.items.filter((item) => item.outcome === "failed") ?? []
  const approved = response?.items.filter((item) => item.outcome === "approved") ?? []
  const groups = groupByCode([...blocked, ...failed])
  const description = dialogState === "previewing" ? copy.previewLoading : dialogState === "committing" ? copy.committing : copy.preflightHelp

  useEffect(() => {
    restoreFocusRef.current = triggerRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [triggerRef])

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.defaultPrevented) return
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }
    if (event.key !== "Tab") return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    if (dialogState === "preview") void commit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
      <form ref={dialogRef} data-disposal-bulk-dialog="true" onSubmit={handleSubmit} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-border bg-surface shadow-lg sm:rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><h2 id={titleId} className="text-base font-semibold text-foreground">{dialogState === "result" ? copy.resultTitle : copy.previewTitle}</h2><p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p></div>
          <button ref={closeRef} type="button" onClick={closeDialog} disabled={busy} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-8 sm:w-8" aria-label={copy.close}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          {dialogState === "previewing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{copy.previewLoading}</div> : null}
          {dialogState === "committing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{copy.committing}</div> : null}
          {response ? <>
            <BulkSummary selected={response.summary.selected} eligible={response.summary.eligible} blocked={response.summary.blocked} approved={response.summary.approved} failed={response.summary.failed} />
            {groups.length ? <div className="space-y-2">{groups.map(([code, group]) => <details key={code} className="rounded-md border border-border bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-medium text-foreground"><span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" />{getErrorLabel(code)} ({group.length})</span></summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{group.map((item) => <li key={item.requestId}>{item.disposalNo} - {item.assetTag}</li>)}</ul></details>)}</div> : null}
            {dialogState === "preview" && eligible.length === 0 ? <p role="alert" className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">{copy.zeroEligible}</p> : null}
            {dialogState === "preview" ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{copy.sharedRemark}</span><textarea value={approvalRemark} maxLength={4000} rows={4} disabled={busy} onChange={(event) => setApprovalRemark(event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /><span className="mt-1 block text-xs text-muted-foreground">{copy.sharedRemarkHelp}</span><span className="mt-1 block text-xs text-muted-foreground">{formatCopy(copy.remarkLimit, { count: approvalRemark.length })}</span></label> : null}
            {dialogState === "result" && (approved.length || failed.length || blocked.length) ? <ResultDetails approved={approved} blocked={blocked} failed={failed} getErrorLabel={getErrorLabel} /> : null}
          </> : null}
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={closeDialog} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{dialogState === "result" ? copy.close : copy.cancel}</button>
            {dialogState === "preview" && error ? <button type="button" onClick={() => void commit()} disabled={busy || eligible.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.retry}</button> : null}
            {dialogState === "preview" ? <button type="submit" disabled={busy || eligible.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare2 className="h-4 w-4" />}{formatCopy(copy.confirmApproval, { count: eligible.length })}</button> : null}
          </div>
        </div>
      </form>
    </div>
  )
}

function BulkSummary({ selected, eligible, blocked, approved, failed }: DisposalBulkApprovalSummary) {
  const { copy } = useDisposalBulkApproval()
  return <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5"><Metric label={copy.selected} value={selected} /><Metric label={copy.eligible} value={eligible} /><Metric label={copy.blocked} value={blocked} /><Metric label={copy.approved} value={approved} /><Metric label={copy.failed} value={failed} /></dl>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border bg-muted/30 p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold text-foreground">{value}</dd></div>
}

function ResultDetails({ approved, blocked, failed, getErrorLabel }: { approved: DisposalBulkApprovalItem[]; blocked: DisposalBulkApprovalItem[]; failed: DisposalBulkApprovalItem[]; getErrorLabel: (code: DisposalBulkApprovalCode | null) => string }) {
  const { copy } = useDisposalBulkApproval()
  const sections = [
    [copy.approved, approved],
    [copy.blocked, blocked],
    [copy.failed, failed],
  ] as const
  return <div className="space-y-3">{sections.filter(([, items]) => items.length).map(([label, items]) => <section key={label}><h3 className="text-sm font-semibold text-foreground">{label} ({items.length})</h3><ul className="mt-1 space-y-1 text-sm text-muted-foreground">{items.map((item) => <li key={item.requestId}>{item.disposalNo} - {item.assetTag}{item.code ? `: ${getErrorLabel(item.code)}` : ""}</li>)}</ul></section>)}</div>
}

function groupByCode(items: DisposalBulkApprovalItem[]) {
  const groups = new Map<DisposalBulkApprovalCode, DisposalBulkApprovalItem[]>()
  for (const item of items) {
    if (!item.code) continue
    groups.set(item.code, [...(groups.get(item.code) ?? []), item])
  }
  return [...groups.entries()]
}
