"use client"

import { useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Undo2 } from "lucide-react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"

type TransactionType = "checkout" | "checkin" | "transfer"

export type TransactionCancellationLabels = {
  action: string
  title: string
  description: string
  reasonLabel: string
  reasonPlaceholder: string
  confirm: string
  cancel: string
  loading: string
  blockedTitle: string
  blockedDescription: string
  success: string
  error: string
  reasonTooShort: string
  operator: string
  currentState: string
  restoreState: string
  components: string
  blockers: Record<string, string>
}

export type TransactionCancelDialogProps = {
  type: TransactionType
  transactionId: string
  expectedUpdatedAt: string
  originalOperator: string
  currentState: string
  restoreState: string
  componentCount: number
  labels: TransactionCancellationLabels
}

export type TransactionCancelDialogHandle = { open: () => void }

export function TransactionCancelDialog({
  type,
  transactionId,
  expectedUpdatedAt,
  originalOperator,
  currentState,
  restoreState,
  componentCount,
  labels,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: TransactionCancelDialogProps & {
  ref?: Ref<TransactionCancelDialogHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [blockers, setBlockers] = useState<string[]>([])
  const endpoint = `/api/asset-${type}s/${transactionId}`

  async function openPreview() {
    setOpen(true)
    setLoading(true)
    setError(null)
    setBlockers([])
    try {
      const response = await fetch(`${endpoint}/cancel-preview`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)
      if (!payload?.eligible) setBlockers(Array.isArray(payload?.reasons) ? payload.reasons : [])
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : labels.error)
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({ open: () => void openPreview() }))

  async function submitCancellation() {
    if (reason.trim().length < 5) {
      setError(labels.reasonTooShort)
      reasonRef.current?.focus()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`${endpoint}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, expectedUpdatedAt }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        if (payload?.status === "blocked") setBlockers(Array.isArray(payload.reasons) ? payload.reasons : [])
        throw new Error(payload?.error ?? (payload?.status === "blocked" ? labels.blockedDescription : labels.error))
      }
      setOpen(false)
      setReason("")
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button type="button" onClick={() => void openPreview()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/40 bg-surface px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40">
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          {labels.action}
        </button>
      )}
      <AccessibleDialog open={open} title={labels.title} description={labels.description} busy={saving} initialFocusRef={reasonRef} returnFocusRef={returnFocusRef} onClose={() => setOpen(false)}>
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{labels.loading}</div>
          ) : (
            <>
              <dl className="divide-y divide-border rounded-md border border-border bg-background px-3">
                {[[labels.operator, originalOperator], [labels.currentState, currentState], [labels.restoreState, restoreState], [labels.components, String(componentCount)]].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium text-foreground">{value}</dd></div>
                ))}
              </dl>
              {blockers.length > 0 ? (
                <div className="mt-4 rounded-md border border-warning/40 bg-warning-soft p-4" role="status">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />{labels.blockedTitle}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{labels.blockedDescription}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">{blockers.map((blocker) => <li key={blocker}>{labels.blockers[blocker] ?? blocker}</li>)}</ul>
                </div>
              ) : null}
              <label className="mt-4 block text-sm font-medium text-foreground">
                {labels.reasonLabel}
                <textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving || blockers.length > 0} rows={4} maxLength={2000} placeholder={labels.reasonPlaceholder} className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
              </label>
              <p className="mt-2 min-h-5 text-sm text-danger" aria-live="polite">{error ? <ApiErrorText error={error} /> : null}</p>
            </>
          )}
        </div>
        <div className="grid gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:grid-cols-2">
          <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50">{labels.cancel}</button>
          <button type="button" onClick={() => void submitCancellation()} disabled={loading || saving || blockers.length > 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{labels.confirm}</button>
        </div>
      </AccessibleDialog>
    </>
  )
}
