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
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { maxLength, minLength, required } from "@/lib/validation-rules"

export type ReviewTarget = { id: string; name: string; nameTh: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The
// server's "a status or condition target is required" has no field: it comes as _form and shows above the fields.
const FIELD_IDS = {
  statusId: "state-review-status",
  conditionId: "state-review-condition",
  reason: "state-review-reason",
} as const
type StateReviewField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as StateReviewField[]

// noValidate turns the browser's check off, so this restates the reason's required, minLength and maxLength. The
// 10 characters were a disabled button; they are an error on submit now (spec §4.4, v-track M-R2).
function validate(values: { reason: string }) {
  const errors: Partial<Record<StateReviewField, string>> = {}
  const check = (key: StateReviewField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", required(values.reason) ?? minLength(values.reason, 10) ?? maxLength(values.reason, 2000))
  return errors
}

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
  // Resolves to the server's body when it refused the input (the workspace hands it back), else to nothing.
  onSubmit: (input: { statusId?: string; conditionId?: string; reason: string }) => Promise<unknown>
}) {
  const [statusId, setStatusId] = useState(suggestedStatusId ?? statusTargets[0]?.id ?? "")
  const [conditionId, setConditionId] = useState(suggestedConditionId ?? conditionTargets[0]?.id ?? "")
  const [reason, setReason] = useState("")
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const fieldErrors = useFieldErrors<StateReviewField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    const refusal = await onSubmit({
      ...(mode === "resolve" && statusTargets.length ? { statusId } : {}),
      ...(mode === "resolve" && conditionTargets.length ? { conditionId } : {}),
      reason,
    })
    // Under its field, or (the _form key) in the Notice above the fields; the dialog stays open either way.
    if (fieldErrors.applyServer(refusal) && focusFirstError()) return
  }

  return (
    <AccessibleDialog
      open={open}
      title={mode === "resolve" ? labels.resolveTitle : labels.dismissTitle}
      description={mode === "resolve" ? labels.resolveDescription : labels.dismissDescription}
      busy={busy}
      initialFocusRef={reasonRef}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="space-y-4">
          {fieldErrors.errors._form ? <Notice tone="danger" role="alert">{fieldErrors.message("_form")}</Notice> : null}
          {mode === "resolve" && statusTargets.length > 0 ? (
            <Field label={labels.nextStatus} id="state-review-status" error={fieldErrors.message("statusId")}>
              <NativeSelect
                name="statusId"
                value={statusId}
                onChange={(event) => {
                  setStatusId(event.target.value)
                  fieldErrors.clear("statusId")
                }}
              >
                {statusTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          {mode === "resolve" && conditionTargets.length > 0 ? (
            <Field label={labels.nextCondition} id="state-review-condition" error={fieldErrors.message("conditionId")}>
              <NativeSelect
                name="conditionId"
                value={conditionId}
                onChange={(event) => {
                  setConditionId(event.target.value)
                  fieldErrors.clear("conditionId")
                }}
              >
                {conditionTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          <Field
            label={labels.reason}
            id="state-review-reason"
            required
            hint={labels.reasonHelp}
            error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 10, max: 2000 }) : undefined}
          >
            <Textarea
              ref={reasonRef}
              name="resolutionReason"
              value={reason}
              minLength={10}
              maxLength={2000}
              required
              rows={4}
              onChange={(event) => {
                setReason(event.target.value)
                fieldErrors.clear("reason")
              }}
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
          >
            {mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
