"use client"

import Link from "next/link"
import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn } from "@/lib/utils"
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type RepairValues = {
  assetId: string
  reportedDate: string
  problem: string
  done: boolean
  outcome: Outcome
  reportedById: string
  vendorId: string
  repairCost: string
  invoiceNo: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The two
// questions are radio groups: their id is the FieldGroup's.
const FIELD_IDS = {
  assetId: "repair-record-asset",
  reportedDate: "repair-record-date",
  problem: "repair-record-problem",
  done: "repair-record-done",
  outcome: "repair-record-outcome",
  reportedById: "repair-record-reporter",
  vendorId: "repair-record-vendor",
  repairCost: "repair-record-cost",
  invoiceNo: "repair-record-invoice-no",
  remark: "repair-record-remark",
} as const
type RepairField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as RepairField[]
// The fields inside "more details", which opens before focus moves there (spec §4.2).
const DETAIL_FIELDS: readonly RepairField[] = ["vendorId", "repairCost", "invoiceNo", "remark"]

// The fields on screen: the outcome only when the repair is done, the reporter only for an account without an employee.
function fieldOrder(values: RepairValues, needsReporter: boolean) {
  return FIELD_ORDER.filter((key) => (key !== "outcome" || values.done) && (key !== "reportedById" || needsReporter))
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min and step, and the
// reporter the server needs from an account without a linked employee (MAINTENANCE_REPORTER_REQUIRED) (v-track M-R2).
function validate(values: RepairValues, needsReporter: boolean) {
  const errors: Partial<Record<RepairField, string>> = {}
  const check = (key: RepairField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("reportedDate", required(values.reportedDate))
  check("problem", required(values.problem) ?? maxLength(values.problem, 4000))
  check("reportedById", needsReporter ? required(values.reportedById) : null)
  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))
  check("invoiceNo", maxLength(values.invoiceNo, 100))
  check("remark", maxLength(values.remark, 4000))
  return errors
}

export function RepairRecordForm({
  locale,
  returnTo,
  initialAsset,
  plan,
  needsReporter,
}: {
  locale: string
  returnTo: string
  initialAsset?: Option
  plan?: { id: string; label: string; title: string; vendor: Option | null }
  needsReporter: boolean
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [openRecordAssetId, setOpenRecordAssetId] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(Boolean(plan?.vendor))
  const detailsId = useId()
  const [files, setFiles] = useState<File[]>([])
  const [values, setValues] = useState<RepairValues>({
    assetId: initialAsset?.id ?? "",
    reportedDate: toLocalDateInputValue(),
    problem: plan?.title ?? "",
    done: true,
    outcome: "usable" as Outcome,
    reportedById: "",
    vendorId: plan?.vendor?.id ?? "",
    repairCost: "",
    invoiceNo: "",
    remark: "",
  })
  const effectKey = !values.done ? "toMaintenance" : values.outcome === "beyond_repair" ? "toDisposal" : null
  const fieldErrors = useFieldErrors<RepairField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(values, needsReporter), {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (DETAIL_FIELDS.includes(key)) setShowDetails(true)
      },
    })

  function setField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    fieldErrors.clear(field)
  }

  // New picks append to the list; each file can be taken out before saving.
  function addFiles(next: File[]) {
    setFiles((current) => [...current, ...next])
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((_, index) => String(index) !== id))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, needsReporter))
    if (focusFirstError()) return
    setSaving(true)
    setOpenRecordAssetId(null)
    try {
      const response = await fetch("/api/maintenance-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          maintenancePlanId: plan?.id ?? null,
          problem: values.problem,
          reportedDate: values.reportedDate,
          done: values.done,
          outcome: values.outcome,
          reportedById: needsReporter ? values.reportedById || null : null,
          vendorId: values.vendorId || null,
          repairCost: values.repairCost || null,
          invoiceNo: values.invoiceNo || null,
          remark: values.remark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") setOpenRecordAssetId(values.assetId)
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      }
      const failed = await uploadRepairFiles(payload.id, files, values.done ? "after_repair" : "before_repair")
      if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))
      else toast.success(t("saved"))
      router.push(appendOperationalReturnTo(`/${locale}/maintenance/${payload.id}`, returnTo))
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentPanel>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {plan ? <FormContextBanner label={t("planLabel")} value={plan.label} /> : null}
        <MaintenanceOptionSelect
          id="repair-record-asset"
          type="asset"
          label={t("asset")}
          value={values.assetId}
          required
          disabled={Boolean(plan)}
          initialOption={initialAsset}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          formatReason={(code) => getMaintenanceErrorMessage(code, tMaintenance, code)}
          error={fieldErrors.message("assetId")}
          onChange={(value) => setField("assetId", value)}
        />
        {openRecordAssetId ? (
          <Notice tone="danger" role="alert">
            {tMaintenance("errors.MAINTENANCE_OPEN_RECORD_EXISTS")}{" "}
            <Link
              href={`/${locale}/maintenance?assetId=${encodeURIComponent(openRecordAssetId)}&status=in_progress`}
              className={cn(linkVariants({ size: "inherit" }), "decoration-current")}
            >
              {t("openExistingRecord")}
            </Link>
          </Notice>
        ) : null}
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr]">
          <Field label={t("date")} id="repair-record-date" required error={fieldErrors.message("reportedDate")}>
            <Input type="date" required value={values.reportedDate} onChange={(event) => setField("reportedDate", event.target.value)} />
          </Field>
          <Field label={t("problem")} id="repair-record-problem" required error={fieldErrors.message("problem")}>
            <Textarea
              required
              rows={3}
              maxLength={4000}
              value={values.problem}
              placeholder={t("problemPlaceholder")}
              onChange={(event) => setField("problem", event.target.value)}
            />
          </Field>
        </div>
        <FieldGroup legend={t("doneQuestion")} id="repair-record-done" required error={fieldErrors.message("done")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard type="radio" name="done" checked={values.done} label={t("doneYes")} onChange={() => setField("done", true)} />
            <ChoiceCard type="radio" name="done" checked={!values.done} label={t("doneNo")} onChange={() => setField("done", false)} />
          </div>
        </FieldGroup>
        {values.done ? (
          <FieldGroup legend={t("outcomeQuestion")} id="repair-record-outcome" required error={fieldErrors.message("outcome")}>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "usable"} label={t("outcome.usable")} onChange={() => setField("outcome", "usable")} />
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onChange={() => setField("outcome", "beyond_repair")} />
            </div>
          </FieldGroup>
        ) : null}
        {effectKey ? (
          <Notice tone="warning">
            {t(`assetStatusEffect.${effectKey}`)}
          </Notice>
        ) : null}
        {needsReporter ? (
          <MaintenanceOptionSelect
            id="repair-record-reporter"
            type="employee"
            label={t("reporter")}
            value={values.reportedById}
            required
            placeholder={t("selectReporter")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            loadingLabel={tCommon("loading")}
            hint={t("reporterHelp")}
            error={fieldErrors.message("reportedById")}
            onChange={(value) => setField("reportedById", value)}
          />
        ) : null}
        <div>
          <Button
            variant="outline"
            aria-expanded={showDetails}
            aria-controls={showDetails ? detailsId : undefined}
            onClick={() => setShowDetails((open) => !open)}
            className="w-full justify-between"
          >
            {t("moreDetails")}
            <ChevronDown aria-hidden="true" className={showDetails ? "rotate-180" : undefined} />
          </Button>
          {showDetails ? (
            <div id={detailsId} className="mt-3 grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-2">
              <MaintenanceOptionSelect
                id="repair-record-vendor"
                type="supplier"
                label={t("vendor")}
                value={values.vendorId}
                initialOption={plan?.vendor ?? undefined}
                placeholder={t("vendorPlaceholder")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                error={fieldErrors.message("vendorId")}
                onChange={(value) => setField("vendorId", value)}
              />
              <Field
                label={t("cost")}
                id="repair-record-cost"
                error={fieldErrors.errors.repairCost ? validationMessage(fieldErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={values.repairCost} onChange={(event) => setField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-record-invoice-no" error={fieldErrors.message("invoiceNo")}>
                <Input maxLength={100} value={values.invoiceNo} onChange={(event) => setField("invoiceNo", event.target.value)} />
              </Field>
              <Field label={t("files")} className="md:col-span-2">
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
              <div className="md:col-span-2">
                <Field label={t("remark")} id="repair-record-remark" error={fieldErrors.message("remark")}>
                  <Textarea rows={2} maxLength={4000} value={values.remark} onChange={(event) => setField("remark", event.target.value)} className="min-h-16" />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="submit" busy={saving} className="w-full sm:w-auto">
            <Save />
            {t("save")}
          </Button>
        </div>
      </form>
    </ContentPanel>
  )
}
