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
import { getApiErrorKey } from "@/lib/api-error-catalog"
import {
  getDisposalRequestReasonError,
  showsEstimatedSaleValue,
  showsEstimatedSalvageValue,
  type DisposalType,
} from "@/lib/disposal-type-policy"
import { summarizeDisposalEvidenceUploads } from "@/lib/disposal-upload-outcome"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }

type DisposalRequestValues = {
  assetId: string
  disposalType: string
  reason: string
  requestedById: string
  approverId: string
  saleValue: string
  salvageValue: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The
// approver has no rule anywhere and stays out.
const FIELD_IDS = {
  assetId: "disposal-request-asset",
  disposalType: "disposal-request-type",
  requestedById: "disposal-request-requested-by",
  saleValue: "disposal-request-sale-value",
  salvageValue: "disposal-request-salvage-value",
  reason: "disposal-request-reason",
} as const
type DisposalRequestField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DisposalRequestField[]

// The fields the form shows: the estimated values follow the type. A hidden field is neither checked nor focused, so a
// refusal about one falls through to the toast (v-track D-R4).
function shownFields(values: DisposalRequestValues): DisposalRequestField[] {
  const type = values.disposalType as DisposalType
  return FIELD_ORDER.filter((key) => {
    if (key === "saleValue") return showsEstimatedSaleValue(type)
    if (key === "salvageValue") return showsEstimatedSalvageValue(type)
    return true
  })
}

// noValidate turns the browser's check off, so this restates the controls' required, min, minLength and maxLength, and
// checks the asset and the requester the server requires, which nothing checked before (v-track M-R2, D-R2).
function validate(values: DisposalRequestValues): Partial<Record<DisposalRequestField, string>> {
  const errors: Partial<Record<DisposalRequestField, string>> = {}
  const shown = shownFields(values)
  const check = (key: DisposalRequestField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("disposalType", required(values.disposalType))
  check("requestedById", required(values.requestedById))
  check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))
  // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
  const reasonTooShort = getDisposalRequestReasonError(values.reason)
  check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))
  return errors
}

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
  const [values, setValues] = useState<DisposalRequestValues>({
    assetId: initialAsset?.id ?? "",
    disposalType: "dispose",
    reason: initialReason ?? "",
    requestedById: "",
    approverId: "",
    saleValue: "",
    salvageValue: "",
  })
  const fieldErrors = useFieldErrors<DisposalRequestField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key] })

  function setField(field: keyof DisposalRequestValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // The type decides which estimated values show: it clears them with itself.
    if (field === "disposalType") fieldErrors.clear("disposalType", "saleValue", "salvageValue")
    else if (field in FIELD_IDS) fieldErrors.clear(field as DisposalRequestField)
  }

  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
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
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }
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
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormSection number={1} title={t("formSteps.asset")} className="md:col-span-2" />
        <DisposalAssetPicker
          id="disposal-request-asset"
          label={t("asset")}
          selected={selectedAssets}
          onChange={(assets) => {
            setSelectedAssets(assets)
            setField("assetId", assets[0]?.id ?? "")
          }}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          error={fieldErrors.message("assetId")}
        />
        <Select
          label={t("disposalType")}
          id="disposal-request-type"
          value={values.disposalType}
          required
          onChange={(value) => setField("disposalType", value)}
          error={fieldErrors.message("disposalType")}
        >
          <option value="dispose">{t("types.dispose")}</option>
          <option value="sell">{t("types.sell")}</option>
          <option value="donate">{t("types.donate")}</option>
          <option value="destroy">{t("types.destroy")}</option>
          <option value="lost">{t("types.lost")}</option>
        </Select>
        <FormSection number={2} title={t("formSteps.request")} className="md:col-span-2" />
        <SearchableSelect
          id="disposal-request-requested-by"
          label={t("requestedBy")}
          value={values.requestedById}
          required
          options={employees}
          placeholder={t("selectEmployee")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          error={fieldErrors.message("requestedById")}
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              requestedById: value,
              approverId: current.approverId === value ? "" : current.approverId,
            }))
            fieldErrors.clear("requestedById")
          }}
        />
        <SearchableSelect label={t("approver")} value={values.approverId} options={approverOptions} placeholder={t("noApprover")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("approverId", value)} />
        {showsEstimatedSaleValue(values.disposalType as DisposalType) ? (
          <Field
            label={t("saleValueBaht")}
            id="disposal-request-sale-value"
            error={fieldErrors.errors.saleValue ? validationMessage(fieldErrors.errors.saleValue, { min: 0 }) : undefined}
          >
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
          <Field
            label={t("salvageValueBaht")}
            id="disposal-request-salvage-value"
            error={fieldErrors.errors.salvageValue ? validationMessage(fieldErrors.errors.salvageValue, { min: 0 }) : undefined}
          >
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
            id="disposal-request-reason"
            required
            hint={<span className="block text-right">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</span>}
            error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 12, max: 4000 }) : undefined}
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
  id,
  value,
  required,
  onChange,
  error,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  error?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
