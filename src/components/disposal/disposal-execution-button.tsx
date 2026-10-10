"use client"

import { useId, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Truck } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  requiresDisposalExecutionRecipient,
  requiresDisposalExecutionRemark,
  showsActualSaleValue,
  showsActualSalvageValue,
  type DisposalType,
} from "@/lib/disposal-type-policy"
import { useApiError } from "@/components/ui/use-api-error"

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

const evidencePolicyErrorCodes = new Set([
  "DISPOSAL_EVIDENCE_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
  "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED",
  "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE",
  "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED",
])

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
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
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

  function closeExecutionDialog() {
    resetHistoricalEvidenceException()
    setOpen(false)
  }

  function setField(field: keyof ExecutionValues, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        const message = getDisposalApiErrorMessage(payload, t, tCommon("error"))
        if (payload?.code && evidencePolicyErrorCodes.has(payload.code)) {
          resetHistoricalEvidenceException()
          setOpen(false)
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
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0 sm:w-auto">
        <Truck className="h-4 w-4" />
        {t("executeDisposal")}
      </button>
      {open ? <ExecutionDialog disposalNo={disposalNo} disposalType={disposalType} statuses={statuses} employees={employees} values={values} saving={saving} effectiveEvidenceCount={effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} triggerRef={triggerRef} onClose={closeExecutionDialog} onSubmit={handleSubmit} onFieldChange={setField} /> : null}
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
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof ExecutionValues, value: string | boolean) => void
}) {
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const evidenceExceptionReasonHelpId = useId()
  const historicalEvidenceWarningId = useId()
  const executionDateRef = useRef<HTMLInputElement | null>(null)
  const normalizedDisposalType = disposalType as DisposalType
  const recipientRequired = requiresDisposalExecutionRecipient(normalizedDisposalType)
  const remarkRequired = requiresDisposalExecutionRemark(normalizedDisposalType)
  const showSaleValue = showsActualSaleValue(normalizedDisposalType)
  const showSalvageValue = showsActualSalvageValue(normalizedDisposalType)
  const evidenceBlocked = effectiveEvidenceCount === 0 && !values.useHistoricalEvidenceException
  const historicalInputInvalid = values.useHistoricalEvidenceException && (
    values.evidenceExceptionReason.trim().length < 20 || !values.evidenceExceptionAcknowledged
  )
  const submitDisabled = saving || evidenceBlocked || historicalInputInvalid

  function closeDialog() {
    if (!saving) onClose()
  }

  return (
    <AccessibleDialog
      open
      title={t("executionTitle")}
      description={disposalNo}
      busy={saving}
      size="md"
      initialFocusRef={executionDateRef}
      returnFocusRef={triggerRef}
      onClose={closeDialog}
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2">
          {effectiveEvidenceCount === 0 ? <div role="alert" className="flex gap-3 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-foreground md:col-span-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" /><p>{t("errors.DISPOSAL_EVIDENCE_REQUIRED")}</p></div> : null}
          <Field label={t("executionDate")} required><input ref={executionDateRef} type="date" value={values.executionDate} required disabled={saving} onChange={(event) => onFieldChange("executionDate", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" /></Field>
          <SearchableSelect label={t("executedBy")} value={values.executedById} required disabled={saving} options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => onFieldChange("executedById", value)} />
          <Field label={t("nextStatus")} required><select value={values.nextStatusId} required disabled={saving} onChange={(event) => onFieldChange("nextStatusId", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0">{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></Field>
          {recipientRequired ? <Field label={t("recipientName")} required><input value={values.recipientName} maxLength={200} required disabled={saving} onChange={(event) => onFieldChange("recipientName", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" /></Field> : null}
          <Field label={t("documentNo")} required={!values.useHistoricalEvidenceException}><input value={values.documentNo} maxLength={100} required={!values.useHistoricalEvidenceException} disabled={saving} onChange={(event) => onFieldChange("documentNo", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" /></Field>
          {showSaleValue ? <Field label={t("actualSaleValue")} required><input type="number" min="0" step="0.01" value={values.actualSaleValue} required disabled={saving} onChange={(event) => onFieldChange("actualSaleValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" /></Field> : null}
          {showSalvageValue ? <Field label={t("actualSalvageValue")}><input type="number" min="0" step="0.01" value={values.actualSalvageValue} disabled={saving} onChange={(event) => onFieldChange("actualSalvageValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" /></Field> : null}
          <div className="md:col-span-2"><Field label={t("executionRemark")} required={remarkRequired}><textarea value={values.executionRemark} rows={4} maxLength={4000} required={remarkRequired} disabled={saving} onChange={(event) => onFieldChange("executionRemark", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" /></Field></div>
          {effectiveEvidenceCount === 0 && canUseHistoricalEvidenceException ? <div className="md:col-span-2"><label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground"><input type="checkbox" checked={values.useHistoricalEvidenceException} disabled={saving} aria-describedby={historicalEvidenceWarningId} onChange={(event) => onFieldChange("useHistoricalEvidenceException", event.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-ring" />{t("historicalEvidenceException")}</label><div id={historicalEvidenceWarningId} hidden={!values.useHistoricalEvidenceException} role="alert" className="mt-2 flex gap-3 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-foreground"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" /><p>{t("historicalEvidenceWarning")}</p></div></div> : null}
          {values.useHistoricalEvidenceException ? <><div className="md:col-span-2"><Field label={t("historicalEvidenceReason")} required><textarea value={values.evidenceExceptionReason} rows={4} minLength={20} maxLength={2000} required disabled={saving} aria-describedby={evidenceExceptionReasonHelpId} onChange={(event) => onFieldChange("evidenceExceptionReason", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" /><p id={evidenceExceptionReasonHelpId} className="mt-1 text-xs text-muted-foreground">{t("historicalEvidenceReasonHelp", { count: values.evidenceExceptionReason.length, max: 2000 })}</p></Field></div><div className="md:col-span-2"><label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground"><input type="checkbox" checked={values.evidenceExceptionAcknowledged} required disabled={saving} onChange={(event) => onFieldChange("evidenceExceptionAcknowledged", event.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-ring" />{t("historicalEvidenceAcknowledgement")}</label></div></> : null}
          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0">{tCommon("cancel")}</button>
            <button type="submit" disabled={submitDisabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 sm:h-10 sm:min-h-0">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{values.useHistoricalEvidenceException ? t("confirmHistoricalEvidenceException") : t("saveExecution")}</button>
          </div>
        </div>
      </form>
    </AccessibleDialog>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-danger">*</span>}</span>{children}</label>
}
