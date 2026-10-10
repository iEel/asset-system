"use client"

import { useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"
import { useApiError } from "@/components/ui/use-api-error"

type StatusOption = { id: string; label: string; name: string }
type DisposalDecision = "approve" | "reject"
type DecisionValues = {
  decision: DisposalDecision
  nextStatusId: string
  saleValue: string
  salvageValue: string
  approvalRemark: string
}

export function DisposalDecisionButton({
  requestId,
  disposalNo,
  disposalType,
  statuses,
  defaultSaleValue,
  defaultSalvageValue,
}: {
  requestId: string
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  defaultSaleValue?: string
  defaultSalvageValue?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const pendingDisposalStatus = statuses.find((status) => status.name === "Pending Disposal")
  const defaultStatus = pendingDisposalStatus
  const [values, setValues] = useState<DecisionValues>({
    decision: "approve",
    nextStatusId: defaultStatus?.id ?? statuses[0]?.id ?? "",
    saleValue: defaultSaleValue ?? "",
    salvageValue: defaultSalvageValue ?? "",
    approvalRemark: "",
  })

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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10 sm:min-h-0 sm:w-auto"
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        {t("reviewRequest")}
      </button>

      {open ? (
        <DecisionDialog
          disposalNo={disposalNo}
          disposalType={disposalType}
          statuses={statuses}
          values={values}
          saving={saving}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
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
  onClose,
  onSubmit,
  onFieldChange,
}: {
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  values: DecisionValues
  saving: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof DecisionValues, value: string) => void
}) {
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
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
      description={disposalNo}
      busy={saving}
      size="md"
      initialFocusRef={decisionRef}
      returnFocusRef={triggerRef}
      onClose={closeDialog}
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2">
          <Field label={t("decision")} required>
            <select ref={decisionRef} value={values.decision} required disabled={saving} onChange={(event) => onFieldChange("decision", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0">
              <option value="approve">{t("approve")}</option>
              <option value="reject">{t("reject")}</option>
            </select>
          </Field>
          {values.decision === "approve" ? <Field label={t("nextStatus")} required>
            <select value={values.nextStatusId} required disabled={saving || values.decision === "approve"} onChange={(event) => onFieldChange("nextStatusId", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0">
              {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{t("approveKeepsPendingDisposal")}</p>
          </Field> : (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {t("rejectRestoresPreviousStatus")}
            </div>
          )}
          {showSaleValue ? <Field label={t("saleValue")}>
            <input type="number" min="0" step="0.01" value={values.saleValue} disabled={saving} onChange={(event) => onFieldChange("saleValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" />
          </Field> : null}
          {showSalvageValue ? <Field label={t("salvageValue")}>
            <input type="number" min="0" step="0.01" value={values.salvageValue} disabled={saving} onChange={(event) => onFieldChange("salvageValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:h-10 sm:min-h-0" />
          </Field> : null}
          <div className="md:col-span-2">
            <Field label={t("approvalRemark")} required={rejectionReasonRequired}>
              <textarea value={values.approvalRemark} rows={4} maxLength={4000} required={rejectionReasonRequired} disabled={saving} onChange={(event) => onFieldChange("approvalRemark", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
              {rejectionReasonRequired ? <p className="mt-1 text-xs text-muted-foreground">{t("rejectionReasonRequired")}</p> : null}
            </Field>
          </div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving || (rejectionReasonRequired && !values.approvalRemark.trim())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 sm:h-10 sm:min-h-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("saveDecision")}
            </button>
          </div>
        </div>
      </form>
    </AccessibleDialog>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-danger">*</span>}</span>{children}</label>
}
