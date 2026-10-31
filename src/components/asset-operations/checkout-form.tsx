"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckoutPhoneBar, CheckoutReadBack } from "@/components/asset-operations/checkout-phone-steps"
import { AssetConditionChoice } from "@/components/asset-operations/condition-choice"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { ChosenPhotoPreview } from "@/components/ui/chosen-photo-preview"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge } from "@/components/ui/status-badge"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { Textarea } from "@/components/ui/textarea"
import { assetOperationRowLabel, chosenAssetReasonKey } from "@/lib/asset-operation-form-rules"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import type { AssetOperationEmployeeOption, AssetOperationNamedOption } from "@/lib/asset-operation-options"
import { buildAssetOperationSearchHref, type AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"
import {
  buildCheckoutChecklist,
  buildCheckoutSummaryRows,
  checkoutComponents,
  checkoutConditionDefault,
  checkoutReceiverLabel,
  checkoutRepairHref,
  checkoutRepairLinkShown,
  checkoutReceiverName,
  checkoutSubmitAction,
  isCheckoutConditionReasonKey,
  withCheckoutAssetDetail,
  type CheckoutChoice,
  type CheckoutDestinationType,
  type CheckoutDetailState,
  type CheckoutPhoneStep,
} from "@/lib/checkout-form-rules"
import { checkoutPhonePartClass, formatCheckoutDay, getCheckoutSignStatement } from "@/lib/checkout-phone-steps"
import { getAssetStateTone } from "@/lib/design-system"
import { toLocalDateInputValue } from "@/lib/local-date"
import type { AssetHandoverMode } from "@/lib/asset-handover-mode"
import { waitForDialogToClose } from "@/lib/field-focus"
import { cn } from "@/lib/utils"
import { notBefore, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { useMediaQuery } from "@/components/ui/use-media-query"

type Option = { id: string; label: string; disabled?: boolean }
type NamedOption = AssetOperationNamedOption & { disabled?: boolean }
type CheckoutType = CheckoutDestinationType
type HandoverModeSelection = "" | AssetHandoverMode
type CheckoutFormValues = {
  /** The row the shared picker chose, or the ?assetId= answer (chosen-but-blocked when it cannot be taken, spec 6.4). */
  asset: AssetOperationSearchRow | null
  checkoutType: CheckoutType
  handoverMode: HandoverModeSelection
  custodianId: string
  departmentId: string
  locationId: string
  checkoutDate: string
  expectedReturnDate: string
  conditionBefore: string
  remark: string
}

// The form's id: the frame's footer submit names it (group 3 spec §5).
const CHECKOUT_FORM_ID = "checkout-form"

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The one
// destination select shows the key of the checkout type: custodianId, departmentId or locationId (O-R3).
const FIELD_IDS = {
  assetId: "checkout-asset",
  checkoutType: "checkout-type",
  custodianId: "checkout-destination",
  departmentId: "checkout-destination",
  locationId: "checkout-destination",
  handoverMode: "checkout-handover-mode",
  expectedReturnDate: "checkout-expected-return",
  conditionBefore: "checkout-condition",
  checkoutDate: "checkout-date",
} as const
type CheckoutField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckoutField[]
const DESTINATION_KEYS = ["custodianId", "departmentId", "locationId"] as const
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

// ส่งมอบ (group 3 spec §7.1-§7.3): three sections in the shared operation frame, the สรุปก่อนบันทึก card beside them
// and the footer ตรวจสอบและบันทึก / ยกเลิก. Below lg the same form is the phone's three steps (spec §7.4, P1-R4): each
// part takes its step's class beside its data-checkout-part hook, and the phone's own bar follows the frame.
export function CheckoutForm({
  employees,
  departments,
  locations,
  conditions,
  initialAsset,
  returnTo,
  deliveredByLabel,
  canCreateRepair,
}: {
  employees: AssetOperationEmployeeOption[]
  departments: NamedOption[]
  locations: NamedOption[]
  conditions: Option[]
  /** ?assetId=: the search's by-id answer with its detail, takeable or not (spec 6.4, §7.1). */
  initialAsset: AssetOperationSearchRow | null
  returnTo?: string
  /** ผู้ส่งมอบ on the phone's read-back: the signed-in user (spec §7.4). */
  deliveredByLabel: string
  /** maintenance:create: the ส่งซ่อม link shows only to someone who may record a repair (final review I3). */
  canCreateRepair: boolean
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("checkout")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckoutField>()
  const [photoBefore, setPhotoBefore] = useState<File | null>(null)
  const [receiverSignatureDataUrl, setReceiverSignatureDataUrl] = useState<string | null>(null)
  // The chosen asset's detail=1 read (final review I1): the summary, the read-back and the statement need it. The
  // ?assetId= answer arrives with it; a picked row reads it. assetIdRef is the chosen id, so a late answer for an asset
  // chosen before does not set the state.
  const [assetDetail, setAssetDetail] = useState<CheckoutDetailState>(initialAsset && !initialAsset.detail ? "failed" : "ready")
  const assetIdRef = useRef(initialAsset?.id ?? null)
  // A submit's read of the asset is under way: the submit buttons show busy.
  const [readingForSubmit, setReadingForSubmit] = useState(false)
  // The phone step (spec §7.4, P1-R4); from lg it is ignored and every section shows.
  const [step, setStep] = useState<CheckoutPhoneStep>(1)
  const isDesktop = useMediaQuery("(min-width: 64rem)")
  // Step 1 reads the handover date as a line; เปลี่ยน, or an error on the date, opens the field.
  const [phoneDateOpen, setPhoneDateOpen] = useState(false)
  const [values, setValues] = useState<CheckoutFormValues>({
    asset: initialAsset,
    checkoutType: "user" as CheckoutType,
    handoverMode: "",
    custodianId: "",
    departmentId: "",
    locationId: "",
    checkoutDate: toLocalDateInputValue(),
    expectedReturnDate: "",
    // The asset's own condition, preselected (spec §7.2).
    conditionBefore: checkoutConditionDefault(initialAsset, conditions),
    remark: "",
  })

  // The choice the summary, the footer and the phone steps read.
  const selectedEmployee = employees.find((option) => option.id === values.custodianId) ?? null
  const selectedDepartment = departments.find((option) => option.id === values.departmentId) ?? null
  const selectedLocation = locations.find((option) => option.id === values.locationId) ?? null
  const choice: CheckoutChoice = {
    asset: values.asset,
    checkoutType: values.checkoutType,
    handoverMode: values.handoverMode,
    employee: selectedEmployee,
    department: selectedDepartment,
    location: selectedLocation,
  }
  const cancelHref = getOperationCancelHref(locale, returnTo)
  const receiverLabel = checkoutReceiverLabel(choice)
  // The read-back names the receiver plainly (look L1); the footer, the pad's helper and the statement keep "code - name".
  const receiverName = checkoutReceiverName(choice)
  const summaryRows = buildCheckoutSummaryRows(choice, {
    holder: tOperation("summaryHolder"),
    department: tOperation("summaryDepartment"),
    location: tOperation("summaryLocation"),
    status: tOperation("summaryStatus"),
    components: tOperation("summaryComponents"),
    none: tOperation("summaryNone"),
    notChosen: tOperation("summaryNotChosen"),
    inUse: t("statusInUse"),
    checkedOut: t("statusCheckedOut"),
    kept: (value) => tOperation("summaryKept", { value }),
    count: (count) => tOperation("summaryCount", { count }),
    componentsGo: (count) => t("summaryComponentsGo", { count }),
  })
  const checklist = buildCheckoutChecklist(
    { ...choice, signed: receiverSignatureDataUrl !== null },
    {
      asset: t("asset"),
      receiver: t("checkReceiver"),
      mode: t("handoverMode"),
      signature: t("receiverSignature"),
      signatureMissing: t("signatureMissing"),
    },
  )
  const { travelling, staying } = checkoutComponents(values.asset)
  const dateOpen = phoneDateOpen || Boolean(fieldErrors.errors.checkoutDate)
  const signStatement = getCheckoutSignStatement({ checkoutType: values.checkoutType, travellingCount: travelling.length })

  const destinationOptions = values.checkoutType === "user"
    ? employees
    : values.checkoutType === "department"
      ? departments
      : locations
  const destinationLabel = destinationOptions.find((option) => option.id === destinationValue(values))?.label
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
        ? [{ label: t("expectedReturn"), value: formatCheckoutDay(values.expectedReturnDate, locale) }]
        : []),
      // The photo and the signature each on its own line, so a signature that is gone shows (final review M1).
      { key: "photoBefore", label: t("photoBefore"), value: photoBefore ? t("reviewAttached") : t("reviewNotAttached") },
      { label: t("receiverSignature"), value: receiverSignatureDataUrl ? t("reviewAttached") : t("reviewNotAttached") },
    ],
    labels: {
      asset: t("asset"),
      source: t("checkedOutBy"),
      destination: t("checkoutTo"),
      nextStatus: t("conditionBefore"),
      evidence: t("reviewEvidence"),
    },
  })

  // The review's รูปก่อนส่งมอบ line shows the chosen photo beside "แนบแล้ว" (group 3 spec §19.5).
  const reviewDialogItems = reviewItems.map((item) => item.key === "photoBefore" && photoBefore
    ? {
        ...item,
        value: (
          <span className="inline-flex items-center justify-end gap-2">
            <ChosenPhotoPreview file={photoBefore} alt={t("photoBefore")} size={48} />
            <span>{item.value}</span>
          </span>
        ),
      }
    : item)

  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1). On the
  // phone a refused field is on step 1, so the form returns there first.
  async function leaveReview() {
    if (!isDesktop) return showStepOne()
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  // A phone step move: the page scrolls to the top and the step bar takes focus, so a screen reader reads the new step.
  function moveToStep(next: CheckoutPhoneStep) {
    setStep(next)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-dashboard-main]")?.scrollTo({ top: 0, behavior: "auto" })
      document.getElementById("checkout-phone-steps")?.focus({ preventScroll: true })
    })
  }

  // Back to step 1 before a field takes focus: two frames, so its parts show again.
  async function showStepOne() {
    setStep(1)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
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

  // A pick preselects the asset's own condition (spec §7.2); a row from the list has no detail yet, so it is read once.
  function setAsset(row: AssetOperationSearchRow | null) {
    setValues((current) => ({ ...current, asset: row, conditionBefore: checkoutConditionDefault(row, conditions) }))
    fieldErrors.clear("assetId", "conditionBefore")
    assetIdRef.current = row?.id ?? null
    setAssetDetail(row && !row.detail ? "loading" : "ready")
    if (row && !row.detail) void loadAssetDetail(row.id)
  }

  // The by-id read with detail=1 (spec §7.1, P1-R5): its whole row, so a verdict that changed since the pick shows. The
  // answer is used only while it is still the chosen asset (withCheckoutAssetDetail). A failed read (network, non-OK,
  // no row) keeps the row and sets the detail "failed": the card, and the phone's step 1, show อ่านข้อมูลสรุปไม่สำเร็จ
  // with ลองอีกครั้ง (final review I1). Returns the answered row, or null when the read failed.
  async function loadAssetDetail(assetId: string): Promise<AssetOperationSearchRow | null> {
    if (assetIdRef.current === assetId) setAssetDetail("loading")
    const response = await fetch(buildAssetOperationSearchHref({ mode: "checkout", id: assetId, detail: true })).catch(() => null)
    const payload = response?.ok ? await response.json().catch(() => null) : null
    const row: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
    const answered = row?.id === assetId && row.detail ? row : null
    if (assetIdRef.current !== assetId) return null
    setValues((current) => ({ ...current, asset: withCheckoutAssetDetail(current.asset, answered) }))
    setAssetDetail(answered ? "ready" : "failed")
    return answered
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readingForSubmit) return
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    // The desktop reviews in the dialog; the phone's step 1 goes on to the read-back, and step 3 saves (step 3 still
    // checks every field). The phone never opens the dialog. The review and step 2 read the chosen asset again first, so
    // the card, the read-back and step 3's statement show what the save will change (final review I1, M3): the submit's
    // detail is "loading" until that read answers.
    const hasAsset = values.asset !== null
    let action = checkoutSubmitAction({ isDesktop, step, detail: "loading", hasAsset })
    if (action === "readDetail" && values.asset) {
      setReadingForSubmit(true)
      const answered = await loadAssetDetail(values.asset.id).finally(() => setReadingForSubmit(false))
      // No longer takeable since the pick: stop, and the asset field reads its reason (the blocked-row path).
      if (answered && !answered.eligible) {
        fieldErrors.setErrors({ assetId: "invalid" })
        focusFirstError()
        return
      }
      action = checkoutSubmitAction({ isDesktop, step, detail: answered ? "ready" : "failed", hasAsset })
    }
    if (action === "review") return setReviewOpen(true)
    if (action === "nextStep") return moveToStep(2)
    if (action === "save") return void submitCheckout()
    // readDetail: the read failed, and the warning with ลองอีกครั้ง shows.
  }

  // อ่านข้อมูลสรุปไม่สำเร็จ, with ลองอีกครั้ง: in the summary card, and on the phone's step 1 above the bar's buttons.
  const detailFailedNotice = values.asset && assetDetail === "failed" ? (
    <span role="status" className="grid justify-items-start gap-2">
      <span>{t("detailReadFailed")}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => values.asset && void loadAssetDetail(values.asset.id)}>
        {tCommon("tryAgain")}
      </Button>
    </span>
  ) : null

  async function submitCheckout() {
    setSaving(true)
    const body = new FormData()
    body.set("handoverMode", values.handoverMode)
    body.set("checkoutType", values.checkoutType)
    body.set("custodianId", values.checkoutType === "user" ? values.custodianId : "")
    body.set("departmentId", values.checkoutType === "department" ? values.departmentId : "")
    body.set("locationId", values.checkoutType === "location" ? values.locationId : "")
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
        // The asset's condition changed since the last read: read it again before the field takes focus, so the row, the
        // checklist, the card and the ส่งซ่อม link catch up with the reason under the field (final review M2).
        if (payload?.code === "ASSET_CHECKOUT_CONDITION_BLOCKED" && values.asset) await loadAssetDetail(values.asset.id)
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
    <>
      <form onSubmit={handleSubmit} noValidate id={CHECKOUT_FORM_ID} data-step={step}>
        <OperationFormFrame
          title={t("title")}
          description={t("description")}
          phoneSteps
          summary={<OperationSummaryCard
            title={tOperation("summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={tOperation("summaryNext")}
            rows={summaryRows}
            checklist={checklist}
            warnings={detailFailedNotice ? [detailFailedNotice] : []}
            footnote={t("summaryFootnote")}
            photo={values.asset ? <AssetThumbnail photo={values.asset.photo} assetTag={values.asset.assetTag} assetName={values.asset.name} size={64} /> : undefined}
            assetLabel={values.asset ? assetOperationRowLabel(values.asset) : undefined}
          />}
          footer={{
            description: values.asset && receiverLabel
              ? t("footerDescription", { tag: values.asset.assetTag, receiver: receiverLabel })
              : t("footerIncomplete"),
            cancelHref,
            cancelLabel: tCommon("cancel"),
            submitLabel: tOperation("reviewAndSave"),
            busy: saving || readingForSubmit,
            formId: CHECKOUT_FORM_ID,
          }}
        >
          <CheckoutPhoneBar step={step} cancelHref={cancelHref} onStep={moveToStep} className={checkoutPhonePartClass("stepsBar", step)} />
          <CheckoutReadBack
            receiverLabel={receiverName ?? ""}
            assetName={values.asset?.name ?? ""}
            assetTag={values.asset?.assetTag ?? ""}
            serialNumber={values.asset?.serialNumber ?? null}
            assetPhoto={values.asset?.photo ?? null}
            photoCount={photoBefore ? 1 : 0}
            components={checkoutComponents(values.asset).travelling}
            conditionLabel={selectedCondition?.label ?? ""}
            handoverModeLabel={handoverModeLabel}
            statusAfterLabel={resultingStatusLabel}
            checkoutDateLabel={formatCheckoutDay(values.checkoutDate, locale)}
            dueDateLabel={values.handoverMode === "temporary_loan" ? formatCheckoutDay(values.expectedReturnDate, locale) : null}
            remark={values.remark}
            deliveredByLabel={deliveredByLabel}
            className={checkoutPhonePartClass("readBack", step)}
          />
          <div data-checkout-part="asset" className={checkoutPhonePartClass("asset", step)}>
            <FormSection number={1} title={t("sectionAsset")}>
              <div className="grid gap-4">
                {/* The arrival banner names the ?assetId= asset only while it is still the chosen one (look step). */}
                {initialAsset?.eligible && values.asset?.id === initialAsset.id ? (
                  <FormContextBanner label={t("asset")} value={assetOperationRowLabel(initialAsset)} />
                ) : null}
                <AssetOperationPicker
                  id="checkout-asset"
                  label={t("asset")}
                  mode="checkout"
                  value={values.asset}
                  required
                  error={errorText("assetId")}
                  onChange={setAsset}
                  pickedBody={(row) => <CheckoutAssetCard row={row} />}
                  // A row refused for its condition can be picked, so its reason reads under the field (spec §19.3, A1-R1).
                  pickBlocked={(row) => isCheckoutConditionReasonKey(row.reasonKey)}
                />
                {/* เสียหาย or ใช้งานไม่ได้: ส่งซ่อม opens a new repair for the asset, under its reason; ซาก gets none, and
                    nor does someone who may not record a repair (final review I3). It reads with the reason (M9). */}
                {values.asset && checkoutRepairLinkShown(assetReasonKey, canCreateRepair) ? (
                  <Link
                    href={checkoutRepairHref(locale, values.asset.id)}
                    aria-describedby="checkout-asset-error"
                    data-checkout-repair-link
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "-mt-2 justify-self-start")}
                  >
                    {tOperation("sendToRepair")}
                  </Link>
                ) : null}
                {travelling.length > 0 ? (
                  <div className="grid gap-1.5 text-sm">
                    <p className="font-medium text-foreground">{t("componentsTravel", { count: travelling.length })}</p>
                    <ul className="grid gap-1 text-muted-foreground">
                      {travelling.map((component) => (
                        <li key={component.id} className="min-w-0 break-words">
                          <span className="tag">{component.assetTag}</span> {component.name}
                        </li>
                      ))}
                    </ul>
                    <p className="text-meta text-muted-foreground">{t("componentsTravelNote")}</p>
                  </div>
                ) : null}
                {staying.length > 0 ? (
                  <Notice tone="info">
                    {t("componentsStaying", { count: staying.length, list: staying.map((component) => component.assetTag).join(", ") })}
                  </Notice>
                ) : null}
              </div>
            </FormSection>
          </div>
          <div data-checkout-part="receiver" className={checkoutPhonePartClass("receiver", step)}>
            <FormSection number={2} title={t("sectionReceiver")}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup legend={t("checkoutTo")} id="checkout-type" required error={errorText("checkoutType")}>
                  <Segmented
                    labelledBy="checkout-type-legend"
                    showCheck
                    value={values.checkoutType}
                    options={[
                      { value: "user", label: t("toUser") },
                      { value: "department", label: t("toDepartment") },
                      { value: "location", label: t("toLocation") },
                    ]}
                    onValueChange={(value) => {
                      setValues((current) => ({
                        ...current,
                        checkoutType: value,
                        handoverMode: value === "user" ? "" : "temporary_loan",
                        custodianId: "",
                        departmentId: "",
                        locationId: "",
                        expectedReturnDate: "",
                      }))
                      // Another receiver: the signature given for the last one goes (final review M2).
                      setReceiverSignatureDataUrl(null)
                      fieldErrors.clear("checkoutType", ...DESTINATION_KEYS, "handoverMode", "expectedReturnDate")
                    }}
                  />
                </FieldGroup>
                <SearchableSelect
                  id="checkout-destination"
                  label={values.checkoutType === "user"
                    ? t("receiverEmployee")
                    : values.checkoutType === "department"
                      ? t("receiverDepartment")
                      : t("receiverLocation")}
                  value={destinationValue(values)}
                  required
                  options={destinationOptions}
                  placeholder={t("selectDestination")}
                  searchPlaceholder={tCommon("searchSelectPlaceholder")}
                  emptyLabel={tCommon("searchSelectNoResults")}
                  hint={values.checkoutType === "user" && selectedEmployee
                    ? t("receiverHint", { department: selectedEmployee.departmentLabel, branch: selectedEmployee.branchLabel, count: selectedEmployee.heldCount })
                    : undefined}
                  error={errorText(destinationKey(values.checkoutType))}
                  onChange={(value) => setDestinationValue(values.checkoutType, value)}
                />
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
                <AssetConditionChoice
                  id="checkout-condition"
                  legend={t("conditionBefore")}
                  options={conditions}
                  value={values.conditionBefore}
                  required
                  error={errorText("conditionBefore")}
                  onChange={(value) => setField("conditionBefore", value)}
                />
                <div className={cn("flex min-w-0 items-center justify-between gap-3 md:col-span-2", checkoutPhonePartClass("dateLine", step), dateOpen && "hidden")}>
                  <p className="min-w-0 text-sm text-foreground">
                    {values.checkoutDate === toLocalDateInputValue()
                      ? t("phoneDateToday", { date: formatCheckoutDay(values.checkoutDate, locale) })
                      : t("phoneDateOther", { date: formatCheckoutDay(values.checkoutDate, locale) })}
                  </p>
                  <Button type="button" variant="ghost" size="sm" aria-label={t("phoneDateChange")} onClick={openPhoneDate}>
                    {tOperation("change")}
                  </Button>
                </div>
                <div className={cn(checkoutPhonePartClass("dateField", step), !dateOpen && "max-lg:hidden")}>
                  <Field label={t("checkoutDate")} id="checkout-date" required error={errorText("checkoutDate")}>
                    <Input type="date" value={values.checkoutDate} onChange={(event) => setField("checkoutDate", event.target.value)} required />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t("remark")}>
                    <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
                  </Field>
                </div>
              </div>
            </FormSection>
          </div>
          <p data-checkout-sign-statement className={cn("grid gap-1 text-base font-medium text-foreground", checkoutPhonePartClass("statement", step))}>
            <span>
              {t(signStatement.key, {
                tag: values.asset?.assetTag ?? "",
                count: checkoutComponents(values.asset).travelling.length,
                condition: selectedCondition?.label ?? "",
              })}
            </span>
            {signStatement.onBehalf ? (
              <span className="text-sm font-normal text-muted-foreground">{t("signOnBehalf", { destination: receiverLabel ?? "" })}</span>
            ) : null}
          </p>
          <div data-checkout-part="evidence" className={checkoutPhonePartClass("evidence", step)}>
            {/* The heading introduces the photo; on the phone's step 3 the statement is the step's heading (look L2). */}
            <FormSection number={3} title={<>{t("sectionEvidence")} <span className="font-normal text-muted-foreground">{t("sectionEvidenceOptional")}</span></>} className={cn("mb-4", checkoutPhonePartClass("evidenceHeading", step))} />
            <div>
              <div className="grid gap-4">
                <div data-checkout-part="photo" className={checkoutPhonePartClass("photo", step)}>
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
                  <ChosenPhotoPreview file={photoBefore} alt={t("photoBefore")} size={96} className="mt-2" />
                </div>
                <div data-checkout-part="signature" className={checkoutPhonePartClass("signature", step)}>
                  {/* A new receiver remounts the pad, so no ink given for another stays (final review M2). */}
                  <SignaturePad
                    key={`${values.checkoutType}:${destinationValue(values)}`}
                    label={t("receiverSignature")}
                    helper={receiverLabel ? t("receiverSignatureFor", { name: receiverLabel }) : t("receiverSignatureHelp")}
                    clearLabel={t("clearSignature")}
                    disabled={saving}
                    tall
                    onChange={setReceiverSignatureDataUrl}
                  />
                  <p className={cn("mt-2 text-meta text-muted-foreground", checkoutPhonePartClass("statement", step), "landscape:hidden")}>
                    {t("signLandscapeHint")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </OperationFormFrame>
        <StickyFormFooter className={checkoutPhonePartClass("stepsFooter", step)} status={step === 1 && detailFailedNotice ? <Notice tone="warning">{detailFailedNotice}</Notice> : undefined}>
          {step === 2 ? (
            <>
              <Button type="button" variant="outline" onClick={() => moveToStep(1)}>{t("phoneFix")}</Button>
              <Button type="button" onClick={() => moveToStep(3)}>{t("phoneAccept")}</Button>
            </>
          ) : null}
          {step === 1 ? <Button type="submit" busy={readingForSubmit}>{t("phoneNext")}</Button> : null}
          {step === 3 ? <Button type="submit" busy={saving}>{t("phoneSave")}</Button> : null}
        </StickyFormFooter>
      </form>
      <OperationReviewDialog
        open={reviewOpen}
        title={t("reviewTitle")}
        description={t("reviewDescription")}
        items={reviewDialogItems}
        confirmLabel={t("reviewConfirm")}
        cancelLabel={tCommon("cancel")}
        busy={saving}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void submitCheckout()}
      />
    </>
  )

  // เปลี่ยน on step 1's date line: the field opens and takes focus.
  function openPhoneDate() {
    setPhoneDateOpen(true)
    requestAnimationFrame(() => document.getElementById("checkout-date")?.focus())
  }

  function setDestinationValue(type: CheckoutType, value: string) {
    // Another receiver: the signature given for the last one goes (final review M2).
    if (value !== destinationValue(values)) setReceiverSignatureDataUrl(null)
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

// The chosen box of section 1 (spec §7.1): the tag and the status (muted until the detail arrives), the name, and where
// it is, its branch and its holder; without the detail, the location alone.
function CheckoutAssetCard({ row }: { row: AssetOperationSearchRow }) {
  const t = useTranslations("checkout")
  return (
    <span className="flex min-w-0 items-start gap-3">
      <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="tag font-medium">{row.assetTag}</span>
          <StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />
        </span>
        <span className="min-w-0 break-words font-medium text-foreground">{row.name}</span>
        <span className="min-w-0 break-words text-meta text-muted-foreground">
          {row.detail ? t("assetWhere", { location: row.locationLabel, branch: row.detail.locationBranchLabel, holder: row.detail.holderLabel ?? t("noHolder") }) : row.locationLabel}
        </span>
      </span>
    </span>
  )
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
  return "locationId"
}

function destinationValue(values: {
  checkoutType: CheckoutType
  custodianId: string
  departmentId: string
  locationId: string
}) {
  if (values.checkoutType === "user") return values.custodianId
  if (values.checkoutType === "department") return values.departmentId
  return values.locationId
}
