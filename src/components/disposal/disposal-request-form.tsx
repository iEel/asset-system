"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { DisposalAssetPicker, type DisposalAssetOption } from "@/components/disposal/disposal-asset-picker"
import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"
import { summarizeDisposalEvidenceUploads } from "@/lib/disposal-upload-outcome"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  function addEvidenceFile(file: File | null) {
    if (!file) return
    setEvidenceFiles((current) => [...current, file])
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormStep number={1} title={t("formSteps.asset")} />
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
        <FormStep number={2} title={t("formSteps.request")} />
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
        {showsEstimatedSaleValue(values.disposalType as DisposalType) ? <Field label={t("saleValue")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.saleValue}
            onChange={(event) => setField("saleValue", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field> : null}
        {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? <Field label={t("salvageValue")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.salvageValue}
            onChange={(event) => setField("salvageValue", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field> : null}
        <div className="md:col-span-2">
          <Field label={t("reason")} required>
            <textarea
              value={values.reason}
              required
              minLength={12}
              rows={4}
              maxLength={4000}
              onChange={(event) => setField("reason", event.target.value)}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</p>
          </Field>
        </div>
        <FormStep number={3} title={t("formSteps.evidence")} />
        <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">{t("requestEvidence")}</div>
          <FileDropzone
            file={null}
            onFileChange={addEvidenceFile}
            disabled={saving}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,application/pdf"
            capture="environment"
            title={t("dropEvidenceTitle")}
            hint={t("dropEvidenceSelected")}
            browseLabel={t("dropEvidenceHint")}
          />
          {evidenceFiles.length > 0 ? (
            <div className="mt-3 space-y-2">
              {evidenceFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setEvidenceFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="text-xs font-medium text-danger"
                  >
                    {tCommon("delete")}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
    </section>
  )
}

function FormStep({ number, title }: { number: number; title: string }) {
  return <div className="flex items-center gap-3 border-b border-border pb-3 md:col-span-2"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{number}</span><h2 className="text-sm font-semibold text-foreground">{title}</h2></div>
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
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </Field>
  )
}
