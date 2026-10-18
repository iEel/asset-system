"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
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

type AssetStatusCorrectionButtonProps = {
  assetId: string
  readyStatusId: string
  labels: {
    button: string
    title: string
    description: string
    reason: string
    reasonPlaceholder: string
    cancel: string
    submit: string
    errorFallback: string
  }
}

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fieldErrors = useFieldErrors<CorrectionField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

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
    <div className="space-y-2">
      {/* Spec 2D M27: the trigger says whether the panel is open; aria-controls only points at a panel that exists. */}
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
      {open ? (
        // A quiet grouping inside the lifecycle panel: controls never sit in a warning box (spec 2D D7).
        <form onSubmit={handleSubmit} noValidate id={panelId} className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <Notice tone="neutral" className="mt-1">{labels.description}</Notice>
          <Field
            label={labels.reason}
            required
            className="mt-3"
            error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 5, max: 500 }) : undefined}
          >
            <Textarea
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setError(null)
                fieldErrors.setErrors({})
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="submit" busy={isSubmitting}>
              {labels.submit}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
