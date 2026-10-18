"use client"

import { useImperativeHandle, useRef, useState, type FormEvent, type Ref, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, ClipboardCheck } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import {
  getDisposalDecisionFieldErrors,
  showsEstimatedSaleValue,
  showsEstimatedSalvageValue,
  type DisposalType,
} from "@/lib/disposal-type-policy"
import { maxLength, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type StatusOption = { id: string; label: string; name: string }
type DisposalDecision = "approve" | "reject"
type DecisionValues = {
  decision: DisposalDecision
  nextStatusId: string
  saleValue: string
  salvageValue: string
  approvalRemark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  decision: "disposal-decision-decision",
  nextStatusId: "disposal-decision-next-status",
  saleValue: "disposal-decision-sale-value",
  salvageValue: "disposal-decision-salvage-value",
  approvalRemark: "disposal-decision-remark",
} as const
type DecisionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DecisionField[]
type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>

// The fields the dialog shows: the next status for an approval, the estimated values for the request's type. A hidden
// field is neither checked nor focused, so a refusal about one falls through to the toast (v-track D-R4).
function shownFields(values: DecisionValues, disposalType: DisposalType): DecisionField[] {
  return FIELD_ORDER.filter((key) => {
    if (key === "nextStatusId") return values.decision === "approve"
    if (key === "saleValue") return showsEstimatedSaleValue(disposalType)
    if (key === "salvageValue") return showsEstimatedSalvageValue(disposalType)
    return true
  })
}

// noValidate turns the browser's check off, so this restates the controls' required, min and maxLength; a rejection's
// reason comes from the server's own rule, getDisposalDecisionFieldErrors, whose code is its catalog key, and is no
// longer a disabled save (v-track M-R2, D-R6).
function validate(values: DecisionValues, disposalType: DisposalType): Partial<Record<DecisionField, string>> {
  const errors: Partial<Record<DecisionField, string>> = {}
  const shown = shownFields(values, disposalType)
  const check = (key: DecisionField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("decision", required(values.decision))
  check("nextStatusId", required(values.nextStatusId))
  check("saleValue", range(values.saleValue, 0))
  check("salvageValue", range(values.salvageValue, 0))
  check("approvalRemark", maxLength(values.approvalRemark, 4000))
  for (const error of getDisposalDecisionFieldErrors(values)) check(error.field, getApiErrorKey(error.message))
  return errors
}

export type DisposalDecisionButtonHandle = { open: () => void }

// An owner (for example a row ⋯ menu) can render this with hideTrigger, open it through ref.current?.open() and pass
// its own button as returnFocusRef, so focus goes back there when the dialog closes.
export function DisposalDecisionButton({
  requestId,
  disposalNo,
  disposalType,
  statuses,
  defaultSaleValue,
  defaultSalvageValue,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  requestId: string
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  defaultSaleValue?: string
  defaultSalvageValue?: string
  ref?: Ref<DisposalDecisionButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))
  const pendingDisposalStatus = statuses.find((status) => status.name === "Pending Disposal")
  const defaultStatus = pendingDisposalStatus
  const [values, setValues] = useState<DecisionValues>({
    decision: "approve",
    nextStatusId: defaultStatus?.id ?? statuses[0]?.id ?? "",
    saleValue: defaultSaleValue ?? "",
    salvageValue: defaultSalvageValue ?? "",
    approvalRemark: "",
  })

  const fieldErrors = useFieldErrors<DecisionField>()
  const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })

  function setField(field: keyof DecisionValues, value: string) {
    setValues((current) => {
      if (field === "decision" && value === "reject") {
        return { ...current, decision: value }
      }
      if (field === "decision" && value === "approve") {
        return { ...current, decision: value, nextStatusId: defaultStatus?.id ?? current.nextStatusId }
      }
      return { ...current, [field]: value }
    })
    // The decision sets which status is shown and whether the reason is required: it clears them with itself.
    if (field === "decision") fieldErrors.clear("decision", "nextStatusId", "approvalRemark")
    else fieldErrors.clear(field)
  }

  function closeDialog() {
    fieldErrors.setErrors({})
    setOpen(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, disposalType as DisposalType))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: values.decision,
          nextStatusId: values.nextStatusId,
          saleValue: values.saleValue || null,
          salvageValue: values.salvageValue || null,
          approvalRemark: values.approvalRemark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field the dialog shows lands under it, the dialog still open; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }
      toast.success(t("decisionSuccess"))
      setOpen(false)
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
        <Button ref={triggerRef} variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <ClipboardCheck aria-hidden="true" />
          {t("reviewRequest")}
        </Button>
      )}

      {open ? (
        <DecisionDialog
          disposalNo={disposalNo}
          disposalType={disposalType}
          statuses={statuses}
          values={values}
          saving={saving}
          triggerRef={returnFocusRef ?? triggerRef}
          fieldErrors={fieldErrors}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          onFieldChange={setField}
        />
      ) : null}
    </>
  )
}

