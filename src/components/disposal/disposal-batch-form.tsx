"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, PackageCheck, Save, X } from "lucide-react"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { DisposalAssetPicker, type DisposalAssetOption } from "@/components/disposal/disposal-asset-picker"
import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"

type Option = { id: string; label: string }

export function DisposalBatchForm({ employees }: { employees: Option[] }) {
  const locale = useLocale()
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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  if (reviewing) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("batchReviewTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewHelp", { count: selectedIds.length })}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
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
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setReviewing(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> {t("batchBackToEdit")}
          </button>
          <button type="button" onClick={submit} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("batchConfirm")}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-4">
          <FormStep number={1} title={t("formSteps.asset")} />
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
          <FormStep number={2} title={t("formSteps.request")} />
          <Field label={t("disposalType")}><select value={values.disposalType} onChange={(event) => setValues((current) => ({ ...current, disposalType: event.target.value }))} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm">{["dispose", "sell", "donate", "destroy", "lost"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></Field>
          <SearchableSelect label={t("requestedBy")} required value={values.requestedById} options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setValues((current) => ({ ...current, requestedById: value, approverId: current.approverId === value ? "" : current.approverId }))} />
          <SearchableSelect label={t("approver")} value={values.approverId} options={approverOptions} placeholder={t("noApprover")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setValues((current) => ({ ...current, approverId: value }))} />
          {showsEstimatedSaleValue(values.disposalType as DisposalType) ? <Field label={t("saleValue")}><input type="number" min="0" step="0.01" value={values.saleValue} onChange={(event) => setValues((current) => ({ ...current, saleValue: event.target.value }))} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm" /></Field> : null}
          {showsEstimatedSalvageValue(values.disposalType as DisposalType) ? <Field label={t("salvageValue")}><input type="number" min="0" step="0.01" value={values.salvageValue} onChange={(event) => setValues((current) => ({ ...current, salvageValue: event.target.value }))} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm" /></Field> : null}
          <Field label={t("reason")}><textarea required minLength={12} maxLength={4000} rows={5} value={values.reason} onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /><p className="mt-1 text-right text-xs text-muted-foreground">{t("reasonCharacterCount", { count: values.reason.length, max: 4000 })}</p></Field>
          <FormStep number={3} title={t("formSteps.evidence")} />
          <FileDropzone file={null} onFileChange={(file) => file && setFiles((current) => [...current, file])} disabled={saving} accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" title={t("dropEvidenceTitle")} hint={t("batchEvidenceHelp")} browseLabel={t("dropEvidenceHint")} />
          {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"><span className="truncate">{file.name}</span><button type="button" aria-label={tCommon("delete")} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-10 w-10 items-center justify-center text-danger"><X className="h-4 w-4" /></button></div>)}
          <button type="button" disabled={!valid} onClick={() => setReviewing(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"><PackageCheck className="h-4 w-4" />{t("batchReview")}</button>
        </div>
      </div>
    </section>
  )
}

function FormStep({ number, title }: { number: number; title: string }) { return <div className="flex items-center gap-3 border-b border-border pb-3"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{number}</span><h2 className="text-sm font-semibold text-foreground">{title}</h2></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-foreground">{value}</dd></div> }
