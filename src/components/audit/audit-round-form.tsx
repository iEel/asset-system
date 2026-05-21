"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { filterAuditStatusOptions } from "@/lib/audit-round-scope"

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
  sampleRate: number
  riskPreset: string
  previewAssets: Array<{ id: string; assetTag: string; name: string }>
}

const riskPresetValues = ["all", "data_quality", "high_value", "stale_movement", "repair_history", "license_expiring"] as const

export function AuditRoundForm({ options }: { options: AuditRoundOptions }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<AuditRoundPreview | null>(null)
  const [values, setValues] = useState({
    name: "",
    auditYear: String(new Date().getFullYear()),
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

  function setField(field: string, value: string | boolean) {
    setPreview(null)
    setValues((current) => ({ ...current, [field]: value }))
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
        body: JSON.stringify(emptyToNull(values)),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      setPreview(payload as AuditRoundPreview)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/audit-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptyToNull(values)),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("createSuccess", { count: payload.generatedItems ?? 0 }))
      router.push(`/${locale}/audit/rounds/${payload.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
      </div>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("name")} required>
            <input value={values.name} onChange={(event) => setField("name", event.target.value)} required maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("auditYear")} required>
            <input type="number" value={values.auditYear} onChange={(event) => setField("auditYear", event.target.value)} required min={2000} max={2100} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("startDate")} required>
            <input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("endDate")} required>
            <input type="date" value={values.endDate} onChange={(event) => setField("endDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Select label={t("status")} value={values.status} required onChange={(value) => setField("status", value)}>
            <option value="draft">{t("statusDraft")}</option>
            <option value="open">{t("statusOpen")}</option>
          </Select>
          <div />
          <div className="md:col-span-2 rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">{t("riskSampling")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("riskSamplingHelp")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label={t("riskPreset")} value={values.riskPreset} onChange={(value) => setField("riskPreset", value)}>
                {riskPresetValues.map((preset) => (
                  <option key={preset} value={preset}>
                    {t(`riskPreset_${preset}`)}
                  </option>
                ))}
              </Select>
              <Field label={t("sampleRate")} required>
                <input
                  type="number"
                  value={values.sampleRate}
                  onChange={(event) => setField("sampleRate", event.target.value)}
                  required
                  min={1}
                  max={100}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t("sampleRateHelp")}</p>
              </Field>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{t("previewTitle")}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("previewHelp")}</div>
              </div>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                {t("preview")}
              </button>
            </div>
            {preview ? (
              <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <PreviewMetric label={t("previewMatched")} value={String(preview.matchedAssets)} />
                  <PreviewMetric label={t("previewSampled")} value={String(preview.sampledAssets)} />
                  <PreviewMetric label={t("previewSampleRate")} value={`${preview.sampleRate}%`} />
                  <PreviewMetric label={t("previewRisk")} value={t(`riskPreset_${preview.riskPreset}`)} />
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("previewAssets")}</div>
                  {preview.previewAssets.length > 0 ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {preview.previewAssets.map((asset) => (
                        <div key={asset.id} className="rounded-md border border-border bg-surface px-3 py-2">
                          <div className="text-sm font-semibold text-foreground">{asset.assetTag}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">{t("previewEmpty")}</p>
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
          <label className="md:col-span-2 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
            <input
              type="checkbox"
              checked={values.includeClosedAssets}
              onChange={(event) => setIncludeClosedAssets(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{t("includeClosedAssets")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("includeClosedAssetsHelp")}</span>
            </span>
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving || previewing} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {tCommon("save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function isClosedStatusId(statuses: Option[], statusId: string) {
  return Boolean(statusId) && statuses.some((status) => status.id === statusId && status.isClosed)
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  )
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

function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        {children}
      </select>
    </Field>
  )
}
