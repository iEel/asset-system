"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarClock, Check, FileUp, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { SearchableSelect } from "@/components/ui/searchable-select"

type EmployeeOption = { id: string; label: string }
type ReviewAction = "approve" | "reject"
type ReviewConflictPayload = {
  code?: string
  error?: string
  assetUpdatedAt?: string
  findingReportedAt?: string
}

export function AuditFindingReviewActions({
  findingId,
  assetLabel,
  findingTypeLabel,
  expectedValue,
  actualValue,
  reviewStatus,
  actionStatus,
  actionPlan,
  actionOwnerId,
  actionDueDate,
  evidenceCount,
  employees,
  reviewBlocked = false,
  reviewBlockedReason,
}: {
  findingId: string
  assetLabel: string
  findingTypeLabel: string
  expectedValue?: string | null
  actualValue?: string | null
  reviewStatus: string
  actionStatus: string
  actionPlan?: string | null
  actionOwnerId?: string | null
  actionDueDate?: Date | string | null
  evidenceCount: number
  employees: EmployeeOption[]
  reviewBlocked?: boolean
  reviewBlockedReason?: string
}) {
  const t = useTranslations("auditFinding")
  const router = useRouter()
  const [reviewing, setReviewing] = useState<ReviewAction | null>(null)
  const [reviewModalAction, setReviewModalAction] = useState<ReviewAction | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  async function review(action: ReviewAction, reviewRemark: string, confirmConflict = false) {
    setReviewing(action)
    try {
      const response = await fetch(`/api/audit-findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewRemark, confirmConflict }),
      })
      const payload = await response.json().catch(() => null)
      if (response.status === 409) {
        return payload as ReviewConflictPayload
      }
      if (!response.ok) throw new Error(payload?.error ?? "Error")
      toast.success(action === "approve" ? t("approvedSuccess") : t("rejectedSuccess"))
      setReviewModalAction(null)
      router.refresh()
      return null
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
      return null
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {reviewStatus === "pending" ? (
        reviewBlocked ? (
          <div className="max-w-56 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-left text-xs font-medium text-warning">
            {reviewBlockedReason ?? t("segregationReviewBlocked")}
          </div>
        ) : (
        <>
          <button
            type="button"
            onClick={() => setReviewModalAction("approve")}
            disabled={reviewing !== null}
            title={t("approve")}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50 sm:h-8 sm:min-h-0"
          >
            {reviewing === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("approve")}
          </button>
          <button
            type="button"
            onClick={() => setReviewModalAction("reject")}
            disabled={reviewing !== null}
            title={t("reject")}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 sm:h-8 sm:min-h-0"
          >
            {reviewing === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            {t("reject")}
          </button>
        </>
        )
      ) : null}
      <button
        type="button"
        onClick={() => setPlanOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {t("actionPlan")}
      </button>
      {actionStatus !== "closed" ? (
        <button
          type="button"
          onClick={() => setCloseOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
        >
          <FileUp className="h-3.5 w-3.5" />
          {t("closeFinding")}
        </button>
      ) : null}
      {planOpen ? (
        <ActionPlanModal
          findingId={findingId}
          employees={employees}
          actionPlan={actionPlan}
          actionOwnerId={actionOwnerId}
          actionDueDate={actionDueDate}
          actionStatus={actionStatus}
          onClose={() => setPlanOpen(false)}
        />
      ) : null}
      {closeOpen ? (
        <CloseFindingModal
          findingId={findingId}
          evidenceCount={evidenceCount}
          onClose={() => setCloseOpen(false)}
        />
      ) : null}
      {reviewModalAction ? (
        <ReviewDecisionModal
          action={reviewModalAction}
          assetLabel={assetLabel}
          findingTypeLabel={findingTypeLabel}
          expectedValue={expectedValue}
          actualValue={actualValue}
          reviewing={reviewing === reviewModalAction}
          onClose={() => setReviewModalAction(null)}
          onReview={review}
        />
      ) : null}
    </div>
  )
}

function ReviewDecisionModal({
  action,
  assetLabel,
  findingTypeLabel,
  expectedValue,
  actualValue,
  reviewing,
  onClose,
  onReview,
}: {
  action: ReviewAction
  assetLabel: string
  findingTypeLabel: string
  expectedValue?: string | null
  actualValue?: string | null
  reviewing: boolean
  onClose: () => void
  onReview: (action: ReviewAction, reviewRemark: string, confirmConflict?: boolean) => Promise<ReviewConflictPayload | null>
}) {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [reviewRemark, setReviewRemark] = useState("")
  const [conflict, setConflict] = useState<ReviewConflictPayload | null>(null)

  async function submit(confirmConflict = false) {
    const nextConflict = await onReview(action, reviewRemark.trim(), confirmConflict)
    if (nextConflict?.code === "asset_updated_after_finding") {
      setConflict(nextConflict)
    }
  }

  return (
    <Modal title={t(`reviewDecisionTitle_${action}`)} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-semibold text-foreground">{assetLabel}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ReviewPreviewField label={t("findingType")} value={findingTypeLabel} />
            <ReviewPreviewField label={t("systemValue")} value={expectedValue || "-"} />
            <ReviewPreviewField label={t("foundValue")} value={actualValue || "-"} strong />
          </div>
        </div>

        <div className={`rounded-lg border p-4 text-sm ${action === "approve" ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/30 bg-danger/10 text-danger"}`}>
          <div className="font-semibold">{t(`reviewDecisionImpactTitle_${action}`)}</div>
          <p className="mt-1 leading-relaxed">{t(`reviewDecisionHelp_${action}`)}</p>
        </div>

        {conflict ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            <div className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{t("reviewConflictTitle")}</span>
            </div>
            <p className="mt-2 leading-relaxed text-foreground">{t("reviewConflictHelp")}</p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <ReviewPreviewField label={t("reviewConflictFindingAt")} value={formatClientDateTime(conflict.findingReportedAt)} />
              <ReviewPreviewField label={t("reviewConflictAssetUpdatedAt")} value={formatClientDateTime(conflict.assetUpdatedAt)} />
            </div>
          </div>
        ) : null}

        <label>
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t(`reviewRemarkLabel_${action}`)}</span>
          <textarea
            value={reviewRemark}
            rows={3}
            maxLength={4000}
            onChange={(event) => setReviewRemark(event.target.value)}
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>

        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium sm:h-10 sm:min-h-0">
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={() => submit(Boolean(conflict))}
            disabled={reviewing}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50 sm:h-10 sm:min-h-0 ${
              action === "approve" ? "bg-primary" : "bg-danger"
            }`}
          >
            {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : action === "approve" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {conflict ? t("reviewConfirmConflict") : t(`reviewSubmit_${action}`)}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ReviewPreviewField({ label, value, strong = false }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words text-sm ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>{value || "-"}</div>
    </div>
  )
}

function formatClientDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ActionPlanModal({
  findingId,
  employees,
  actionPlan,
  actionOwnerId,
  actionDueDate,
  actionStatus,
  onClose,
}: {
  findingId: string
  employees: EmployeeOption[]
  actionPlan?: string | null
  actionOwnerId?: string | null
  actionDueDate?: Date | string | null
  actionStatus: string
  onClose: () => void
}) {
  const router = useRouter()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    actionPlan: actionPlan ?? "",
    actionOwnerId: actionOwnerId ?? "",
    actionDueDate: actionDueDate ? new Date(actionDueDate).toISOString().slice(0, 10) : "",
    actionStatus: actionStatus === "not_required" || actionStatus === "closed" ? "planned" : actionStatus,
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          actionPlan: values.actionPlan,
          actionOwnerId: values.actionOwnerId || null,
          actionDueDate: values.actionDueDate || null,
          actionStatus: values.actionStatus,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("actionPlanSaved"))
      onClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t("actionPlanTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("actionPlan")}</span>
          <textarea
            value={values.actionPlan}
            required
            rows={4}
            maxLength={4000}
            onChange={(event) => setValues((current) => ({ ...current, actionPlan: event.target.value }))}
            className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect
            label={t("actionOwner")}
            value={values.actionOwnerId}
            options={employees}
            placeholder={t("noActionOwner")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setValues((current) => ({ ...current, actionOwnerId: value }))}
          />
          <label>
            <span className="mb-1.5 block text-sm font-medium text-foreground">{t("actionDueDate")}</span>
            <input
              type="date"
              value={values.actionDueDate}
              onChange={(event) => setValues((current) => ({ ...current, actionDueDate: event.target.value }))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("actionStatus")}</span>
          <select
            value={values.actionStatus}
            onChange={(event) => setValues((current) => ({ ...current, actionStatus: event.target.value }))}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {["planned", "in_progress", "done"].map((status) => (
              <option key={status} value={status}>
                {t(`actionStatus_${status}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium sm:h-10 sm:min-h-0">
            {tCommon("cancel")}
          </button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50 sm:h-10 sm:min-h-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CloseFindingModal({ findingId, evidenceCount, onClose }: { findingId: string; evidenceCount: number; onClose: () => void }) {
  const router = useRouter()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedCount, setUploadedCount] = useState(evidenceCount)
  const [closureRemark, setClosureRemark] = useState("")

  async function uploadEvidence(nextFile: File | null) {
    if (!nextFile) return
    setFile(nextFile)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", nextFile)
      const response = await fetch(`/api/audit-findings/${findingId}/attachments`, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("evidenceUploaded"))
      setUploadedCount((current) => current + 1)
      setFile(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setUploading(false)
    }
  }

  async function closeFinding() {
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", closureRemark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("findingClosed"))
      onClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t("closeFindingTitle")} onClose={onClose}>
      <div className="space-y-4">
        <FileDropzone
          file={file}
          onFileChange={uploadEvidence}
          disabled={uploading}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf"
          capture="environment"
          title={t("dropClosureEvidenceTitle")}
          hint={uploading ? t("uploadingEvidence") : t("dropClosureEvidenceSelected")}
          browseLabel={t("dropClosureEvidenceHint")}
        />
        <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          {t("closureEvidenceCount", { count: uploadedCount })}
        </div>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("closureRemark")}</span>
          <textarea
            value={closureRemark}
            rows={3}
            maxLength={4000}
            onChange={(event) => setClosureRemark(event.target.value)}
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium sm:h-10 sm:min-h-0">
            {tCommon("cancel")}
          </button>
          <button type="button" onClick={closeFinding} disabled={saving || uploadedCount === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50 sm:h-10 sm:min-h-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("closeFinding")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const tCommon = useTranslations("common")
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
      <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-lg sm:max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-8 sm:w-8" aria-label={tCommon("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  )
}
