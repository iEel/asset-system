"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, ClipboardCheck, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"

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
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const pendingDisposalStatus = statuses.find((status) => status.name === "Pending Disposal")
  const readyStatus = statuses.find((status) => status.name === "Ready")
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
        return { ...current, decision: value, nextStatusId: readyStatus?.id ?? current.nextStatusId }
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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
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
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-10 sm:min-h-0 sm:w-auto"
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
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const decisionRef = useRef<HTMLSelectElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const normalizedDisposalType = disposalType as DisposalType
  const showSaleValue = showsEstimatedSaleValue(normalizedDisposalType)
  const showSalvageValue = showsEstimatedSalvageValue(normalizedDisposalType)
  const rejectionReasonRequired = values.decision === "reject"

  useEffect(() => {
    restoreFocusRef.current = triggerRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const frame = window.requestAnimationFrame(() => decisionRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [triggerRef])

  function closeDialog() {
    if (!saving) onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.defaultPrevented) return
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }
    if (event.key !== "Tab") return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={onSubmit}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-border bg-surface shadow-lg sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-foreground">{t("decisionTitle")}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{disposalNo}</p>
          </div>
          <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-8 sm:w-8" aria-label={tCommon("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2">
          <Field label={t("decision")} required>
            <select ref={decisionRef} value={values.decision} required disabled={saving} onChange={(event) => onFieldChange("decision", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0">
              <option value="approve">{t("approve")}</option>
              <option value="reject">{t("reject")}</option>
            </select>
          </Field>
          <Field label={t("nextStatus")} required>
            <select value={values.nextStatusId} required disabled={saving || values.decision === "approve"} onChange={(event) => onFieldChange("nextStatusId", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0">
              {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
            {values.decision === "approve" ? <p className="mt-1 text-xs text-muted-foreground">{t("approveKeepsPendingDisposal")}</p> : null}
          </Field>
          {showSaleValue ? <Field label={t("saleValue")}>
            <input type="number" min="0" step="0.01" value={values.saleValue} disabled={saving} onChange={(event) => onFieldChange("saleValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" />
          </Field> : null}
          {showSalvageValue ? <Field label={t("salvageValue")}>
            <input type="number" min="0" step="0.01" value={values.salvageValue} disabled={saving} onChange={(event) => onFieldChange("salvageValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" />
          </Field> : null}
          <div className="md:col-span-2">
            <Field label={t("approvalRemark")} required={rejectionReasonRequired}>
              <textarea value={values.approvalRemark} rows={4} maxLength={4000} required={rejectionReasonRequired} disabled={saving} onChange={(event) => onFieldChange("approvalRemark", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              {rejectionReasonRequired ? <p className="mt-1 text-xs text-muted-foreground">{t("rejectionReasonRequired")}</p> : null}
            </Field>
          </div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving || (rejectionReasonRequired && !values.approvalRemark.trim())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("saveDecision")}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-danger">*</span>}</span>{children}</label>
}
