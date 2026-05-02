"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AuditMarkNotFoundButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)

  async function handleClick() {
    const promptValue = window.prompt(t("notFoundRemark"))
    if (promptValue === null) return

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-items/${itemId}/mark-not-found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: promptValue.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("notFoundSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      title={t("markNotFound")}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
    </button>
  )
}
