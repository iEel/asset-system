"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type Option = { id: string; label: string; disabled?: boolean }

export function TransferForm({
  assets,
  employees,
  departments,
  locations,
  initialAssetId,
}: {
  assets: Option[]
  employees: Option[]
  departments: Option[]
  locations: Option[]
  initialAssetId?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("transfer")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const initialAsset = assets.find((asset) => asset.id === initialAssetId && !asset.disabled)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    toLocationId: "",
    toCustodianId: "",
    toDepartmentId: "",
    reason: "",
    remark: "",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.toLocationId && !values.toCustodianId && !values.toDepartmentId) {
      toast.error(t("destinationRequired"))
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/assets/${values.assetId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toLocationId: values.toLocationId || null,
          toCustodianId: values.toCustodianId || null,
          toDepartmentId: values.toDepartmentId || null,
          reason: values.reason,
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/assets/${values.assetId}`)
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
        <h1 className="break-words text-2xl font-bold text-foreground">{t("title")}</h1>
      </div>
      <section className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {initialAsset ? (
            <div className="md:col-span-2">
              <FormContextBanner label={t("asset")} value={initialAsset.label} />
            </div>
          ) : null}
          <SearchableSelect label={t("asset")} value={values.assetId} required options={assets} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("assetId", value)} />
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} options={locations} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
          <SearchableSelect label={t("toCustodian")} value={values.toCustodianId} options={employees} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toCustodianId", value)} />
          <SearchableSelect label={t("toDepartment")} value={values.toDepartmentId} options={departments} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toDepartmentId", value)} />
          <div className="md:col-span-2">
            <Field label={t("reason")} required>
              <input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto">
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
