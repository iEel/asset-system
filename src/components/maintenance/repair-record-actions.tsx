"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Pencil, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type Dialog = "complete" | "cancel" | "edit" | null

const inputClass = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const textareaClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {isOpen ? (
        <>
          <button type="button" onClick={() => setDialog("complete")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <CheckCircle2 className="h-4 w-4" />{t("complete")}
          </button>
          <button type="button" onClick={() => setDialog("cancel")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/40 bg-surface px-4 text-sm font-medium text-danger hover:bg-danger/10">
            <XCircle className="h-4 w-4" />{t("cancel")}
          </button>
        </>
      ) : null}
      <button type="button" onClick={() => setDialog("edit")} className={secondaryButton}>
        <Pencil className="h-4 w-4" />{t("edit")}
      </button>

      <AccessibleDialog open={dialog === "complete"} title={t("completeTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
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
          <p className="text-sm text-muted-foreground">{t("completeHelp")}</p>
          <Field label={t("returnDate")} required>
            <input type="date" required value={complete.returnDate} onChange={(event) => setComplete((v) => ({ ...v, returnDate: event.target.value }))} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">{t("outcomeQuestion")}<span className="ml-1 text-danger">*</span></legend>
            <div className="grid gap-2">
              {(["usable", "beyond_repair"] as const).map((outcome) => (
                <label key={outcome} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm ${complete.outcome === outcome ? "border-primary bg-primary/5 font-medium" : "border-border text-muted-foreground"}`}>
                  <input type="radio" name="outcome" checked={complete.outcome === outcome} onChange={() => setComplete((v) => ({ ...v, outcome }))} className="h-4 w-4 accent-primary" />
                  {t(`outcome.${outcome}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={complete.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setComplete((v) => ({ ...v, vendorId: value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cost")}>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setComplete((v) => ({ ...v, repairCost: event.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("invoiceNo")}>
              <input maxLength={100} value={complete.invoiceNo} onChange={(event) => setComplete((v) => ({ ...v, invoiceNo: event.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label={t("files")}>
            <input type="file" multiple accept="image/*,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-sm" />
          </Field>
          <Field label={t("remark")}>
            <textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setComplete((v) => ({ ...v, remark: event.target.value }))} className={textareaClass} />
          </Field>
          <DialogButtons saving={saving} onBack={close} backLabel={tCommon("back")} submitLabel={t("complete")} />
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === "cancel"} title={t("cancelTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void send({ action: "cancel", reason: reason.trim() || null }, "cancelled")
          }}
        >
          <p className="text-sm text-muted-foreground">{t("cancelHelp")}</p>
          <Field label={t("cancelReason")}>
            <textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} />
          </Field>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={close} disabled={saving} className={secondaryButton}>{t("keep")}</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{t("confirmCancel")}
            </button>
          </div>
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === "edit"} title={t("editTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
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
          <p className="text-sm text-muted-foreground">{t("editHelp")}</p>
          <Field label={t("date")} required>
            <input type="date" required value={edit.reportedDate} onChange={(event) => setEdit((v) => ({ ...v, reportedDate: event.target.value }))} className={inputClass} />
          </Field>
          <Field label={t("problem")} required>
            <textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEdit((v) => ({ ...v, problem: event.target.value }))} className={textareaClass} />
          </Field>
          <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={edit.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setEdit((v) => ({ ...v, vendorId: value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cost")}>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEdit((v) => ({ ...v, repairCost: event.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("invoiceNo")}>
              <input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEdit((v) => ({ ...v, invoiceNo: event.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label={t("remark")}>
            <textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEdit((v) => ({ ...v, remark: event.target.value }))} className={textareaClass} />
          </Field>
          <DialogButtons saving={saving} onBack={close} backLabel={tCommon("back")} submitLabel={tCommon("save")} />
        </form>
      </AccessibleDialog>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function DialogButtons({ saving, onBack, backLabel, submitLabel }: { saving: boolean; onBack: () => void; backLabel: string; submitLabel: string }) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row">
      <button type="button" onClick={onBack} disabled={saving} className={secondaryButton}>{backLabel}</button>
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{submitLabel}
      </button>
    </div>
  )
}
