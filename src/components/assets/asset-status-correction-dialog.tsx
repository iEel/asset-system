"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { maxLength, minLength, required } from "@/lib/validation-rules"

// The one field, keyed like the server's fieldErrors (validations/asset-status-correction.ts), with the id focus moves to
// (v-track M-R1). The server's other key, nextStatusId, is not a field here (the target is always Ready): its refusal
// shows in the error line under the field, as today (spec §4.1.3).
const FIELD_IDS = {
  reason: "asset-status-correction-reason",
} as const
type CorrectionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CorrectionField[]

// The server's rule for the reason, 5 to 500 characters, which a disabled button used to hide (spec §4.4, v-track M-R2).
function validate(values: { reason: string }): Partial<Record<CorrectionField, string>> {
  const errors: Partial<Record<CorrectionField, string>> = {}
  const check = (key: CorrectionField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 500))
  return errors
}

export type AssetStatusCorrectionLabels = {
  button: string
  title: string
  description: string
  reason: string
  reasonPlaceholder: string
  cancel: string
  submit: string
  errorFallback: string
}

export type AssetStatusCorrectionDialogHandle = { open: () => void }

// Group 1 asset detail task 8A: a dialog its owner opens through the handle (the page's "อื่น ๆ" menu, the phone sheet),
// with no trigger of its own when hideTrigger is set; focus returns to returnFocusRef, as TransactionCancelDialog does.
export function AssetStatusCorrectionDialog({
  assetId,
  readyStatusId,
  labels,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  assetId: string
  readyStatusId: string
  labels: AssetStatusCorrectionLabels
  ref?: Ref<AssetStatusCorrectionDialogHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fieldErrors = useFieldErrors<CorrectionField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function openDialog() {
    setError(null)
    fieldErrors.setErrors({})
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setError(null)
    fieldErrors.setErrors({})
  }

  useImperativeHandle(ref, () => ({ open: openDialog }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/assets/${assetId}/status-correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatusId: readyStatusId, reason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal of the reason shows under it; any other keeps the error line (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        setError(payload?.error ?? labels.errorFallback)
        return
      }
      setOpen(false)
      setReason("")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <Button variant="outline" onClick={openDialog}>
          <RotateCcw className="text-warning" aria-hidden="true" />
          {labels.button}
        </Button>
      )}
      <AccessibleDialog
        open={open}
        title={labels.title}
        description={labels.description}
        busy={isSubmitting}
        initialFocusRef={reasonRef}
        returnFocusRef={returnFocusRef}
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody>
            <Field
              label={labels.reason}
              required
              error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 5, max: 500 }) : undefined}
            >
              <Textarea
                ref={reasonRef}
                id="asset-status-correction-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  fieldErrors.clear("reason")
                }}
                placeholder={labels.reasonPlaceholder}
                className="min-h-24"
              />
            </Field>
            {error ? <p className="mt-2 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            <Button type="submit" busy={isSubmitting}>
              {labels.submit}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </>
  )
}
