"use client"

import { useId, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { preventEnterSubmit } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"

type Option = { id: string; label: string; disabled?: boolean }
type BulkMoveFormValues = { assetIds: readonly string[]; toLocationId: string; reason: string; remark: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The asset
// list is one group: its id is on the list, and focus goes to its first checkbox (O-R5).
const FIELD_IDS = {
  assetIds: "bulk-move-assets",
  toLocationId: "bulk-move-to-location",
  reason: "bulk-move-reason",
} as const
type BulkMoveField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BulkMoveField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength; the destination had
// the star and nothing checked it (spec §5) (v-track M-R2).
function validate(values: BulkMoveFormValues): Partial<Record<BulkMoveField, string>> {
  const errors: Partial<Record<BulkMoveField, string>> = {}
  const check = (key: BulkMoveField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetIds", required(values.assetIds))
  check("toLocationId", required(values.toLocationId))
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}

export function BulkMoveForm({ assets, locations }: { assets: Option[]; locations: Option[] }) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<BulkMoveField>()
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

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as BulkMoveField)
  }

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    )
    fieldErrors.clear("assetIds")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ ...values, assetIds }))
    if (focusFirstError()) return

    setSaving(true)
    try {
      const response = await fetch("/api/assets/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, assetIds }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
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
      <ContentPanel>
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
            <div
              role="group"
              id="bulk-move-assets"
              aria-labelledby={assetsLabelId}
              aria-describedby={fieldErrors.errors.assetIds ? "bulk-move-assets-error" : undefined}
              className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface"
            >
              {availableAssets.length === 0 ? (
                <EmptyNote padded role="status">{tCommon("noData")}</EmptyNote>
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
            {fieldErrors.errors.assetIds ? (
              <FieldError id="bulk-move-assets-error" className="mt-1.5">
                {fieldErrors.errors.assetIds === "required" ? t("selectAssets") : fieldErrors.message("assetIds")}
              </FieldError>
            ) : null}
          </div>
          <SearchableSelect id="bulk-move-to-location" label={t("toLocation")} value={values.toLocationId} required options={locations} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
          <Field label={t("reason")} id="bulk-move-reason" required error={fieldErrors.message("reason")}>
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
      </ContentPanel>
    </div>
  )
}
