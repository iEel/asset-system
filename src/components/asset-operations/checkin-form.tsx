"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileImage, Loader2, PackageCheck, Save, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SignaturePad } from "@/components/asset-operations/signature-pad"

type Option = { id: string; label: string }
type StatusOption = Option & { name?: string }
type CheckoutOption = Option & {
  assetId?: string
  assetTag?: string
  assetName?: string
  serialNumber?: string | null
  checkoutType?: string
  checkoutDate?: string
  expectedReturnDate?: string | null
  conditionBefore?: string | null
  destinationLabel?: string
  remark?: string | null
}
type QueuedPhoto = {
  id: string
  label: string
  file: File
}

export function CheckinForm({
  activeCheckouts,
  employees,
  locations,
  statuses,
  conditions,
}: {
  activeCheckouts: CheckoutOption[]
  employees: Option[]
  locations: Option[]
  statuses: StatusOption[]
  conditions: StatusOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("checkin")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [photoType, setPhotoType] = useState("overview")
  const [photosAfter, setPhotosAfter] = useState<QueuedPhoto[]>([])
  const [returnSignatureDataUrl, setReturnSignatureDataUrl] = useState<string | null>(null)
  const [receiveSignatureDataUrl, setReceiveSignatureDataUrl] = useState<string | null>(null)
  const [createMaintenance, setCreateMaintenance] = useState(false)
  const [values, setValues] = useState({
    checkoutId: "",
    returnDate: new Date().toISOString().slice(0, 10),
    returnBy: "",
    receiveBy: "",
    conditionAfter: "",
    nextStatusId: "",
    nextLocationId: "",
    missingAccessories: "",
    damageNote: "",
    remark: "",
    maintenanceReportedById: "",
    maintenanceProblem: "",
  })

  const selectedCheckout = useMemo(
    () => activeCheckouts.find((checkout) => checkout.id === values.checkoutId),
    [activeCheckouts, values.checkoutId]
  )
  const conditionLabelById = useMemo(() => new Map(conditions.map((condition) => [condition.id, condition.label])), [conditions])
  const selectedStatus = statuses.find((status) => status.id === values.nextStatusId)
  const pendingRepairStatus = statuses.find((status) => status.name === "Pending Repair")
  const canCreateMaintenance = selectedStatus?.name === "Pending Repair"
  const hasActiveCheckouts = activeCheckouts.length > 0
  const photoTypes = [
    { id: "overview", label: t("photoTypeOverview") },
    { id: "assetTag", label: t("photoTypeAssetTag") },
    { id: "serial", label: t("photoTypeSerial") },
    { id: "accessories", label: t("photoTypeAccessories") },
    { id: "damage", label: t("photoTypeDamage") },
  ]

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "nextStatusId") {
      const status = statuses.find((item) => item.id === value)
      setCreateMaintenance(status?.name === "Pending Repair")
    }
  }

  function handleDamageNoteChange(value: string) {
    setValues((current) => ({
      ...current,
      damageNote: value,
      nextStatusId: value.trim() && !current.nextStatusId && pendingRepairStatus ? pendingRepairStatus.id : current.nextStatusId,
    }))
    if (value.trim() && pendingRepairStatus && !values.nextStatusId) setCreateMaintenance(true)
  }

  function addPhoto(file: File | null) {
    if (!file) return
    const selectedType = photoTypes.find((type) => type.id === photoType)
    setPhotosAfter((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: selectedType?.label ?? t("photoTypeOverview"),
        file,
      },
    ])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCheckout?.assetId) return
    setSaving(true)
    const body = new FormData()
    for (const [key, value] of Object.entries(values)) {
      body.set(key, value)
    }
    body.set("createMaintenance", String(createMaintenance && canCreateMaintenance))
    body.set("photoAfterLabels", JSON.stringify(photosAfter.map((photo) => photo.label)))
    for (const photo of photosAfter) {
      body.append("photoAfterFiles", photo.file)
    }
    if (returnSignatureDataUrl) body.set("returnSignatureFile", dataUrlToFile(returnSignatureDataUrl, `return-signature-${Date.now()}.png`))
    if (receiveSignatureDataUrl) body.set("receiveSignatureFile", dataUrlToFile(receiveSignatureDataUrl, `receive-signature-${Date.now()}.png`))

    try {
      const response = await fetch(`/api/assets/${selectedCheckout.assetId}/checkin`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/asset-management/checkins/${payload.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      </div>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SearchableSelect
            label={t("asset")}
            value={values.checkoutId}
            required
            disabled={!hasActiveCheckouts}
            options={activeCheckouts}
            placeholder={hasActiveCheckouts ? t("selectCheckout") : t("noActiveCheckoutsOption")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setField("checkoutId", value)}
          />

          {!hasActiveCheckouts && (
            <div className="md:col-span-2 rounded-md border border-dashed border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <PackageCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t("noActiveCheckoutsTitle")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t("noActiveCheckoutsDescription")}</div>
                  </div>
                </div>
                <Link href={`/${locale}/asset-management/checkout`} className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                  {t("goToCheckout")}
                </Link>
              </div>
            </div>
          )}

          {hasActiveCheckouts && (
            <>
          <Field label={t("returnDate")} required>
            <input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>

          {selectedCheckout && (
            <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("previousCheckout")}</div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <ReadOnly label={t("assetTag")} value={selectedCheckout.assetTag ?? "-"} />
                <ReadOnly label={t("assetName")} value={selectedCheckout.assetName ?? "-"} />
                <ReadOnly label={t("serialNumber")} value={selectedCheckout.serialNumber ?? "-"} />
                <ReadOnly label={t("checkoutType")} value={selectedCheckout.checkoutType ? t(`type_${selectedCheckout.checkoutType}`) : "-"} />
                <ReadOnly label={t("checkoutTo")} value={selectedCheckout.destinationLabel ?? "-"} />
                <ReadOnly label={t("conditionBefore")} value={selectedCheckout.conditionBefore ? conditionLabelById.get(selectedCheckout.conditionBefore) ?? selectedCheckout.conditionBefore : "-"} />
                <ReadOnly label={t("checkoutDate")} value={formatDate(selectedCheckout.checkoutDate)} />
                <ReadOnly label={t("expectedReturnDate")} value={formatDate(selectedCheckout.expectedReturnDate)} />
                <ReadOnly label={t("checkoutRemark")} value={selectedCheckout.remark ?? "-"} />
              </div>
            </div>
          )}

          <Field label={t("returnBy")} required>
            <input value={values.returnBy} onChange={(event) => setField("returnBy", event.target.value)} required maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("receiveBy")} required>
            <input value={values.receiveBy} onChange={(event) => setField("receiveBy", event.target.value)} required maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Select label={t("conditionAfter")} value={values.conditionAfter} required onChange={(value) => setField("conditionAfter", value)}>
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>{condition.label}</option>
            ))}
          </Select>
          <Select label={t("nextStatus")} value={values.nextStatusId} required onChange={(value) => setField("nextStatusId", value)}>
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </Select>
          <Select label={t("nextLocation")} value={values.nextLocationId} required onChange={(value) => setField("nextLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.label}</option>
            ))}
          </Select>
          <Field label={t("missingAccessories")}>
            <input value={values.missingAccessories} onChange={(event) => setField("missingAccessories", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("damageNote")}>
              <textarea value={values.damageNote} onChange={(event) => handleDamageNoteChange(event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>

          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileImage className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{t("returnPhotoChecklist")}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("returnPhotoChecklistHelp")}</div>
              </div>
            </div>
            <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr]">
              <Select label={t("photoType")} value={photoType} onChange={setPhotoType}>
                {photoTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </Select>
              <FileDropzone
                file={null}
                onFileChange={addPhoto}
                disabled={saving}
                accept="image/*"
                capture="environment"
                title={t("photoAfterDropTitle")}
                hint={t("photoQueued")}
                browseLabel={t("photoAfterDropHint")}
              />
            </div>
            <div className="grid gap-2">
              {photosAfter.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">{t("noQueuedPhotos")}</div>
              ) : (
                photosAfter.map((photo) => (
                  <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{photo.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{photo.file.name}</div>
                    </div>
                    <button type="button" onClick={() => setPhotosAfter((current) => current.filter((item) => item.id !== photo.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("removePhoto")}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <SignaturePad
              label={t("returnSignature")}
              helper={t("returnSignatureHelp")}
              clearLabel={t("clearSignature")}
              disabled={saving}
              onChange={setReturnSignatureDataUrl}
            />
            <SignaturePad
              label={t("receiveSignature")}
              helper={t("receiveSignatureHelp")}
              clearLabel={t("clearSignature")}
              disabled={saving}
              onChange={setReceiveSignatureDataUrl}
            />
          </div>

          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={createMaintenance}
                disabled={!canCreateMaintenance}
                onChange={(event) => setCreateMaintenance(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wrench className="h-4 w-4" />
                  {t("createMaintenance")}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {canCreateMaintenance ? t("createMaintenanceHelp") : t("createMaintenanceDisabledHelp")}
                </span>
              </span>
            </label>
            {createMaintenance && canCreateMaintenance && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SearchableSelect
                  label={t("maintenanceReportedBy")}
                  value={values.maintenanceReportedById}
                  required
                  options={employees}
                  placeholder={t("selectMaintenanceReportedBy")}
                  searchPlaceholder={tCommon("searchSelectPlaceholder")}
                  emptyLabel={tCommon("searchSelectNoResults")}
                  onChange={(value) => setField("maintenanceReportedById", value)}
                />
                <div className="md:col-span-2">
                  <Field label={t("maintenanceProblem")}>
                    <textarea value={values.maintenanceProblem} onChange={(event) => setField("maintenanceProblem", event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder={t("maintenanceProblemPlaceholder")} />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving || !selectedCheckout?.assetId} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {tCommon("save")}
            </button>
          </div>
            </>
          )}
        </form>
      </section>
    </div>
  )
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

function Select({ label, value, required, disabled, onChange, children }: { label: string; value: string; required?: boolean; disabled?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">
        {children}
      </select>
    </Field>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium text-foreground" title={value}>{value}</div>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value))
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [metadata, base64Data] = dataUrl.split(",")
  const mimeMatch = metadata.match(/data:(.*);base64/)
  const mimeType = mimeMatch?.[1] ?? "image/png"
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], fileName, { type: mimeType })
}
