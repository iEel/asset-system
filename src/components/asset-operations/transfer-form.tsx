"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean; personalTransferEligible?: boolean }

export function TransferForm({
  assets,
  employees,
  departments,
  locations,
  initialAssetId,
  returnTo,
}: {
  assets: Option[]
  employees: Option[]
  departments: Option[]
  locations: Option[]
  initialAssetId?: string
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("transfer")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const initialAsset = assets.find((asset) => asset.id === initialAssetId && !asset.disabled)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    toLocationId: "",
    toCustodianId: "",
    toDepartmentId: "",
    reason: "",
    remark: "",
  })
  const availableAssets = values.toCustodianId
    ? assets.filter((asset) => asset.personalTransferEligible)
    : assets
  const selectedAsset = assets.find((asset) => asset.id === values.assetId)
  const selectedLocation = locations.find((location) => location.id === values.toLocationId)
  const selectedCustodian = employees.find((employee) => employee.id === values.toCustodianId)
  const selectedDepartment = departments.find((department) => department.id === values.toDepartmentId)
  const reviewItems = buildOperationReviewSummary({
    assetLabel: selectedAsset?.label ?? "",
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

  function setField(field: string, value: string) {
    setValues((current) => {
      if (field === "toCustodianId" && value) {
        const currentAsset = assets.find((asset) => asset.id === current.assetId)
        return {
          ...current,
          toCustodianId: value,
          assetId: currentAsset?.personalTransferEligible ? current.assetId : "",
        }
      }
      return { ...current, [field]: value }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAsset || (!values.toLocationId && !values.toCustodianId && !values.toDepartmentId)) {
      toast.error(t("destinationRequired"))
      return
    }
    setReviewOpen(true)
  }

  async function submitTransfer() {
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
      router.push(returnTo ?? `/${locale}/assets/${values.assetId}`)
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {initialAsset ? (
            <div className="md:col-span-2">
              <FormContextBanner label={t("asset")} value={initialAsset.label} />
            </div>
          ) : null}
          <SearchableSelect label={t("asset")} value={values.assetId} required options={availableAssets} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("assetId", value)} />
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} options={locations} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
          <SearchableSelect label={t("toCustodian")} value={values.toCustodianId} options={employees} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toCustodianId", value)} />
          <SearchableSelect label={t("toDepartment")} value={values.toDepartmentId} options={departments} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toDepartmentId", value)} />
          <div className="md:col-span-2">
            <Field label={t("reason")} required>
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
