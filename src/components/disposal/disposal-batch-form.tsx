"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, PackageCheck, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }

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
  const [values, setValues] = useState({ disposalType: "dispose", reason: "", requestedById: "", approverId: "", saleValue: "", salvageValue: "" })
  const selectedIds = selectedAssets.map((asset) => asset.id)
  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)
  const valid = selectedIds.length >= 2 && selectedIds.length <= 100 && values.reason.trim().length >= 12 && Boolean(values.requestedById)

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const response = await fetch("/api/disposal-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: selectedIds, ...values, approverId: values.approverId || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))

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
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("batchReviewTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewHelp", { count: selectedIds.length })}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary">
            <PackageCheck className="h-4 w-4" /> {selectedIds.length}
          </span>
        </div>
        <dl className="mt-5 grid gap-3 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
          <Summary label={t("disposalType")} value={t(`types.${values.disposalType}`)} />
          <Summary label={t("requestedBy")} value={employees.find((item) => item.id === values.requestedById)?.label ?? "-"} />
          <Summary label={t("approver")} value={employees.find((item) => item.id === values.approverId)?.label ?? t("noApprover")} />
          {showsEstimatedSaleValue(values.disposalType as DisposalType) ? <Summary label={t("saleValue")} value={values.saleValue || "-"} /> : null}
          {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? <Summary label={t("salvageValue")} value={values.salvageValue || "-"} /> : null}
          <Summary label={t("reason")} value={values.reason} />
        </dl>
        <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-border">
          {selectedAssets.map((asset) => <div key={asset.id} className="border-b border-border px-3 py-2 text-sm last:border-b-0">{asset.label}</div>)}
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
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
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
            <NativeSelect value={values.disposalType} onChange={(event) => setValues((current) => ({ ...current, disposalType: event.target.value }))}>
              {["dispose", "sell", "donate", "destroy", "lost"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </NativeSelect>
          </Field>
          <SearchableSelect label={t("requestedBy")} required value={values.requestedById} options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setValues((current) => ({ ...current, requestedById: value, approverId: current.approverId === value ? "" : current.approverId }))} />
          <SearchableSelect label={t("approver")} value={values.approverId} options={approverOptions} placeholder={t("noApprover")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setValues((current) => ({ ...current, approverId: value }))} />
          {showsEstimatedSaleValue(values.disposalType as DisposalType) ? (
            <Field label={t("saleValueBaht")}>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.saleValue} onChange={(event) => setValues((current) => ({ ...current, saleValue: event.target.value }))} />
            </Field>
          ) : null}
          {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? (
            <Field label={t("salvageValueBaht")}>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={values.salvageValue} onChange={(event) => setValues((current) => ({ ...current, salvageValue: event.target.value }))} />
            </Field>
          ) : null}
          <Field
            label={t("reason")}
            required
            hint={<span className="block text-right">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</span>}
          >
            <Textarea required minLength={12} maxLength={4000} rows={5} value={values.reason} onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))} className="min-h-28" />
          </Field>
          <FormSection number={3} title={t("formSteps.evidence")} />
          <FileDropzone file={null} onFileChange={(file) => file && setFiles((current) => [...current, file])} disabled={saving} accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" title={t("dropEvidenceTitle")} description={t("batchEvidenceHelp")} browseLabel={t("dropEvidenceHint")} />
          <FileQueueList
            items={files.map((file, index) => ({ id: String(index), name: file.name }))}
            disabled={saving}
            onRemove={(id) => setFiles((current) => current.filter((_, index) => String(index) !== id))}
          />
          <Button disabled={!valid} onClick={() => setReviewing(true)} className="w-full">
            <PackageCheck aria-hidden="true" />
            {t("batchReview")}
          </Button>
        </div>
      </div>
    </section>
  )
}

function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-foreground">{value}</dd></div> }
