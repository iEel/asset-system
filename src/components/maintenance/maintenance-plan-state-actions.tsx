"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { useApiError } from "@/components/ui/use-api-error"

type PlanAction = "pause" | "resume" | "end"

export function MaintenancePlanStateActions({ planId, state }: { planId: string; state: MaintenancePlanState }) {
  const router = useRouter()
  const apiError = useApiError()
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  if (actions.length === 0) return null

  return (
    <>
      {actions.map((action) => (
        <Button key={action} variant={action === "end" ? "danger" : "outline"} size="sm" onClick={() => setPendingAction(action)}>
          {action === "pause" ? <Pause aria-hidden="true" /> : action === "resume" ? <Play aria-hidden="true" /> : <Square aria-hidden="true" />}
          {t(`pmActions.${action}`)}
        </Button>
      ))}
      <AccessibleDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? t(`pmActions.${pendingAction}Title`) : ""}
        description={pendingAction ? t(`pmActions.${pendingAction}Help`) : undefined}
        busy={saving}
        onClose={() => setPendingAction(null)}
      >
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button variant={pendingAction === "end" ? "destructive" : "default"} busy={saving} onClick={submitAction}>
            {pendingAction ? t(`pmActions.${pendingAction}`) : null}
          </Button>
        </AccessibleDialogFooter>
      </AccessibleDialog>
    </>
  )
}
