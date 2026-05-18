"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

type ChecklistItem = {
  label: string
  value: number
  ok: boolean
}

export function AuditRoundCloseButton({
  roundId,
  disabled,
  checklist,
}: {
  roundId: string
  disabled: boolean
  checklist: ChecklistItem[]
}) {
  const router = useRouter()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)

  async function closeRound() {
    if (!window.confirm(t("closeConfirm"))) return
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("closeSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("closeChecklist")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("closeChecklistHelp")}</p>
        </div>
        <button
          type="button"
          onClick={closeRound}
          disabled={disabled || saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {t("closeRound")}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {checklist.map((item) => (
          <div
            key={item.label}
            className={`rounded-md border px-3 py-3 ${
              item.ok ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.ok ? "text-success" : "text-warning"}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="mt-1 text-2xl font-bold">{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
