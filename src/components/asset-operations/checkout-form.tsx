"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type Option = { id: string; label: string; disabled?: boolean }
type CheckoutType = "user" | "department" | "location" | "asset"

export function CheckoutForm({
  assets,
  employees,
  departments,
  locations,
  conditions,
}: {
  assets: Option[]
  employees: Option[]
  departments: Option[]
  locations: Option[]
  conditions: Option[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("checkout")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    assetId: "",
    checkoutType: "user" as CheckoutType,
    custodianId: "",
    departmentId: "",
    locationId: "",
    parentAssetId: "",
    checkoutDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: "",
    conditionBefore: "",
    remark: "",
  })

  const destinationOptions = useMemo(() => {
    if (values.checkoutType === "user") return employees
    if (values.checkoutType === "department") return departments
    if (values.checkoutType === "location") return locations
    return assets.filter((asset) => asset.id !== values.assetId)
  }, [assets, departments, employees, locations, values.assetId, values.checkoutType])

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const body = {
      checkoutType: values.checkoutType,
      custodianId: values.checkoutType === "user" ? values.custodianId : null,
      departmentId: values.checkoutType === "department" ? values.departmentId : null,
      locationId: values.checkoutType === "location" ? values.locationId : null,
      parentAssetId: values.checkoutType === "asset" ? values.parentAssetId : null,
      checkoutDate: values.checkoutDate,
      expectedReturnDate: values.expectedReturnDate,
      conditionBefore: values.conditionBefore,
      remark: values.remark,
    }

    try {
      const response = await fetch(`/api/assets/${values.assetId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/asset-management/checkouts/${payload.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <OperationShell title={t("title")}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Select label={t("asset")} value={values.assetId} required onChange={(value) => setField("assetId", value)}>
          <option value="">{t("selectAsset")}</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id} disabled={asset.disabled}>
              {asset.label}
            </option>
          ))}
        </Select>
        <Select
          label={t("checkoutType")}
          value={values.checkoutType}
          required
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              checkoutType: value as CheckoutType,
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAssetId: "",
            }))
          }}
        >
          <option value="user">{t("toUser")}</option>
          <option value="department">{t("toDepartment")}</option>
          <option value="location">{t("toLocation")}</option>
          <option value="asset">{t("toAsset")}</option>
        </Select>
        <Select
          label={t("checkoutTo")}
          value={destinationValue(values)}
          required
          onChange={(value) => setDestinationValue(values.checkoutType, value)}
        >
          <option value="">{t("selectDestination")}</option>
          {destinationOptions.map((option) => (
            <option key={option.id} value={option.id} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select label={t("conditionBefore")} value={values.conditionBefore} required onChange={(value) => setField("conditionBefore", value)}>
          <option value="">{t("selectCondition")}</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.label}
            </option>
          ))}
        </Select>
        <Field label={t("checkoutDate")} required>
          <input type="date" value={values.checkoutDate} onChange={(event) => setField("checkoutDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label={t("expectedReturn")}>
          <input type="date" value={values.expectedReturnDate} onChange={(event) => setField("expectedReturnDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("remark")}>
            <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
    </OperationShell>
  )

  function setDestinationValue(type: CheckoutType, value: string) {
    if (type === "user") setField("custodianId", value)
    if (type === "department") setField("departmentId", value)
    if (type === "location") setField("locationId", value)
    if (type === "asset") setField("parentAssetId", value)
  }
}

function destinationValue(values: {
  checkoutType: CheckoutType
  custodianId: string
  departmentId: string
  locationId: string
  parentAssetId: string
}) {
  if (values.checkoutType === "user") return values.custodianId
  if (values.checkoutType === "department") return values.departmentId
  if (values.checkoutType === "location") return values.locationId
  return values.parentAssetId
}

function OperationShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">{children}</section>
    </div>
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

function Select({
  label,
  value,
  required,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        {children}
      </select>
    </Field>
  )
}
