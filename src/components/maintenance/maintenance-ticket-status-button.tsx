"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type EmployeeOption = { id: string; label: string }

export function MaintenanceTicketStatusButton({
  ticketId,
  repairNo,
  currentStatus,
  assignedToId,
  dueDate,
  employees,
}: {
  ticketId: string
  repairNo: string
  currentStatus: string
  assignedToId?: string | null
  dueDate?: Date | string | null
  employees: EmployeeOption[]
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    repairStatus: currentStatus === "open" ? "reported" : currentStatus,
    assignedToId: assignedToId ?? "",
    dueDate: dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "",
    remark: "",
  })

  function setField(field: string, value: string) {
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
          action: "status",
          repairStatus: values.repairStatus,
          assignedToId: values.assignedToId || null,
          dueDate: values.dueDate || null,
          remark: values.remark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("statusUpdateSuccess"))
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
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("updateStatus")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <section className="w-full max-w-xl rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("updateStatusTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{repairNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
                aria-label={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
              <Field label={tCommon("status")} required>
                <select
                  value={values.repairStatus}
                  required
                  onChange={(event) => setField("repairStatus", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {["reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"].map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("dueDate")}>
                <input
                  type="date"
                  value={values.dueDate}
                  onChange={(event) => setField("dueDate", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="md:col-span-2">
                <SearchableSelect
                  label={t("assignedTo")}
                  value={values.assignedToId}
                  options={employees}
                  placeholder={t("unassigned")}
                  searchPlaceholder={tCommon("searchSelectPlaceholder")}
                  emptyLabel={tCommon("searchSelectNoResults")}
                  onChange={(value) => setField("assignedToId", value)}
                />
              </div>
              <div className="md:col-span-2">
                <Field label={t("statusRemark")}>
                  <textarea
                    value={values.remark}
                    rows={3}
                    maxLength={500}
                    onChange={(event) => setField("remark", event.target.value)}
                    className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t("updateStatus")}
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
