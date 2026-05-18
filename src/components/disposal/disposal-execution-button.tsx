"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type StatusOption = { id: string; label: string; name: string }
type EmployeeOption = { id: string; label: string }

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
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const disposedStatus = statuses.find((status) => status.name === "Disposed")
  const lostStatus = statuses.find((status) => status.name === "Lost")
  const defaultStatus = disposalType === "lost" ? lostStatus : disposedStatus
  const [values, setValues] = useState({
    executionDate: new Date().toISOString().slice(0, 10),
    executedById: "",
    nextStatusId: defaultStatus?.id ?? statuses[0]?.id ?? "",
    recipientName: "",
    documentNo: "",
    actualSaleValue: defaultActualSaleValue ?? "",
    actualSalvageValue: defaultActualSalvageValue ?? "",
    executionRemark: "",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
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
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Truck className="h-4 w-4" />
        {t("executeDisposal")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <section className="w-full max-w-2xl rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("executionTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{disposalNo}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent" aria-label={tCommon("close")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
              <Field label={t("executionDate")} required>
                <input type="date" value={values.executionDate} required onChange={(event) => setField("executionDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
              <SearchableSelect label={t("executedBy")} value={values.executedById} required options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("executedById", value)} />
              <Field label={t("nextStatus")} required>
                <select value={values.nextStatusId} required onChange={(event) => setField("nextStatusId", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("recipientName")}>
                <input value={values.recipientName} maxLength={200} onChange={(event) => setField("recipientName", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
              <Field label={t("documentNo")}>
                <input value={values.documentNo} maxLength={100} onChange={(event) => setField("documentNo", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
              <Field label={t("actualSaleValue")}>
                <input type="number" min="0" step="0.01" value={values.actualSaleValue} onChange={(event) => setField("actualSaleValue", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
              <Field label={t("actualSalvageValue")}>
                <input type="number" min="0" step="0.01" value={values.actualSalvageValue} onChange={(event) => setField("actualSalvageValue", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
              <div className="md:col-span-2">
                <Field label={t("executionRemark")}>
                  <textarea value={values.executionRemark} rows={4} maxLength={4000} onChange={(event) => setField("executionRemark", event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </Field>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent">{tCommon("cancel")}</button>
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("saveExecution")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
