"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ClipboardList, Save } from "lucide-react"
import { toast } from "sonner"
import { filterAuditStatusOptions } from "@/lib/audit-round-scope"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { displayYearRange, fromDisplayYear, toDisplayYear } from "@/lib/display-year"
import { cn } from "@/lib/utils"
import { maxLength, notBefore, range, required } from "@/lib/validation-rules"

type Option = { id: string; label: string; isClosed?: boolean }

type AuditRoundOptions = {
  companies: Option[]
  branches: Option[]
  departments: Option[]
  locations: Option[]
  categories: Option[]
  employees: Option[]
  statuses: Option[]
  conditions: Option[]
}

type AuditRoundPreview = {
  matchedAssets: number
  sampledAssets: number
  componentItems?: number
  sampleRate: number
  riskPreset: string
  previewAssets: Array<{
    id: string
    assetTag: string
    name: string
    includedVia?: "direct" | "component"
    parentAssetTag?: string | null
  }>
}

const riskPresetValues = ["all", "data_quality", "high_value", "stale_movement", "repair_history", "license_expiring"] as const

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The scope
// selects send optional ids the server never refuses, so they stay out.
const FIELD_IDS = {
  name: "audit-round-name",
  auditYear: "audit-round-year",
  startDate: "audit-round-start-date",
  endDate: "audit-round-end-date",
  status: "audit-round-status",
  riskPreset: "audit-round-risk-preset",
  sampleRate: "audit-round-sample-rate",
} as const
type AuditRoundField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as AuditRoundField[]

// A number field's step is 1 unless it says otherwise, and the browser checked it before noValidate; the server's year
// and sample rate are whole numbers too (v-track U-R3).
function wholeNumber(value: string) {
  return Number.isInteger(Number(value.trim())) ? null : "invalidNumber"
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, max and step, and
// the end date not before the start date, the server's endBeforeStart (spec §7.4; v-track M-R2, U-R1).
function validate(
  values: { name: string; auditYear: string; startDate: string; endDate: string; status: string; sampleRate: string },
  yearRange: { min: number; max: number },
): Partial<Record<AuditRoundField, string>> {
  const errors: Partial<Record<AuditRoundField, string>> = {}
  const check = (key: AuditRoundField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))
  check("startDate", required(values.startDate))
  check("endDate", required(values.endDate) ?? notBefore(values.endDate, values.startDate))
  check("status", required(values.status))
  check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))
  return errors
}

