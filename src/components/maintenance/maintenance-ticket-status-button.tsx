"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { getMaintenanceStatusUpdateTargets, type MaintenanceStatus } from "@/lib/maintenance-policy"

export function MaintenanceTicketStatusButton({
  ticketId,
  repairNo,
  currentStatus,
  expectedUpdatedAt,
  isPreventive,
  open: controlledOpen,
  hideTrigger = false,
  onOpenChange,
}: {
  ticketId: string
  repairNo: string
  currentStatus: string
  expectedUpdatedAt: Date | string
  isPreventive: boolean
  open?: boolean
  hideTrigger?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [internalOpen, setInternalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({ repairStatus: "", remark: "" })
  const open = controlledOpen ?? internalOpen
  const targets = getMaintenanceStatusUpdateTargets(currentStatus)
  const waitingForExternalInput = values.repairStatus === "waiting_parts" || values.repairStatus === "waiting_vendor"
  const remarkMissing = waitingForExternalInput && !values.remark.trim()

  function setOpen(next: boolean) {
    if (!next) setValues({ repairStatus: "", remark: "" })
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.repairStatus || remarkMissing) return
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          expectedUpdatedAt,
          repairStatus: values.repairStatus,
          remark: values.remark.trim() || null,
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
        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="text-xs font-medium text-muted-foreground">{t("currentRepairStatus")}</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{t(`statuses.${currentStatus}`)}</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">{t("changeStatusTo")}</legend>
            {targets.map((status) => (
              <label key={status} className="flex min-h-11 cursor-pointer gap-3 rounded-md border border-border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  type="radio"
                  name="repairStatus"
                  value={status}
                  checked={values.repairStatus === status}
                  onChange={() => setValues((current) => ({ ...current, repairStatus: status }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{t(`statuses.${status}`)}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{getConsequence(status, isPreventive, t)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              {t("statusRemark")}{waitingForExternalInput ? <span className="ml-1 text-danger">*</span> : null}
            </span>
            <textarea
              value={values.remark}
              rows={3}
              maxLength={500}
              required={waitingForExternalInput}
              aria-describedby={waitingForExternalInput ? "maintenance-waiting-remark-help" : undefined}
              onChange={(event) => setValues((current) => ({ ...current, remark: event.target.value }))}
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {waitingForExternalInput ? <span id="maintenance-waiting-remark-help" className="mt-1.5 block text-xs text-muted-foreground">{t("waitingRemarkHelp")}</span> : null}
          </label>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{tCommon("cancel")}</button>
            <button type="submit" disabled={saving || !values.repairStatus || remarkMissing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t("updateStatus")}</button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  )
}

function getConsequence(status: MaintenanceStatus, isPreventive: boolean, t: (key: string) => string) {
  if (status === "in_progress") return t(`statusConsequences.${isPreventive ? "in_progress_pm" : "in_progress_corrective"}`)
  return t(`statusConsequences.${status}`)
}
