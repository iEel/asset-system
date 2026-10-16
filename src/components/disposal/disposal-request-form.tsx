"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { DisposalAssetPicker, type DisposalAssetOption } from "@/components/disposal/disposal-asset-picker"
import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"
import { summarizeDisposalEvidenceUploads } from "@/lib/disposal-upload-outcome"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }

export function DisposalRequestForm({
  employees,
  initialAsset,
  initialReason,
  initialSourceType,
  initialSourceId,
}: {
  employees: Option[]
  initialAsset?: DisposalAssetOption
  initialReason?: string
  initialSourceType?: string
  initialSourceId?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const locale = useLocale()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [selectedAssets, setSelectedAssets] = useState<DisposalAssetOption[]>(initialAsset ? [initialAsset] : [])
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    disposalType: "dispose",
    reason: initialReason ?? "",
    requestedById: "",
    approverId: "",
    saleValue: "",
    salvageValue: "",
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)

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
          sourceType: initialSourceType || null,
          sourceId: initialSourceId || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      const uploadResults: Array<{ fileName: string; ok: boolean }> = []
      for (const file of evidenceFiles) {
        const formData = new FormData()
        formData.append("file", file)
        const uploadResponse = await fetch(`/api/disposal-requests/${payload.id}/attachments`, {
          method: "POST",
          body: formData,
        })
        uploadResults.push({ fileName: file.name, ok: uploadResponse.ok })
      }
      const outcome = summarizeDisposalEvidenceUploads(payload.id, uploadResults)
      if (outcome.failedFileNames.length > 0) {
        toast.warning(t("createSuccessWithUploadErrors", { count: outcome.failedFileNames.length }))
      } else {
        toast.success(t("createSuccess"))
      }
      const uploadQuery = outcome.failedFileNames.length > 0 ? `?uploadErrors=${outcome.failedFileNames.length}` : ""
      router.push(`/${locale}/disposal/${payload.id}${uploadQuery}`)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  function addEvidenceFile(file: File | null) {
    if (!file) return
    setEvidenceFiles((current) => [...current, file])
  }

  return (
    <ContentPanel>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormSection number={1} title={t("formSteps.asset")} className="md:col-span-2" />
        <DisposalAssetPicker
          label={t("asset")}
          selected={selectedAssets}
          onChange={(assets) => {
            setSelectedAssets(assets)
            setField("assetId", assets[0]?.id ?? "")
          }}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
        />
        <Select label={t("disposalType")} value={values.disposalType} required onChange={(value) => setField("disposalType", value)}>
          <option value="dispose">{t("types.dispose")}</option>
          <option value="sell">{t("types.sell")}</option>
          <option value="donate">{t("types.donate")}</option>
          <option value="destroy">{t("types.destroy")}</option>
          <option value="lost">{t("types.lost")}</option>
        </Select>
        <FormSection number={2} title={t("formSteps.request")} className="md:col-span-2" />
        <SearchableSelect
          label={t("requestedBy")}
          value={values.requestedById}
          required
          options={employees}
          placeholder={t("selectEmployee")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          onChange={(value) => setValues((current) => ({
            ...current,
            requestedById: value,
            approverId: current.approverId === value ? "" : current.approverId,
          }))}
        />
        <SearchableSelect label={t("approver")} value={values.approverId} options={approverOptions} placeholder={t("noApprover")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("approverId", value)} />
        {showsEstimatedSaleValue(values.disposalType as DisposalType) ? (
          <Field label={t("saleValueBaht")}>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values.saleValue}
              onChange={(event) => setField("saleValue", event.target.value)}
            />
          </Field>
        ) : null}
        {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? (
          <Field label={t("salvageValueBaht")}>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values.salvageValue}
              onChange={(event) => setField("salvageValue", event.target.value)}
            />
          </Field>
        ) : null}
        <div className="md:col-span-2">
          <Field
            label={t("reason")}
            required
            hint={<span className="block text-right">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</span>}
          >
            <Textarea
              value={values.reason}
              required
              minLength={12}
              rows={4}
              maxLength={4000}
              onChange={(event) => setField("reason", event.target.value)}
              className="min-h-28"
            />
          </Field>
        </div>
        <FormSection number={3} title={t("formSteps.evidence")} className="md:col-span-2" />
        <div className="grid gap-3 md:col-span-2">
          <Field label={t("requestEvidence")} hideLabel>
            <FileDropzone
              file={null}
              onFileChange={addEvidenceFile}
              disabled={saving}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf"
              capture="environment"
              title={t("dropEvidenceTitle")}
              description={t("requestEvidenceDescription")}
              browseLabel={t("dropEvidenceHint")}
            />
          </Field>
          <FileQueueList
            items={evidenceFiles.map((file, index) => ({ id: String(index), name: file.name }))}
            disabled={saving}
            onRemove={(id) => setEvidenceFiles((current) => current.filter((_, index) => String(index) !== id))}
          />
        </div>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" busy={saving} className="w-full sm:w-auto">
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </ContentPanel>
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
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
