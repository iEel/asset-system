"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Pencil, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field, FieldRequiredMark } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type Dialog = "complete" | "cancel" | "edit" | null

export function RepairRecordActions({
  recordId,
  repairNo,
  expectedUpdatedAt,
  isOpen,
  details,
}: {
  recordId: string
  repairNo: string
  expectedUpdatedAt: string
  isOpen: boolean
  details: { reportedDate: string; problem: string; vendor: Option | null; repairCost: string; invoiceNo: string; remark: string }
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [complete, setComplete] = useState({
    returnDate: toLocalDateInputValue(),
    outcome: "usable" as Outcome,
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

  function close() {
    if (saving) return
    setDialog(null)
    setFiles([])
  }

  // New picks append to the list; each file can be taken out before saving.
  function addFiles(next: File[]) {
    setFiles((current) => [...current, ...next])
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((_, index) => String(index) !== id))
  }

  async function send(body: Record<string, unknown>, successKey: "completed" | "cancelled" | "updated") {
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedUpdatedAt }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
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

  return (
    <>
      {isOpen ? (
        <>
          <Button onClick={() => setDialog("complete")}>
            <CheckCircle2 />{t("complete")}
          </Button>
          <Button variant="danger" onClick={() => setDialog("cancel")}>
            <XCircle />{t("cancel")}
          </Button>
        </>
      ) : null}
      <Button variant="outline" onClick={() => setDialog("edit")}>
        <Pencil />{t("edit")}
      </Button>

      <AccessibleDialog open={dialog === "complete"} title={t("completeTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} onClose={close}>
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "complete",
              returnDate: complete.returnDate,
              outcome: complete.outcome,
              vendorId: complete.vendorId || null,
              repairCost: complete.repairCost || null,
              invoiceNo: complete.invoiceNo || null,
              remark: complete.remark || null,
            }, "completed")
          }}
        >
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("completeHelp")}</p>
            <Field label={t("returnDate")} required>
              <Input type="date" required value={complete.returnDate} onChange={(event) => setComplete((v) => ({ ...v, returnDate: event.target.value }))} />
            </Field>
            <fieldset className="min-w-0">
              <legend className={cn(fieldLabelClasses, "mb-1.5")}>{t("outcomeQuestion")}<FieldRequiredMark /></legend>
              <div className="grid gap-2">
                {(["usable", "beyond_repair"] as const).map((outcome) => (
                  <ChoiceCard key={outcome} type="radio" name="outcome" checked={complete.outcome === outcome} label={t(`outcome.${outcome}`)} onChange={() => setComplete((v) => ({ ...v, outcome }))} />
                ))}
              </div>
            </fieldset>
            <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={complete.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setComplete((v) => ({ ...v, vendorId: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("cost")}>
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setComplete((v) => ({ ...v, repairCost: event.target.value }))} />
              </Field>
              <Field label={t("invoiceNo")}>
                <Input maxLength={100} value={complete.invoiceNo} onChange={(event) => setComplete((v) => ({ ...v, invoiceNo: event.target.value }))} />
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
                    description={t("filesHelp")}
                    browseLabel={t("dropFilesHint")}
                  />
                  <FileQueueList items={files.map((file, index) => ({ id: String(index), name: file.name }))} disabled={saving} onRemove={removeFile} />
                </div>
              )}
            </Field>
            <Field label={t("remark")}>
              <Textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setComplete((v) => ({ ...v, remark: event.target.value }))} className="min-h-16" />
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

      <AccessibleDialog open={dialog === "cancel"} title={t("cancelTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} onClose={close}>
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({ action: "cancel", reason: reason.trim() || null }, "cancelled")
          }}
        >
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("cancelHelp")}</p>
            <Field label={t("cancelReason")}>
              <Textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
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

      <AccessibleDialog open={dialog === "edit"} title={t("editTitle")} description={<span className="tag">{repairNo}</span>} busy={saving} onClose={close}>
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "update",
              reportedDate: edit.reportedDate,
              problem: edit.problem,
              vendorId: edit.vendorId || null,
              repairCost: edit.repairCost || null,
              invoiceNo: edit.invoiceNo || null,
              remark: edit.remark || null,
            }, "updated")
          }}
        >
          <AccessibleDialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("editHelp")}</p>
            <Field label={t("date")} required>
              <Input type="date" required value={edit.reportedDate} onChange={(event) => setEdit((v) => ({ ...v, reportedDate: event.target.value }))} />
            </Field>
            <Field label={t("problem")} required>
              <Textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEdit((v) => ({ ...v, problem: event.target.value }))} />
            </Field>
            <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={edit.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setEdit((v) => ({ ...v, vendorId: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("cost")}>
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEdit((v) => ({ ...v, repairCost: event.target.value }))} />
              </Field>
              <Field label={t("invoiceNo")}>
                <Input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEdit((v) => ({ ...v, invoiceNo: event.target.value }))} />
              </Field>
            </div>
            <Field label={t("remark")}>
              <Textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEdit((v) => ({ ...v, remark: event.target.value }))} className="min-h-16" />
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
    </>
  )
}
