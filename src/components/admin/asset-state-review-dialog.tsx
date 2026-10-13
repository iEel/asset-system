"use client"

import { useRef, useState } from "react"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

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
        className={accessibleDialogFormClasses}
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({
            ...(mode === "resolve" && statusTargets.length ? { statusId } : {}),
            ...(mode === "resolve" && conditionTargets.length ? { conditionId } : {}),
            reason,
          })
        }}
      >
        <AccessibleDialogBody className="space-y-4">
          {mode === "resolve" && statusTargets.length > 0 ? (
            <Field label={labels.nextStatus}>
              <NativeSelect
                name="statusId"
                value={statusId}
                onChange={(event) => setStatusId(event.target.value)}
              >
                {statusTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          {mode === "resolve" && conditionTargets.length > 0 ? (
            <Field label={labels.nextCondition}>
              <NativeSelect
                name="conditionId"
                value={conditionId}
                onChange={(event) => setConditionId(event.target.value)}
              >
                {conditionTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          <Field label={labels.reason} required hint={labels.reasonHelp}>
            <Textarea
              ref={reasonRef}
              name="resolutionReason"
              value={reason}
              minLength={10}
              maxLength={2000}
              required
              rows={4}
              onChange={(event) => setReason(event.target.value)}
              placeholder={labels.reasonPlaceholder}
            />
          </Field>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
          <Button
            type="submit"
            variant={mode === "dismiss" ? "destructive" : "default"}
            busy={busy}
            disabled={reason.trim().length < 10}
          >
            {mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
