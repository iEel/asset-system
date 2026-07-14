"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"

type StatusOption = { id: string; label: string; name: string }

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
  expectedUpdatedAt,
  isPreventive,
  open: controlledOpen,
  hideTrigger = false,
  disabled = false,
  onOpenChange,
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
  expectedUpdatedAt: Date | string
  isPreventive: boolean
  open?: boolean
  hideTrigger?: boolean
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => onOpenChange ? onOpenChange(next) : setInternalOpen(next)
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
          expectedUpdatedAt,
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
          ...(!isPreventive ? { nextStatusId: values.nextStatusId } : {}),
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
      {!hideTrigger ? <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? t("closeChecklistEvidence") : undefined}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:min-h-0"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("closeTicket")}
      </button> : null}

      <AccessibleDialog open={open} title={t("closeTitle")} description={repairNo} busy={saving} onClose={() => setOpen(false)}>
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
              {!isPreventive ? <Field label={t("nextStatus")} required>
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
              </Field> : null}
              <MaintenanceOptionSelect
                type="employee"
                label={t("inspectedBy")}
                value={values.inspectedById}
                required
                placeholder={t("selectEmployee")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={t("loading")}
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
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10 sm:min-h-0"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("closeTicket")}
                </button>
              </div>
              </div>
            </form>
      </AccessibleDialog>
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
