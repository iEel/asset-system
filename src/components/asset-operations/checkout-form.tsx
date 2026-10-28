"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { assetOperationRowLabel, chosenAssetReasonKey } from "@/lib/asset-operation-form-rules"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { toLocalDateInputValue } from "@/lib/local-date"
import type { AssetHandoverMode } from "@/lib/asset-handover-mode"
import { waitForDialogToClose } from "@/lib/field-focus"
import { notBefore, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string; disabled?: boolean }
type CheckoutType = "user" | "department" | "location" | "asset"
type HandoverModeSelection = "" | AssetHandoverMode
type CheckoutFormValues = {
  /** The row the shared picker chose, or the ?assetId= answer (chosen-but-blocked when it cannot be taken, spec 6.4). */
  asset: AssetOperationSearchRow | null
  checkoutType: CheckoutType
  handoverMode: HandoverModeSelection
  custodianId: string
  departmentId: string
  locationId: string
  /** ทรัพย์สินอื่น: the destination asset, chosen through the shared picker (mode checkoutParent). */
  parentAsset: AssetOperationSearchRow | null
  checkoutDate: string
  expectedReturnDate: string
  conditionBefore: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The one
// destination select shows the key of the checkout type: custodianId, departmentId, locationId or parentAssetId (O-R3).
const FIELD_IDS = {
  assetId: "checkout-asset",
  checkoutType: "checkout-type",
  custodianId: "checkout-destination",
  departmentId: "checkout-destination",
  locationId: "checkout-destination",
  parentAssetId: "checkout-destination",
  handoverMode: "checkout-handover-mode",
  conditionBefore: "checkout-condition",
  checkoutDate: "checkout-date",
  expectedReturnDate: "checkout-expected-return",
} as const
type CheckoutField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckoutField[]
const DESTINATION_KEYS = ["custodianId", "departmentId", "locationId", "parentAssetId"] as const
// The handover codes (the server's catalog keys, which validate() sends too) read the checkout form's own sentences, in
// the words of its fields (spec §7.1); every other code reads the shared message (O-R2).
const HANDOVER_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  handoverModeRequired: "handoverModeRequired",
  handoverPermanentUserOnly: "permanentUserOnly",
  handoverPermanentCustodianRequired: "permanentCustodianRequired",
  handoverPermanentNoDueDate: "permanentDueDateNotAllowed",
  handoverTemporaryDueDateRequired: "temporaryDueDateRequired",
  handoverReturnBeforeCheckout: "returnBeforeCheckout",
}

// noValidate turns the browser's check off, so this restates the controls' required, and the handover rules with the
// server's own codes (HANDOVER_*), so a refusal from either side reads the same under the field (v-track M-R2, O-R2).
function validate(values: CheckoutFormValues): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {}
  const check = (key: CheckoutField, code: string | null) => {
    if (code) errors[key] = code
  }
  // A ?assetId= that arrived blocked stays chosen; save stops on it, and the field reads its reason (errorText).
  check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))
  check("checkoutType", required(values.checkoutType))
  check(destinationKey(values.checkoutType), required(destinationValue(values)))
  if (values.checkoutType === "user") check("handoverMode", required(values.handoverMode) && "handoverModeRequired")
  check("conditionBefore", required(values.conditionBefore))
  check("checkoutDate", required(values.checkoutDate))
  if (values.handoverMode === "temporary_loan") {
    check(
      "expectedReturnDate",
      (required(values.expectedReturnDate) && "handoverTemporaryDueDateRequired") ??
        (notBefore(values.expectedReturnDate, values.checkoutDate) && "handoverReturnBeforeCheckout"),
    )
  }
  return errors
}

