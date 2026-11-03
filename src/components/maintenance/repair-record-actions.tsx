"use client"

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AssetConditionChoice } from "@/components/asset-operations/condition-choice"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { RepairHeldNotice } from "@/components/maintenance/repair-held-notice"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import type { RepairHeld } from "@/lib/repair-record-outlook"
import { decimals, maxLength, notBefore, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type Dialog = "complete" | "cancel" | "edit" | null

// The fields of each dialog in visual order, keyed like the server's fieldErrors, with the id focus moves to
// (v-track M-R1). The outcome and the condition after repair are radio groups: their id is the FieldGroup's.
const COMPLETE_FIELD_IDS = {
  returnDate: "repair-complete-return-date",
  outcome: "repair-complete-outcome",
  conditionId: "repair-complete-condition",
  vendorId: "repair-complete-vendor",
  repairCost: "repair-complete-cost",
  invoiceNo: "repair-complete-invoice-no",
  remark: "repair-complete-remark",
} as const
type CompleteField = keyof typeof COMPLETE_FIELD_IDS
const COMPLETE_FIELD_ORDER = Object.keys(COMPLETE_FIELD_IDS) as CompleteField[]
const CANCEL_FIELD_IDS = {
  reason: "repair-cancel-reason",
} as const
type CancelField = keyof typeof CANCEL_FIELD_IDS
const CANCEL_FIELD_ORDER = Object.keys(CANCEL_FIELD_IDS) as CancelField[]
const EDIT_FIELD_IDS = {
  reportedDate: "repair-edit-date",
  problem: "repair-edit-problem",
  vendorId: "repair-edit-vendor",
  repairCost: "repair-edit-cost",
  invoiceNo: "repair-edit-invoice-no",
  remark: "repair-edit-remark",
} as const
type EditField = keyof typeof EDIT_FIELD_IDS
const EDIT_FIELD_ORDER = Object.keys(EDIT_FIELD_IDS) as EditField[]
type RepairActionField = CompleteField | CancelField | EditField

// noValidate turns the browser's check off, so this restates the controls' required, min, step and maxLength for the
// three dialogs; each passes only its own fields, and a field it does not pass is not checked. The return date is not
// before the reported date: a client rule, the server has none (spec §7.4, §11 call 6) (v-track M-R2). It is not after
// Bangkok today either, and the result has no default, so it is required (group 5 G5P3-R9).
function validate(values: Partial<Record<RepairActionField, string>>, reportedDate: string, todayKey = "") {
  const errors: Partial<Record<RepairActionField, string>> = {}
  const check = (key: RepairActionField, code: string | null) => {
    if (code) errors[key] = code
  }
  if (values.returnDate !== undefined) check("returnDate", required(values.returnDate) ?? notBefore(values.returnDate, reportedDate) ?? (todayKey && values.returnDate > todayKey ? "repairDateInFuture" : null))
  if (values.outcome !== undefined) check("outcome", values.outcome ? null : "repairOutcomeRequired")
  // A repair that ends ใช้งานได้ names the condition after it (group 3 spec §19.4).
  if (values.outcome === "usable") check("conditionId", values.conditionId ? null : "conditionAfterRepairRequired")
  if (values.reportedDate !== undefined) check("reportedDate", required(values.reportedDate))
  if (values.problem !== undefined) check("problem", required(values.problem) ?? maxLength(values.problem, 4000))
  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))
  check("invoiceNo", maxLength(values.invoiceNo, 100))
  check("remark", maxLength(values.remark, 4000))
  check("reason", maxLength(values.reason, 1000))
  return errors
}

// What the header, the อื่น ๆ menu, the next-step card and the phone bar call (group 5 G5P3-R2). Each passes the element
// that opened the dialog, and the dialog gives focus back to it when it closes (Review Focus 5).
export type RepairRecordActionsValue = {
  openComplete: (opener?: HTMLElement | null) => void
  openCancel: (opener?: HTMLElement | null) => void
  openEdit: (opener?: HTMLElement | null) => void
}

const RepairRecordActionsContext = createContext<RepairRecordActionsValue | null>(null)

export function useRepairRecordActions(): RepairRecordActionsValue {
  const value = useContext(RepairRecordActionsContext)
  if (!value) throw new Error("useRepairRecordActions needs RepairRecordActionsProvider")
  return value
}

