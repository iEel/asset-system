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
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import {
  assetOperationRowLabel,
  chosenAssetReasonKey,
  transferAssetToClear,
  type ClearedTransferAsset,
} from "@/lib/asset-operation-form-rules"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { buildAssetOperationSearchHref, type AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { waitForDialogToClose } from "@/lib/field-focus"
import { atLeastOne, maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string; disabled?: boolean }
type TransferFormValues = {
  /** The row the shared picker chose, or the ?assetId= answer (chosen-but-blocked when it cannot be taken, spec 6.4). */
  asset: AssetOperationSearchRow | null
  /** The asset a custodian chosen after it cleared, with the reason the field reads (spec 6.3). */
  clearedAsset: ClearedTransferAsset | null
  toLocationId: string
  toCustodianId: string
  toDepartmentId: string
  reason: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The server
// names "at least one destination" under toLocationId, so the rule shows under the location select (O-R4).
const FIELD_IDS = {
  assetId: "transfer-asset",
  toLocationId: "transfer-to-location",
  reason: "transfer-reason",
} as const
type TransferField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as TransferField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength, and the server's
// "at least one destination" with the server's own code (v-track M-R2, O-R4).
function validate(values: TransferFormValues): Partial<Record<TransferField, string>> {
  const errors: Partial<Record<TransferField, string>> = {}
  const check = (key: TransferField, code: string | null) => {
    if (code) errors[key] = code
  }
  // A ?assetId= that arrived blocked stays chosen; save stops on it, and the field reads its reason (assetError).
  check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))
  check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId, values.toDepartmentId]) && "transferDestinationRequired")
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}

export function TransferForm({
  employees,
  departments,
  locations,
  initialAsset,
  returnTo,
}: {
  employees: Option[]
  departments: Option[]
  locations: Option[]
  /** ?assetId=: the search's by-id answer, takeable or not (spec 6.4). */
  initialAsset: AssetOperationSearchRow | null
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("transfer")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<TransferField>()
  const [values, setValues] = useState<TransferFormValues>({
    asset: initialAsset,
    clearedAsset: null,
    toLocationId: "",
    toCustodianId: "",
    toDepartmentId: "",
    reason: "",
    remark: "",
  })
  // The asset's line under the field: a chosen row's reason, else the asset a custodian cleared, else the field's code.
  const assetReasonKey = chosenAssetReasonKey(values.asset)
  const assetError = assetReasonKey
    ? tAll(assetReasonKey)
    : values.clearedAsset
      ? t("assetClearedForCustodian", { assetTag: values.clearedAsset.assetTag, reason: tAll(values.clearedAsset.reasonKey) })
      : fieldErrors.message("assetId")
  const selectedLocation = locations.find((location) => location.id === values.toLocationId)
  const selectedCustodian = employees.find((employee) => employee.id === values.toCustodianId)
  const selectedDepartment = departments.find((department) => department.id === values.toDepartmentId)
  const reviewItems = buildOperationReviewSummary({
    assetLabel: values.asset ? assetOperationRowLabel(values.asset) : "",
    destinationLabels: [selectedLocation?.label, selectedCustodian?.label, selectedDepartment?.label],
    nextStatusLabel: values.toCustodianId ? t("inUseStatus") : t("statusUnchanged"),
    details: values.reason ? [{ label: t("reason"), value: values.reason }] : [],
    evidenceLabel: t("reviewNoEvidence"),
    labels: {
      asset: t("asset"),
      source: t("from"),
      destination: t("reviewDestination"),
      nextStatus: t("reviewNextStatus"),
      evidence: t("reviewEvidence"),
    },
  })

  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })

  function setField(field: string, value: string) {
    // The three destinations are one rule, so a change of any clears it (spec §4.3).
    if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")
    else if (field in FIELD_IDS) fieldErrors.clear(field as TransferField)
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)
  }

  function setAsset(asset: AssetOperationSearchRow | null) {
    setValues((current) => ({ ...current, asset, clearedAsset: null }))
    fieldErrors.clear("assetId")
  }

  // A custodian makes the transfer an assign (Ready or In Use only): the chosen asset is asked again under that rule (spec 6.3).
  async function recheckAssetForCustodian(assetId: string) {
    const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })).catch(() => null)
    const payload = response?.ok ? await response.json().catch(() => null) : null
    const rechecked: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
    setValues((current) => {
      const cleared = transferAssetToClear(current, rechecked)
      return cleared ? { ...current, asset: null, clearedAsset: cleared } : current
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewOpen(true)
  }

  async function submitTransfer() {
    setSaving(true)
    try {
      const response = await fetch(`/api/assets/${values.asset?.id}/transfer`, {
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
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("success"))
      // The TR- document opens, as the handover and the return open theirs (user decision 2026-10-21, FX10).
      const documentHref = `/${locale}/asset-management/transfers/${payload.id}`
      router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} className="mb-6" />
      <ContentPanel>
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {/* The arrival banner names the ?assetId= asset only while it is still the chosen one (look step). */}
          {initialAsset?.eligible && values.asset?.id === initialAsset.id ? (
            <div className="md:col-span-2">
              <FormContextBanner label={t("asset")} value={assetOperationRowLabel(initialAsset)} />
            </div>
          ) : null}
          <AssetOperationPicker
            id="transfer-asset"
            label={t("asset")}
            mode="transfer"
            context={{ assignCustodian: Boolean(values.toCustodianId) }}
            value={values.asset}
            required
            error={assetError}
            onChange={setAsset}
          />
          <SearchableSelect id="transfer-to-location" label={t("toLocation")} value={values.toLocationId} options={locations} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
          <SearchableSelect label={t("toCustodian")} value={values.toCustodianId} options={employees} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toCustodianId", value)} />
          <SearchableSelect label={t("toDepartment")} value={values.toDepartmentId} options={departments} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toDepartmentId", value)} />
          <div className="md:col-span-2">
            <Field label={t("reason")} id="transfer-reason" required error={fieldErrors.message("reason")}>
              <Input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" busy={saving} className="w-full sm:w-auto">
              <Save />
              {tCommon("save")}
            </Button>
          </div>
        </form>
        <OperationReviewDialog
          open={reviewOpen}
          title={t("reviewTitle")}
          description={t("reviewDescription")}
          items={reviewItems}
          confirmLabel={t("reviewConfirm")}
          cancelLabel={tCommon("cancel")}
          busy={saving}
          onClose={() => setReviewOpen(false)}
          onConfirm={() => void submitTransfer()}
        />
      </ContentPanel>
    </div>
  )
}
