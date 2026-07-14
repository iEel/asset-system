"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"

type PlanAction = "pause" | "resume" | "end"

export function MaintenancePlanStateActions({ planId, state }: { planId: string; state: MaintenancePlanState }) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [pendingAction, setPendingAction] = useState<PlanAction | null>(null)
  const [saving, setSaving] = useState(false)
  const actions: PlanAction[] = state === "active" ? ["pause", "end"] : state === "paused" ? ["resume", "end"] : []

  async function submitAction() {
    if (!pendingAction) return
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pendingAction }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t(`pmActions.${pendingAction}Success`))
      setPendingAction(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  if (actions.length === 0) return null

  return (
    <>
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => setPendingAction(action)}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-8 ${action === "end" ? "border-danger/40 text-danger hover:bg-danger/10" : "border-border bg-surface text-foreground hover:bg-accent"}`}
        >
          {action === "pause" ? <Pause className="h-3.5 w-3.5" /> : action === "resume" ? <Play className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {t(`pmActions.${action}`)}
        </button>
      ))}
      <AccessibleDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? t(`pmActions.${pendingAction}Title`) : ""}
        description={pendingAction ? t(`pmActions.${pendingAction}Help`) : undefined}
        busy={saving}
        onClose={() => setPendingAction(null)}
      >
        <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => setPendingAction(null)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {tCommon("cancel")}
          </button>
          <button type="button" disabled={saving} onClick={submitAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{tCommon("confirm")}
          </button>
        </div>
      </AccessibleDialog>
    </>
  )
}
