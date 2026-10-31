"use client"

import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import {
  assetOperationRowLabel,
  chosenAssetReasonKey,
  transferAssetToClear,
  type ClearedTransferAsset,
} from "@/lib/asset-operation-form-rules"
import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "@/lib/asset-operation-options"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { buildAssetOperationSearchHref, type AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"
import { withCheckoutAssetDetail, type CheckoutDetailState } from "@/lib/checkout-form-rules"
import { getAssetStateTone } from "@/lib/design-system"
import { focusField, waitForDialogToClose } from "@/lib/field-focus"
import {
  TRANSFER_REASON_CHIPS,
  applyTransferReasonChip,
  buildTransferChecklist,
  buildTransferFooterLine,
  buildTransferLead,
  buildTransferReviewDetails,
  buildTransferSummaryRows,
  getTransferFormChange,
  pressedTransferReasonChip,
  transferComponentLines,
  transferDepartmentLockText,
  transferNowCells,
  transferWarningLines,
  type TransferChipWords,
  type TransferFormChange,
  type TransferFormChoice,
  type TransferReasonChip,
  type TransferWords,
} from "@/lib/transfer-form-rules"
import { hasTransferChange } from "@/lib/transfer-rules"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { useMediaQuery } from "@/components/ui/use-media-query"

type TransferFormValues = {
  /** The row the shared picker chose, or the ?assetId= answer (chosen-but-blocked when it cannot be taken, spec 6.4). */
  asset: AssetOperationSearchRow | null
  /** The asset a custodian chosen after it cleared, with the reason the field reads (spec 6.3). */
  clearedAsset: ClearedTransferAsset | null
  toLocationId: string
  toCustodianId: string
  toDepartmentId: string
  reason: string
  remark: string
}

// The form's id: the frame's footer submit names it (group 3 spec §5).
const TRANSFER_FORM_ID = "transfer-form"

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The server
// names "at least one change" under toLocationId, so the rule shows under the location select (O-R4); a holder or a
// department it refuses (P3-R6) shows under its own field.
const FIELD_IDS = {
  assetId: "transfer-asset",
  toLocationId: "transfer-to-location",
  toCustodianId: "transfer-to-custodian",
  toDepartmentId: "transfer-to-department",
  reason: "transfer-reason",
} as const
type TransferField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as TransferField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength, and the server's
// "at least one change" with the server's own code, counted on the normalized change set (v-track M-R2, O-R4; P3-R4).
function validate(values: TransferFormValues, change: TransferFormChange): Partial<Record<TransferField, string>> {
  const errors: Partial<Record<TransferField, string>> = {}
  const check = (key: TransferField, code: string | null) => {
    if (code) errors[key] = code
  }
  // A ?assetId= that arrived blocked stays chosen; save stops on it, and the field reads its reason (assetError).
  check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))
  // A chosen asset whose change set is not ready (its detail pending or failed) is judged after the submit's re-read, so a
  // department-only pick reaches that read instead of stopping here (final review ui-1).
  check("toLocationId", values.asset && !change.ready ? null : hasTransferChange(change.destinations) ? null : "transferDestinationRequired")
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}

// One class string for the heads and the three rows of เปลี่ยนอะไร (spec §9.2, P3-R17): stacked below xl, four columns from
// xl, so each picker keeps room for its chosen value beside the summary column (final review ui-3).
const TRANSFER_ROW_CLASSES = "grid min-w-0 gap-1.5 xl:grid-cols-[8rem_minmax(0,1fr)_1rem_minmax(0,1fr)] xl:items-start xl:gap-3"
// A pressed reason chip takes Segmented's pressed look, on a Button (P3-R16), and keeps it on hover and press (ui-5).
const TRANSFER_CHIP_PRESSED_CLASSES = "border-primary bg-primary-soft font-semibold text-primary-hover hover:border-primary hover:bg-primary-soft active:border-primary active:bg-primary-soft"

