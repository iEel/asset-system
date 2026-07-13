"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  requiresDisposalExecutionRecipient,
  requiresDisposalExecutionRemark,
  showsActualSaleValue,
  showsActualSalvageValue,
  type DisposalType,
} from "@/lib/disposal-type-policy"

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
}

export function DisposalExecutionButton({
  requestId,
  disposalNo,
  disposalType,
  statuses,
  employees,
  defaultActualSaleValue,
  defaultActualSalvageValue,
}: {
  requestId: string
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  employees: EmployeeOption[]
  defaultActualSaleValue?: string
  defaultActualSalvageValue?: string
}) {
  const router = useRouter()
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
  })

  function setField(field: keyof ExecutionValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
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
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      toast.success(t("executionSuccess"))
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
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0 sm:w-auto">
        <Truck className="h-4 w-4" />
        {t("executeDisposal")}
      </button>
      {open ? <ExecutionDialog disposalNo={disposalNo} disposalType={disposalType} statuses={statuses} employees={employees} values={values} saving={saving} triggerRef={triggerRef} onClose={() => setOpen(false)} onSubmit={handleSubmit} onFieldChange={setField} /> : null}
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
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof ExecutionValues, value: string) => void
}) {
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const executionDateRef = useRef<HTMLInputElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const normalizedDisposalType = disposalType as DisposalType
  const recipientRequired = requiresDisposalExecutionRecipient(normalizedDisposalType)
  const remarkRequired = requiresDisposalExecutionRemark(normalizedDisposalType)
  const showSaleValue = showsActualSaleValue(normalizedDisposalType)
  const showSalvageValue = showsActualSalvageValue(normalizedDisposalType)

  useEffect(() => {
    restoreFocusRef.current = triggerRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const frame = window.requestAnimationFrame(() => executionDateRef.current?.focus())
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
      <form ref={dialogRef} onSubmit={onSubmit} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-border bg-surface shadow-lg sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h2 id={titleId} className="text-base font-semibold text-foreground">{t("executionTitle")}</h2><p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{disposalNo}</p></div>
          <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:h-8 sm:w-8" aria-label={tCommon("close")}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2">
          <Field label={t("executionDate")} required><input ref={executionDateRef} type="date" value={values.executionDate} required disabled={saving} onChange={(event) => onFieldChange("executionDate", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" /></Field>
          <SearchableSelect label={t("executedBy")} value={values.executedById} required disabled={saving} options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => onFieldChange("executedById", value)} />
          <Field label={t("nextStatus")} required><select value={values.nextStatusId} required disabled={saving} onChange={(event) => onFieldChange("nextStatusId", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0">{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></Field>
          {recipientRequired ? <Field label={t("recipientName")} required><input value={values.recipientName} maxLength={200} required disabled={saving} onChange={(event) => onFieldChange("recipientName", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" /></Field> : null}
          <Field label={t("documentNo")} required><input value={values.documentNo} maxLength={100} required disabled={saving} onChange={(event) => onFieldChange("documentNo", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" /></Field>
          {showSaleValue ? <Field label={t("actualSaleValue")} required><input type="number" min="0" step="0.01" value={values.actualSaleValue} required disabled={saving} onChange={(event) => onFieldChange("actualSaleValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" /></Field> : null}
          {showSalvageValue ? <Field label={t("actualSalvageValue")}><input type="number" min="0" step="0.01" value={values.actualSalvageValue} disabled={saving} onChange={(event) => onFieldChange("actualSalvageValue", event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0" /></Field> : null}
          <div className="md:col-span-2"><Field label={t("executionRemark")} required={remarkRequired}><textarea value={values.executionRemark} rows={4} maxLength={4000} required={remarkRequired} disabled={saving} onChange={(event) => onFieldChange("executionRemark", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></Field></div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            <button type="button" onClick={closeDialog} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{t("saveExecution")}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-danger">*</span>}</span>{children}</label>
}