export function AuditRoundForm({ options }: { options: AuditRoundOptions }) {
  const locale = useLocale()
  const yearRange = displayYearRange(locale)
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<AuditRoundPreview | null>(null)
  const fieldErrors = useFieldErrors<AuditRoundField>()
  const validationMessage = useValidationMessage()
  const [values, setValues] = useState({
    name: "",
    auditYear: String(toDisplayYear(new Date().getFullYear(), locale)),
    scopeCompanyId: "",
    scopeBranchId: "",
    scopeDepartmentId: "",
    scopeLocationId: "",
    scopeCategoryId: "",
    scopeCustodianId: "",
    scopeStatusId: "",
    scopeConditionId: "",
    includeClosedAssets: false,
    riskPreset: "all",
    sampleRate: "100",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: "draft",
  })
  const statusOptions = filterAuditStatusOptions(options.statuses, values.includeClosedAssets)
  const componentItems = preview?.componentItems ?? 0
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // The field shows the reader's calendar year; the API stores Gregorian.
  function requestBody() {
    return { ...emptyToNull(values), auditYear: fromDisplayYear(Number(values.auditYear), locale) }
  }

  function setField(field: string, value: string | boolean) {
    setPreview(null)
    setValues((current) => ({ ...current, [field]: value }))
    // The date pair clears together: either date can fix "end before start" (spec §4.3).
    if (field === "startDate" || field === "endDate") fieldErrors.clear("startDate", "endDate")
    else if (field in FIELD_IDS) fieldErrors.clear(field as AuditRoundField)
  }

  function setIncludeClosedAssets(checked: boolean) {
    setPreview(null)
    setValues((current) => ({
      ...current,
      includeClosedAssets: checked,
      scopeStatusId: checked || !isClosedStatusId(options.statuses, current.scopeStatusId) ? current.scopeStatusId : "",
    }))
  }

  async function handlePreview() {
    setPreviewing(true)
    try {
      const response = await fetch("/api/audit-rounds/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody()),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // The preview sends the round's body: a refusal that names a field shows under it, like save's (v-track U-R2).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      setPreview(payload as AuditRoundPreview)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, yearRange))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch("/api/audit-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody()),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("createSuccess", { count: payload.generatedItems ?? 0 }))
      router.push(`/${locale}/audit/rounds/${payload.id}`)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("createTitle")} className="mb-6" />
        <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2")}>
          <Field label={t("name")} id="audit-round-name" required error={fieldErrors.message("name")}>
            <Input value={values.name} onChange={(event) => setField("name", event.target.value)} required maxLength={200} />
          </Field>
          <Field
            label={t("auditYear")}
            id="audit-round-year"
            required
            error={fieldErrors.errors.auditYear ? validationMessage(fieldErrors.errors.auditYear, yearRange) : undefined}
          >
            <Input type="number" value={values.auditYear} onChange={(event) => setField("auditYear", event.target.value)} required min={yearRange.min} max={yearRange.max} />
          </Field>
          {/* The pair limits each other's picker (spec §7.4), as the disposal list's date filter does. */}
          <Field label={t("startDate")} id="audit-round-start-date" required error={fieldErrors.message("startDate")}>
            <Input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} required max={values.endDate} />
          </Field>
          <Field label={t("endDate")} id="audit-round-end-date" required error={fieldErrors.message("endDate")}>
            <Input type="date" value={values.endDate} onChange={(event) => setField("endDate", event.target.value)} required min={values.startDate} />
          </Field>
          <Select label={t("status")} id="audit-round-status" value={values.status} required error={fieldErrors.message("status")} onChange={(value) => setField("status", value)}>
            <option value="draft">{t("statusDraft")}</option>
            <option value="open">{t("statusOpen")}</option>
          </Select>
          <div />
          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">{t("riskSampling")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("riskSamplingHelp")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label={t("riskPreset")} id="audit-round-risk-preset" value={values.riskPreset} error={fieldErrors.message("riskPreset")} onChange={(value) => setField("riskPreset", value)}>
                {riskPresetValues.map((preset) => (
                  <option key={preset} value={preset}>
                    {t(`riskPreset_${preset}`)}
                  </option>
                ))}
              </Select>
              <Field
                label={t("sampleRate")}
                id="audit-round-sample-rate"
                required
                hint={t("sampleRateHelp")}
                error={fieldErrors.errors.sampleRate ? validationMessage(fieldErrors.errors.sampleRate, { min: 1, max: 100 }) : undefined}
              >
                <Input
                  type="number"
                  value={values.sampleRate}
                  onChange={(event) => setField("sampleRate", event.target.value)}
                  required
                  min={1}
                  max={100}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{t("previewTitle")}</div>
                <div className="mt-1 text-meta text-muted-foreground">{t("previewHelp")}</div>
              </div>
              <Button variant="outline" busy={previewing} onClick={handlePreview}>
                <ClipboardList aria-hidden="true" />
                {t("preview")}
              </Button>
            </div>
            {preview ? (
              <div className="mt-4 space-y-4">
                <StatStrip
                  items={[
                    { key: "matched", label: t("previewMatched"), value: formatCount(preview.matchedAssets) },
                    { key: "sampled", label: t("previewSampled"), value: formatCount(preview.sampledAssets) },
                    { key: "componentItems", label: t("previewComponentItems"), value: formatCount(componentItems) },
                    { key: "sampleRate", label: t("previewSampleRate"), value: `${formatCount(preview.sampleRate)}%` },
                  ]}
                />
                <KeyValueList items={[{ key: "risk", label: t("previewRisk"), value: t(`riskPreset_${preview.riskPreset}`) }]} />
                {componentItems > 0 ? (
                  <Notice tone="info">{t("previewComponentHelp", { count: componentItems })}</Notice>
                ) : null}
                <div>
                  <div className="text-meta font-medium text-muted-foreground">{t("previewAssets")}</div>
                  {preview.previewAssets.length > 0 ? (
                    <ul className="mt-2 grid gap-x-4 gap-y-3 md:grid-cols-2">
                      {preview.previewAssets.map((asset) => (
                        <li key={asset.id} className="min-w-0">
                          <div className="text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
                          <div className="mt-0.5 truncate text-meta text-muted-foreground">{asset.name}</div>
                          {asset.includedVia === "component" && asset.parentAssetTag ? (
                            <div className="mt-1 text-meta text-muted-foreground">
                              {t("previewComponentFromParent", { assetTag: asset.parentAssetTag })}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyNote className="mt-2">{t("previewEmpty")}</EmptyNote>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <Select label={t("scopeCompany")} value={values.scopeCompanyId} onChange={(value) => setField("scopeCompanyId", value)}>
            <OptionList emptyLabel={t("all")} options={options.companies} />
          </Select>
          <Select label={t("scopeBranch")} value={values.scopeBranchId} onChange={(value) => setField("scopeBranchId", value)}>
            <OptionList emptyLabel={t("all")} options={options.branches} />
          </Select>
          <Select label={t("scopeDepartment")} value={values.scopeDepartmentId} onChange={(value) => setField("scopeDepartmentId", value)}>
            <OptionList emptyLabel={t("all")} options={options.departments} />
          </Select>
          <Select label={t("scopeLocation")} value={values.scopeLocationId} onChange={(value) => setField("scopeLocationId", value)}>
            <OptionList emptyLabel={t("all")} options={options.locations} />
          </Select>
          <Select label={t("scopeCategory")} value={values.scopeCategoryId} onChange={(value) => setField("scopeCategoryId", value)}>
            <OptionList emptyLabel={t("all")} options={options.categories} />
          </Select>
          <Select label={t("scopeCustodian")} value={values.scopeCustodianId} onChange={(value) => setField("scopeCustodianId", value)}>
            <OptionList emptyLabel={t("all")} options={options.employees} />
          </Select>
          <Select label={t("scopeStatus")} value={values.scopeStatusId} onChange={(value) => setField("scopeStatusId", value)}>
            <OptionList emptyLabel={t("all")} options={statusOptions} />
          </Select>
          <Select label={t("scopeCondition")} value={values.scopeConditionId} onChange={(value) => setField("scopeConditionId", value)}>
            <OptionList emptyLabel={t("all")} options={options.conditions} />
          </Select>
          <ChoiceCard
            type="checkbox"
            className="md:col-span-2"
            label={t("includeClosedAssets")}
            description={t("includeClosedAssetsHelp")}
            checked={values.includeClosedAssets}
            onChange={(event) => setIncludeClosedAssets(event.target.checked)}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" busy={saving} disabled={previewing}>
              <Save aria-hidden="true" />
              {tCommon("save")}
            </Button>
          </div>
        </form>
    </div>
  )
}

function isClosedStatusId(statuses: Option[], statusId: string) {
  return Boolean(statusId) && statuses.some((status) => status.id === statusId && status.isClosed)
}

function emptyToNull(values: Record<string, string | boolean>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value])
  )
}

function OptionList({ emptyLabel, options }: { emptyLabel: string; options: Option[] }) {
  return (
    <>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </>
  )
}

function Select({
  label,
  id,
  value,
  required,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  error?: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