export function TransferForm({
  employees,
  departments,
  locations,
  initialAsset,
  returnTo,
}: {
  employees: AssetOperationEmployeeDepartmentOption[]
  departments: AssetOperationNamedOption[]
  locations: AssetOperationLocationBranchOption[]
  /** ?assetId=: the search's by-id answer with its detail, takeable or not (spec 6.4, §9.1). */
  initialAsset: AssetOperationSearchRow | null
  returnTo?: string
}) {
  // โอนย้าย (group 3 spec §9): three sections in the shared operation frame, the สรุปก่อนบันทึก card beside them and the
  // footer ตรวจสอบและบันทึก / ยกเลิก. Below lg the card is hidden; the footer's line is the lead and the card's warnings
  // repeat above the bar (spec §9.4). Everything shown or sent reads one change set, T5's getTransferFormChange.
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("transfer")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<TransferField>()
  // The chosen asset's detail (spec §9.1, P3-R15): the ?assetId= answer carries it; a row from the list is read once.
  const [assetDetail, setAssetDetail] = useState<CheckoutDetailState>(initialAsset && !initialAsset.detail ? "failed" : "ready")
  const assetIdRef = useRef(initialAsset?.id ?? null)
  const [readingForSubmit, setReadingForSubmit] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 64rem)")
  const [values, setValues] = useState<TransferFormValues>({
    asset: initialAsset,
    clearedAsset: null,
    toLocationId: "",
    toCustodianId: "",
    toDepartmentId: "",
    reason: "",
    remark: "",
  })

  const transferWords: TransferWords = {
    location: tOperation("summaryLocation"),
    holder: tOperation("summaryHolder"),
    department: tOperation("summaryDepartment"),
    status: tOperation("summaryStatus"),
    components: tOperation("summaryComponents"),
    none: tOperation("summaryNone"),
    kept: (value) => tOperation("summaryKept", { value }),
    formerHolder: (name) => tAll("checkin.returnByFormer", { name }),
    followsHolder: (department) => t("followsHolder", { department }),
    departmentChooseAssetFirst: t("departmentChooseAssetFirst"),
    inUse: t("inUseStatus"),
    statusUnchanged: t("statusUnchanged"),
    count: (count) => tOperation("summaryCount", { count }),
    summaryComponentsMove: (count) => t("summaryComponentsMove", { count }),
    summaryComponentsOutstanding: (count) => tAll("checkout.summaryComponentsOutstanding", { count }),
    summaryLead: (count, list) => t("summaryLead", { count, list }),
    summaryHolderDepartmentKept: t("summaryHolderDepartmentKept"),
    summaryCrossBranch: (branch) => t("summaryCrossBranch", { branch }),
    footerDescription: (tag, changes) => t("footerDescription", { tag, changes }),
    footerIncomplete: t("footerIncomplete"),
    checkAsset: t("asset"),
    checkChange: t("checkChange"),
    checkReason: t("sectionReason"),
    toLocation: t("toLocation"),
    toCustodian: t("toCustodian"),
    toDepartment: t("toDepartment"),
    nextStatus: t("reviewNextStatus"),
    componentsMove: (count, list) => t("componentsMove", { count, list }),
    componentsStaying: (list) => t("componentsStaying", { list }),
    componentsOutstanding: (count, list) => t("componentsOutstanding", { count, list }),
    outstandingLine: { with: (holder) => tAll("checkout.outstandingWith", { holder }), since: (documentNo) => tAll("checkout.outstandingSince", { documentNo }) },
  }
  const chipWords: TransferChipWords = { branch: t("reasonChipBranch"), user: t("reasonChipUser"), restructure: t("reasonChipRestructure") }

  // The one change set (GP X2): the picker's context, validate(), the card, the footer, the review and the payload read it.
  const transferChoice: TransferFormChoice = {
    row: values.asset,
    detail: assetDetail,
    destinations: { toLocationId: values.toLocationId, toCustodianId: values.toCustodianId, toDepartmentId: values.toDepartmentId },
    employees,
    departments,
    locations,
  }
  const transferChange = getTransferFormChange(transferChoice)

  const cancelHref = getOperationCancelHref(locale, returnTo)
  const nowCells = transferNowCells(transferChoice, transferWords)
  const lockText = transferDepartmentLockText(transferChoice, transferWords)
  const summaryRows = buildTransferSummaryRows(transferChoice, transferWords)
  const checklist = buildTransferChecklist(transferChoice, values.reason, transferWords)
  const transferLead = buildTransferLead(transferChoice, transferWords)
  const footerLine = buildTransferFooterLine(transferChoice, transferWords)
  const componentLines = transferComponentLines(transferChoice, transferWords)
  const pressedChip = pressedTransferReasonChip(values.reason, chipWords)
  // The asset's line under the field: a chosen row's reason, else the asset a custodian cleared, else the field's code.
  const assetReasonKey = chosenAssetReasonKey(values.asset)
  const assetError = assetReasonKey
    ? tAll(assetReasonKey)
    : values.clearedAsset
      ? t("assetClearedForCustodian", { assetTag: values.clearedAsset.assetTag, reason: tAll(values.clearedAsset.reasonKey) })
      : fieldErrors.message("assetId")
  // The review (P3-R18): the asset, each real change, the components, the next status (T5's last line), the reason, the evidence.
  const transferReviewDetails = buildTransferReviewDetails(transferChoice, transferWords)
  const reviewItems = buildOperationReviewSummary({
    assetLabel: values.asset ? assetOperationRowLabel(values.asset) : "",
    details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }],
    evidenceLabel: t("reviewNoEvidence"),
    labels: {
      asset: t("asset"),
      source: t("from"),
      destination: t("reviewDestination"),
      nextStatus: t("reviewNextStatus"),
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

  function setField(field: string, value: string) {
    // The three destinations are one rule, so a change of any clears it (spec §4.3).
    if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")
    // A holder's or a free department's own refusal (P3-R6) clears with its field, as every other field's does.
    if (field !== "toLocationId" && field in FIELD_IDS) fieldErrors.clear(field as TransferField)
    // §9.2, P3-R5: a new holder the department follows locks it to them, so a department picked before goes, and it does
    // not come back when the holder is cleared with ×. ส่วนกลาง and ส่วนควบ stay free with any holder and keep it (P3-R2).
    // Without a ready detail (no asset, a detail not read yet, a failed read) the source is null: nothing can judge the
    // pick yet, so it is cleared too and cannot come back once the detail locks the row (Y21).
    const dropsDepartment = field === "toCustodianId" && value !== "" && getTransferFormChange({ ...transferChoice, destinations: { ...transferChoice.destinations, toCustodianId: value } }).departmentSource !== "free"
    if (dropsDepartment) fieldErrors.clear("toDepartmentId")
    setValues((current) => ({ ...current, [field]: value, ...(dropsDepartment ? { toDepartmentId: "" } : {}) }))
    if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)
  }

  // A pick keeps the destinations (P3-R21); everything is recomputed from the new asset's detail, read once here.
  function setAsset(asset: AssetOperationSearchRow | null) {
    setValues((current) => ({ ...current, asset, clearedAsset: null }))
    fieldErrors.clear("assetId")
    // A department refusal belongs to the asset it was given for; the new asset may lock the row (ui-2).
    fieldErrors.clear("toDepartmentId")
    assetIdRef.current = asset?.id ?? null
    setAssetDetail(asset && !asset.detail ? "loading" : "ready")
    if (asset && !asset.detail) void loadAssetDetail(asset.id, Boolean(values.toCustodianId))
  }

  // A custodian makes the transfer an assign (Ready or In Use only): the chosen asset is asked again under that rule (spec 6.3).
  async function recheckAssetForCustodian(assetId: string) {
    const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })).catch(() => null)
    const payload = response?.ok ? await response.json().catch(() => null) : null
    const rechecked: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
    setValues((current) => {
      const cleared = transferAssetToClear(current, rechecked)
      return cleared ? { ...current, asset: null, clearedAsset: cleared } : current
    })
  }

  // The by-id read with detail=1 (spec §9.1, P3-R15): its whole row, so a verdict that changed since the pick shows. The
  // answer is used only while it is still the chosen asset (withCheckoutAssetDetail). A failed read (network, non-OK,
  // no row) keeps the row and sets the detail "failed": the card, and the phone's warnings, show อ่านข้อมูลสรุปไม่สำเร็จ
  // with ลองอีกครั้ง. Returns the answered row, or null when the read failed.
  async function loadAssetDetail(assetId: string, assignCustodian: boolean): Promise<AssetOperationSearchRow | null> {
    if (assetIdRef.current === assetId) setAssetDetail("loading")
    const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, detail: true, assignCustodian })).catch(() => null)
    const payload = response?.ok ? await response.json().catch(() => null) : null
    const row: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
    const answered = row?.id === assetId && row.detail ? row : null
    if (assetIdRef.current !== assetId) return null
    setValues((current) => ({ ...current, asset: withCheckoutAssetDetail(current.asset, answered) }))
    setAssetDetail(answered ? "ready" : "failed")
    return answered
  }

  // A chip writes its word at the start of the reason and อื่น ๆ writes nothing; both focus the text with the caret at
  // its end, once React has committed it (P3-R16). focusField scrolls the field clear of the phone's bar (P3-R23).
  function chooseReasonChip(chip: TransferReasonChip) {
    if (chip !== "other") setField("reason", applyTransferReasonChip(values.reason, chip, chipWords))
    requestAnimationFrame(() => {
      const input = document.getElementById(FIELD_IDS.reason)
      if (!(input instanceof HTMLInputElement)) return
      focusField(input)
      input.setSelectionRange(input.value.length, input.value.length)
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readingForSubmit) return
    // Field checks first, so a wrong entry shows its errors at once (P3-R15).
    fieldErrors.setErrors(validate(values, transferChange))
    if (focusFirstError()) return
    if (!values.asset) return
    // The review reads the asset again, under the holder the save sends (P3-R15): the lock, the current values and the
    // components it shows are the asset's as it is now.
    setReadingForSubmit(true)
    const answered = await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId)).finally(() => setReadingForSubmit(false))
    // A failed read stops here, and the card and the phone's warnings show อ่านข้อมูลสรุปไม่สำเร็จ with ลองอีกครั้ง.
    if (!answered) return
    // The checks again on the answer: an asset no longer takeable reads its reason under the field, and a pick that is no
    // longer a change (another save got there first) stops under the location instead of opening an empty review.
    fieldErrors.setErrors(validate({ ...values, asset: answered }, getTransferFormChange({ ...transferChoice, row: answered, detail: "ready" })))
    if (focusFirstError()) return
    setReviewOpen(true)
  }

  // อ่านข้อมูลสรุปไม่สำเร็จ, with ลองอีกครั้ง: in the summary card, and on the phone above the bar (ส่งมอบ's word, Y7).
  const detailFailedNotice = values.asset && assetDetail === "failed" ? (
    <span role="status" className="grid justify-items-start gap-2">
      <span>{tAll("checkout.detailReadFailed")}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => values.asset && void loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))}>
        {tCommon("tryAgain")}
      </Button>
    </span>
  ) : null
  const summaryWarnings = [...transferWarningLines(transferChoice, transferWords), ...(detailFailedNotice ? [detailFailedNotice] : [])]

  async function submitTransfer() {
    setSaving(true)
    try {
      const response = await fetch(`/api/assets/${values.asset?.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...transferChange.destinations, reason: values.reason, remark: values.remark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // The route's no-change answer (a destination now equals the current value): the asset is read again first, so the
        // ตอนนี้ cells and the picker's current mark show it as it is now when the error shows under ที่ตั้ง (journeys-1).
        if (payload?.fieldErrors?.toLocationId === "transferDestinationRequired" && values.asset) await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        // The holder or the asset changed under the page (P3-R5, P3-R4): the review closes and the asset is read again, so the
        // rows, the lock and the card show it as it is now; then the toast says why. Its field is not on screen (V-form rule).
        if (payload?.code === "ASSET_TRANSFER_DEPARTMENT_LOCKED" || payload?.code === "ASSET_CHANGED_DURING_OPERATION") {
          setReviewOpen(false)
          if (values.asset) await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))
          // The shared words say to reload the page; this one has just read the asset again, so it says that (ui-4).
          // LOCKED keeps its catalog words, which already say to check and save again.
          if (payload.code === "ASSET_CHANGED_DURING_OPERATION") {
            toast.error(t("assetChangedReread"))
            return
          }
        }
        throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))
      }
      toast.success(t("success"))
      // The TR- document opens, as the handover and the return open theirs (user decision 2026-10-21, FX10).
      const documentHref = `/${locale}/asset-management/transfers/${payload.id}`
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
      <form onSubmit={handleSubmit} noValidate id={TRANSFER_FORM_ID}>
        <OperationFormFrame
          title={t("title")}
          description={t("description")}
          summaryOnPhone={false}
          summary={<OperationSummaryCard
            title={tOperation("summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={tOperation("summaryNext")}
            lead={transferLead}
            rows={summaryRows}
            checklist={checklist}
            warnings={summaryWarnings}
            footnote={t("summaryFootnote")}
            photo={values.asset ? <AssetThumbnail photo={values.asset.photo} assetTag={values.asset.assetTag} assetName={values.asset.name} size={64} /> : undefined}
            assetLabel={values.asset ? assetOperationRowLabel(values.asset) : undefined}
          />}
          footer={{
            description: (
              <>
                <span data-transfer-footer="desktop" className="max-lg:hidden">{footerLine}</span>
                <span data-transfer-footer="phone" className="lg:hidden">{transferLead ?? footerLine}</span>
              </>
            ),
            cancelHref,
            cancelLabel: tCommon("cancel"),
            submitLabel: tOperation("reviewAndSave"),
            busy: saving || readingForSubmit,
            formId: TRANSFER_FORM_ID,
          }}
        >
          <FormSection number={1} title={t("sectionAsset")}>
            <div className="grid gap-4">
              {/* The arrival banner names the ?assetId= asset only while it is still the chosen one (look step). */}
              {initialAsset?.eligible && values.asset?.id === initialAsset.id ? (
                <FormContextBanner label={t("asset")} value={assetOperationRowLabel(initialAsset)} />
              ) : null}
              <AssetOperationPicker
                id="transfer-asset"
                label={t("asset")}
                mode="transfer"
                context={{ assignCustodian: Boolean(transferChange.destinations.toCustodianId) }}
                value={values.asset}
                required
                error={assetError}
                onChange={setAsset}
                pickedBody={(row) => <TransferAssetCard row={row} />}
              />
              {componentLines.staying ? <Notice tone="info" data-transfer-staying>{componentLines.staying}</Notice> : null}
              {componentLines.outstanding ? <Notice tone="warning" role="status" data-transfer-outstanding>{componentLines.outstanding}</Notice> : null}
            </div>
          </FormSection>
          <FormSection number={2} title={<>{t("sectionChanges")} <span className="font-normal text-muted-foreground">{t("sectionChangesHint")}</span></>}>
            <div className="grid gap-4">
              <div data-transfer-table className="grid gap-4 xl:gap-3">
                <div aria-hidden="true" className={cn(TRANSFER_ROW_CLASSES, "text-meta text-muted-foreground max-xl:hidden")}>
                  <span>{t("columnItem")}</span>
                  <span>{t("columnNow")}</span>
                  <span />
                  <span>{t("columnTarget")}</span>
                </div>
                <div data-transfer-row="location" className={TRANSFER_ROW_CLASSES}>
                  <span className="text-sm font-medium text-foreground xl:pt-2">{tOperation("summaryLocation")}</span>
                  <p data-transfer-now className="min-w-0 break-words text-sm text-foreground xl:pt-2"><span className="text-muted-foreground xl:sr-only">{t("columnNow")}: </span>{nowCells.location}</p>
                  <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-xl:hidden xl:mt-2.5" />
                  <SearchableSelect id="transfer-to-location" label={t("toLocation")} labelVisuallyHidden value={values.toLocationId} options={locations} currentValue={values.asset?.currentLocationId} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
                </div>
                <div data-transfer-row="holder" className={TRANSFER_ROW_CLASSES}>
                  <span className="text-sm font-medium text-foreground xl:pt-2">{tOperation("summaryHolder")}</span>
                  <p data-transfer-now className="min-w-0 break-words text-sm text-foreground xl:pt-2"><span className="text-muted-foreground xl:sr-only">{t("columnNow")}: </span>{nowCells.holder}</p>
                  <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-xl:hidden xl:mt-2.5" />
                  <SearchableSelect id="transfer-to-custodian" label={t("toCustodian")} labelVisuallyHidden value={values.toCustodianId} options={employees} currentValue={values.asset?.detail?.holderId ?? undefined} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toCustodianId")} onChange={(value) => setField("toCustodianId", value)} />
                </div>
                <div data-transfer-row="department" className={TRANSFER_ROW_CLASSES}>
                  <span className="text-sm font-medium text-foreground xl:pt-2">{tOperation("summaryDepartment")}</span>
                  <p data-transfer-now className="min-w-0 break-words text-sm text-foreground xl:pt-2"><span className="text-muted-foreground xl:sr-only">{t("columnNow")}: </span>{nowCells.department}</p>
                  <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-xl:hidden xl:mt-2.5" />
                  <SearchableSelect id="transfer-to-department" label={t("toDepartment")} labelVisuallyHidden value={transferChange.departmentLocked ? "" : values.toDepartmentId} options={departments} currentValue={values.asset?.detail?.departmentId ?? undefined} currentMark={tOperation("summaryNow")} disabled={transferChange.departmentLocked} placeholder={lockText ?? t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={transferChange.departmentLocked ? undefined : fieldErrors.message("toDepartmentId")} onChange={(value) => setField("toDepartmentId", value)} />
                </div>
              </div>
              {componentLines.travelling ? <p data-transfer-components className="text-sm text-muted-foreground">{componentLines.travelling}</p> : null}
            </div>
          </FormSection>
          <FormSection number={3} title={t("sectionReason")}>
            <div className="grid gap-4">
              <div role="group" aria-label={t("reason")} aria-describedby="transfer-reason-chips-hint" data-transfer-reason-chips className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  {TRANSFER_REASON_CHIPS.map((chip) => (
                    <Button
                      key={chip}
                      variant="outline"
                      size="sm"
                      aria-pressed={pressedChip === chip}
                      data-transfer-reason-chip={chip}
                      className={cn(pressedChip === chip && TRANSFER_CHIP_PRESSED_CLASSES)}
                      onClick={() => chooseReasonChip(chip)}
                    >
                      {pressedChip === chip ? <Check aria-hidden="true" /> : null}
                      {chip === "restructure" ? (
                        <>
                          <span className="lg:hidden">{t("reasonChipRestructureShort")}</span>
                          <span className="max-lg:hidden">{chipWords.restructure}</span>
                        </>
                      ) : chip === "other" ? t("reasonChipOther") : chipWords[chip]}
                    </Button>
                  ))}
                </div>
                <p id="transfer-reason-chips-hint" className="text-meta text-muted-foreground">{t("reasonChipHint")}</p>
              </div>
              <Field label={t("reason")} id="transfer-reason" required error={fieldErrors.message("reason")}>
                <Input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} />
              </Field>
              <Field label={t("remark")}>
                <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
              </Field>
            </div>
          </FormSection>
          {!isDesktop && summaryWarnings.length > 0 ? (
            <div data-transfer-phone-warnings className="grid gap-2 lg:hidden">
              {summaryWarnings.map((warning, index) => (
                <Notice key={index} tone="warning">
                  {warning}
                </Notice>
              ))}
            </div>
          ) : null}
        </OperationFormFrame>
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
        onConfirm={() => void submitTransfer()}
      />
    </>
  )
}

// The chosen box of section 1 (spec §9.1, P3-R19): the photo, the tag and the status, the name. Where it is and who holds it
// read in section 2's ตอนนี้ column.
function TransferAssetCard({ row }: { row: AssetOperationSearchRow }) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="tag font-medium">{row.assetTag}</span>
          <StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />
        </span>
        <span className="min-w-0 break-words font-medium text-foreground">{row.name}</span>
      </span>
    </span>
  )
}
