"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, ScanLine, Save } from "lucide-react"
import { toast } from "sonner"

type Option = { id: string; label: string }
type AuditScanItem = {
  id: string
  assetId: string
  label: string
  auditStatus: string
  auditResult: string | null
  expectedDepartmentId: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedConditionId: string | null
}

type AuditScanOptions = {
  locations: Option[]
  departments: Option[]
  employees: Option[]
  conditions: Option[]
}

export function AuditScanForm({
  roundId,
  roundName,
  items,
  options,
}: {
  roundId: string
  roundName: string
  items: AuditScanItem[]
  options: AuditScanOptions
}) {
  const router = useRouter()
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [values, setValues] = useState({
    assetId: "",
    actualLocationId: "",
    actualCustodianId: "",
    actualDepartmentId: "",
    actualConditionId: "",
    remark: "",
  })

  const selectedItem = useMemo(() => items.find((item) => item.assetId === values.assetId), [items, values.assetId])
  const mismatchPreview = useMemo(() => {
    if (!selectedItem) return []
    const actual = getActualValues(values, selectedItem)
    return [
      actual.actualLocationId !== selectedItem.expectedLocationId ? t("wrongLocation") : null,
      (actual.actualCustodianId || null) !== selectedItem.expectedCustodianId ? t("wrongCustodian") : null,
      (actual.actualDepartmentId || null) !== selectedItem.expectedDepartmentId ? t("wrongDepartment") : null,
      (actual.actualConditionId || null) !== selectedItem.expectedConditionId ? t("wrongCondition") : null,
    ].filter(Boolean)
  }, [selectedItem, t, values])

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          ...emptyToNull(getActualValues(values, selectedItem)),
          scanSource: "manual",
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      setLastResult(payload.auditResult ?? null)
      toast.success(payload.auditResult === "found" ? t("foundSuccess") : t("mismatchSuccess"))
      setValues({
        assetId: "",
        actualLocationId: "",
        actualCustodianId: "",
        actualDepartmentId: "",
        actualConditionId: "",
        remark: "",
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{roundName}</p>
        </div>
        {lastResult && (
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {t("lastResult")}: {lastResult}
          </div>
        )}
      </div>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Select label={t("asset")} value={values.assetId} required onChange={(value) => setField("assetId", value)}>
              <option value="">{t("selectAsset")}</option>
              {items.map((item) => (
                <option key={item.id} value={item.assetId}>
                  {item.label} {item.auditStatus !== "pending" ? `(${item.auditStatus})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <Select label={t("actualLocation")} value={values.actualLocationId || selectedItem?.expectedLocationId || ""} required onChange={(value) => setField("actualLocationId", value)}>
            <OptionList options={options.locations} />
          </Select>
          <Select label={t("actualCustodian")} value={values.actualCustodianId || selectedItem?.expectedCustodianId || ""} onChange={(value) => setField("actualCustodianId", value)}>
            <OptionList emptyLabel={t("none")} options={options.employees} />
          </Select>
          <Select label={t("actualDepartment")} value={values.actualDepartmentId || selectedItem?.expectedDepartmentId || ""} onChange={(value) => setField("actualDepartmentId", value)}>
            <OptionList emptyLabel={t("none")} options={options.departments} />
          </Select>
          <Select label={t("actualCondition")} value={values.actualConditionId || selectedItem?.expectedConditionId || ""} onChange={(value) => setField("actualConditionId", value)}>
            <OptionList emptyLabel={t("none")} options={options.conditions} />
          </Select>

          {selectedItem && (
            <div className="md:col-span-2 rounded-md border border-border bg-background p-3 text-sm">
              {mismatchPreview.length === 0 ? (
                <div className="text-success">{t("matchedPreview")}</div>
              ) : (
                <div className="text-warning">{t("mismatchPreview", { fields: mismatchPreview.join(", ") })}</div>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving || !selectedItem} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("submitScan")}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function getActualValues(
  values: {
    actualLocationId: string
    actualCustodianId: string
    actualDepartmentId: string
    actualConditionId: string
  },
  selectedItem: AuditScanItem
) {
  return {
    actualLocationId: values.actualLocationId || selectedItem.expectedLocationId,
    actualCustodianId: values.actualCustodianId || selectedItem.expectedCustodianId || "",
    actualDepartmentId: values.actualDepartmentId || selectedItem.expectedDepartmentId || "",
    actualConditionId: values.actualConditionId || selectedItem.expectedConditionId || "",
  }
}

function emptyToNull(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value]))
}

function OptionList({ emptyLabel, options }: { emptyLabel?: string; options: Option[] }) {
  return (
    <>
      {emptyLabel && <option value="">{emptyLabel}</option>}
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
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-danger">*</span>}
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
