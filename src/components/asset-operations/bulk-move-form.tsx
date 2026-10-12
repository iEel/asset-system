"use client"

import { useId, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { preventEnterSubmit } from "@/components/ui/choice-card"
import { Field, FieldLabel } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean }

export function BulkMoveForm({ assets, locations }: { assets: Option[]; locations: Option[] }) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [assetQuery, setAssetQuery] = useState("")
  const [assetIds, setAssetIds] = useState<string[]>([])
  const assetSearchId = useId()
  const assetsLabelId = useId()
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} meta={t("selectedCount", { count: assetIds.length })} className="mb-6" />
      <section className="rounded-lg border border-border bg-surface p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel id={assetsLabelId} htmlFor={assetSearchId} required className="mb-1.5 block">
              {t("assets")}
            </FieldLabel>
            <SearchField
              id={assetSearchId}
              className="mb-2"
              value={assetQuery}
              onChange={(event) => setAssetQuery(event.target.value)}
              placeholder={tCommon("searchSelectPlaceholder")}
            />
            <div role="group" aria-labelledby={assetsLabelId} className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface">
              {availableAssets.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{tCommon("noData")}</div>
              ) : (
                availableAssets.map((asset) => {
                  const checked = assetIds.includes(asset.id)
                  return (
                    <label
                      key={asset.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border-soft px-3 text-sm last:border-b-0 hover:bg-row-hover has-checked:bg-primary-soft"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAsset(asset.id)}
                        onKeyDown={preventEnterSubmit}
                        className={checkboxVariants()}
                      />
                      <span className="min-w-0 truncate">{asset.label}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} required options={locations} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
          <Field label={t("reason")} required>
            <Input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" busy={saving}>
              <Save />
              {tCommon("save")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
