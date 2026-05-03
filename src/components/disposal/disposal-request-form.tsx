"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type Option = { id: string; label: string }

export function DisposalRequestForm({
  assets,
  employees,
}: {
  assets: Option[]
  employees: Option[]
}) {
  const router = useRouter()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    assetId: "",
    disposalType: "dispose",
    reason: "",
    requestedById: "",
    approverId: "",
    saleValue: "",
    salvageValue: "",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/disposal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          disposalType: values.disposalType,
          reason: values.reason,
          requestedById: values.requestedById,
          approverId: values.approverId || null,
          saleValue: values.saleValue || null,
          salvageValue: values.salvageValue || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("createSuccess"))
      setValues((current) => ({ ...current, assetId: "", reason: "", saleValue: "", salvageValue: "" }))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{t("createTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Select label={t("asset")} value={values.assetId} required onChange={(value) => setField("assetId", value)}>
          <option value="">{t("selectAsset")}</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </Select>
        <Select label={t("disposalType")} value={values.disposalType} required onChange={(value) => setField("disposalType", value)}>
          <option value="dispose">{t("types.dispose")}</option>
          <option value="sell">{t("types.sell")}</option>
          <option value="donate">{t("types.donate")}</option>
          <option value="destroy">{t("types.destroy")}</option>
          <option value="lost">{t("types.lost")}</option>
        </Select>
        <Select label={t("requestedBy")} value={values.requestedById} required onChange={(value) => setField("requestedById", value)}>
          <option value="">{t("selectEmployee")}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </Select>
        <Select label={t("approver")} value={values.approverId} onChange={(value) => setField("approverId", value)}>
          <option value="">{t("noApprover")}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </Select>
        <Field label={t("saleValue")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.saleValue}
            onChange={(event) => setField("saleValue", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("salvageValue")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.salvageValue}
            onChange={(event) => setField("salvageValue", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("reason")} required>
            <textarea
              value={values.reason}
              required
              rows={4}
              maxLength={4000}
              onChange={(event) => setField("reason", event.target.value)}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
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
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </Field>
  )
}
