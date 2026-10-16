"use client"

import { useState, type MouseEvent as ReactMouseEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarClock, Check, FileUp, X } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type EmployeeOption = { id: string; label: string }
type ReviewAction = "approve" | "reject"
type ReviewConflictPayload = {
  code?: string
  error?: string
  assetUpdatedAt?: string
  findingReportedAt?: string
}

// The three dialogs render in a portal, but React still sends their clicks up through this component to the table row
// (ClickableTableRow on the findings page), which would open the asset. Clicks from outside this element stop here.
function stopPortalClick(event: ReactMouseEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
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
  compact = false,
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
  /** The findings table: the self-review note as small text with its icon instead of a box (audit mobile fix D8). */
  compact?: boolean
}) {
  const t = useTranslations("auditFinding")
  const apiError = useApiError()
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
      apiError.toast(error)
      return null
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:justify-end" onClick={stopPortalClick}>
      {reviewStatus === "pending" ? (
        reviewBlocked ? (
          // The findings table (compact) shows the note as one or two lines of text; the phone cards keep the box.
          compact ? (
            <p className="flex items-start gap-1.5 text-left text-xs text-warning">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>{reviewBlockedReason ?? t("segregationReviewBlocked")}</span>
            </p>
          ) : (
          <div className="max-w-56 rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-left text-xs font-medium text-warning">
            {reviewBlockedReason ?? t("segregationReviewBlocked")}
          </div>
          )
        ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReviewModalAction("approve")}
            busy={reviewing === "approve"}
            disabled={reviewing === "reject"}
            title={t("approve")}
          >
            <Check aria-hidden="true" />
            {t("approve")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setReviewModalAction("reject")}
            busy={reviewing === "reject"}
            disabled={reviewing === "approve"}
            title={t("reject")}
          >
            <X aria-hidden="true" />
            {t("reject")}
          </Button>
        </>
        )
      ) : null}
      <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
        <CalendarClock aria-hidden="true" />
        {t("actionPlan")}
      </Button>
      {actionStatus !== "closed" ? (
        <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
          <FileUp aria-hidden="true" />
          {t("closeFinding")}
        </Button>
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
  const [reviewRemark, setReviewRemark] = useState("")
  const [conflict, setConflict] = useState<ReviewConflictPayload | null>(null)

  async function submit(confirmConflict = false) {
    const nextConflict = await onReview(action, reviewRemark.trim(), confirmConflict)
    if (nextConflict?.code === "asset_updated_after_finding") {
      setConflict(nextConflict)
    }
  }

  return (
    <AccessibleDialog open title={t(`reviewDecisionTitle_${action}`)} busy={reviewing} size="md" onClose={onClose}>
      <AccessibleDialogBody className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-semibold text-foreground">{assetLabel}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ReviewPreviewField label={t("findingType")} value={findingTypeLabel} />
            <ReviewPreviewField label={t("systemValue")} value={expectedValue || "-"} />
            <ReviewPreviewField label={t("foundValue")} value={actualValue || "-"} strong />
          </div>
        </div>

        <div className={`rounded-lg border p-4 text-sm ${action === "approve" ? "border-warning-border bg-warning-soft text-warning" : "border-danger-border bg-danger-soft text-danger"}`}>
          <div className="font-semibold">{t(`reviewDecisionImpactTitle_${action}`)}</div>
          <p className="mt-1 leading-relaxed">{t(`reviewDecisionHelp_${action}`)}</p>
        </div>

        {conflict ? (
          <div className="rounded-lg border border-warning-border bg-warning-soft p-4 text-sm text-warning">
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

        <Field label={t(`reviewRemarkLabel_${action}`)}>
          <Textarea value={reviewRemark} rows={3} maxLength={4000} onChange={(event) => setReviewRemark(event.target.value)} />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button variant={action === "approve" ? "default" : "destructive"} busy={reviewing} onClick={() => submit(Boolean(conflict))}>
          {action === "approve" ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
          {conflict ? t("reviewConfirmConflict") : t(`reviewSubmit_${action}`)}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
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
  const apiError = useApiError()
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccessibleDialog open title={t("actionPlanTitle")} busy={saving} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid gap-4">
          <Field label={t("actionPlan")} required>
            <Textarea
              value={values.actionPlan}
              required
              rows={4}
              maxLength={4000}
              onChange={(event) => setValues((current) => ({ ...current, actionPlan: event.target.value }))}
              className="min-h-28"
            />
          </Field>
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
            <Field label={t("actionDueDate")}>
              <Input
                type="date"
                value={values.actionDueDate}
                onChange={(event) => setValues((current) => ({ ...current, actionDueDate: event.target.value }))}
              />
            </Field>
          </div>
          <Field label={t("actionStatus")}>
            <NativeSelect
              value={values.actionStatus}
              onChange={(event) => setValues((current) => ({ ...current, actionStatus: event.target.value }))}
            >
              {["planned", "in_progress", "done"].map((status) => (
                <option key={status} value={status}>
                  {t(`actionStatus_${status}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button type="submit" busy={saving}>
            <Check aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}

function CloseFindingModal({ findingId, evidenceCount, onClose }: { findingId: string; evidenceCount: number; onClose: () => void }) {
  const router = useRouter()
  const apiError = useApiError()
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
      apiError.toast(error)
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccessibleDialog open title={t("closeFindingTitle")} busy={saving} size="md" onClose={onClose}>
      <AccessibleDialogBody className="space-y-4">
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
        <Field label={t("closureRemark")}>
          <Textarea value={closureRemark} rows={3} maxLength={4000} onChange={(event) => setClosureRemark(event.target.value)} />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button busy={saving} disabled={uploadedCount === 0} onClick={closeFinding}>
          <Check aria-hidden="true" />
          {t("closeFinding")}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
