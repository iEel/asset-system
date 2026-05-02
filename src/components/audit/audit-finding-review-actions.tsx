"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

export function AuditFindingReviewActions({ findingId }: { findingId: string }) {
  const router = useRouter()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null)

  async function review(action: "approve" | "reject") {
    const promptValue = window.prompt(action === "approve" ? t("approveRemark") : t("rejectRemark"))
    if (promptValue === null) return
    const reviewRemark = promptValue.trim()

    setReviewing(action)
    try {
      const response = await fetch(`/api/audit-findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewRemark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(action === "approve" ? t("approvedSuccess") : t("rejectedSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => review("approve")}
        disabled={reviewing !== null}
        title={t("approve")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10 disabled:opacity-50"
      >
        {reviewing === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => review("reject")}
        disabled={reviewing !== null}
        title={t("reject")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        {reviewing === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </div>
  )
}