export function CheckoutForm({
  employees,
  departments,
  locations,
  conditions,
  initialAsset,
  returnTo,
}: {
  employees: Option[]
  departments: Option[]
  locations: Option[]
  conditions: Option[]
  /** ?assetId=: the search's by-id answer, takeable or not (spec 6.4). */
  initialAsset: AssetOperationSearchRow | null
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("checkout")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckoutField>()
  const [photoBefore, setPhotoBefore] = useState<File | null>(null)
  const [receiverSignatureDataUrl, setReceiverSignatureDataUrl] = useState<string | null>(null)
  const [values, setValues] = useState<CheckoutFormValues>({
    asset: initialAsset,
    checkoutType: "user" as CheckoutType,
    handoverMode: "",
    custodianId: "",
    departmentId: "",
    locationId: "",
    parentAsset: null,
    checkoutDate: toLocalDateInputValue(),
    expectedReturnDate: "",
    conditionBefore: "",
    remark: "",
  })

  // The three master-list destinations; ทรัพย์สินอื่น is the shared picker and holds its row (spec 6.3).
  const destinationOptions = values.checkoutType === "user"
    ? employees
    : values.checkoutType === "department"
      ? departments
      : values.checkoutType === "location"
        ? locations
        : []
  const destinationLabel = values.checkoutType === "asset"
    ? (values.parentAsset ? assetOperationRowLabel(values.parentAsset) : undefined)
    : destinationOptions.find((option) => option.id === destinationValue(values))?.label
  const assetReasonKey = chosenAssetReasonKey(values.asset)
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
    assetLabel: values.asset ? assetOperationRowLabel(values.asset) : "",
    destinationLabels: [destinationLabel],
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

  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })
  const errorText = (key: CheckoutField) => {
    // A chosen asset this transaction cannot take reads its reason from arrival, over any code (spec 6.4).
    if (key === "assetId" && assetReasonKey) return tAll(assetReasonKey)
    const code = fieldErrors.errors[key]
    return code && Object.hasOwn(HANDOVER_MESSAGE_KEYS, code) ? t(HANDOVER_MESSAGE_KEYS[code]) : fieldErrors.message(key)
  }

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // The two dates are one rule, so a change of either clears both (spec §4.3).
    if (field === "checkoutDate" || field === "expectedReturnDate") fieldErrors.clear("checkoutDate", "expectedReturnDate")
    else if (field in FIELD_IDS) fieldErrors.clear(field as CheckoutField)
  }

  // An asset cannot be its own destination: choosing the asset that is the ทรัพย์สินอื่น destination clears it.
  function setAsset(asset: AssetOperationSearchRow | null) {
    setValues((current) => ({ ...current, asset, parentAsset: current.parentAsset?.id === asset?.id ? null : current.parentAsset }))
    fieldErrors.clear("assetId")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
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
    body.set("parentAssetId", values.checkoutType === "asset" ? (values.parentAsset?.id ?? "") : "")
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
      const response = await fetch(`/api/assets/${values.asset?.id}/checkout`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getCheckoutErrorMessage(payload?.code ?? payload?.error))
      }
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
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        {/* The arrival banner names the ?assetId= asset only while it is still the chosen one (look step). */}
        {initialAsset?.eligible && values.asset?.id === initialAsset.id ? (
          <div className="md:col-span-2">
            <FormContextBanner label={t("asset")} value={assetOperationRowLabel(initialAsset)} />
          </div>
        ) : null}
        <AssetOperationPicker
          id="checkout-asset"
          label={t("asset")}
          mode="checkout"
          value={values.asset}
          required
          error={errorText("assetId")}
          onChange={setAsset}
        />
        <Select
          label={t("checkoutType")}
          id="checkout-type"
          value={values.checkoutType}
          required
          error={errorText("checkoutType")}
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              checkoutType: value as CheckoutType,
              handoverMode: value === "user" ? "" : "temporary_loan",
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAsset: null,
              expectedReturnDate: "",
            }))
            fieldErrors.clear("checkoutType", ...DESTINATION_KEYS, "handoverMode", "expectedReturnDate")
          }}
        >
          <option value="user">{t("toUser")}</option>
          <option value="department">{t("toDepartment")}</option>
          <option value="location">{t("toLocation")}</option>
          <option value="asset">{t("toAsset")}</option>
        </Select>
        {values.checkoutType === "asset" ? (
          <AssetOperationPicker
            id="checkout-destination"
            label={t("checkoutTo")}
            mode="checkoutParent"
            context={{ handedOverAssetId: values.asset?.id }}
            value={values.parentAsset}
            required
            error={errorText(destinationKey(values.checkoutType))}
            onChange={(parentAsset) => {
              setValues((current) => ({ ...current, parentAsset }))
              fieldErrors.clear("parentAssetId")
            }}
          />
        ) : (
          <SearchableSelect
            id="checkout-destination"
            label={t("checkoutTo")}
            value={destinationValue(values)}
            required
            options={destinationOptions}
            placeholder={t("selectDestination")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={errorText(destinationKey(values.checkoutType))}
            onChange={(value) => setDestinationValue(values.checkoutType, value)}
          />
        )}
        <div className="md:col-span-2">
          {values.checkoutType === "user" ? (
            <FieldGroup legend={t("handoverMode")} id="checkout-handover-mode" required error={errorText("handoverMode")}>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["permanent_assignment", t("permanentAssignment"), t("permanentAssignmentHelp")],
                  ["temporary_loan", t("temporaryLoan"), t("temporaryLoanHelp")],
                ] as const).map(([mode, label, help]) => (
                  <ChoiceCard
                    key={mode}
                    type="radio"
                    name="handoverModeChoice"
                    value={mode}
                    checked={values.handoverMode === mode}
                    required
                    label={label}
                    description={help}
                    onChange={() => {
                      setValues((current) => ({
                        ...current,
                        handoverMode: mode,
                        expectedReturnDate: mode === "permanent_assignment" ? "" : current.expectedReturnDate,
                      }))
                      fieldErrors.clear("handoverMode", "expectedReturnDate")
                    }}
                  />
                ))}
              </div>
            </FieldGroup>
          ) : (
            <div>
              <p className={fieldLabelClasses}>{t("handoverMode")}</p>
              <p className="mt-1.5 text-sm text-foreground">{t("temporaryLoan")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("nonUserTemporaryHelp")}</p>
            </div>
          )}
        </div>
        <Select
          label={t("conditionBefore")}
          id="checkout-condition"
          value={values.conditionBefore}
          required
          error={errorText("conditionBefore")}
          onChange={(value) => setField("conditionBefore", value)}
        >
          <option value="">{t("selectCondition")}</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.label}
            </option>
          ))}
        </Select>
        <Field label={t("checkoutDate")} id="checkout-date" required error={errorText("checkoutDate")}>
          <Input type="date" value={values.checkoutDate} onChange={(event) => setField("checkoutDate", event.target.value)} required />
        </Field>
        {values.handoverMode === "temporary_loan" ? (
          <Field label={t("expectedReturn")} id="checkout-expected-return" required error={errorText("expectedReturnDate")}>
            <Input
              type="date"
              value={values.expectedReturnDate}
              min={values.checkoutDate}
              onChange={(event) => setField("expectedReturnDate", event.target.value)}
              required
            />
          </Field>
        ) : null}
        <div className="md:col-span-2">
          <Field label={t("remark")}>
            <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
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
        onConfirm={() => void submitCheckout()}
      />
    </OperationShell>
  )

  function setDestinationValue(type: CheckoutType, value: string) {
    if (type === "user") setField("custodianId", value)
    if (type === "department") setField("departmentId", value)
    if (type === "location") setField("locationId", value)
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

function destinationKey(type: CheckoutType): (typeof DESTINATION_KEYS)[number] {
  if (type === "user") return "custodianId"
  if (type === "department") return "departmentId"
  if (type === "location") return "locationId"
  return "parentAssetId"
}

function destinationValue(values: {
  checkoutType: CheckoutType
  custodianId: string
  departmentId: string
  locationId: string
  parentAsset: AssetOperationSearchRow | null
}) {
  if (values.checkoutType === "user") return values.custodianId
  if (values.checkoutType === "department") return values.departmentId
  if (values.checkoutType === "location") return values.locationId
  return values.parentAsset?.id ?? ""
}

function OperationShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={title} className="mb-6" />
      <ContentPanel>{children}</ContentPanel>
    </div>
  )
}

function Select({
  label,
  id,
  value,
  required,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  error?: React.ReactNode
  onChange: (value: string) => void
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
