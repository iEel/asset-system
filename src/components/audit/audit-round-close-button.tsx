"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

// The close action of the round page's next-step card, shown at step 3 (group 2 spec §8, §13 bug 2): the card writes
// the four conditions the close API checks, this button asks first, then PATCHes { action: "close" } and refreshes.
export function AuditRoundCloseButton({ roundId, disabled }: { roundId: string; disabled: boolean }) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [saving, setSaving] = useState(false)

  async function closeRound() {
    if (!(await confirm({ title: t("closeConfirm"), confirmLabel: t("closeRound") }))) return
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button onClick={closeRound} busy={saving} disabled={disabled}>
      <Lock aria-hidden="true" />
      {t("closeRound")}
    </Button>
  )
}
