"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CalendarClock, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"

type Option = { id: string; label: string }

export function MaintenancePlanForm({
  locale,
  initialAsset,
  planId,
  initialValues,
}: {
  locale: string
  initialAsset?: Option
  planId?: string
  initialValues?: Partial<{
    title: string
    frequency: string
    intervalDays: string
    nextDueDate: string
    assignedToId: string
    vendorId: string
    notes: string
  }>
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    title: initialValues?.title ?? "",
    frequency: initialValues?.frequency ?? "monthly",
    intervalDays: initialValues?.intervalDays ?? "30",
    nextDueDate: initialValues?.nextDueDate ?? toLocalDateInputValue(),
    assignedToId: initialValues?.assignedToId ?? "",
    vendorId: initialValues?.vendorId ?? "",
    notes: initialValues?.notes ?? "",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(planId ? `/api/maintenance-plans/${planId}` : "/api/maintenance-plans", {
        method: planId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(planId ? { action: "update" } : { assetId: values.assetId }),
          title: values.title,
          frequency: values.frequency,
          intervalDays: values.frequency === "custom" ? values.intervalDays : null,
          nextDueDate: values.nextDueDate,
          assignedToId: values.assignedToId || null,
          vendorId: values.vendorId || null,
          notes: values.notes || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t("pmCreateSuccess"))
      router.push(`/${locale}/maintenance?view=pm`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-base font-semibold text-foreground">
        <CalendarClock className="h-5 w-5 text-primary" />
        {t("pmCreateTitle")}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MaintenanceOptionSelect type="asset" label={t("asset")} value={values.assetId} required disabled={Boolean(planId)} initialOption={initialAsset} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={t("loading")} onChange={(value) => setField("assetId", value)} />
        <Field label={t("pmPlanTitle")} required>
          <input
            value={values.title}
            required
            maxLength={200}
            onChange={(event) => setField("title", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("pmFrequencyLabel")} required>
          <select
            value={values.frequency}
            required
            onChange={(event) => setField("frequency", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="monthly">{t("pmFrequencyMonthly")}</option>
            <option value="quarterly">{t("pmFrequencyQuarterly")}</option>
            <option value="yearly">{t("pmFrequencyYearly")}</option>
            <option value="custom">{t("pmFrequencyCustom")}</option>
          </select>
        </Field>
        {values.frequency === "custom" ? (
          <Field label={t("pmIntervalDays")} required>
            <input
              type="number"
              min="1"
              max="3650"
              value={values.intervalDays}
              required
              onChange={(event) => setField("intervalDays", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        ) : null}
        <Field label={t("pmNextDueDate")} required>
          <input
            type="date"
            value={values.nextDueDate}
            required
            onChange={(event) => setField("nextDueDate", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <MaintenanceOptionSelect type="employee" label={t("pmInternalResponsible")} value={values.assignedToId} placeholder={t("unassigned")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={t("loading")} onChange={(value) => setField("assignedToId", value)} />
        <MaintenanceOptionSelect type="supplier" label={t("pmExternalProvider")} value={values.vendorId} placeholder={t("pmNoExternalProvider")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={t("loading")} onChange={(value) => setField("vendorId", value)} />
        <div className="md:col-span-2 xl:col-span-3">
          <Field label={t("pmNotes")}>
            <textarea
              value={values.notes}
              rows={3}
              maxLength={4000}
              onChange={(event) => setField("notes", event.target.value)}
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
        <div className="flex justify-end md:col-span-2 xl:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
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
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
