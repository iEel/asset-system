"use client"

import { useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react"
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
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { formatDateTime } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type EmployeeOption = { id: string; label: string }
type ReviewAction = "approve" | "reject"
type ReviewConflictPayload = {
  code?: string
  error?: string
  assetUpdatedAt?: string
  findingReportedAt?: string
}

// The fields of the three dialogs in visual order, keyed like the server's fieldErrors, with the id focus moves to
// (v-track M-R1). The owner select is optional and the server never refuses it, so it stays out.
const REVIEW_FIELD_IDS = {
  reviewRemark: "audit-review-remark",
} as const
type ReviewField = keyof typeof REVIEW_FIELD_IDS
const REVIEW_FIELD_ORDER = Object.keys(REVIEW_FIELD_IDS) as ReviewField[]
const PLAN_FIELD_IDS = {
  actionPlan: "audit-plan-action-plan",
  actionDueDate: "audit-plan-due-date",
  actionStatus: "audit-plan-status",
} as const
type PlanField = keyof typeof PLAN_FIELD_IDS
const PLAN_FIELD_ORDER = Object.keys(PLAN_FIELD_IDS) as PlanField[]
const CLOSE_FIELD_IDS = {
  closureRemark: "audit-close-remark",
} as const
type CloseField = keyof typeof CLOSE_FIELD_IDS
const CLOSE_FIELD_ORDER = Object.keys(CLOSE_FIELD_IDS) as CloseField[]
type FindingField = ReviewField | PlanField | CloseField

// noValidate turns the browser's check off, so this restates the controls' required and maxLength. Each dialog passes
// only its own fields (v-track M-R2, U-R8).
function validate(
  values: { reviewRemark?: string; actionPlan?: string; closureRemark?: string },
): Partial<Record<FindingField, string>> {
  const errors: Partial<Record<FindingField, string>> = {}
  const check = (key: FindingField, code: string | null) => {
    if (code) errors[key] = code
  }
  if (values.reviewRemark !== undefined) check("reviewRemark", maxLength(values.reviewRemark, 4000))
  if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))
  if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))
  return errors
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
  menuCode = assetLabel,
  menuLinks = [],
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
  /** The findings table (audit mobile fix D8, pattern ช1): only the review decision stays visible, the note is small
   * text instead of a box, and plan, close and menuLinks go into ⋯. */
  compact?: boolean
  /** The row's code for ⋯ (compact only). */
  menuCode?: string
  /** Links of the page in the same ⋯ after plan and close, e.g. the disposal request (compact only). */
  menuLinks?: RowActionItem[]
}) {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  // ⋯ when a dialog was opened from the menu: the dialog gives focus back to it (R-m).
  const openerRef = useRef<HTMLElement | null>(null)
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

  const reviewButtons = (
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
  // The findings table shows the note as small text with its icon; the phone cards keep the box, a warning Notice.
  const blockedNote = compact ? (
    <p className="flex items-start gap-1.5 text-left text-meta text-warning">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{reviewBlockedReason ?? t("segregationReviewBlocked")}</span>
    </p>
  ) : (
    <Notice tone="warning">{reviewBlockedReason ?? t("segregationReviewBlocked")}</Notice>
  )
  const dialogs = (
    <>
      {planOpen ? (
        <ActionPlanModal
          findingId={findingId}
          employees={employees}
          actionPlan={actionPlan}
          actionOwnerId={actionOwnerId}
          actionDueDate={actionDueDate}
          actionStatus={actionStatus}
          returnFocusRef={openerRef}
          onClose={() => setPlanOpen(false)}
        />
      ) : null}
      {closeOpen ? (
        <CloseFindingModal
          findingId={findingId}
          evidenceCount={evidenceCount}
          returnFocusRef={openerRef}
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
    </>
  )

  // Pattern ช1 in the findings table (audit mobile fix D8, fix round 3): the review decision (approve and reject
  // stacked, or the self-review note) stays visible; plan, close and the page's links are in ⋯. A menu item only sets
  // the state that mounts its dialog, and the dialog gives focus back to ⋯ through openerRef (R-m).
  if (compact) {
    const menuItems: RowActionItem[] = [
      { kind: "action", key: "plan", label: t("actionPlan"), icon: <CalendarClock aria-hidden="true" />, onSelect: () => setPlanOpen(true) },
      ...(actionStatus !== "closed" ? [{ kind: "action" as const, key: "close", label: t("closeFinding"), icon: <FileUp aria-hidden="true" />, onSelect: () => setCloseOpen(true) }] : []),
      ...menuLinks,
    ]
    return (
      <div className="flex min-w-0 items-start justify-end gap-1.5" onClick={stopPortalClick}>
        {reviewStatus === "pending" ? (
          reviewBlocked ? blockedNote : <div className="flex flex-col items-end gap-2">{reviewButtons}</div>
        ) : null}
        <RowActions
          code={menuCode}
          name={assetLabel}
          menuLabel={tCommon("moreActionsFor", { code: menuCode })}
          groups={[{ key: "finding", items: menuItems }]}
          openerRef={openerRef}
          className="shrink-0"
        />
        {dialogs}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:justify-end" onClick={stopPortalClick}>
      {reviewStatus === "pending" ? (reviewBlocked ? blockedNote : reviewButtons) : null}
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
      {dialogs}
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
  const fieldErrors = useFieldErrors<ReviewField>()

  // The row's review() sends the decision and keeps its toast for a refusal: the route cannot refuse the remark
  // (v-track U-R5). A second press after a conflict confirms it.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ reviewRemark }))
    if (fieldErrors.focusFirst(REVIEW_FIELD_ORDER, { idFor: (key) => REVIEW_FIELD_IDS[key] })) return
    const nextConflict = await onReview(action, reviewRemark.trim(), Boolean(conflict))
    if (nextConflict?.code === "asset_updated_after_finding") {
      setConflict(nextConflict)
    }
  }

  return (
    <AccessibleDialog open title={t(`reviewDecisionTitle_${action}`)} busy={reviewing} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="space-y-4">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-sm font-semibold text-foreground">{assetLabel}</div>
            <KeyValueList
              className="mt-3"
              items={[
                { key: "findingType", label: t("findingType"), value: findingTypeLabel },
                { key: "systemValue", label: t("systemValue"), value: expectedValue },
                { key: "foundValue", label: t("foundValue"), value: actualValue ? <span className="font-semibold">{actualValue}</span> : null },
              ]}
            />
          </div>

          <Notice tone={action === "approve" ? "warning" : "neutral"} title={t(`reviewDecisionImpactTitle_${action}`)}>
            {t(`reviewDecisionHelp_${action}`)}
          </Notice>

          {conflict ? (
            <>
              <Notice tone="warning" role="alert" title={t("reviewConflictTitle")}>{t("reviewConflictHelp")}</Notice>
              <KeyValueList
                items={[
                  { key: "findingReportedAt", label: t("reviewConflictFindingAt"), value: conflict.findingReportedAt ? formatDateTime(conflict.findingReportedAt) : null },
                  { key: "assetUpdatedAt", label: t("reviewConflictAssetUpdatedAt"), value: conflict.assetUpdatedAt ? formatDateTime(conflict.assetUpdatedAt) : null },
                ]}
              />
            </>
          ) : null}

          <Field label={t(`reviewRemarkLabel_${action}`)} id="audit-review-remark" error={fieldErrors.message("reviewRemark")}>
            <Textarea
              value={reviewRemark}
              rows={3}
              maxLength={4000}
              onChange={(event) => {
                setReviewRemark(event.target.value)
                fieldErrors.clear("reviewRemark")
              }}
            />
          </Field>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button type="submit" variant={action === "approve" ? "default" : "destructive"} busy={reviewing}>
            {action === "approve" ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            {conflict ? t("reviewConfirmConflict") : t(`reviewSubmit_${action}`)}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}

function ActionPlanModal({
  findingId,
  employees,
  actionPlan,
  actionOwnerId,
  actionDueDate,
  actionStatus,
  returnFocusRef,
  onClose,
}: {
  findingId: string
  employees: EmployeeOption[]
  actionPlan?: string | null
  actionOwnerId?: string | null
  actionDueDate?: Date | string | null
  actionStatus: string
  returnFocusRef?: RefObject<HTMLElement | null>
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
  const fieldErrors = useFieldErrors<PlanField>()
  const focusFirstError = () => fieldErrors.focusFirst(PLAN_FIELD_ORDER, { idFor: (key) => PLAN_FIELD_IDS[key] })

  function setField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in PLAN_FIELD_IDS) fieldErrors.clear(field as PlanField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ actionPlan: values.actionPlan }))
    if (focusFirstError()) return
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
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
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
    <AccessibleDialog open title={t("actionPlanTitle")} busy={saving} size="md" returnFocusRef={returnFocusRef} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="grid gap-4">
          <Field label={t("actionPlan")} id="audit-plan-action-plan" required error={fieldErrors.message("actionPlan")}>
            <Textarea
              value={values.actionPlan}
              required
              rows={4}
              maxLength={4000}
              onChange={(event) => setField("actionPlan", event.target.value)}
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
              onChange={(value) => setField("actionOwnerId", value)}
            />
            <Field label={t("actionDueDate")} id="audit-plan-due-date" error={fieldErrors.message("actionDueDate")}>
              <Input
                type="date"
                value={values.actionDueDate}
                onChange={(event) => setField("actionDueDate", event.target.value)}
              />
            </Field>
          </div>
          <Field label={t("actionStatus")} id="audit-plan-status" error={fieldErrors.message("actionStatus")}>
            <NativeSelect
              value={values.actionStatus}
              onChange={(event) => setField("actionStatus", event.target.value)}
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

function CloseFindingModal({
  findingId,
  evidenceCount,
  returnFocusRef,
  onClose,
}: {
  findingId: string
  evidenceCount: number
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedCount, setUploadedCount] = useState(evidenceCount)
  const [closureRemark, setClosureRemark] = useState("")
  const fieldErrors = useFieldErrors<CloseField>()
  const focusFirstError = () => fieldErrors.focusFirst(CLOSE_FIELD_ORDER, { idFor: (key) => CLOSE_FIELD_IDS[key] })
  // A prerequisite, not a field (spec §4.4): closing waits for one evidence file and says so beside the button.
  const needsEvidence = uploadedCount === 0

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needsEvidence) return
    fieldErrors.setErrors(validate({ closureRemark }))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", closureRemark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
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
    <AccessibleDialog open title={t("closeFindingTitle")} busy={saving} size="md" returnFocusRef={returnFocusRef} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
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
          <p className="text-sm text-muted-foreground">{t("closureEvidenceCount", { count: uploadedCount })}</p>
          <Field label={t("closureRemark")} id="audit-close-remark" error={fieldErrors.message("closureRemark")}>
            <Textarea
              value={closureRemark}
              rows={3}
              maxLength={4000}
              onChange={(event) => {
                setClosureRemark(event.target.value)
                fieldErrors.clear("closureRemark")
              }}
            />
          </Field>
          {/* Why close waits, the body's last line right above the button (the footer holds only buttons, GD3). */}
          {needsEvidence ? <p id="audit-close-reason" className="text-meta text-muted-foreground">{t("closeNeedsEvidence")}</p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button
            type="submit"
            busy={saving}
            aria-disabled={needsEvidence || undefined}
            aria-describedby={needsEvidence ? "audit-close-reason" : undefined}
          >
            <Check aria-hidden="true" />
            {t("closeFinding")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