// The one owner of the record's three dialogs (ซ่อมเสร็จ, ยกเลิกบันทึก, แก้ไขรายละเอียด; group 5 spec §8.1, §8.4). It
// renders them once, outside every menu (DESIGN.md:651), and no button of its own: the openers are the small client
// parts that call useRepairRecordActions().
export function RepairRecordActionsProvider({
  recordId,
  repairNo,
  expectedUpdatedAt,
  isOpen,
  details,
  conditionOptions,
  initialConditionId,
  held,
  assetId,
  locale,
  canReturn,
  todayKey,
  children,
}: {
  recordId: string
  repairNo: string
  expectedUpdatedAt: string
  isOpen: boolean
  details: { reportedDate: string; problem: string; vendor: Option | null; repairCost: string; invoiceNo: string; remark: string }
  // ดี and พอใช้ (getRepairConditionOptions), and the asset's own when offered (repairConditionDefault), else "".
  conditionOptions: Option[]
  initialConditionId: string
  // The open handover that refuses ซ่อมไม่ได้ (MAINTENANCE_ASSET_ON_LOAN), shown under the result (spec §5 early refusal).
  held: RepairHeld | null
  assetId: string
  locale: string
  // asset:edit, the check-in page's permission: the refusal's รับคืน link.
  canReturn: boolean
  /** Bangkok today on the server (getBangkokDateKey): with the browser's own, the completion date's max. */
  todayKey: string
  children: ReactNode
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [dialog, setDialog] = useState<Dialog>(null)
  // The control that opened the dialog: the dialog gives focus back to it when it closes.
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [complete, setComplete] = useState({
    returnDate: toLocalDateInputValue(),
    // No result is chosen for the user (decision 2, G5P3-R9).
    outcome: "" as Outcome | "",
    conditionId: initialConditionId,
    vendorId: details.vendor?.id ?? "",
    repairCost: details.repairCost,
    invoiceNo: details.invoiceNo,
    remark: details.remark,
  })
  const [reason, setReason] = useState("")
  const [edit, setEdit] = useState({
    reportedDate: details.reportedDate,
    problem: details.problem,
    vendorId: details.vendor?.id ?? "",
    repairCost: details.repairCost,
    invoiceNo: details.invoiceNo,
    remark: details.remark,
  })
  const completeErrors = useFieldErrors<CompleteField>()
  const cancelErrors = useFieldErrors<CancelField>()
  const editErrors = useFieldErrors<EditField>()
  const validationMessage = useValidationMessage()
  const focusFirstCompleteError = () => completeErrors.focusFirst(COMPLETE_FIELD_ORDER, { idFor: (key) => COMPLETE_FIELD_IDS[key] })
  const focusFirstCancelError = () => cancelErrors.focusFirst(CANCEL_FIELD_ORDER, { idFor: (key) => CANCEL_FIELD_IDS[key] })
  const focusFirstEditError = () => editErrors.focusFirst(EDIT_FIELD_ORDER, { idFor: (key) => EDIT_FIELD_IDS[key] })
  // Today is the later of the server's Bangkok day and the browser's, so a dialog left open past Bangkok midnight still
  // takes the new day (as the record form, group 5 plan 2). The check and the date's max both read it.
  const latestTodayKey = () => {
    const now = getBangkokDateKey(new Date())
    return now > todayKey ? now : todayKey
  }
  // One stable value: the openers remember who opened the dialog, so it gives focus back there.
  const actions = useMemo<RepairRecordActionsValue>(() => ({
    openComplete: (opener?: HTMLElement | null) => {
      returnFocusRef.current = opener ?? null
      setDialog("complete")
    },
    openCancel: (opener?: HTMLElement | null) => {
      returnFocusRef.current = opener ?? null
      setDialog("cancel")
    },
    openEdit: (opener?: HTMLElement | null) => {
      returnFocusRef.current = opener ?? null
      setDialog("edit")
    },
  }), [])

  function close() {
    if (saving) return
    setDialog(null)
    setFiles([])
    // A dialog opens again without the errors of its last try.
    completeErrors.setErrors({})
    cancelErrors.setErrors({})
    editErrors.setErrors({})
  }

  function setCompleteField<K extends CompleteField>(field: K, value: (typeof complete)[K]) {
    setComplete((current) => ({ ...current, [field]: value }))
    completeErrors.clear(field)
  }

  function setEditField<K extends EditField>(field: K, value: (typeof edit)[K]) {
    setEdit((current) => ({ ...current, [field]: value }))
    editErrors.clear(field)
  }

  // New picks append to the list; each file can be taken out before saving.
  function addFiles(next: File[]) {
    setFiles((current) => [...current, ...next])
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((_, index) => String(index) !== id))
  }

  // Sends one dialog's action. showRefusal puts a refusal that names a field of that dialog under the field; any other
  // refusal keeps the toast (spec §4.1).
  async function send(body: Record<string, unknown>, successKey: "completed" | "cancelled" | "updated", showRefusal: (payload: unknown) => boolean) {
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedUpdatedAt }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        if (showRefusal(payload)) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      }
      const failed = files.length > 0 ? await uploadRepairFiles(recordId, files, "after_repair") : 0
      if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))
      else toast.success(t(successKey))
      setDialog(null)
      setFiles([])
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    completeErrors.setErrors(validate(complete, details.reportedDate, latestTodayKey()))
    if (focusFirstCompleteError()) return
    void send({
      action: "complete",
      returnDate: complete.returnDate,
      outcome: complete.outcome,
      conditionId: complete.outcome === "usable" ? complete.conditionId || null : null,
      vendorId: complete.vendorId || null,
      repairCost: complete.repairCost || null,
      invoiceNo: complete.invoiceNo || null,
      remark: complete.remark || null,
    }, "completed", (payload) => completeErrors.applyServer(payload) && focusFirstCompleteError())
  }

  function handleCancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    cancelErrors.setErrors(validate({ reason }, details.reportedDate))
    if (focusFirstCancelError()) return
    void send({ action: "cancel", reason: reason.trim() || null }, "cancelled", (payload) => cancelErrors.applyServer(payload) && focusFirstCancelError())
  }

  function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    editErrors.setErrors(validate(edit, details.reportedDate))
    if (focusFirstEditError()) return
    void send({
      action: "update",
      reportedDate: edit.reportedDate,
      problem: edit.problem,
      vendorId: edit.vendorId || null,
      repairCost: edit.repairCost || null,
      invoiceNo: edit.invoiceNo || null,
      remark: edit.remark || null,
    }, "updated", (payload) => editErrors.applyServer(payload) && focusFirstEditError())
  }

  return (
    <RepairRecordActionsContext.Provider value={actions}>
      {children}

      {/* Complete and cancel apply to an open record only; edit to any (Appendix A "Record"). */}
      <AccessibleDialog open={isOpen && dialog === "complete"} title={t("completeTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} returnFocusRef={returnFocusRef} onClose={close}>
        <form onSubmit={handleComplete} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("completeHelp")}</p>
            <Field
              label={t("returnDate")}
              id="repair-complete-return-date"
              required
              error={completeErrors.errors.returnDate === "endBeforeStart" ? t("returnDateBeforeReported") : completeErrors.message("returnDate")}
            >
              <Input type="date" required min={details.reportedDate} max={latestTodayKey()} value={complete.returnDate} onChange={(event) => setCompleteField("returnDate", event.target.value)} />
            </Field>
            {/* ซ่อมไม่ได้: the ซาก line is the group's hint, read with it by aria-describedby (final review M9). */}
            <FieldGroup legend={t("outcomeQuestion")} id="repair-complete-outcome" required hint={complete.outcome === "beyond_repair" ? t("conditionBecomesSalvage") : undefined} error={completeErrors.message("outcome")}>
              <div className="grid gap-2">
                {(["usable", "beyond_repair"] as const).map((outcome) => (
                  <ChoiceCard key={outcome} type="radio" name="outcome" checked={complete.outcome === outcome} label={t(`outcome.${outcome}`)} onChange={() => setCompleteField("outcome", outcome)} />
                ))}
              </div>
            </FieldGroup>
            {/* ซ่อมไม่ได้ on a held asset: the server refuses it (MAINTENANCE_ASSET_ON_LOAN), so the dialog says why and how
                to return it as soon as it is chosen; the save stays enabled (spec §5 early refusal, G5P3-R9). */}
            {complete.outcome === "beyond_repair" && held ? (
              <RepairHeldNotice held={held} assetId={assetId} locale={locale} canReturn={canReturn} />
            ) : null}
            {complete.outcome === "usable" ? (
              <AssetConditionChoice
                id="repair-complete-condition"
                legend={t("conditionAfterRepair")}
                options={conditionOptions}
                value={complete.conditionId}
                required
                error={completeErrors.message("conditionId")}
                onChange={(value) => setCompleteField("conditionId", value)}
              />
            ) : null}
            <MaintenanceOptionSelect
              id="repair-complete-vendor"
              type="supplier"
              label={t("vendor")}
              value={complete.vendorId}
              initialOption={details.vendor ?? undefined}
              placeholder={t("vendorPlaceholder")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              error={completeErrors.message("vendorId")}
              onChange={(value) => setCompleteField("vendorId", value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("cost")}
                id="repair-complete-cost"
                error={completeErrors.errors.repairCost ? validationMessage(completeErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setCompleteField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-complete-invoice-no" error={completeErrors.message("invoiceNo")}>
                <Input maxLength={100} value={complete.invoiceNo} onChange={(event) => setCompleteField("invoiceNo", event.target.value)} />
              </Field>
            </div>
            <Field label={t("files")}>
              {(control) => (
                <div className="grid gap-2">
                  <FileDropzone
                    {...control}
                    file={null}
                    onFileChange={(file) => {
                      if (file) addFiles([file])
                    }}
                    onFilesChange={addFiles}
                    disabled={saving}
                    accept="image/*,application/pdf"
                    multiple
                    title={t("dropFilesTitle")}
                    description={t("filesHelpDone")}
                    browseLabel={t("dropFilesHint")}
                  />
                  <FileQueueList items={files.map((file, index) => ({ id: String(index), name: file.name }))} disabled={saving} onRemove={removeFile} />
                </div>
              )}
            </Field>
            <Field label={t("remark")} id="repair-complete-remark" error={completeErrors.message("remark")}>
              <Textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setCompleteField("remark", event.target.value)} className="min-h-16" />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{tCommon("back")}</AccessibleDialogCancel>
            <Button type="submit" busy={saving}>
              <CheckCircle2 />{t("complete")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={isOpen && dialog === "cancel"} title={t("cancelTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} returnFocusRef={returnFocusRef} onClose={close}>
        <form onSubmit={handleCancel} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("cancelHelp")}</p>
            <Field label={t("cancelReason")} id="repair-cancel-reason" error={cancelErrors.message("reason")}>
              <Textarea
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  cancelErrors.clear("reason")
                }}
              />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{t("keep")}</AccessibleDialogCancel>
            <Button type="submit" variant="destructive" busy={saving}>
              <XCircle />{t("confirmCancel")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === "edit"} title={t("editTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} returnFocusRef={returnFocusRef} onClose={close}>
        <form onSubmit={handleEdit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("editHelp")}</p>
            <Field label={t("date")} id="repair-edit-date" required error={editErrors.message("reportedDate")}>
              <Input type="date" required value={edit.reportedDate} onChange={(event) => setEditField("reportedDate", event.target.value)} />
            </Field>
            <Field label={t("problem")} id="repair-edit-problem" required error={editErrors.message("problem")}>
              <Textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEditField("problem", event.target.value)} />
            </Field>
            <MaintenanceOptionSelect
              id="repair-edit-vendor"
              type="supplier"
              label={t("vendor")}
              value={edit.vendorId}
              initialOption={details.vendor ?? undefined}
              placeholder={t("vendorPlaceholder")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              error={editErrors.message("vendorId")}
              onChange={(value) => setEditField("vendorId", value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("cost")}
                id="repair-edit-cost"
                error={editErrors.errors.repairCost ? validationMessage(editErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEditField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-edit-invoice-no" error={editErrors.message("invoiceNo")}>
                <Input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEditField("invoiceNo", event.target.value)} />
              </Field>
            </div>
            <Field label={t("remark")} id="repair-edit-remark" error={editErrors.message("remark")}>
              <Textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEditField("remark", event.target.value)} className="min-h-16" />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{tCommon("back")}</AccessibleDialogCancel>
            <Button type="submit" busy={saving}>
              <CheckCircle2 />{tCommon("save")}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </RepairRecordActionsContext.Provider>
  )
}
