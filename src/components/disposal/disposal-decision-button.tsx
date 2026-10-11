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
import { Textarea } from "@/components/ui/textarea"
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
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof DecisionValues, value: string) => void
}) {
  const t = useTranslations("disposalPage")
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
      <form onSubmit={onSubmit} className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("decision")} required>
            <NativeSelect ref={decisionRef} value={values.decision} required disabled={saving} onChange={(event) => onFieldChange("decision", event.target.value)}>
              <option value="approve">{t("approve")}</option>
              <option value="reject">{t("reject")}</option>
            </NativeSelect>
          </Field>
          {values.decision === "approve" ? (
            <Field label={t("nextStatus")} required hint={t("approveKeepsPendingDisposal")}>
              <NativeSelect value={values.nextStatusId} required disabled={saving || values.decision === "approve"} onChange={(event) => onFieldChange("nextStatusId", event.target.value)}>
                {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </NativeSelect>
            </Field>
          ) : (
            <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {t("rejectRestoresPreviousStatus")}
            </div>
          )}
          {showSaleValue ? (
            <Field label={t("saleValueBaht")}>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.saleValue} disabled={saving} onChange={(event) => onFieldChange("saleValue", event.target.value)} />
            </Field>
          ) : null}
          {showSalvageValue ? (
            <Field label={t("salvageValueBaht")}>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.salvageValue} disabled={saving} onChange={(event) => onFieldChange("salvageValue", event.target.value)} />
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <Field label={t("approvalRemark")} required={rejectionReasonRequired} hint={rejectionReasonRequired ? t("rejectionReasonRequired") : undefined}>
              <Textarea value={values.approvalRemark} rows={4} maxLength={4000} required={rejectionReasonRequired} disabled={saving} onChange={(event) => onFieldChange("approvalRemark", event.target.value)} className="min-h-28" />
            </Field>
          </div>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button type="submit" busy={saving} disabled={rejectionReasonRequired && !values.approvalRemark.trim()}>
            <CheckCircle2 aria-hidden="true" />
            {t("saveDecision")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
