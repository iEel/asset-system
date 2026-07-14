"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CalendarClock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { toLocalDateInputValue } from "@/lib/local-date"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { createMaintenancePlanningDraft, reconcileMaintenancePlanningDraft } from "@/lib/maintenance-planning-draft"

export function MaintenanceTicketPlanningButton({
  ticketId,
  repairNo,
  currentStatus,
  initialAssignedToId,
  initialDueDate,
  expectedUpdatedAt,
  open: controlledOpen,
  hideTrigger = false,
  onOpenChange,
}: {
  ticketId: string
  repairNo: string
  currentStatus: string
  initialAssignedToId?: string | null
  initialDueDate?: Date | string | null
  expectedUpdatedAt: Date | string
  open?: boolean
  hideTrigger?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const initialDueDateValue = initialDueDate ? toLocalDateInputValue(new Date(initialDueDate)) : ""
  const initialDraft = createMaintenancePlanningDraft(initialAssignedToId, initialDueDateValue)
  const [internalOpen, setInternalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => initialDraft)
  const open = controlledOpen ?? internalOpen
  const values = reconcileMaintenancePlanningDraft(draft, initialDraft, open)
  const changed = values.assignedToId !== initialDraft.assignedToId || values.dueDate !== initialDraft.dueDate

  function setOpen(next: boolean) {
    setDraft(initialDraft)
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed) return
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "planning",
          expectedUpdatedAt,
          assignedToId: values.assignedToId || null,
          dueDate: values.dueDate || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t("planningUpdateSuccess"))
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
          <CalendarClock className="h-3.5 w-3.5" />{t("editPlanning")}
        </button>
      ) : null}
      <AccessibleDialog open={open} title={t("editPlanningTitle")} description={repairNo} busy={saving} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="text-xs font-medium text-muted-foreground">{t("currentRepairStatus")}</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{t(`statuses.${currentStatus}`)}</p>
          </div>
          <MaintenanceOptionSelect type="employee" label={t("assignedTo")} value={values.assignedToId} placeholder={t("unassigned")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(assignedToId) => setDraft((current) => ({ ...current, assignedToId }))} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{t("dueDate")}</span>
            <input type="date" value={values.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving || !changed} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}{tCommon("save")}</button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  )
}
