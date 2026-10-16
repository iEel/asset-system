"use client"

import { useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Undo2 } from "lucide-react"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { formatCount } from "@/lib/display-format"

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
  // null when the transaction has no snapshot: the facts list shows Nil (spec 2D M32 b, plan 2D-3 R2).
  currentState: string | null
  restoreState: string | null
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
        <Button variant="danger" onClick={() => void openPreview()}>
          <Undo2 aria-hidden="true" />
          {labels.action}
        </Button>
      )}
      <AccessibleDialog open={open} title={labels.title} description={labels.description} busy={saving} initialFocusRef={reasonRef} returnFocusRef={returnFocusRef} onClose={() => setOpen(false)}>
        <AccessibleDialogBody>
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{labels.loading}</div>
          ) : (
            <>
              {error ? (
                <Notice tone="danger" role="alert" className="mb-4">
                  <ApiErrorText error={error} />
                </Notice>
              ) : null}
              <dl className="divide-y divide-border rounded-md border border-border bg-background px-3">
                {[[labels.operator, originalOperator], [labels.currentState, currentState], [labels.restoreState, restoreState], [labels.components, formatCount(componentCount)]].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium text-foreground">{orNil(value)}</dd></div>
                ))}
              </dl>
              {blockers.length > 0 ? (
                <Notice tone="warning" role="status" title={labels.blockedTitle} className="mt-4">
                  <p>{labels.blockedDescription}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">{blockers.map((blocker) => <li key={blocker}>{labels.blockers[blocker] ?? blocker}</li>)}</ul>
                </Notice>
              ) : null}
              <Field label={labels.reasonLabel} className="mt-4">
                <Textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving || blockers.length > 0} rows={4} maxLength={2000} placeholder={labels.reasonPlaceholder} className="min-h-28" />
              </Field>
            </>
          )}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
          <Button variant="destructive" busy={saving} disabled={loading || blockers.length > 0} onClick={() => void submitCancellation()}>
            {labels.confirm}
          </Button>
        </AccessibleDialogFooter>
      </AccessibleDialog>
    </>
  )
}
