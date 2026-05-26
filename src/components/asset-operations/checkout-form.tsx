"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type Option = { id: string; label: string; disabled?: boolean }
type CheckoutType = "user" | "department" | "location" | "asset"

export function CheckoutForm({
  assets,
  employees,
  departments,
  locations,
  conditions,
  initialAssetId,
}: {
  assets: Option[]
  employees: Option[]
  departments: Option[]
  locations: Option[]
  conditions: Option[]
  initialAssetId?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("checkout")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [photoBefore, setPhotoBefore] = useState<File | null>(null)
  const [receiverSignatureDataUrl, setReceiverSignatureDataUrl] = useState<string | null>(null)
  const initialAsset = assets.find((asset) => asset.id === initialAssetId && !asset.disabled)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    checkoutType: "user" as CheckoutType,
    custodianId: "",
    departmentId: "",
    locationId: "",
    parentAssetId: "",
    checkoutDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: "",
    conditionBefore: "",
    remark: "",
  })

  const destinationOptions = useMemo(() => {
    if (values.checkoutType === "user") return employees
    if (values.checkoutType === "department") return departments
    if (values.checkoutType === "location") return locations
    return assets.filter((asset) => asset.id !== values.assetId)
  }, [assets, departments, employees, locations, values.assetId, values.checkoutType])

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const body = new FormData()
    body.set("checkoutType", values.checkoutType)
    body.set("custodianId", values.checkoutType === "user" ? values.custodianId : "")
    body.set("departmentId", values.checkoutType === "department" ? values.departmentId : "")
    body.set("locationId", values.checkoutType === "location" ? values.locationId : "")
    body.set("parentAssetId", values.checkoutType === "asset" ? values.parentAssetId : "")
    body.set("checkoutDate", values.checkoutDate)
    body.set("expectedReturnDate", values.expectedReturnDate)
    body.set("conditionBefore", values.conditionBefore)
    body.set("remark", values.remark)
    if (photoBefore) body.set("photoBefore", photoBefore)
    const receiverSignatureFile = receiverSignatureDataUrl
      ? dataUrlToFile(receiverSignatureDataUrl, `receiver-signature-${Date.now()}.png`)
      : null
    if (receiverSignatureFile) body.set("receiverSignatureFile", receiverSignatureFile)

    try {
      const response = await fetch(`/api/assets/${values.assetId}/checkout`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("success"))
      router.push(`/${locale}/asset-management/checkouts/${payload.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <OperationShell title={t("title")}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        {initialAsset ? (
          <div className="md:col-span-2">
            <FormContextBanner label={t("asset")} value={initialAsset.label} />
          </div>
        ) : null}
        <SearchableSelect
          label={t("asset")}
          value={values.assetId}
          required
          options={assets}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          onChange={(value) => setField("assetId", value)}
        />
        <Select
          label={t("checkoutType")}
          value={values.checkoutType}
          required
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              checkoutType: value as CheckoutType,
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAssetId: "",
            }))
          }}
        >
          <option value="user">{t("toUser")}</option>
          <option value="department">{t("toDepartment")}</option>
          <option value="location">{t("toLocation")}</option>
          <option value="asset">{t("toAsset")}</option>
        </Select>
        <SearchableSelect
          label={t("checkoutTo")}
          value={destinationValue(values)}
          required
          options={destinationOptions}
          placeholder={t("selectDestination")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          onChange={(value) => setDestinationValue(values.checkoutType, value)}
        />
        <Select label={t("conditionBefore")} value={values.conditionBefore} required onChange={(value) => setField("conditionBefore", value)}>
          <option value="">{t("selectCondition")}</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.label}
            </option>
          ))}
        </Select>
        <Field label={t("checkoutDate")} required>
          <input type="date" value={values.checkoutDate} onChange={(event) => setField("checkoutDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label={t("expectedReturn")}>
          <input type="date" value={values.expectedReturnDate} onChange={(event) => setField("expectedReturnDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("remark")}>
            <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t("photoBefore")}>
            <FileDropzone
              file={photoBefore}
              onFileChange={setPhotoBefore}
              disabled={saving}
              accept="image/*"
              capture="environment"
              title={t("photoBeforeDropTitle")}
              hint={t("photoBeforeSelected")}
              browseLabel={t("photoBeforeDropHint")}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <SignaturePad
            label={t("receiverSignature")}
            helper={t("receiverSignatureHelp")}
            clearLabel={t("clearSignature")}
            disabled={saving}
            onChange={setReceiverSignatureDataUrl}
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
    </OperationShell>
  )

  function setDestinationValue(type: CheckoutType, value: string) {
    if (type === "user") setField("custodianId", value)
    if (type === "department") setField("departmentId", value)
    if (type === "location") setField("locationId", value)
    if (type === "asset") setField("parentAssetId", value)
  }
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64] = dataUrl.split(",")
  const mimeMatch = header.match(/data:(.*);base64/)
  const mimeType = mimeMatch?.[1] ?? "image/png"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], fileName, { type: mimeType })
}

function destinationValue(values: {
  checkoutType: CheckoutType
  custodianId: string
  departmentId: string
  locationId: string
  parentAssetId: string
}) {
  if (values.checkoutType === "user") return values.custodianId
  if (values.checkoutType === "department") return values.departmentId
  if (values.checkoutType === "location") return values.locationId
  return values.parentAssetId
}

function OperationShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <section className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">{children}</section>
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
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0">
        {children}
      </select>
    </Field>
  )
}
