"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, Loader2, Save, Search } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type Option = { id: string; label: string; disabled?: boolean }

export function BulkMoveForm({ assets, locations }: { assets: Option[]; locations: Option[] }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [assetQuery, setAssetQuery] = useState("")
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [values, setValues] = useState({
    toLocationId: "",
    reason: "",
    remark: "",
  })

  const availableAssets = useMemo(() => {
    const normalizedQuery = assetQuery.toLocaleLowerCase().replace(/\s+/g, "")
    return assets.filter((asset) => {
      if (asset.disabled) return false
      if (!normalizedQuery) return true
      return asset.label.toLocaleLowerCase().replace(/\s+/g, "").includes(normalizedQuery)
    })
  }, [assetQuery, assets])

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (assetIds.length === 0) {
      toast.error(t("selectAssets"))
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/assets/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, assetIds }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/assets`)
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
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <div className="text-sm text-muted-foreground">
          {t("selectedCount", { count: assetIds.length })}
        </div>
      </div>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              {t("assets")}
              <span className="ml-1 text-danger">*</span>
            </span>
            <div className="mb-2 flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                placeholder={tCommon("searchSelectPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
              {availableAssets.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{tCommon("noData")}</div>
              ) : (
                availableAssets.map((asset) => {
                  const checked = assetIds.includes(asset.id)
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => toggleAsset(asset.id)}
                      className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="truncate">{asset.label}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} required options={locations} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
          <Field label={t("reason")} required>
            <input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
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
