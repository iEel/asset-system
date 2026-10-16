"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }

export function MaintenancePlanForm({
  locale,
  initialAsset,
  planId,
  initialValues,
  returnHref = `/${locale}/maintenance/pm`,
}: {
  locale: string
  initialAsset?: Option
  planId?: string
  initialValues?: Partial<{
    title: string
    frequency: string
    intervalDays: string
    nextDueDate: string
    vendorId: string
    notes: string
  }>
  // Where a save goes: the edit page passes the PM list page it was opened from (its returnTo, spec 2B B4).
  returnHref?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    title: initialValues?.title ?? "",
    frequency: initialValues?.frequency ?? "monthly",
    intervalDays: initialValues?.intervalDays ?? "30",
    nextDueDate: initialValues?.nextDueDate ?? toLocalDateInputValue(),
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
          vendorId: values.vendorId || null,
          notes: values.notes || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t("pmCreateSuccess"))
      router.push(returnHref)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentPanel>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MaintenanceOptionSelect type="asset" label={t("asset")} value={values.assetId} required disabled={Boolean(planId)} initialOption={initialAsset} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setField("assetId", value)} />
        <Field label={t("pmPlanTitle")} required>
          <Input
            value={values.title}
            required
            maxLength={200}
            onChange={(event) => setField("title", event.target.value)}
          />
        </Field>
        <Field label={t("pmFrequencyLabel")} required>
          <NativeSelect
            value={values.frequency}
            required
            onChange={(event) => setField("frequency", event.target.value)}
          >
            <option value="monthly">{t("pmFrequencyMonthly")}</option>
            <option value="quarterly">{t("pmFrequencyQuarterly")}</option>
            <option value="yearly">{t("pmFrequencyYearly")}</option>
            <option value="custom">{t("pmFrequencyCustom")}</option>
          </NativeSelect>
        </Field>
        {values.frequency === "custom" ? (
          <Field label={t("pmIntervalDays")} required>
            <Input
              type="number"
              min="1"
              max="3650"
              value={values.intervalDays}
              required
              onChange={(event) => setField("intervalDays", event.target.value)}
            />
          </Field>
        ) : null}
        <Field label={t("pmNextDueDate")} required>
          <Input
            type="date"
            value={values.nextDueDate}
            required
            onChange={(event) => setField("nextDueDate", event.target.value)}
          />
        </Field>
        <MaintenanceOptionSelect type="supplier" label={t("pmExternalProvider")} value={values.vendorId} placeholder={t("pmNoExternalProvider")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setField("vendorId", value)} />
        <div className="md:col-span-2 xl:col-span-3">
          <Field label={t("pmNotes")}>
            <Textarea
              value={values.notes}
              rows={3}
              maxLength={4000}
              onChange={(event) => setField("notes", event.target.value)}
              className="min-h-20"
            />
          </Field>
        </div>
        <div className="flex justify-end md:col-span-2 xl:col-span-3">
          <Button type="submit" busy={saving} className="w-full sm:w-auto">
            <Save />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </ContentPanel>
  )
}
