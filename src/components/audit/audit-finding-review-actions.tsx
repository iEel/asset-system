"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, FileUp, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { SearchableSelect } from "@/components/ui/searchable-select"

type EmployeeOption = { id: string; label: string }

export function AuditFindingReviewActions({
  findingId,
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
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

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
      if (!response.ok) throw new Error(payload?.error ?? "Error")
      toast.success(action === "approve" ? t("approvedSuccess") : t("rejectedSuccess"))
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
      setReviewing(null)
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {reviewStatus === "pending" ? (
        reviewBlocked ? (
          <div className="max-w-56 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-left text-xs font-medium text-warning">
            {reviewBlockedReason ?? t("segregationReviewBlocked")}
          </div>
        ) : (
        <>
          <button
            type="button"
            onClick={() => review("approve")}
            disabled={reviewing !== null}
            title={t("approve")}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
          >
            {reviewing === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("approve")}
          </button>
          <button
            type="button"
            onClick={() => review("reject")}
            disabled={reviewing !== null}
            title={t("reject")}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
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
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {t("actionPlan")}
      </button>
      {actionStatus !== "closed" ? (
        <button
          type="button"
          onClick={() => setCloseOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
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
    </div>
  )
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-4 text-sm font-medium">
            {tCommon("cancel")}
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50">
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-4 text-sm font-medium">
            {tCommon("cancel")}
          </button>
          <button type="button" onClick={closeFinding} disabled={saving || uploadedCount === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent" aria-label={tCommon("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  )
}
