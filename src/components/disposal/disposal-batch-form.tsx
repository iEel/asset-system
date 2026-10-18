"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, PackageCheck, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
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
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { formatCount, formatMoney } from "@/lib/display-format"
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }

type DisposalBatchValues = {
  disposalType: string
  reason: string
  requestedById: string
  approverId: string
  saleValue: string
  salvageValue: string
}

// The fields of the edit step in visual order, keyed like the request body, with the id focus moves to (v-track M-R1).
// The type always holds a choice and the approver has no rule, so they stay out; the asset count is a prerequisite.
const FIELD_IDS = {
  requestedById: "disposal-batch-requested-by",
  saleValue: "disposal-batch-sale-value",
  salvageValue: "disposal-batch-salvage-value",
  reason: "disposal-batch-reason",
} as const
type DisposalBatchField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DisposalBatchField[]

// The fields the edit step shows: the estimated values follow the type. A hidden field is neither checked nor focused
// (v-track D-R4).
function shownFields(values: DisposalBatchValues): DisposalBatchField[] {
  const type = values.disposalType as DisposalType
  return FIELD_ORDER.filter((key) => {
    if (key === "saleValue") return showsEstimatedSaleValue(type)
    if (key === "salvageValue") return showsEstimatedSalvageValue(type)
    return true
  })
}

// The content rules the review button used to hide behind its gate, and the controls' min, minLength and maxLength,
// which nothing applied because the step was not a form (v-track M-R2, D-R3).
function validate(values: DisposalBatchValues): Partial<Record<DisposalBatchField, string>> {
  const errors: Partial<Record<DisposalBatchField, string>> = {}
  const shown = shownFields(values)
  const check = (key: DisposalBatchField, code: string | null) => {
    if (code && shown.includes(key)) errors[key] = code
  }
  check("requestedById", required(values.requestedById))
  check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))
  // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
  const reasonTooShort = getDisposalRequestReasonError(values.reason)
  check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))
  return errors
}

