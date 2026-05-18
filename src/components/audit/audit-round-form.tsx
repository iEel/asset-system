"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type Option = { id: string; label: string }

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

const riskPresetValues = ["all", "data_quality", "high_value", "stale_movement", "repair_history", "license_expiring"] as const

export function AuditRoundForm({ options }: { options: AuditRoundOptions }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
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
    riskPreset: "all",
    sampleRate: "100",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: "draft",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
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
            <OptionList emptyLabel={t("all")} options={options.statuses} />
          </Select>
          <Select label={t("scopeCondition")} value={values.scopeConditionId} onChange={(value) => setField("scopeConditionId", value)}>
            <OptionList emptyLabel={t("all")} options={options.conditions} />
          </Select>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {tCommon("save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function emptyToNull(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value]))
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
