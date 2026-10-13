"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
import { useApiError } from "@/components/ui/use-api-error"
import { cn } from "@/lib/utils"

type BatchFinding = {
  id: string
  label: string
  detail: string
}

export function AuditFindingsBatchActions({ findings }: { findings: BatchFinding[] }) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null)
  const [reviewDialogAction, setReviewDialogAction] = useState<"approve" | "reject" | null>(null)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedCount = selectedIds.length

  function toggleFinding(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === findings.length ? [] : findings.map((finding) => finding.id)))
  }

  function openReviewDialog(action: "approve" | "reject") {
    if (selectedIds.length === 0) return
    setReviewDialogAction(action)
  }

  async function reviewSelected(action: "approve" | "reject", reviewRemark: string) {
    setReviewing(action)
    try {
      for (const findingId of selectedIds) {
        const response = await fetch(`/api/audit-findings/${findingId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewRemark }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("batchReviewSuccess", { count: selectedIds.length }))
      setSelectedIds([])
      setReviewDialogAction(null)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setReviewing(null)
    }
  }

  if (findings.length === 0) return null

  return (
    <>
      <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("batchReview")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewHelp")}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">
          <Button variant="outline" size="md" onClick={toggleAll}>
            {t("selectAllPending")}
          </Button>
          <Button
            size="md"
            onClick={() => openReviewDialog("approve")}
            busy={reviewing === "approve"}
            disabled={selectedCount === 0 || reviewing === "reject" || reviewDialogAction !== null}
          >
            <Check aria-hidden="true" />
            {t("approveSelected")}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => openReviewDialog("reject")}
            busy={reviewing === "reject"}
            disabled={selectedCount === 0 || reviewing === "approve" || reviewDialogAction !== null}
          >
            <X aria-hidden="true" />
            {t("rejectSelected")}
          </Button>
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
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span className="min-w-0">
                <span className="block break-words font-medium text-foreground">{finding.label}</span>
                <span className="mt-1 block break-words text-xs text-muted-foreground">{finding.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      </section>
      <ConfirmTextDialog
        open={reviewDialogAction !== null}
        title={t("batchReview")}
        description={t("selectedCount", { count: selectedCount })}
        fieldLabel={t("batchReviewRemark")}
        confirmLabel={reviewDialogAction === "approve" ? t("approveSelected") : t("rejectSelected")}
        cancelLabel={tCommon("cancel")}
        busy={reviewing !== null}
        tone={reviewDialogAction === "reject" ? "danger" : "default"}
        onClose={() => setReviewDialogAction(null)}
        onConfirm={(remark) => {
          if (reviewDialogAction) void reviewSelected(reviewDialogAction, remark)
        }}
      />
    </>
  )
}
