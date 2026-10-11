"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field, FieldRequiredMark } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"

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
  const [files, setFiles] = useState<File[]>([])
  const [values, setValues] = useState({
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

  function setField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
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
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {plan ? <FormContextBanner label={t("planLabel")} value={plan.label} /> : null}
        <MaintenanceOptionSelect
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
          onChange={(value) => setField("assetId", value)}
        />
        {openRecordAssetId ? (
          <p role="alert" className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
            {tMaintenance("errors.MAINTENANCE_OPEN_RECORD_EXISTS")}{" "}
            <Link
              href={`/${locale}/maintenance?assetId=${encodeURIComponent(openRecordAssetId)}&status=in_progress`}
              className={cn(linkVariants({ size: "inherit" }), "decoration-current")}
            >
              {t("openExistingRecord")}
            </Link>
          </p>
        ) : null}
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr]">
          <Field label={t("date")} required>
            <Input type="date" required value={values.reportedDate} onChange={(event) => setField("reportedDate", event.target.value)} />
          </Field>
          <Field label={t("problem")} required>
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
        <fieldset className="min-w-0">
          <legend className={cn(fieldLabelClasses, "mb-1.5")}>
            {t("doneQuestion")}<FieldRequiredMark />
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard type="radio" name="done" checked={values.done} label={t("doneYes")} onChange={() => setField("done", true)} />
            <ChoiceCard type="radio" name="done" checked={!values.done} label={t("doneNo")} onChange={() => setField("done", false)} />
          </div>
        </fieldset>
        {values.done ? (
          <fieldset className="min-w-0">
            <legend className={cn(fieldLabelClasses, "mb-1.5")}>
              {t("outcomeQuestion")}<FieldRequiredMark />
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "usable"} label={t("outcome.usable")} onChange={() => setField("outcome", "usable")} />
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onChange={() => setField("outcome", "beyond_repair")} />
            </div>
          </fieldset>
        ) : null}
        {effectKey ? (
          <p className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
            {t(`assetStatusEffect.${effectKey}`)}
          </p>
        ) : null}
        {needsReporter ? (
          <div>
            <MaintenanceOptionSelect
              type="employee"
              label={t("reporter")}
              value={values.reportedById}
              required
              placeholder={t("selectReporter")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              onChange={(value) => setField("reportedById", value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("reporterHelp")}</p>
          </div>
        ) : null}
        <div className="rounded-md border border-border">
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("moreDetails")}
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails ? (
            <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
              <MaintenanceOptionSelect
                type="supplier"
                label={t("vendor")}
                value={values.vendorId}
                initialOption={plan?.vendor ?? undefined}
                placeholder={t("vendorPlaceholder")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                onChange={(value) => setField("vendorId", value)}
              />
              <Field label={t("cost")}>
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={values.repairCost} onChange={(event) => setField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")}>
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
                <Field label={t("remark")}>
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
    </section>
  )
}
