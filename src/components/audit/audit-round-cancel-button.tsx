"use client"

import { useImperativeHandle, useState, type FormEvent, type Ref, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { formatCount } from "@/lib/display-format"
import { maxLength, required } from "@/lib/validation-rules"

export type AuditRoundCancellationImpact = {
  pendingItems: number
  processedItems: number
  pendingFindings: number
  approvedFindings: number
  openActions: number
  scanHistoryRows: number
}

export type AuditRoundCancelButtonHandle = { open: () => void }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  reason: "audit-round-cancel-reason",
} as const
type CancelField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CancelField[]
// The reason's limit for its message: the textarea has no maxLength, so a long reason can be typed (v-track U-R7).
const FIELD_PARAMS = { reason: { max: 4000 } }

// noValidate turns the browser's check off, so this restates the control's required and the server's 4,000-character
// limit (auditRoundCancelSchema) (v-track M-R2, U-R7).
function validate(values: { reason: string }): Partial<Record<CancelField, string>> {
  const errors: Partial<Record<CancelField, string>> = {}
  const check = (key: CancelField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", required(values.reason) ?? maxLength(values.reason, 4000))
  return errors
}

// The round's cancel dialog (spec 2D M26). Its owner, the round page header's อื่น ๆ menu (group 2 spec §8), renders it
// outside the menu with hideTrigger, opens it through the handle and passes its trigger as returnFocusRef (R-m).
export function AuditRoundCancelButton({
  roundId,
  impact,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  roundId: string
  impact: AuditRoundCancellationImpact
  ref?: Ref<AuditRoundCancelButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<CancelField>({ params: FIELD_PARAMS })
  useImperativeHandle(ref, () => ({ open: () => setDialogOpen(true) }))
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // The next opening starts with no errors.
  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setReason("")
    fieldErrors.setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    const trimmedReason = reason.trim()

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: trimmedReason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("cancelSuccess"))
      setDialogOpen(false)
      setReason("")
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <Button variant="danger" busy={saving} onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <AlertTriangle aria-hidden="true" />
          {t("cancelRound")}
        </Button>
      )}

      <AccessibleDialog
        open={dialogOpen}
        title={t("cancelDialogTitle")}
        description={t("cancelDialogHelp")}
        busy={saving}
        size="sm"
        returnFocusRef={returnFocusRef}
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <KeyValueList
              items={[
                { key: "processed", label: t("cancelImpactProcessed"), value: formatCount(impact.processedItems) },
                { key: "pending", label: t("cancelImpactPending"), value: formatCount(impact.pendingItems) },
                { key: "pendingFindings", label: t("cancelImpactPendingFindings"), value: formatCount(impact.pendingFindings) },
                { key: "approvedFindings", label: t("cancelImpactApprovedFindings"), value: formatCount(impact.approvedFindings) },
                { key: "openActions", label: t("cancelImpactOpenActions"), value: formatCount(impact.openActions) },
                { key: "scanHistory", label: t("cancelImpactScanHistory"), value: formatCount(impact.scanHistoryRows) },
              ]}
            />
            <Notice tone="warning">{t("cancelNoRollbackWarning")}</Notice>
            {/* An empty reason keeps its own message, the one the toast showed before (spec §7.1). */}
            <Field
              label={t("cancelReason")}
              id="audit-round-cancel-reason"
              required
              error={fieldErrors.errors.reason === "required" ? t("cancelReasonRequired") : fieldErrors.message("reason")}
            >
              <Textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  fieldErrors.clear("reason")
                }}
                disabled={saving}
                rows={4}
                required
                placeholder={t("cancelReasonPlaceholder")}
                className="min-h-28"
              />
            </Field>
          </AccessibleDialogBody>

          <AccessibleDialogFooter>
            <AccessibleDialogCancel />
            <Button type="submit" variant="destructive" busy={saving}>
              <AlertTriangle aria-hidden="true" />
              {t("cancelConfirm")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </>
  )
}
