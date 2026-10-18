"use client"

import { useId, useImperativeHandle, useRef, useState, type FormEvent, type Ref, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Truck } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldHint } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  getDisposalExecutionFieldErrors,
  requiresDisposalExecutionRecipient,
  requiresDisposalExecutionRemark,
  showsActualSaleValue,
  showsActualSalvageValue,
  type DisposalType,
} from "@/lib/disposal-type-policy"
import { maxLength, minLength, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type StatusOption = { id: string; label: string; name: string }
type EmployeeOption = { id: string; label: string }
type ExecutionValues = {
  executionDate: string
  executedById: string
  nextStatusId: string
  recipientName: string
  documentNo: string
  actualSaleValue: string
  actualSalvageValue: string
  executionRemark: string
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason: string
  evidenceExceptionAcknowledged: boolean
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  executionDate: "disposal-execution-date",
  executedById: "disposal-execution-executed-by",
  nextStatusId: "disposal-execution-next-status",
  recipientName: "disposal-execution-recipient",
  documentNo: "disposal-execution-document-no",
  actualSaleValue: "disposal-execution-sale-value",
  actualSalvageValue: "disposal-execution-salvage-value",
  executionRemark: "disposal-execution-remark",
  evidenceExceptionReason: "disposal-execution-exception-reason",
  evidenceExceptionAcknowledged: "disposal-execution-exception-acknowledged",
} as const
type ExecutionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as ExecutionField[]
type ExecutionFieldErrors = ReturnType<typeof useFieldErrors<ExecutionField>>

// The fields the dialog shows: the recipient and the actual values follow the request's type, the exception's reason and
// acknowledgement show while the exception is chosen. A hidden field is neither checked nor focused (v-track D-R4).
function shownFields(values: ExecutionValues, disposalType: DisposalType): ExecutionField[] {
  return FIELD_ORDER.filter((key) => {
    if (key === "recipientName") return requiresDisposalExecutionRecipient(disposalType)
    if (key === "actualSaleValue") return showsActualSaleValue(disposalType)
    if (key === "actualSalvageValue") return showsActualSalvageValue(disposalType)
    if (key === "evidenceExceptionReason" || key === "evidenceExceptionAcknowledged") return values.useHistoricalEvidenceException
    return true
  })
}

// noValidate turns the browser's check off, so this restates the controls' required, min, minLength and maxLength, with
// the server's own rules for the type (getDisposalExecutionFieldErrors, codes are their catalog keys) and the historical
// exception's reason and acknowledgement, which were a disabled save (v-track M-R2, D-R6, D-R7).
function validate(values: ExecutionValues, disposalType: DisposalType): Partial<Record<ExecutionField, string>> {
  const errors: Partial<Record<ExecutionField, string>> = {}
  const shown = shownFields(values, disposalType)
  const check = (key: ExecutionField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("executionDate", required(values.executionDate))
  check("executedById", required(values.executedById))
  check("nextStatusId", required(values.nextStatusId))
  check("recipientName", maxLength(values.recipientName, 200))
  check("documentNo", maxLength(values.documentNo, 100))
  check("actualSaleValue", range(values.actualSaleValue, 0))
  check("actualSalvageValue", range(values.actualSalvageValue, 0))
  check("executionRemark", maxLength(values.executionRemark, 4000))
  const policyInput = { ...values, disposalType, actualSaleValue: values.actualSaleValue.trim() === "" ? null : Number(values.actualSaleValue) }
  for (const error of getDisposalExecutionFieldErrors(policyInput)) check(error.field, getApiErrorKey(error.message))
  check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))
  check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))
  return errors
}

const evidencePolicyErrorCodes = new Set([
  "DISPOSAL_EVIDENCE_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
  "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE",
  "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED",
])

export type DisposalExecutionButtonHandle = { open: () => void }

