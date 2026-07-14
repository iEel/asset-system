"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"

export function MaintenanceTicketStatusButton({
  ticketId,
  repairNo,
  currentStatus,
  assignedToId,
  dueDate,
  expectedUpdatedAt,
  open: controlledOpen,
  hideTrigger = false,
  onOpenChange,
}: {
  ticketId: string
  repairNo: string
  currentStatus: string
  assignedToId?: string | null
  dueDate?: Date | string | null
  expectedUpdatedAt: Date | string
  open?: boolean
  hideTrigger?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [internalOpen, setInternalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => onOpenChange ? onOpenChange(next) : setInternalOpen(next)
  const [values, setValues] = useState({
    repairStatus: nextStatuses[currentStatus]?.[0] ?? currentStatus,
    assignedToId: assignedToId ?? "",
    dueDate: dueDate ? toLocalDateInputValue(new Date(dueDate)) : "",
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
          expectedUpdatedAt,
          repairStatus: values.repairStatus,
          assignedToId: values.assignedToId || null,
          dueDate: values.dueDate || null,
          remark: values.remark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
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
      {!hideTrigger ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:min-h-0">
          <RefreshCw className="h-3.5 w-3.5" />{t("updateStatus")}
        </button>
      ) : null}
      <AccessibleDialog open={open} title={t("updateStatusTitle")} description={repairNo} busy={saving} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="grid max-h-[calc(100vh-7rem)] grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 md:grid-cols-2">
          <Field label={tCommon("status")} required>
            <select value={values.repairStatus} required onChange={(event) => setField("repairStatus", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              {(nextStatuses[currentStatus] ?? []).map((status) => <option key={status} value={status}>{t(`statuses.${status}`)}</option>)}
            </select>
          </Field>
          <Field label={t("dueDate")}><input type="date" value={values.dueDate} onChange={(event) => setField("dueDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" /></Field>
          <div className="md:col-span-2">
            <MaintenanceOptionSelect type="employee" label={t("assignedTo")} value={values.assignedToId} placeholder={t("unassigned")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setField("assignedToId", value)} />
          </div>
          <div className="md:col-span-2"><Field label={t("statusRemark")}><textarea value={values.remark} rows={3} maxLength={500} onChange={(event) => setField("remark", event.target.value)} className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" /></Field></div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t("updateStatus")}</button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  )
}

const nextStatuses: Record<string, string[]> = {
  open: [], reported: ["accepted"], accepted: ["in_progress"],
  in_progress: ["waiting_parts", "waiting_vendor", "completed"],
  waiting_parts: ["in_progress", "completed"], waiting_vendor: ["in_progress", "completed"], completed: [],
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}{required ? <span className="ml-1 text-danger">*</span> : null}</span>{children}</label>
}
