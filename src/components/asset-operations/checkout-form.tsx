"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import type { AssetHandoverMode } from "@/lib/asset-handover-mode"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean }
type CheckoutType = "user" | "department" | "location" | "asset"
type HandoverModeSelection = "" | AssetHandoverMode
type CheckoutFormValues = {
  assetId: string
  checkoutType: CheckoutType
  handoverMode: HandoverModeSelection
  custodianId: string
  departmentId: string
  locationId: string
  parentAssetId: string
  checkoutDate: string
  expectedReturnDate: string
  conditionBefore: string
  remark: string
}

export function CheckoutForm({
  assets,
  employees,
  departments,
  locations,
  conditions,
  initialAssetId,
  returnTo,
}: {
  assets: Option[]
  employees: Option[]
  departments: Option[]
  locations: Option[]
  conditions: Option[]
  initialAssetId?: string
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("checkout")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [photoBefore, setPhotoBefore] = useState<File | null>(null)
  const [receiverSignatureDataUrl, setReceiverSignatureDataUrl] = useState<string | null>(null)
  const initialAsset = assets.find((asset) => asset.id === initialAssetId && !asset.disabled)
  const [values, setValues] = useState<CheckoutFormValues>({
    assetId: initialAsset?.id ?? "",
    checkoutType: "user" as CheckoutType,
    handoverMode: "",
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
  const selectedAsset = assets.find((asset) => asset.id === values.assetId)
  const selectedDestination = destinationOptions.find((option) => option.id === destinationValue(values))
  const selectedCondition = conditions.find((condition) => condition.id === values.conditionBefore)
  const handoverModeLabel = values.handoverMode === "permanent_assignment"
    ? t("permanentAssignment")
    : values.handoverMode === "temporary_loan"
      ? t("temporaryLoan")
      : ""
  const resultingStatusLabel = values.handoverMode === "permanent_assignment"
    ? t("statusInUse")
    : values.handoverMode === "temporary_loan"
      ? t("statusCheckedOut")
      : ""
  const reviewItems = buildOperationReviewSummary({
    assetLabel: selectedAsset?.label ?? "",
    destinationLabels: [selectedDestination?.label],
    nextStatusLabel: selectedCondition?.label,
    details: [
      { label: t("handoverMode"), value: handoverModeLabel },
      { label: t("resultingStatus"), value: resultingStatusLabel },
      ...(values.handoverMode === "temporary_loan" && values.expectedReturnDate
        ? [{ label: t("expectedReturn"), value: values.expectedReturnDate }]
        : []),
    ],
    evidenceLabel: photoBefore || receiverSignatureDataUrl ? t("reviewEvidenceAttached") : t("reviewNoEvidence"),
    labels: {
      asset: t("asset"),
      source: t("checkedOutBy"),
      destination: t("checkoutTo"),
      nextStatus: t("conditionBefore"),
      evidence: t("reviewEvidence"),
    },
  })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAsset || !selectedDestination || !selectedCondition) {
      toast.error(t("reviewIncomplete"))
      return
    }
    if (!values.handoverMode) {
      toast.error(t("handoverModeRequired"))
      return
    }
    if (values.handoverMode === "temporary_loan" && !values.expectedReturnDate) {
      toast.error(t("temporaryDueDateRequired"))
      return
    }
    if (values.expectedReturnDate && values.expectedReturnDate < values.checkoutDate) {
      toast.error(t("returnBeforeCheckout"))
      return
    }
    setReviewOpen(true)
  }

  async function submitCheckout() {
    setSaving(true)
    const body = new FormData()
    body.set("handoverMode", values.handoverMode)
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
      if (!response.ok) throw new Error(getCheckoutErrorMessage(payload?.code ?? payload?.error))
      toast.success(t("success"))
      const documentHref = `/${locale}/asset-management/checkouts/${payload.id}`
      router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
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
              handoverMode: value === "user" ? "" : "temporary_loan",
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAssetId: "",
              expectedReturnDate: "",
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
        <div className="md:col-span-2">
          {values.checkoutType === "user" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">
                {t("handoverMode")}
                <span className="ml-1 text-danger">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["permanent_assignment", t("permanentAssignment"), t("permanentAssignmentHelp")],
                  ["temporary_loan", t("temporaryLoan"), t("temporaryLoanHelp")],
                ] as const).map(([mode, label, help]) => {
                  const selected = values.handoverMode === mode
                  return (
                    <label
                      key={mode}
                      className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                        selected ? "border-primary bg-primary-soft" : "border-border bg-background hover:border-primary/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="handoverModeChoice"
                        value={mode}
                        checked={selected}
                        required
                        className="mt-1 h-4 w-4 accent-primary"
                        onChange={() => setValues((current) => ({
                          ...current,
                          handoverMode: mode,
                          expectedReturnDate: mode === "permanent_assignment" ? "" : current.expectedReturnDate,
                        }))}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{help}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <div>
              <FormContextBanner label={t("handoverMode")} value={t("temporaryLoan")} />
              <p className="mt-2 text-sm text-muted-foreground">{t("nonUserTemporaryHelp")}</p>
            </div>
          )}
        </div>
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
        {values.handoverMode === "temporary_loan" ? (
          <Field label={t("expectedReturn")} required>
            <input
              type="date"
              value={values.expectedReturnDate}
              min={values.checkoutDate}
              onChange={(event) => setField("expectedReturnDate", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        ) : null}
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
          <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
      <OperationReviewDialog
        open={reviewOpen}
        title={t("reviewTitle")}
        description={t("reviewDescription")}
        items={reviewItems}
        confirmLabel={t("reviewConfirm")}
        cancelLabel={tCommon("cancel")}
        closeLabel={tCommon("close")}
        busy={saving}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void submitCheckout()}
      />
    </OperationShell>
  )

  function setDestinationValue(type: CheckoutType, value: string) {
    if (type === "user") setField("custodianId", value)
    if (type === "department") setField("departmentId", value)
    if (type === "location") setField("locationId", value)
    if (type === "asset") setField("parentAssetId", value)
  }

  function getCheckoutErrorMessage(code: unknown) {
    switch (code) {
      case "HANDOVER_MODE_REQUIRED": return t("handoverModeRequired")
      case "HANDOVER_PERMANENT_USER_ONLY": return t("permanentUserOnly")
      case "HANDOVER_PERMANENT_CUSTODIAN_REQUIRED": return t("permanentCustodianRequired")
      case "HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED": return t("permanentDueDateNotAllowed")
      case "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED": return t("temporaryDueDateRequired")
      case "HANDOVER_RETURN_BEFORE_CHECKOUT": return t("returnBeforeCheckout")
      default: return typeof code === "string" && code ? code : tCommon("error")
    }
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