// An owner (for example a row ⋯ menu) can render this with hideTrigger, open it through ref.current?.open() and pass
// its own button as returnFocusRef, so focus goes back there when the dialog closes.
export function DisposalExecutionButton({
  requestId,
  disposalNo,
  disposalType,
  statuses,
  employees,
  defaultActualSaleValue,
  defaultActualSalvageValue,
  effectiveEvidenceCount,
  canUseHistoricalEvidenceException = false,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  requestId: string
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  employees: EmployeeOption[]
  defaultActualSaleValue?: string
  defaultActualSalvageValue?: string
  effectiveEvidenceCount?: number
  canUseHistoricalEvidenceException?: boolean
  ref?: Ref<DisposalExecutionButtonHandle>
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
  const disposedStatus = statuses.find((status) => status.name === "Disposed")
  const defaultStatus = disposedStatus
  const [values, setValues] = useState<ExecutionValues>({
    executionDate: new Date().toISOString().slice(0, 10),
    executedById: "",
    nextStatusId: defaultStatus?.id ?? statuses[0]?.id ?? "",
    recipientName: "",
    documentNo: "",
    actualSaleValue: defaultActualSaleValue ?? "",
    actualSalvageValue: defaultActualSalvageValue ?? "",
    executionRemark: "",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: "",
    evidenceExceptionAcknowledged: false,
  })

  function resetHistoricalEvidenceException() {
    setValues((current) => ({
      ...current,
      useHistoricalEvidenceException: false,
      evidenceExceptionReason: "",
      evidenceExceptionAcknowledged: false,
    }))
  }

  const fieldErrors = useFieldErrors<ExecutionField>()
  const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })
  // A prerequisite, not a field (spec §4.4): no evidence and no exception. The dialog's evidence Notice says why.
  const evidenceBlocked = effectiveEvidenceCount === 0 && !values.useHistoricalEvidenceException

  function closeExecutionDialog() {
    resetHistoricalEvidenceException()
    fieldErrors.setErrors({})
    setOpen(false)
  }

  function setField(field: keyof ExecutionValues, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }))
    // The exception decides whether the document number is required and whether its own two fields show.
    if (field === "useHistoricalEvidenceException") fieldErrors.clear("documentNo", "evidenceExceptionReason", "evidenceExceptionAcknowledged")
    else if (field in FIELD_IDS) fieldErrors.clear(field as ExecutionField)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (evidenceBlocked) return
    fieldErrors.setErrors(validate(values, disposalType as DisposalType))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const exceptionPayload = {
        useHistoricalEvidenceException: values.useHistoricalEvidenceException,
        evidenceExceptionReason: values.useHistoricalEvidenceException ? values.evidenceExceptionReason : null,
        evidenceExceptionAcknowledged: values.useHistoricalEvidenceException && values.evidenceExceptionAcknowledged,
      }
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          disposalType,
          executionDate: values.executionDate,
          executedById: values.executedById,
          nextStatusId: values.nextStatusId,
          recipientName: values.recipientName || null,
          documentNo: values.documentNo || null,
          actualSaleValue: values.actualSaleValue || null,
          actualSalvageValue: values.actualSalvageValue || null,
          executionRemark: values.executionRemark || null,
          ...exceptionPayload,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field the dialog shows lands under it, the dialog still open (spec §4.1); the evidence
        // reason and acknowledgement name theirs (v-track D1), so only the evidence refusals about no field still close.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        const message = getDisposalApiErrorMessage(payload, t, tCommon("error"))
        if (payload?.code && evidencePolicyErrorCodes.has(payload.code)) {
          closeExecutionDialog()
          router.refresh()
        }
        throw new Error(message)
      }
      toast.success(t("executionSuccess"))
      closeExecutionDialog()
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
        <Button ref={triggerRef} onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Truck aria-hidden="true" />
          {t("executeDisposal")}
        </Button>
      )}
      {open ? <ExecutionDialog disposalNo={disposalNo} disposalType={disposalType} statuses={statuses} employees={employees} values={values} saving={saving} effectiveEvidenceCount={effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} evidenceBlocked={evidenceBlocked} fieldErrors={fieldErrors} triggerRef={returnFocusRef ?? triggerRef} onClose={closeExecutionDialog} onSubmit={handleSubmit} onFieldChange={setField} /> : null}
    </>
  )
}

