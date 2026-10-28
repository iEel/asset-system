"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, FileUp } from "lucide-react"
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
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"

type EmployeeOption = { id: string; label: string }

// The fields of the two follow-up dialogs in visual order, keyed like the server's fieldErrors, with the id focus moves
// to (v-track M-R1). The owner select is optional and the server never refuses it, so it stays out. The review decision
// and its reason box are in the review panel (audit-finding-decision.tsx, group 2 plan 4).
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
type FindingField = PlanField | CloseField

// noValidate turns the browser's check off, so this restates the controls' required and maxLength. Each dialog passes
// only its own fields (v-track M-R2, U-R8).
function validate(values: { actionPlan?: string; closureRemark?: string }): Partial<Record<FindingField, string>> {
  const errors: Partial<Record<FindingField, string>> = {}
  const check = (key: FindingField, code: string | null) => {
    if (code) errors[key] = code
  }
  if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))
  if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))
  return errors
}

// The follow-up of a finding in the review panel (group 2 spec §10, Appendix A §10): "แผนแก้ไข" and, until it is closed,
// "ปิดรายการไม่ตรง". Each sets the state that mounts its dialog; AccessibleDialog gives focus back to the button pressed.
export function AuditFindingFollowUpActions({
  findingId,
  actionStatus,
  actionPlan,
  actionOwnerId,
  actionDueDate,
  evidenceCount,
  employees,
}: {
  findingId: string
  actionStatus: string
  actionPlan?: string | null
  actionOwnerId?: string | null
  actionDueDate?: Date | string | null
  evidenceCount: number
  employees: EmployeeOption[]
}) {
  const t = useTranslations("auditFinding")
  const [planOpen, setPlanOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  return (
    <div data-audit-finding-follow-up-actions className="flex flex-wrap gap-2">
      <Button variant="outline" size="md" onClick={() => setPlanOpen(true)}>
        <CalendarClock aria-hidden="true" />
        {t("actionPlan")}
      </Button>
      {actionStatus !== "closed" ? (
        <Button variant="outline" size="md" onClick={() => setCloseOpen(true)}>
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
      {closeOpen ? <CloseFindingModal findingId={findingId} evidenceCount={evidenceCount} onClose={() => setCloseOpen(false)} /> : null}
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
    <AccessibleDialog open title={t("actionPlanTitle")} busy={saving} size="md" onClose={onClose}>
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
  onClose,
}: {
  findingId: string
  evidenceCount: number
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
    <AccessibleDialog open title={t("closeFindingTitle")} busy={saving} size="md" onClose={onClose}>
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
