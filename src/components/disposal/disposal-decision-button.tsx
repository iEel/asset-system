"use client"

import { useImperativeHandle, useRef, useState, type FormEvent, type Ref, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, CheckCircle2, ClipboardCheck, X } from "lucide-react"
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
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { getDisposalDecisionFieldErrors } from "@/lib/disposal-type-policy"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type DisposalDecision = "approve" | "reject"
type DecisionValues = {
  decision: DisposalDecision
  approvalRemark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  decision: "disposal-decision-decision",
  approvalRemark: "disposal-decision-remark",
} as const
type DecisionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DecisionField[]
type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>

// The fields the dialog shows: the decision select only when the trigger did not preset it (group 6 spec §9.2). A hidden
// field is neither checked nor focused, so a refusal about one falls through to the toast (v-track D-R4).
function shownFields(preset: boolean): DecisionField[] {
  return FIELD_ORDER.filter((key) => (key === "decision" ? !preset : true))
}

// noValidate turns the browser's check off, so this restates the controls' required and maxLength; a rejection's
// reason comes from the server's own rule, getDisposalDecisionFieldErrors, whose code is its catalog key, and is no
// longer a disabled save (v-track M-R2, D-R6).
function validate(values: DecisionValues, preset: boolean): Partial<Record<DecisionField, string>> {
  const errors: Partial<Record<DecisionField, string>> = {}
  const shown = shownFields(preset)
  const check = (key: DecisionField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("decision", required(values.decision))
  check("approvalRemark", maxLength(values.approvalRemark, 4000))
  for (const error of getDisposalDecisionFieldErrors(values)) check(error.field, getApiErrorKey(error.message))
  return errors
}

export type DisposalDecisionButtonHandle = { open: () => void }

// The decision dialog of a disposal request. The request page renders it twice, with initialDecision "approve" and
// "reject": the trigger reads อนุมัติ (primary) or ปฏิเสธ (danger outline) and the dialog has no decision select. Without
// initialDecision (a queue row) the trigger reads พิจารณาคำขอ and the dialog asks. No asset status and no price: the
// approval keeps รอตัดจำหน่าย and a rejection restores the status saved with the request (the user, 2026-11-04).
// An owner (for example a row ⋯ menu) can render this with hideTrigger, open it through ref.current?.open() and pass
// its own button as returnFocusRef, so focus goes back there when the dialog closes.
export function DisposalDecisionButton({
  requestId,
  disposalNo,
  initialDecision,
  triggerLabel,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  requestId: string
  disposalNo: string
  initialDecision?: "approve" | "reject"
  triggerLabel?: string
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
  const preset = initialDecision !== undefined
  const [values, setValues] = useState<DecisionValues>({
    decision: initialDecision ?? "approve",
    approvalRemark: "",
  })

  const fieldErrors = useFieldErrors<DecisionField>()
  const focusFirstError = () => fieldErrors.focusFirst(shownFields(preset), { idFor: (key) => FIELD_IDS[key] })

  function setField(field: keyof DecisionValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // The decision sets whether the reason is required: it clears that with itself.
    if (field === "decision") fieldErrors.clear("decision", "approvalRemark")
    else fieldErrors.clear(field)
  }

  function closeDialog() {
    fieldErrors.setErrors({})
    setOpen(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, preset))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: values.decision,
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

  // อนุมัติ is the primary button, ปฏิเสธ the danger outline, an open decision the outline พิจารณาคำขอ.
  const trigger =
    initialDecision === "approve"
      ? { variant: "default" as const, icon: <Check aria-hidden="true" />, label: t("approve") }
      : initialDecision === "reject"
        ? { variant: "danger" as const, icon: <X aria-hidden="true" />, label: t("reject") }
        : { variant: "outline" as const, icon: <ClipboardCheck aria-hidden="true" />, label: t("reviewRequest") }

  return (
    <>
      {hideTrigger ? null : (
        <Button ref={triggerRef} variant={trigger.variant} onClick={() => setOpen(true)} className="w-full sm:w-auto">
          {trigger.icon}
          {triggerLabel ?? trigger.label}
        </Button>
      )}

      {open ? (
        <DecisionDialog
          disposalNo={disposalNo}
          preset={preset}
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
  preset,
  values,
  saving,
  triggerRef,
  fieldErrors,
  onClose,
  onSubmit,
  onFieldChange,
}: {
  disposalNo: string
  preset: boolean
  values: DecisionValues
  saving: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  fieldErrors: DecisionFieldErrors
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof DecisionValues, value: string) => void
}) {
  const t = useTranslations("disposalPage")
  const decisionRef = useRef<HTMLSelectElement | null>(null)
  const remarkRef = useRef<HTMLTextAreaElement | null>(null)
  const rejectionReasonRequired = values.decision === "reject"

  function closeDialog() {
    if (!saving) onClose()
  }

  return (
    <AccessibleDialog
      open
      title={preset ? t(values.decision) : t("decisionTitle")}
      description={<span className="tag">{disposalNo}</span>}
      busy={saving}
      size="md"
      initialFocusRef={preset ? remarkRef : decisionRef}
      returnFocusRef={triggerRef}
      onClose={closeDialog}
    >
      <form onSubmit={onSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid grid-cols-1 gap-5">
          {preset ? null : (
            <Field label={t("decision")} id="disposal-decision-decision" required error={fieldErrors.message("decision")}>
              <NativeSelect ref={decisionRef} value={values.decision} required disabled={saving} onChange={(event) => onFieldChange("decision", event.target.value)}>
                <option value="approve">{t("approve")}</option>
                <option value="reject">{t("reject")}</option>
              </NativeSelect>
            </Field>
          )}
          {values.decision === "approve" ? (
            <Notice tone="neutral">{t("approveKeepsPendingDisposal")}</Notice>
          ) : (
            <Notice tone="neutral">{t("rejectRestoresPreviousStatus")}</Notice>
          )}
          <Field
            label={t("approvalRemark")}
            id="disposal-decision-remark"
            required={rejectionReasonRequired}
            hint={rejectionReasonRequired ? t("rejectionReasonRequired") : undefined}
            error={fieldErrors.message("approvalRemark")}
          >
            <Textarea ref={remarkRef} value={values.approvalRemark} rows={4} maxLength={4000} required={rejectionReasonRequired} disabled={saving} onChange={(event) => onFieldChange("approvalRemark", event.target.value)} className="min-h-28" />
          </Field>
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
