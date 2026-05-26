"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Wrench } from "lucide-react"
import { toast } from "sonner"

export function MaintenancePlanGenerateButton({ planId }: { planId: string }) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)

  async function handleClick() {
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-plans/${planId}/generate-ticket`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      toast.success(t("pmGenerateTicketSuccess"))
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
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-8 sm:min-h-0"
    >
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
      {t("pmGenerateTicket")}
    </button>
  )
}
