"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { useApiError } from "@/components/ui/use-api-error"
import { formatCount } from "@/lib/display-format"

type ChecklistItem = {
  label: string
  value: number
  ok: boolean
  // The drill-down of a count; an item without one is a rule.
  href?: string
  actionLabel?: string
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

  // Items with a drill-down are counts in the strip; the others are rules (the closer is not the creator),
  // shown under the strip only while they block closing.
  const counts = checklist.filter((item) => item.href)
  const rules = checklist.filter((item) => !item.href)

  return (
    <ContentPanel
      title={t("closeChecklist")}
      description={t("closeChecklistHelp")}
      actions={
        <Button onClick={closeRound} busy={saving} disabled={disabled}>
          <Lock aria-hidden="true" />
          {t("closeRound")}
        </Button>
      }
    >
      <StatStrip
        items={counts.map((item) => ({
          key: item.label,
          label: item.label,
          value: formatCount(item.value),
          href: item.href && item.value > 0 ? item.href : undefined,
          foot: item.href && item.value > 0 ? item.actionLabel : undefined,
          footTitle: item.href && item.value > 0 ? item.actionLabel : undefined,
          attention: !item.ok,
        }))}
      />
      {rules.map((item) =>
        !item.ok ? (
          <Notice key={item.label} tone="neutral" className="mt-3">{item.label}</Notice>
        ) : null,
      )}
    </ContentPanel>
  )
}
