"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

type BatchFinding = {
  id: string
  label: string
  detail: string
}

export function AuditFindingsBatchActions({ findings }: { findings: BatchFinding[] }) {
  const router = useRouter()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedCount = selectedIds.length

  function toggleFinding(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === findings.length ? [] : findings.map((finding) => finding.id)))
  }

  async function reviewSelected(action: "approve" | "reject") {
    if (selectedIds.length === 0) return
    const promptValue = window.prompt(t("batchReviewRemark"))
    if (promptValue === null) return

    setReviewing(action)
    try {
      for (const findingId of selectedIds) {
        const response = await fetch(`/api/audit-findings/${findingId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewRemark: promptValue.trim() }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("batchReviewSuccess", { count: selectedIds.length }))
      setSelectedIds([])
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setReviewing(null)
    }
  }

  if (findings.length === 0) return null

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("batchReview")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t("selectAllPending")}
          </button>
          <button
            type="button"
            onClick={() => void reviewSelected("approve")}
            disabled={selectedCount === 0 || reviewing !== null}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-success px-3 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:opacity-50"
          >
            {reviewing === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("approveSelected")}
          </button>
          <button
            type="button"
            onClick={() => void reviewSelected("reject")}
            disabled={selectedCount === 0 || reviewing !== null}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-3 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
          >
            {reviewing === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            {t("rejectSelected")}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <div className="mb-2 text-sm font-medium text-foreground">
          {t("selectedCount", { count: selectedCount })}
        </div>
        <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
          {findings.map((finding) => (
            <label key={finding.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 text-sm hover:bg-accent">
              <input
                type="checkbox"
                checked={selectedSet.has(finding.id)}
                onChange={() => toggleFinding(finding.id)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{finding.label}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{finding.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
