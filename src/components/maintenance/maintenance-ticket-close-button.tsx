"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type StatusOption = { id: string; label: string; name: string }
type EmployeeOption = { id: string; label: string }

export function MaintenanceTicketCloseButton({
  ticketId,
  repairNo,
  statuses,
  defaultRepairCost,
  defaultLaborCost,
  defaultPartsCost,
  defaultQuotationNo,
  defaultInvoiceNo,
  defaultWarrantyClaim,
  employees,
}: {
  ticketId: string
  repairNo: string
  statuses: StatusOption[]
  defaultRepairCost?: string
  defaultLaborCost?: string
  defaultPartsCost?: string
  defaultQuotationNo?: string | null
  defaultInvoiceNo?: string | null
  defaultWarrantyClaim: boolean
  employees: EmployeeOption[]
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const readyStatus = statuses.find((status) => status.name === "Ready") ?? statuses[0]
  const [values, setValues] = useState({
    rootCause: "",
    resolution: "",
    returnDate: new Date().toISOString().slice(0, 10),
    laborCost: defaultLaborCost ?? "",
    partsCost: defaultPartsCost ?? "",
    repairCost: defaultRepairCost ?? "",
    quotationNo: defaultQuotationNo ?? "",
    invoiceNo: defaultInvoiceNo ?? "",
    warrantyClaim: defaultWarrantyClaim,
    inspectedById: "",
    nextStatusId: readyStatus?.id ?? "",
  })

  function setField(field: string, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootCause: values.rootCause,
          resolution: values.resolution,
          returnDate: values.returnDate,
          laborCost: values.laborCost || null,
          partsCost: values.partsCost || null,
          repairCost: values.repairCost || null,
          quotationNo: values.quotationNo || null,
          invoiceNo: values.invoiceNo || null,
          warrantyClaim: values.warrantyClaim,
          inspectedById: values.inspectedById,
          nextStatusId: values.nextStatusId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("closeSuccess"))
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
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("closeTicket")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
          <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("closeTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{repairNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                aria-label={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[calc(100vh-7rem)] overflow-y-auto p-4 sm:p-5">
              <div className="mb-5 rounded-md border border-warning/30 bg-warning/5 p-3">
                <h3 className="text-sm font-semibold text-foreground">{t("closeChecklistTitle")}</h3>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>{t("closeChecklistRootCause")}</li>
                  <li>{t("closeChecklistResolution")}</li>
                  <li>{t("closeChecklistEvidence")}</li>
                  <li>{t("closeChecklistInspector")}</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t("returnDate")} required>
                <input
                  type="date"
                  value={values.returnDate}
                  required
                  onChange={(event) => setField("returnDate", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("nextStatus")} required>
                <select
                  value={values.nextStatusId}
                  required
                  onChange={(event) => setField("nextStatusId", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
              <SearchableSelect
                label={t("inspectedBy")}
                value={values.inspectedById}
                required
                options={employees}
                placeholder={t("selectEmployee")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                onChange={(value) => setField("inspectedById", value)}
              />
              <Field label={t("laborCost")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.laborCost}
                  onChange={(event) => setField("laborCost", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("partsCost")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.partsCost}
                  onChange={(event) => setField("partsCost", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("repairCost")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.repairCost}
                  onChange={(event) => setField("repairCost", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("quotationNo")}>
                <input
                  value={values.quotationNo}
                  maxLength={100}
                  onChange={(event) => setField("quotationNo", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("invoiceNo")}>
                <input
                  value={values.invoiceNo}
                  maxLength={100}
                  onChange={(event) => setField("invoiceNo", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={values.warrantyClaim}
                  onChange={(event) => setField("warrantyClaim", event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {t("warrantyClaim")}
              </label>
              <div className="md:col-span-2">
                <Field label={t("rootCause")} required>
                  <textarea
                    value={values.rootCause}
                    required
                    rows={3}
                    maxLength={4000}
                    onChange={(event) => setField("rootCause", event.target.value)}
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label={t("resolution")} required>
                  <textarea
                    value={values.resolution}
                    required
                    rows={3}
                    maxLength={4000}
                    onChange={(event) => setField("resolution", event.target.value)}
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("closeTicket")}
                </button>
              </div>
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
