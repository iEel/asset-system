"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { useApiError } from "@/components/ui/use-api-error"

type BatchFinding = {
  id: string
  label: string
  detail: string
}

// The batch's form is ConfirmTextDialog's, which turns the browser's check off (spec §4.5). Nothing in it can be wrong
// before the request: the remark is optional and the server sets no limit on it. The selection is a prerequisite
// (spec §4.4), gated on the buttons with its reason (v-track U-R6, U-R10).
function validate(): Partial<Record<"reviewRemark", string>> {
  return {}
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
  const noSelection = selectedCount === 0

  function toggleFinding(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === findings.length ? [] : findings.map((finding) => finding.id)))
  }

  // The buttons stay focusable while nothing is selected (aria-disabled), so the gate returns here.
  function openReviewDialog(action: "approve" | "reject") {
    if (noSelection) return
    setReviewDialogAction(action)
  }

  async function reviewSelected(action: "approve" | "reject", reviewRemark: string) {
    if (Object.keys(validate()).length > 0) return
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
      <ContentPanel
        title={t("batchReview")}
        description={t("batchReviewHelp")}
        actions={
          <>
            <Button variant="outline" size="md" onClick={toggleAll}>
              {t("selectAllPending")}
            </Button>
            <Button
              size="md"
              onClick={() => openReviewDialog("approve")}
              busy={reviewing === "approve"}
              aria-disabled={noSelection || undefined}
              aria-describedby={noSelection ? "audit-batch-review-reason" : undefined}
              disabled={reviewing === "reject" || reviewDialogAction !== null}
            >
              <Check aria-hidden="true" />
              {t("approveSelected")}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => openReviewDialog("reject")}
              busy={reviewing === "reject"}
              aria-disabled={noSelection || undefined}
              aria-describedby={noSelection ? "audit-batch-review-reason" : undefined}
              disabled={reviewing === "approve" || reviewDialogAction !== null}
            >
              <X aria-hidden="true" />
              {t("rejectSelected")}
            </Button>
            {/* Why the decision waits: a prerequisite keeps its gate and says so beside the buttons (spec §4.4). */}
            {noSelection ? <p id="audit-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsSelection")}</p> : null}
          </>
        }
      >
        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-2 text-sm font-medium text-foreground">
            {t("selectedCount", { count: selectedCount })}
          </div>
          <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
            {findings.map((finding) => (
              <ChoiceCard
                key={finding.id}
                type="checkbox"
                label={finding.label}
                description={finding.detail}
                checked={selectedSet.has(finding.id)}
                onChange={() => toggleFinding(finding.id)}
              />
            ))}
          </div>
        </div>
      </ContentPanel>
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
