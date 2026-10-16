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
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { formatCount } from "@/lib/display-format"

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
            <KeyValueList
              items={[
                { key: "processed", label: t("cancelImpactProcessed"), value: formatCount(impact.processedItems) },
                { key: "pending", label: t("cancelImpactPending"), value: formatCount(impact.pendingItems) },
                { key: "pendingFindings", label: t("cancelImpactPendingFindings"), value: formatCount(impact.pendingFindings) },
                { key: "approvedFindings", label: t("cancelImpactApprovedFindings"), value: formatCount(impact.approvedFindings) },
                { key: "openActions", label: t("cancelImpactOpenActions"), value: formatCount(impact.openActions) },
                { key: "scanHistory", label: t("cancelImpactScanHistory"), value: formatCount(impact.scanHistoryRows) },
              ]}
            />
            <Notice tone="warning">{t("cancelNoRollbackWarning")}</Notice>
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
