"use client"

import { useRef, useState } from "react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { ActionButton } from "@/components/ui/action-button"

export type ReviewTarget = { id: string; name: string; nameTh: string }

export function AssetStateReviewDialog({
  open,
  mode,
  statusTargets,
  conditionTargets,
  suggestedStatusId,
  suggestedConditionId,
  labels,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: "resolve" | "dismiss"
  statusTargets: ReviewTarget[]
  conditionTargets: ReviewTarget[]
  suggestedStatusId?: string | null
  suggestedConditionId?: string | null
  labels: Record<string, string>
  busy: boolean
  onClose: () => void
  onSubmit: (input: { statusId?: string; conditionId?: string; reason: string }) => Promise<void>
}) {
  const [statusId, setStatusId] = useState(suggestedStatusId ?? statusTargets[0]?.id ?? "")
  const [conditionId, setConditionId] = useState(suggestedConditionId ?? conditionTargets[0]?.id ?? "")
  const [reason, setReason] = useState("")
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  return (
    <AccessibleDialog
      open={open}
      title={mode === "resolve" ? labels.resolveTitle : labels.dismissTitle}
      description={mode === "resolve" ? labels.resolveDescription : labels.dismissDescription}
      busy={busy}
      initialFocusRef={reasonRef}
      onClose={onClose}
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({
            ...(mode === "resolve" && statusTargets.length ? { statusId } : {}),
            ...(mode === "resolve" && conditionTargets.length ? { conditionId } : {}),
            reason,
          })
        }}
      >
        {mode === "resolve" && statusTargets.length > 0 ? (
          <label className="block text-sm font-medium text-foreground">
            {labels.nextStatus}
            <select
              name="statusId"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {statusTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
            </select>
          </label>
        ) : null}
        {mode === "resolve" && conditionTargets.length > 0 ? (
          <label className="block text-sm font-medium text-foreground">
            {labels.nextCondition}
            <select
              name="conditionId"
              value={conditionId}
              onChange={(event) => setConditionId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {conditionTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-foreground">
          {labels.reason}
          <textarea
            ref={reasonRef}
            name="resolutionReason"
            value={reason}
            minLength={10}
            maxLength={2000}
            required
            rows={4}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder={labels.reasonPlaceholder}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{labels.reasonHelp}</span>
        </label>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <ActionButton disabled={busy} onClick={onClose}>{labels.cancel}</ActionButton>
          <ActionButton type="submit" variant={mode === "dismiss" ? "danger" : "primary"} disabled={busy || reason.trim().length < 10}>
            {busy ? labels.saving : mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}
          </ActionButton>
        </div>
      </form>
    </AccessibleDialog>
  )
}
