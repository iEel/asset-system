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
import { maxLength, range, required, wholeNumber } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type PlanValues = { assetId: string; title: string; frequency: string; intervalDays: string; nextDueDate: string; vendorId: string; notes: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  assetId: "maintenance-plan-asset",
  title: "maintenance-plan-title",
  frequency: "maintenance-plan-frequency",
  intervalDays: "maintenance-plan-interval-days",
  nextDueDate: "maintenance-plan-next-due-date",
  vendorId: "maintenance-plan-vendor",
  notes: "maintenance-plan-notes",
} as const
type PlanField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as PlanField[]

// noValidate turns the browser's check off, so this restates the controls' required, min, max, step and maxLength, and
// the asset the server needs on create; an edit keeps its asset (the select is fixed and not sent) (v-track M-R2).
function validate(values: PlanValues, isEdit: boolean) {
  const errors: Partial<Record<PlanField, string>> = {}
  const check = (key: PlanField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", isEdit ? null : required(values.assetId))
  check("title", required(values.title) ?? maxLength(values.title, 200))
  check("frequency", required(values.frequency))
  // The days count only for a custom frequency: whole days from 1 to 3650.
  check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)
  check("nextDueDate", required(values.nextDueDate))
  check("notes", maxLength(values.notes, 4000))
  return errors
}

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
  const [values, setValues] = useState<PlanValues>({
    assetId: initialAsset?.id ?? "",
    title: initialValues?.title ?? "",
    frequency: initialValues?.frequency ?? "monthly",
    intervalDays: initialValues?.intervalDays ?? "30",
    nextDueDate: initialValues?.nextDueDate ?? toLocalDateInputValue(),
    vendorId: initialValues?.vendorId ?? "",
    notes: initialValues?.notes ?? "",
  })

  const fieldErrors = useFieldErrors<PlanField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends PlanField>(field: K, value: PlanValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // The days show only for a custom frequency, so a frequency change clears their error too.
    if (field === "frequency") fieldErrors.clear("frequency", "intervalDays")
    else fieldErrors.clear(field)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, Boolean(planId)))
    if (focusFirstError()) return
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
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      }
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
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MaintenanceOptionSelect
          id="maintenance-plan-asset"
          type="asset"
          label={t("asset")}
          value={values.assetId}
          required
          disabled={Boolean(planId)}
          initialOption={initialAsset}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          error={fieldErrors.message("assetId")}
          onChange={(value) => setField("assetId", value)}
        />
        <Field label={t("pmPlanTitle")} id="maintenance-plan-title" required error={fieldErrors.message("title")}>
          <Input
            value={values.title}
            required
            maxLength={200}
            onChange={(event) => setField("title", event.target.value)}
          />
        </Field>
        <Field label={t("pmFrequencyLabel")} id="maintenance-plan-frequency" required error={fieldErrors.message("frequency")}>
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
          <Field
            label={t("pmIntervalDays")}
            id="maintenance-plan-interval-days"
            required
            error={fieldErrors.errors.intervalDays ? validationMessage(fieldErrors.errors.intervalDays, { min: 1, max: 3650 }) : undefined}
          >
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
        <Field label={t("pmNextDueDate")} id="maintenance-plan-next-due-date" required error={fieldErrors.message("nextDueDate")}>
          <Input
            type="date"
            value={values.nextDueDate}
            required
            onChange={(event) => setField("nextDueDate", event.target.value)}
          />
        </Field>
        <MaintenanceOptionSelect
          id="maintenance-plan-vendor"
          type="supplier"
          label={t("pmExternalProvider")}
          value={values.vendorId}
          placeholder={t("pmNoExternalProvider")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          error={fieldErrors.message("vendorId")}
          onChange={(value) => setField("vendorId", value)}
        />
        <div className="md:col-span-2 xl:col-span-3">
          <Field label={t("pmNotes")} id="maintenance-plan-notes" error={fieldErrors.message("notes")}>
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