function DecisionDialog({
  disposalNo,
  disposalType,
  statuses,
  values,
  saving,
  triggerRef,
  fieldErrors,
  onClose,
  onSubmit,
  onFieldChange,
}: {
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  values: DecisionValues
  saving: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  fieldErrors: DecisionFieldErrors
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof DecisionValues, value: string) => void
}) {
  const t = useTranslations("disposalPage")
  const validationMessage = useValidationMessage()
  const decisionRef = useRef<HTMLSelectElement | null>(null)
  const normalizedDisposalType = disposalType as DisposalType
  const showSaleValue = showsEstimatedSaleValue(normalizedDisposalType)
  const showSalvageValue = showsEstimatedSalvageValue(normalizedDisposalType)
  const rejectionReasonRequired = values.decision === "reject"

  function closeDialog() {
    if (!saving) onClose()
  }

  return (
    <AccessibleDialog
      open
      title={t("decisionTitle")}
      description={<span className="tag">{disposalNo}</span>}
      busy={saving}
      size="md"
      initialFocusRef={decisionRef}
      returnFocusRef={triggerRef}
      onClose={closeDialog}
    >
      <form onSubmit={onSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("decision")} id="disposal-decision-decision" required error={fieldErrors.message("decision")}>
            <NativeSelect ref={decisionRef} value={values.decision} required disabled={saving} onChange={(event) => onFieldChange("decision", event.target.value)}>
              <option value="approve">{t("approve")}</option>
              <option value="reject">{t("reject")}</option>
            </NativeSelect>
          </Field>
          {values.decision === "approve" ? (
            <Field
              label={t("nextStatus")}
              id="disposal-decision-next-status"
              required
              hint={t("approveKeepsPendingDisposal")}
              error={fieldErrors.message("nextStatusId")}
            >
              <NativeSelect value={values.nextStatusId} required disabled={saving || values.decision === "approve"} onChange={(event) => onFieldChange("nextStatusId", event.target.value)}>
                {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </NativeSelect>
            </Field>
          ) : (
            <Notice tone="neutral">{t("rejectRestoresPreviousStatus")}</Notice>
          )}
          {showSaleValue ? (
            <Field
              label={t("saleValueBaht")}
              id="disposal-decision-sale-value"
              error={fieldErrors.errors.saleValue ? validationMessage(fieldErrors.errors.saleValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.saleValue} disabled={saving} onChange={(event) => onFieldChange("saleValue", event.target.value)} />
            </Field>
          ) : null}
          {showSalvageValue ? (
            <Field
              label={t("salvageValueBaht")}
              id="disposal-decision-salvage-value"
              error={fieldErrors.errors.salvageValue ? validationMessage(fieldErrors.errors.salvageValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.salvageValue} disabled={saving} onChange={(event) => onFieldChange("salvageValue", event.target.value)} />
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <Field
              label={t("approvalRemark")}
              id="disposal-decision-remark"
              required={rejectionReasonRequired}
              hint={rejectionReasonRequired ? t("rejectionReasonRequired") : undefined}
              error={fieldErrors.message("approvalRemark")}
            >
              <Textarea value={values.approvalRemark} rows={4} maxLength={4000} required={rejectionReasonRequired} disabled={saving} onChange={(event) => onFieldChange("approvalRemark", event.target.value)} className="min-h-28" />
            </Field>
          </div>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button type="submit" busy={saving}>
            <CheckCircle2 aria-hidden="true" />
            {t("saveDecision")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