export function DisposalBatchForm({ employees }: { employees: Option[] }) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const [selectedAssets, setSelectedAssets] = useState<DisposalAssetOption[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [values, setValues] = useState<DisposalBatchValues>({ disposalType: "dispose", reason: "", requestedById: "", approverId: "", saleValue: "", salvageValue: "" })
  const fieldErrors = useFieldErrors<DisposalBatchField>()
  const validationMessage = useValidationMessage()
  const selectedIds = selectedAssets.map((asset) => asset.id)
  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)
  // A prerequisite, not a field (spec §4.4): review waits for 2 to 100 assets and says so beside the button.
  const needsAssets = selectedIds.length < 2 || selectedIds.length > 100
  // A field the server names on the review step sends the person back to the edit step that owns it (spec §4.2).
  const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key], reveal: () => setReviewing(false) })

  function setField(field: keyof DisposalBatchValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // The type decides which estimated values show: it clears them.
    if (field === "disposalType") fieldErrors.clear("saleValue", "salvageValue")
    else if (field in FIELD_IDS) fieldErrors.clear(field as DisposalBatchField)
  }

  function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needsAssets) return
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewing(true)
  }

  async function submit() {
    setSaving(true)
    try {
      const response = await fetch("/api/disposal-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: selectedIds, ...values, approverId: values.approverId || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of the edit step shows under it there; any other keeps the toast (spec §4.1, §4.2).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }

      let failedUploads = 0
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        const upload = await fetch(`/api/disposal-batches/${payload.batch.id}/attachments`, { method: "POST", body: formData })
        if (!upload.ok) failedUploads += 1
      }
      if (failedUploads > 0) toast.warning(t("batchUploadWarning", { count: failedUploads }))
      else toast.success(t("batchCreateSuccess", { count: selectedIds.length }))
      router.push(`/${locale}/disposal/batches/${payload.batch.id}`)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  if (reviewing) {
    return (
      <ContentPanel
        title={t("batchReviewTitle")}
        description={t("batchReviewHelp", { count: selectedIds.length })}
        actions={<span className="text-count num text-foreground" aria-hidden="true">{formatCount(selectedIds.length)}</span>}
      >
        <KeyValueList
          items={[
            { key: "disposalType", label: t("disposalType"), value: t(`types.${values.disposalType}`) },
            { key: "requestedBy", label: t("requestedBy"), value: employees.find((item) => item.id === values.requestedById)?.label },
            { key: "approver", label: t("approver"), value: employees.find((item) => item.id === values.approverId)?.label ?? t("noApprover") },
            ...(showsEstimatedSaleValue(values.disposalType as DisposalType)
              ? [{ key: "saleValue", label: t("saleValue"), value: values.saleValue ? <span className="num">{formatMoney(Number(values.saleValue), { unit: tCommon("baht") })}</span> : null }]
              : []),
            ...(showsEstimatedSalvageValue(values.disposalType as DisposalType)
              ? [{ key: "salvageValue", label: t("salvageValue"), value: values.salvageValue ? <span className="num">{formatMoney(Number(values.salvageValue), { unit: tCommon("baht") })}</span> : null }]
              : []),
            { key: "reason", label: t("reason"), value: <span className="whitespace-pre-wrap">{values.reason}</span> },
          ]}
        />
        <div className="mt-4 max-h-72 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">
          {selectedAssets.map((asset) => <div key={asset.id} className="px-3 py-2 text-sm">{asset.label}</div>)}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setReviewing(false)}>
            <ArrowLeft aria-hidden="true" />
            {t("batchBackToEdit")}
          </Button>
          <Button busy={saving} onClick={submit}>
            <Save aria-hidden="true" />
            {t("batchConfirm")}
          </Button>
        </div>
      </ContentPanel>
    )
  }

  return (
    <ContentPanel>
      <form onSubmit={handleReview} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-4">
          <FormSection number={1} title={t("formSteps.asset")} />
          <DisposalAssetPicker
            label={t("asset")}
            selected={selectedAssets}
            onChange={setSelectedAssets}
            max={100}
            searchPlaceholder={t("batchAssetSearch")}
            emptyLabel={tCommon("searchSelectNoResults")}
            selectedCountLabel={`${t("batchSelectedCount", { count: selectedIds.length })} · ${t("batchLimit")}`}
          />
        </div>
        <div className="space-y-4">
          <FormSection number={2} title={t("formSteps.request")} />
          <Field label={t("disposalType")}>
            <NativeSelect value={values.disposalType} onChange={(event) => setField("disposalType", event.target.value)}>
              {["dispose", "sell", "donate", "destroy", "lost"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </NativeSelect>
          </Field>
          <SearchableSelect
            id="disposal-batch-requested-by"
            label={t("requestedBy")}
            required
            value={values.requestedById}
            options={employees}
            placeholder={t("selectEmployee")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("requestedById")}
            onChange={(value) => {
              setValues((current) => ({ ...current, requestedById: value, approverId: current.approverId === value ? "" : current.approverId }))
              fieldErrors.clear("requestedById")
            }}
          />
          <SearchableSelect label={t("approver")} value={values.approverId} options={approverOptions} placeholder={t("noApprover")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setValues((current) => ({ ...current, approverId: value }))} />
          {showsEstimatedSaleValue(values.disposalType as DisposalType) ? (
            <Field
              label={t("saleValueBaht")}
              id="disposal-batch-sale-value"
              error={fieldErrors.errors.saleValue ? validationMessage(fieldErrors.errors.saleValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.saleValue} onChange={(event) => setField("saleValue", event.target.value)} />
            </Field>
          ) : null}
          {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? (
            <Field
              label={t("salvageValueBaht")}
              id="disposal-batch-salvage-value"
              error={fieldErrors.errors.salvageValue ? validationMessage(fieldErrors.errors.salvageValue, { min: 0 }) : undefined}
            >
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.salvageValue} onChange={(event) => setField("salvageValue", event.target.value)} />
            </Field>
          ) : null}
          <Field
            label={t("reason")}
            id="disposal-batch-reason"
            required
            hint={<span className="block text-right">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</span>}
            error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 12, max: 4000 }) : undefined}
          >
            <Textarea required minLength={12} maxLength={4000} rows={5} value={values.reason} onChange={(event) => setField("reason", event.target.value)} className="min-h-28" />
          </Field>
          <FormSection number={3} title={t("formSteps.evidence")} />
          <FileDropzone file={null} onFileChange={(file) => file && setFiles((current) => [...current, file])} disabled={saving} accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" title={t("dropEvidenceTitle")} description={t("batchEvidenceHelp")} browseLabel={t("dropEvidenceHint")} />
          <FileQueueList
            items={files.map((file, index) => ({ id: String(index), name: file.name }))}
            disabled={saving}
            onRemove={(id) => setFiles((current) => current.filter((_, index) => String(index) !== id))}
          />
          <Button
            type="submit"
            aria-disabled={needsAssets || undefined}
            aria-describedby={needsAssets ? "disposal-batch-review-reason" : undefined}
            className="w-full"
          >
            <PackageCheck aria-hidden="true" />
            {t("batchReview")}
          </Button>
          {needsAssets ? <p id="disposal-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsAssets")}</p> : null}
        </div>
      </form>
    </ContentPanel>
  )
}
