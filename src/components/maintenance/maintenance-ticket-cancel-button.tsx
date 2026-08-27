"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"

export function MaintenanceTicketCancelButton({
  ticketId,
  repairNo,
  expectedUpdatedAt,
}: {
  ticketId: string
  repairNo: string
  expectedUpdatedAt: Date | string
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState("")

  function close() {
    setOpen(false)
    setReason("")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          expectedUpdatedAt,
          reason: reason.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t("cancelSuccess"))
      close()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-danger/40 bg-surface px-3 text-xs font-medium text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:min-h-0">
        <XCircle className="h-3.5 w-3.5" />{t("cancelAction")}
      </button>
      <AccessibleDialog open={open} title={t("cancelTitle")} description={repairNo} busy={saving} onClose={close}>
        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-5">
          <p className="text-sm leading-6 text-muted-foreground">{t("cancelHelp")}</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{t("cancelReason")}<span className="ml-1 text-danger">*</span></span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1000} required className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={close} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">{tCommon("back")}</button>
            <button type="submit" disabled={saving || !reason.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-medium text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{t("cancelAction")}</button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  )
}
