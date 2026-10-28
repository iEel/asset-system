"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { bulkMoveBlockedList, readBulkMoveBlocked, type BulkMoveBlockedAsset } from "@/lib/bulk-move-blocked"
import { maxLength, required } from "@/lib/validation-rules"

type Option = { id: string; label: string; disabled?: boolean }
type BulkMoveFormValues = { assetIds: readonly string[]; toLocationId: string; reason: string; remark: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The asset
// picker's root carries the id, so focus goes to its search field (spec 6.1).
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

export function BulkMoveForm({ locations }: { locations: Option[] }) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<BulkMoveField>()
  const [assets, setAssets] = useState<AssetOperationSearchRow[]>([])
  const [blockedAssets, setBlockedAssets] = useState<BulkMoveBlockedAsset[]>([])
  const assetIds = assets.map((asset) => asset.id)
  const [values, setValues] = useState({
    toLocationId: "",
    reason: "",
    remark: "",
  })

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // The asset field's one error: none chosen, the assets the server refused by tag and reason, or a server field error.
  const assetsError =
    fieldErrors.errors.assetIds === "required"
      ? t("selectAssets")
      : fieldErrors.errors.assetIds === "blocked"
        ? t("blockedAssets", { count: blockedAssets.length, list: bulkMoveBlockedList(blockedAssets, (code) => apiError.describe(code).message) })
        : fieldErrors.message("assetIds")

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as BulkMoveField)
  }

  function changeAssets(rows: AssetOperationSearchRow[]) {
    setAssets(rows)
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
        // A refusal that names assets (a License, a Disposed or Retired asset) shows them under the asset field; one that
        // names a field of this form shows under it; any other keeps the toast (spec §4.1, server search Task 7).
        const blocked = readBulkMoveBlocked(payload)
        if (blocked.length > 0) {
          setBlockedAssets(blocked)
          fieldErrors.setErrors({ assetIds: "blocked" })
          focusFirstError()
          return
        }
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
            <AssetOperationPicker
              id="bulk-move-assets"
              label={t("assets")}
              mode="bulkMove"
              multiple
              values={assets}
              required
              error={assetsError}
              onChange={changeAssets}
            />
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
