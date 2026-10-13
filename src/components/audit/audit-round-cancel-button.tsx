"use client"

import { useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type AuditRoundCancellationImpact = {
  pendingItems: number
  processedItems: number
  pendingFindings: number
  approvedFindings: number
  openActions: number
  scanHistoryRows: number
}

export function AuditRoundCancelButton({ roundId, impact }: { roundId: string; impact: AuditRoundCancellationImpact }) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const reasonId = useId()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setReason("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      toast.error(t("cancelReasonRequired"))
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: trimmedReason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("cancelSuccess"))
      setDialogOpen(false)
      setReason("")
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="danger" busy={saving} onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
        <AlertTriangle aria-hidden="true" />
        {t("cancelRound")}
      </Button>

      <AccessibleDialog
        open={dialogOpen}
        title={t("cancelDialogTitle")}
        description={t("cancelDialogHelp")}
        busy={saving}
        size="sm"
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <ImpactItem label={t("cancelImpactProcessed")} value={impact.processedItems} />
              <ImpactItem label={t("cancelImpactPending")} value={impact.pendingItems} />
              <ImpactItem label={t("cancelImpactPendingFindings")} value={impact.pendingFindings} />
              <ImpactItem label={t("cancelImpactApprovedFindings")} value={impact.approvedFindings} />
              <ImpactItem label={t("cancelImpactOpenActions")} value={impact.openActions} />
              <ImpactItem label={t("cancelImpactScanHistory")} value={impact.scanHistoryRows} />
            </div>
            <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("cancelNoRollbackWarning")}
            </div>
            <Field label={t("cancelReason")} required>
              <Textarea
                id={reasonId}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={saving}
                rows={4}
                required
                placeholder={t("cancelReasonPlaceholder")}
                className="min-h-28"
              />
            </Field>
          </AccessibleDialogBody>

          <AccessibleDialogFooter>
            <AccessibleDialogCancel />
            <Button type="submit" variant="destructive" busy={saving}>
              <AlertTriangle aria-hidden="true" />
              {t("cancelConfirm")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </>
  )
}

function ImpactItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}
