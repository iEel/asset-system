"use client"

import { useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { toast } from "sonner"

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
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const titleId = useId()
  const descriptionId = useId()
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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={saving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        {t("cancelRound")}
      </button>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-lg border border-border bg-surface shadow-xl sm:rounded-lg"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-foreground">
                  {t("cancelDialogTitle")}
                </h2>
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                  {t("cancelDialogHelp")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label={tCommon("close")}
                title={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(92dvh-10rem)] space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <ImpactItem label={t("cancelImpactProcessed")} value={impact.processedItems} />
                <ImpactItem label={t("cancelImpactPending")} value={impact.pendingItems} />
                <ImpactItem label={t("cancelImpactPendingFindings")} value={impact.pendingFindings} />
                <ImpactItem label={t("cancelImpactApprovedFindings")} value={impact.approvedFindings} />
                <ImpactItem label={t("cancelImpactOpenActions")} value={impact.openActions} />
                <ImpactItem label={t("cancelImpactScanHistory")} value={impact.scanHistoryRows} />
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                {t("cancelNoRollbackWarning")}
              </div>
              <div>
                <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
                  {t("cancelReason")}
                </label>
                <textarea
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={saving}
                  rows={4}
                  required
                  placeholder={t("cancelReasonPlaceholder")}
                  className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {t("cancelConfirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
