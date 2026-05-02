"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type Option = { id: string; label: string; assetId?: string }

export function CheckinForm({
  activeCheckouts,
  locations,
  statuses,
  conditions,
}: {
  activeCheckouts: Option[]
  locations: Option[]
  statuses: Option[]
  conditions: Option[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("checkin")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    checkoutId: "",
    returnDate: new Date().toISOString().slice(0, 10),
    returnBy: "",
    receiveBy: "",
    conditionAfter: "",
    nextStatusId: "",
    nextLocationId: "",
    missingAccessories: "",
    damageNote: "",
    remark: "",
  })

  const selectedCheckout = useMemo(
    () => activeCheckouts.find((checkout) => checkout.id === values.checkoutId),
    [activeCheckouts, values.checkoutId]
  )

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCheckout?.assetId) return
    setSaving(true)

    try {
      const response = await fetch(`/api/assets/${selectedCheckout.assetId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/asset-management/checkins/${payload.id}`)
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
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      </div>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Select label={t("asset")} value={values.checkoutId} required onChange={(value) => setField("checkoutId", value)}>
            <option value="">{t("selectCheckout")}</option>
            {activeCheckouts.map((checkout) => (
              <option key={checkout.id} value={checkout.id}>
                {checkout.label}
              </option>
            ))}
          </Select>
          <Field label={t("returnDate")} required>
            <input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("returnBy")} required>
            <input value={values.returnBy} onChange={(event) => setField("returnBy", event.target.value)} required maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("receiveBy")} required>
            <input value={values.receiveBy} onChange={(event) => setField("receiveBy", event.target.value)} required maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Select label={t("conditionAfter")} value={values.conditionAfter} required onChange={(value) => setField("conditionAfter", value)}>
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>{condition.label}</option>
            ))}
          </Select>
          <Select label={t("nextStatus")} value={values.nextStatusId} required onChange={(value) => setField("nextStatusId", value)}>
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </Select>
          <Select label={t("nextLocation")} value={values.nextLocationId} required onChange={(value) => setField("nextLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.label}</option>
            ))}
          </Select>
          <Field label={t("missingAccessories")}>
            <input value={values.missingAccessories} onChange={(event) => setField("missingAccessories", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("damageNote")}>
              <textarea value={values.damageNote} onChange={(event) => setField("damageNote", event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
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
