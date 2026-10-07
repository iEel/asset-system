"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"

const inputClass = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const textareaClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
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
          <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
            {tMaintenance("errors.MAINTENANCE_OPEN_RECORD_EXISTS")}{" "}
            <Link
              href={`/${locale}/maintenance?assetId=${encodeURIComponent(openRecordAssetId)}&status=in_progress`}
              className="font-medium underline underline-offset-2"
            >
              {t("openExistingRecord")}
            </Link>
          </p>
        ) : null}
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr]">
          <Field label={t("date")} required>
            <input type="date" required value={values.reportedDate} onChange={(event) => setField("reportedDate", event.target.value)} className={inputClass} />
          </Field>
          <Field label={t("problem")} required>
            <textarea
              required
              rows={3}
              maxLength={4000}
              value={values.problem}
              placeholder={t("problemPlaceholder")}
              onChange={(event) => setField("problem", event.target.value)}
              className={`min-h-24 ${textareaClass}`}
            />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t("doneQuestion")}<span className="ml-1 text-danger">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice name="done" checked={values.done} label={t("doneYes")} onSelect={() => setField("done", true)} />
            <Choice name="done" checked={!values.done} label={t("doneNo")} onSelect={() => setField("done", false)} />
          </div>
        </fieldset>
        {values.done ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              {t("outcomeQuestion")}<span className="ml-1 text-danger">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice name="outcome" checked={values.outcome === "usable"} label={t("outcome.usable")} onSelect={() => setField("outcome", "usable")} />
              <Choice name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onSelect={() => setField("outcome", "beyond_repair")} />
            </div>
          </fieldset>
        ) : null}
        {effectKey ? (
          <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
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
                <input type="number" min="0" step="0.01" inputMode="decimal" value={values.repairCost} onChange={(event) => setField("repairCost", event.target.value)} className={inputClass} />
              </Field>
              <Field label={t("invoiceNo")}>
                <input maxLength={100} value={values.invoiceNo} onChange={(event) => setField("invoiceNo", event.target.value)} className={inputClass} />
              </Field>
              <Field label={t("files")}>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-sm"
                />
                <span className="mt-1 block text-xs text-muted-foreground">{t("filesHelp")}</span>
              </Field>
              <div className="md:col-span-2">
                <Field label={t("remark")}>
                  <textarea rows={2} maxLength={4000} value={values.remark} onChange={(event) => setField("remark", event.target.value)} className={textareaClass} />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("save")}
          </button>
        </div>
      </form>
    </section>
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

function Choice({ name, checked, label, onSelect }: { name: string; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
        checked ? "border-primary bg-primary-soft font-medium text-foreground" : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-primary" />
      {label}
    </label>
  )
}