function ExecutionDialog({
  disposalNo,
  disposalType,
  statuses,
  employees,
  values,
  saving,
  effectiveEvidenceCount,
  canUseHistoricalEvidenceException,
  evidenceBlocked,
  fieldErrors,
  triggerRef,
  onClose,
  onSubmit,
  onFieldChange,
}: {
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  employees: EmployeeOption[]
  values: ExecutionValues
  saving: boolean
  effectiveEvidenceCount?: number
  canUseHistoricalEvidenceException: boolean
  evidenceBlocked: boolean
  fieldErrors: ExecutionFieldErrors
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof ExecutionValues, value: string | boolean) => void
}) {
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const validationMessage = useValidationMessage()
  const evidenceExceptionReasonHelpId = useId()
  const historicalEvidenceWarningId = useId()
  const executionDateRef = useRef<HTMLInputElement | null>(null)
  const normalizedDisposalType = disposalType as DisposalType
  const recipientRequired = requiresDisposalExecutionRecipient(normalizedDisposalType)
  const remarkRequired = requiresDisposalExecutionRemark(normalizedDisposalType)
  const showSaleValue = showsActualSaleValue(normalizedDisposalType)
  const showSalvageValue = showsActualSalvageValue(normalizedDisposalType)

  function closeDialog() {
    if (!saving) onClose()
  }

  return (
    <AccessibleDialog
      open
      title={t("executionTitle")}
      description={<span className="tag">{disposalNo}</span>}
      busy={saving}
      size="md"
      initialFocusRef={executionDateRef}
      returnFocusRef={triggerRef}
      onClose={closeDialog}
    >
      <form onSubmit={onSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {effectiveEvidenceCount === 0 ? <Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">{t("errors.DISPOSAL_EVIDENCE_REQUIRED")}</Notice> : null}
          <Field label={t("executionDate")} id="disposal-execution-date" required error={fieldErrors.message("executionDate")}>
            <Input ref={executionDateRef} type="date" value={values.executionDate} required disabled={saving} onChange={(event) => onFieldChange("executionDate", event.target.value)} />
          </Field>
          <SearchableSelect
            id="disposal-execution-executed-by"
            label={t("executedBy")}
            value={values.executedById}
            required
            disabled={saving}
            options={employees}
            placeholder={t("selectEmployee")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("executedById")}
            onChange={(value) => onFieldChange("executedById", value)}
          />
          <Field label={t("nextStatus")} id="disposal-execution-next-status" required error={fieldErrors.message("nextStatusId")}>
            <NativeSelect value={values.nextStatusId} required disabled={saving} onChange={(event) => onFieldChange("nextStatusId", event.target.value)}>
              {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </NativeSelect>
          </Field>
          {recipientRequired ? (
            <Field label={t("recipientName")} id="disposal-execution-recipient" required error={fieldErrors.message("recipientName")}>
              <Input value={values.recipientName} maxLength={200} required disabled={saving} onChange={(event) => onFieldChange("recipientName", event.target.value)} />
            </Field>
          ) : null}
          <Field
            label={t("documentNo")}
            id="disposal-execution-document-no"
            required={!values.useHistoricalEvidenceException}
            error={fieldErrors.message("documentNo")}
          >
            <Input value={values.documentNo} maxLength={100} required={!values.useHistoricalEvidenceException} disabled={saving} onChange={(event) => onFieldChange("documentNo", event.target.value)} />
          </Field>
          {showSaleValue ? (
            <Field
              label={t("actualSaleValueBaht")}
              id="disposal-execution-sale-value"
              required
              error={fieldErrors.errors.actualSaleValue ? validationMessage(fieldErrors.errors.actualSaleValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.actualSaleValue} required disabled={saving} onChange={(event) => onFieldChange("actualSaleValue", event.target.value)} />
            </Field>
          ) : null}
          {showSalvageValue ? (
            <Field
              label={t("actualSalvageValueBaht")}
              id="disposal-execution-salvage-value"
              error={fieldErrors.errors.actualSalvageValue ? validationMessage(fieldErrors.errors.actualSalvageValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.actualSalvageValue} disabled={saving} onChange={(event) => onFieldChange("actualSalvageValue", event.target.value)} />
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <Field label={t("executionRemark")} id="disposal-execution-remark" required={remarkRequired} error={fieldErrors.message("executionRemark")}>
              <Textarea value={values.executionRemark} rows={4} maxLength={4000} required={remarkRequired} disabled={saving} onChange={(event) => onFieldChange("executionRemark", event.target.value)} className="min-h-28" />
            </Field>
          </div>
          {effectiveEvidenceCount === 0 && canUseHistoricalEvidenceException ? <div className="md:col-span-2"><label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground"><input type="checkbox" checked={values.useHistoricalEvidenceException} disabled={saving} aria-describedby={historicalEvidenceWarningId} onChange={(event) => onFieldChange("useHistoricalEvidenceException", event.target.checked)} className={checkboxVariants()} />{t("historicalEvidenceException")}</label><Notice tone="warning" id={historicalEvidenceWarningId} hidden={!values.useHistoricalEvidenceException} role="alert" className="mt-2">{t("historicalEvidenceWarning")}</Notice></div> : null}
          {values.useHistoricalEvidenceException ? (
            <>
              <div className="md:col-span-2">
                {/* The reason and the acknowledgement are errors on save (spec §4.4); both say the rule in the domain's words. */}
                <Field
                  label={t("historicalEvidenceReason")}
                  id="disposal-execution-exception-reason"
                  required
                  error={fieldErrors.errors.evidenceExceptionReason ? t("errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED") : undefined}
                >
                  <Textarea value={values.evidenceExceptionReason} rows={4} minLength={20} maxLength={2000} required disabled={saving} aria-describedby={evidenceExceptionReasonHelpId} onChange={(event) => onFieldChange("evidenceExceptionReason", event.target.value)} className="min-h-28" />
                </Field>
                <FieldHint id={evidenceExceptionReasonHelpId} className="mt-1.5">{t("historicalEvidenceReasonHelp", { count: values.evidenceExceptionReason.length, max: 2000 })}</FieldHint>
              </div>
              <div className="md:col-span-2">
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                  <input
                    id="disposal-execution-exception-acknowledged"
                    type="checkbox"
                    checked={values.evidenceExceptionAcknowledged}
                    required
                    disabled={saving}
                    aria-invalid={fieldErrors.errors.evidenceExceptionAcknowledged ? true : undefined}
                    aria-describedby={fieldErrors.errors.evidenceExceptionAcknowledged ? "disposal-execution-exception-acknowledged-error" : undefined}
                    onChange={(event) => onFieldChange("evidenceExceptionAcknowledged", event.target.checked)}
                    className={checkboxVariants()}
                  />
                  {t("historicalEvidenceAcknowledgement")}
                </label>
                {fieldErrors.errors.evidenceExceptionAcknowledged ? (
                  <FieldError id="disposal-execution-exception-acknowledged-error" className="mt-1.5">{t("errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")}</FieldError>
                ) : null}
              </div>
            </>
          ) : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button
            type="submit"
            busy={saving}
            aria-disabled={evidenceBlocked || undefined}
            aria-describedby={evidenceBlocked ? "disposal-execution-evidence-reason" : undefined}
          >
            <CheckCircle2 aria-hidden="true" />
            {values.useHistoricalEvidenceException ? t("confirmHistoricalEvidenceException") : t("saveExecution")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
