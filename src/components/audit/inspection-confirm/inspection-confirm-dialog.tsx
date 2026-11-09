"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRef, useState, type RefObject } from "react"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { formatCount } from "@/lib/display-format"
import type { InspectionBlockedCode } from "@/lib/inspection-confirm-page-model"
import type { InspectionTargetStatusName } from "@/lib/inspection-confirm-rules"
import { maxLength, minLength, required } from "@/lib/validation-rules"

// The one field, keyed like the route's fieldErrors (validations/inspection-confirm.ts), with the id focus moves to.
const FIELD_IDS = {
  reason: "inspection-confirm-reason",
} as const
type ConfirmField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as ConfirmField[]
const FIELD_PARAMS = { reason: { min: 3, max: 500 } }

// The schema's rule for the reason: 3 to 500 characters after trim.
function validate(values: { reason: string }): Partial<Record<ConfirmField, string>> {
  const errors: Partial<Record<ConfirmField, string>> = {}
  const code = required(values.reason) ?? minLength(values.reason, 3) ?? maxLength(values.reason.trim(), 500)
  if (code) errors.reason = code
  return errors
}

/** One entry of the route's 409: an asset that can no longer be confirmed, and why. */
export type InspectionBlockedEntry = { assetId: string; assetTag: string | null; code: InspectionBlockedCode }

// The dialog's lines, in the order the summary reads (Missing never comes from the ready tab).
const DIALOG_LINES: ReadonlyArray<{ status: InspectionTargetStatusName; key: "dialogLineInUse" | "dialogLineReady" | "dialogLineCheckedOut" }> = [
  { status: "In Use", key: "dialogLineInUse" },
  { status: "Ready", key: "dialogLineReady" },
  { status: "Checked Out", key: "dialogLineCheckedOut" },
]

// ยืนยันผลตรวจ (inspection-confirm plan 3 task 3): the confirm dialog of the ticked assets. Its owner mounts it with a new
// key per opening, so the reason starts from reasonDefault each time. A 200 and a 409 both close it and refresh the page;
// a refused reason shows under the field; anything else stays in the dialog as the error line.
export function InspectionConfirmDialog({
  open,
  roundId,
  auditNo,
  assetIds,
  summary,
  returnFocusRef,
  onClose,
  onConfirmed,
  onChanged,
}: {
  open: boolean
  roundId: string
  auditNo: string
  assetIds: readonly string[]
  summary: Partial<Record<InspectionTargetStatusName, number>>
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  onConfirmed: (confirmed: number) => void
  onChanged: (blocked: InspectionBlockedEntry[]) => void
}) {
  const t = useTranslations("inspectionConfirmPage")
  const router = useRouter()
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [reason, setReason] = useState(() => t("reasonDefault", { auditNo }))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // A second submit before the next render must not post twice.
  const submittingRef = useRef(false)
  const fieldErrors = useFieldErrors<ConfirmField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError(null)
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    submittingRef.current = true
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/confirm-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds, reason, outcome: "confirm" }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        onConfirmed(typeof payload?.confirmed === "number" ? payload.confirmed : assetIds.length)
        router.refresh()
        return
      }
      if (response.status === 409 && Array.isArray(payload?.blocked)) {
        onChanged(payload.blocked as InspectionBlockedEntry[])
        router.refresh()
        return
      }
      // A refusal of the reason shows under it; any other keeps the error line, as the status correction does.
      if (fieldErrors.applyServer(payload) && focusFirstError()) return
      setError(payload?.error ?? t("errorFallback"))
    } catch {
      setError(t("errorFallback"))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <AccessibleDialog
      open={open}
      title={t("dialogTitle", { count: assetIds.length })}
      busy={isSubmitting}
      initialFocusRef={reasonRef}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody>
          <ul className="mb-4 space-y-1 text-sm text-foreground">
            {DIALOG_LINES.filter((line) => (summary[line.status] ?? 0) > 0).map((line) => (
              <li key={line.status} className="flex items-baseline justify-between gap-3">
                <span>{t(line.key)}</span>
                <span className="font-medium tabular-nums">{formatCount(summary[line.status] ?? 0)}</span>
              </li>
            ))}
          </ul>
          <Field label={t("reason")} required error={fieldErrors.message("reason")}>
            <Textarea
              ref={reasonRef}
              id={FIELD_IDS.reason}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                fieldErrors.clear("reason")
              }}
              className="min-h-24"
            />
          </Field>
          <p className="mt-2 text-meta text-muted-foreground">{t("historyNote")}</p>
          {error ? <p className="mt-2 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{t("cancel")}</AccessibleDialogCancel>
          <Button type="submit" busy={isSubmitting}>
            {t("submit", { count: assetIds.length })}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
