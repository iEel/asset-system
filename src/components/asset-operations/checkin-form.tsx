"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AssetConditionChoice } from "@/components/asset-operations/condition-choice"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { ChoiceCard, ChoiceChip } from "@/components/ui/choice-card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { assetOperationRowLabel } from "@/lib/asset-operation-form-rules"
import type { AssetOperationEmployeePlainOption, AssetOperationNamedOption } from "@/lib/asset-operation-options"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import {
  buildAssetOperationSearchHref,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchRow,
} from "@/lib/asset-operation-search-rules"
import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"
import { getCheckinChoice } from "@/lib/checkin-choice"
import {
  buildCheckinChecklist,
  buildCheckinSummaryRows,
  checkinAutoNextStatus,
  checkinBangkokDay,
  checkinComponents,
  checkinHeldDays,
  checkinNextStatusOptions,
  checkinTodayDay,
  checkinWarningLines,
  type CheckinReturnDepartment,
} from "@/lib/checkin-form-rules"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "@/lib/checkin-route-rules"
import { withCheckoutAssetDetail, type CheckoutDetailState } from "@/lib/checkout-form-rules"
import { formatCheckoutDay } from "@/lib/checkout-phone-steps"
import { getAssetStateTone } from "@/lib/design-system"
import { waitForDialogToClose } from "@/lib/field-focus"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type QueuedPhoto = {
  id: string
  label: string
  file: File
}
type CheckinFormValues = {
  checkoutId: string
  returnDate: string
  returnBy: string
  receiveBy: string
  conditionAfter: string
  nextStatusId: string
  nextLocationId: string
  missingAccessories: string
  damageNote: string
  remark: string
  maintenanceProblem: string
}

// The form's id: the frame's footer submit names it (group 3 spec §5).
const CHECKIN_FORM_ID = "checkin-form"

// The fields in visual order (group 3 spec §8.2, §8.3, P2-R11), keyed like the server's fieldErrors, with the id focus
// moves to (v-track M-R1). The two people are keyed by their names (returnBy, receiveBy), the fields the server
// requires; the selects hold their ids. missingComponentIds is the components checklist, where the server's refusal lands.
const FIELD_IDS = {
  checkoutId: "checkin-checkout",
  missingComponentIds: "checkin-components",
  returnBy: "checkin-return-by",
  receiveBy: "checkin-receive-by",
  conditionAfter: "checkin-condition-after",
  returnDate: "checkin-return-date",
  nextStatusId: "checkin-next-status",
  nextLocationId: "checkin-next-location",
} as const
type CheckinField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckinField[]

// noValidate turns the browser's check off, so this restates the controls' required and the server's 100-character
// limit on the two names (v-track M-R2). A missing component needs an employee as ผู้คืน, in the server's words (P2-R18); the return date is no
// later than today and no earlier than the handover, in the route's own codes (P2-R13); a row with an open repair returns
// into ส่งซ่อม only, in the server's words (S-R43).
function validate(
  values: CheckinFormValues,
  { repairLocked, sendsToRepair, returnByEmployeeId, missingCount, todayDay, handoverDay }: {
    repairLocked: boolean
    sendsToRepair: boolean
    returnByEmployeeId: string
    missingCount: number
    todayDay: string
    handoverDay: string | null
  },
): Partial<Record<CheckinField, string>> {
  const errors: Partial<Record<CheckinField, string>> = {}
  const check = (key: CheckinField, code: string | null) => {
    if (code) errors[key] = code
  }
  const dateError = values.returnDate ? checkinReturnDateError({ returnDay: values.returnDate, todayDay, handoverDay }) : null
  check("checkoutId", required(values.checkoutId))
  check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100) ?? (missingCount > 0 && !returnByEmployeeId ? "checkinMissingComponentReturnerRequired" : null))
  check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))
  check("conditionAfter", required(values.conditionAfter))
  check("returnDate", required(values.returnDate) ?? (dateError ? CHECKIN_RETURN_DATE_ERROR_KEYS[dateError] : null))
  check("nextStatusId", required(values.nextStatusId) ?? (repairLocked && !sendsToRepair ? "checkinRepairStatusRequired" : null))
  check("nextLocationId", required(values.nextLocationId))
  return errors
}

// รับคืน (group 3 spec §8.1-§8.4): three sections in the shared operation frame, the สรุปก่อนบันทึก card beside them
// and the footer ตรวจสอบและบันทึก / ยกเลิก; the header's right side is the page's ข้อมูลเก่า link.
export function CheckinForm({
  employees,
  locations,
  statuses,
  conditions,
  conditionLabels,
  initialRow,
  initialQuery,
  returnDepartment,
  currentEmployeeId,
  canCreateRepair,
  legacyLink,
  returnTo,
}: {
  employees: AssetOperationEmployeePlainOption[]
  locations: AssetOperationNamedOption[]
  statuses: AssetOperationNamedOption[]
  conditions: AssetOperationNamedOption[]
  /** Every condition's name by id, inactive ones too: the handover's and the asset's condition read a name. */
  conditionLabels: Record<string, string>
  /** ?checkoutId=: the open handover's row, chosen or chosen-but-blocked (spec 6.4). */
  initialRow: AssetOperationSearchRow | null
  /** ?assetId=: the asset's tag, the search starts filled (spec 6.4). */
  initialQuery: string
  /** The return department (setting checkin_department_code); null when it does not resolve (P2-R8). */
  returnDepartment: CheckinReturnDepartment | null
  /** The signed-in person's employee: ผู้รับคืน starts as them (group 3 spec §8.3). */
  currentEmployeeId: string | null
  /** maintenance:create: ส่งซ่อม is offered and auto-picked only for someone who may open a repair record (P2-R14). */
  canCreateRepair: boolean
  /** รับคืน's header link to the register's ข้อมูลเก่า list (group 3 spec §8.1), built by the page; null when there is none. */
  legacyLink: React.ReactNode
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const confirm = useConfirm()
  const t = useTranslations("checkin")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckinField>()
  const employeeIds = useMemo(() => new Set(employees.map((employee) => employee.id)), [employees])
  const initialChoice = getCheckinChoice(initialRow, employeeIds)
  const initialReceiverId = currentEmployeeId && employeeIds.has(currentEmployeeId) ? currentEmployeeId : ""
  const [chosen, setChosen] = useState<AssetOperationSearchRow | null>(initialRow)
  const [photoType, setPhotoType] = useState("overview")
  const [photosAfter, setPhotosAfter] = useState<QueuedPhoto[]>([])
  const [returnSignatureDataUrl, setReturnSignatureDataUrl] = useState<string | null>(null)
  const [receiveSignatureDataUrl, setReceiveSignatureDataUrl] = useState<string | null>(null)
  const [returnByEmployeeId, setReturnByEmployeeId] = useState(initialChoice.returnByEmployeeId ?? "")
  const [receiveByEmployeeId, setReceiveByEmployeeId] = useState(initialReceiverId)
  // The travelling components not ticked as returned; a new pick starts with every one ticked (spec §8.2).
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set())
  // The chosen row's detail=1 read: the summary and the components checklist need it. The ?checkoutId= answer arrives
  // with it; a picked row reads it. rowIdRef is the chosen id, so a late answer for a row chosen before is dropped.
  const [rowDetail, setRowDetail] = useState<CheckoutDetailState>(initialRow && !initialRow.detail ? "failed" : "ready")
  const rowIdRef = useRef(initialRow?.id ?? null)
  // A submit's read of the row is under way: the submit shows busy.
  const [readingForSubmit, setReadingForSubmit] = useState(false)
  const repairStatus = statuses.find((status) => status.name === "Under Maintenance")
  const [values, setValues] = useState<CheckinFormValues>({
    checkoutId: initialChoice.checkoutId,
    returnDate: checkinTodayDay(),
    returnBy: employees.find((employee) => employee.id === initialChoice.returnByEmployeeId)?.label ?? initialChoice.returnByInactiveLabel ?? "",
    receiveBy: employees.find((employee) => employee.id === initialReceiverId)?.label ?? "",
    // No default: the condition is what the returner brought back (spec §8.3, P2-R9).
    conditionAfter: "",
    // The arrival's row with an open repair returns into ส่งซ่อม (S-R43).
    nextStatusId: initialRow?.openRepair && repairStatus ? repairStatus.id : "",
    nextLocationId: "",
    missingAccessories: "",
    damageNote: "",
    remark: "",
    maintenanceProblem: "",
  })

  // The chosen row: its open handover when it can come back, else its reason under the field (spec 6.3, 6.4).
  const choice = getCheckinChoice(chosen, employeeIds)
  const blockedReason = choice.reasonKey ? tAll(choice.reasonKey) : undefined
  const selectedCheckout = chosen?.eligible ? chosen.checkout ?? null : null
  // A holder who has left still returns it: the select offers them once more, named as a former employee (S-R46).
  const returnByOptions = choice.returnByInactiveLabel && choice.returnByEmployeeId
    ? [...employees, { id: choice.returnByEmployeeId, label: t("returnByFormer", { name: choice.returnByInactiveLabel }) }]
    : employees
  const selectedStatus = statuses.find((status) => status.id === values.nextStatusId)
  const selectedCondition = conditions.find((condition) => condition.id === values.conditionAfter)
  const selectedReturnBy = returnByOptions.find((employee) => employee.id === returnByEmployeeId)
  const selectedReceiver = employees.find((employee) => employee.id === receiveByEmployeeId)
  const selectedLocation = locations.find((location) => location.id === values.nextLocationId)
  const sendsToRepair = selectedStatus?.name === "Under Maintenance"
  // A row with an open repair returns into ส่งซ่อม under that repair: the select offers that status only (S-R43).
  const repairLocked = Boolean(chosen?.openRepair && repairStatus)
  const cancelHref = getOperationCancelHref(locale, returnTo)
  // The return date's bounds, in Bangkok days as the route counts them (P2-R13); a legacy backfill has no lower bound.
  const todayDay = checkinTodayDay()
  const handoverDay = selectedCheckout ? checkinHandoverDay(selectedCheckout) : null
  // ถือมา N วัน counts to the chosen return date (P2-R9).
  const heldDays = checkinHeldDays({ handoverDay, returnDay: values.returnDate })
  const { travelling, missing: missingComponents } = checkinComponents(chosen, unticked)
  const nextStatusOptions = checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })
  const nextStatusHint = repairLocked
    ? (chosen?.openRepairNo ? t("nextStatusJoinsRepair", { repairNo: chosen.openRepairNo }) : undefined)
    : sendsToRepair ? t("sendToRepairHelp") : undefined
  const photoTypes = [
    { id: "overview", label: t("photoTypeOverview") },
    { id: "damage", label: t("photoTypeDamage") },
  ]

  const summaryRows = buildCheckinSummaryRows(
    {
      row: chosen,
      returnDepartment,
      status: selectedStatus ?? null,
      location: selectedLocation ?? null,
      condition: selectedCondition ?? null,
      conditionLabels,
      unticked,
    },
    {
      holder: tOperation("summaryHolder"),
      department: tOperation("summaryDepartment"),
      status: tOperation("summaryStatus"),
      location: tOperation("summaryLocation"),
      condition: tOperation("summaryCondition"),
      components: tOperation("summaryComponents"),
      none: tOperation("summaryNone"),
      notChosen: tOperation("summaryNotChosen"),
      count: (count) => tOperation("summaryCount", { count }),
      componentsBack: (returned, missing) => t("summaryComponentsBack", { returned, missing }),
    },
  )
  const checklist = buildCheckinChecklist(
    {
      row: chosen,
      returnBy: values.returnBy,
      receiveBy: values.receiveBy,
      conditionAfter: values.conditionAfter,
      nextStatusId: values.nextStatusId,
      nextLocationId: values.nextLocationId,
      returnSigned: returnSignatureDataUrl !== null,
      receiveSigned: receiveSignatureDataUrl !== null,
    },
    {
      asset: t("asset"),
      returnBy: t("returnBy"),
      receiveBy: t("receiveBy"),
      condition: t("conditionAfter"),
      nextStatus: t("nextStatusAfterReturn"),
      location: t("nextLocation"),
      returnSignature: t("returnSignature"),
      receiveSignature: t("receiveSignature"),
      signatureMissing: t("signatureMissing"),
    },
  )
  const warningLines = checkinWarningLines(
    {
      row: chosen,
      returnDepartment,
      unticked,
      returnerLabel: values.returnBy || t("returnBy"),
      status: selectedStatus ?? null,
      conditionName: selectedCondition?.name ?? null,
      repairLocked,
    },
    {
      departmentUnavailable: apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message,
      missing: (input) => t("warningComponentMissing", input),
      repairOpens: t("warningRepairOpens"),
      repairJoins: (repairNo) => t("warningRepairJoins", { repairNo }),
      brokenReady: t("warningBrokenReady"),
      salvageReady: t("warningSalvageReady"),
    },
  )

  const evidenceCount = photosAfter.length + Number(Boolean(returnSignatureDataUrl)) + Number(Boolean(receiveSignatureDataUrl))
  const reviewItems = buildOperationReviewSummary({
    assetLabel: selectedCheckout && chosen ? `${chosen.assetTag} - ${chosen.name}` : "",
    sourceLabel: selectedReturnBy?.label,
    destinationLabels: [selectedReceiver?.label],
    nextStatusLabel: selectedStatus?.label,
    details: [
      ...(selectedLocation ? [{ label: t("nextLocation"), value: selectedLocation.label }] : []),
      { label: t("conditionAfter"), value: selectedCondition?.label ?? "" },
      { label: t("returnDate"), value: formatCheckoutDay(values.returnDate, locale) },
      ...(travelling.length > 0
        ? [{ label: tOperation("summaryComponents"), value: t("summaryComponentsBack", { returned: travelling.length - missingComponents.length, missing: missingComponents.length }) }]
        : []),
    ],
    evidenceLabel: evidenceCount > 0 ? t("reviewEvidenceCount", { count: evidenceCount }) : t("reviewNoEvidence"),
    labels: {
      asset: t("asset"),
      source: t("returnBy"),
      destination: t("receiveBy"),
      nextStatus: t("nextStatusAfterReturn"),
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
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as CheckinField)
  }

  // formerLabel: the name of a holder who is no longer an active employee, which the RT- records (S-R46). Another person
  // clears that side's signature; the pad's key remounts it.
  function setEmployeeField(field: "returnBy" | "receiveBy", employeeId: string, formerLabel: string | null = null) {
    const employee = employees.find((item) => item.id === employeeId)
    if (field === "returnBy") {
      if (employeeId !== returnByEmployeeId) setReturnSignatureDataUrl(null)
      setReturnByEmployeeId(employeeId)
    }
    if (field === "receiveBy") {
      if (employeeId !== receiveByEmployeeId) setReceiveSignatureDataUrl(null)
      setReceiveByEmployeeId(employeeId)
    }
    setField(field, employee?.label ?? (employeeId ? formerLabel ?? "" : ""))
  }

  // A condition picks หลังรับคืนให้เป็น when none is chosen yet (P2-R16): เสียหาย or ใช้งานไม่ได้ ส่งซ่อม, ซาก รอตัดจำหน่าย,
  // among the options offered only. It settles that field's error too.
  function setCondition(conditionId: string) {
    const picked = checkinAutoNextStatus({
      nextStatusId: values.nextStatusId,
      conditionName: conditions.find((condition) => condition.id === conditionId)?.name ?? null,
      damageNote: values.damageNote,
      options: nextStatusOptions,
    })
    if (picked && !values.nextStatusId) fieldErrors.clear("nextStatusId")
    fieldErrors.clear("conditionAfter")
    setValues((current) => ({ ...current, conditionAfter: conditionId, nextStatusId: current.nextStatusId || picked }))
  }

  // A damage note picks ส่งซ่อม when none is chosen yet, for someone who may open a repair record (P2-R14).
  function handleDamageNoteChange(value: string) {
    const picked = checkinAutoNextStatus({
      nextStatusId: values.nextStatusId,
      conditionName: selectedCondition?.name ?? null,
      damageNote: value,
      options: nextStatusOptions,
    })
    if (picked && !values.nextStatusId) fieldErrors.clear("nextStatusId")
    setValues((current) => ({ ...current, damageNote: value, nextStatusId: current.nextStatusId || picked }))
  }

  // A tick is a component back; an untick stays with ผู้คืน as an outstanding component (spec §8.2, §8.5).
  function toggleComponent(componentId: string, returned: boolean) {
    setUnticked((current) => {
      const next = new Set(current)
      if (returned) next.delete(componentId)
      else next.add(componentId)
      return next
    })
    fieldErrors.clear("missingComponentIds")
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

  // The by-id read with detail=1 (spec §8.2): its whole row, used only while it is still the chosen one
  // (withCheckoutAssetDetail). A failed read keeps the row and sets the detail "failed": the card shows
  // อ่านข้อมูลสรุปไม่สำเร็จ with ลองอีกครั้ง. Returns the answered row, or null when the read failed.
  async function loadRowDetail(assetId: string): Promise<AssetOperationSearchRow | null> {
    if (rowIdRef.current === assetId) setRowDetail("loading")
    const response = await fetch(buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })).catch(() => null)
    const payload = response?.ok ? await response.json().catch(() => null) : null
    const row: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
    const answered = row?.id === assetId && row.detail ? row : null
    if (rowIdRef.current !== assetId) return null
    setRowDetail(answered ? "ready" : "failed")
    setChosen((current) => withCheckoutAssetDetail(current, answered))
    return answered
  }

  // A pick: the row's handover, and its holder as the return-by, a former employee included (S-R46). A return-by the
  // form filled in from the previous row goes when the new choice has none; one chosen by hand stays (spec 6.3).
  // A row with an open repair sets the next status to ส่งซ่อม; leaving it clears the status it set (S-R43).
  function applyChoice(row: AssetOperationSearchRow | null) {
    const next = getCheckinChoice(row, employeeIds)
    const prefilled = getCheckinChoice(chosen, employeeIds).returnByEmployeeId
    setChosen(row)
    rowIdRef.current = row?.id ?? null
    setRowDetail(row && !row.detail ? "loading" : "ready")
    if (row && !row.detail) void loadRowDetail(row.id)
    setUnticked(new Set())
    fieldErrors.clear("missingComponentIds")
    setField("checkoutId", next.checkoutId)
    if (next.returnByEmployeeId) setEmployeeField("returnBy", next.returnByEmployeeId, next.returnByInactiveLabel)
    else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")
    if (row?.openRepair && repairStatus) setField("nextStatusId", repairStatus.id)
    else if (repairLocked) setField("nextStatusId", "")
  }

  // A ข้อมูลเก่า row is not taken as it is: it asks once, then the backfill makes its handover (spec 6.3, S-R26). With
  // no return department the return would be refused, so the confirm is refused first and no HO- is left behind (P2-R8).
  function chooseRow(row: AssetOperationSearchRow | null) {
    if (row?.legacy) {
      if (!returnDepartment) {
        fieldErrors.setErrors({ checkoutId: getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE") ?? "invalid" })
        focusFirstError()
        return
      }
      void confirmLegacyReturn(row)
      return
    }
    applyChoice(row)
  }

  async function confirmLegacyReturn(row: AssetOperationSearchRow) {
    const accepted = await confirm({
      title: t("legacyReturnConfirmTitle"),
      description: t("legacyReturnConfirmDescription", { asset: `${row.assetTag} - ${row.name}`, holder: row.holderLabel ?? row.placeLabel }),
      confirmLabel: t("legacyReturnConfirm"),
    })
    if (accepted) await handleCreateLegacyCheckout(row)
  }

  async function handleCreateLegacyCheckout(row: AssetOperationSearchRow) {
    const assetId = row.id
    setSaving(true)
    try {
      const response = await fetch(`/api/assets/${assetId}/legacy-checkout`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? t("legacyReturnFailed"))

      toast.success(t("legacyReturnCreated"))
      // The handover exists now; the search answers it as a HO- row, which the form takes like any pick. Nothing is
      // filled in for the condition or the room (spec §8.3, P2-R9).
      const created = await fetchCheckinRow(assetId)
      if (!created?.checkout) throw new Error(tCommon("error"))
      applyChoice(created)
      fieldErrors.clear("checkoutId", "returnBy")
      const checkinHref = `/${locale}/asset-management/checkin?checkoutId=${payload.id}`
      router.replace(returnTo ? appendReturnTo(checkinHref, returnTo) : checkinHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : t("legacyReturnFailed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readingForSubmit) return
    fieldErrors.setErrors(validate(values, { repairLocked, sendsToRepair, returnByEmployeeId, missingCount: missingComponents.length, todayDay, handoverDay }))
    if (focusFirstError()) return
    // The review needs the row's detail (the card and the components): a row whose read is not ready reads it again.
    if (chosen && rowDetail !== "ready") {
      setReadingForSubmit(true)
      const answered = await loadRowDetail(chosen.id).finally(() => setReadingForSubmit(false))
      // A failed read stops here, and the warning with ลองอีกครั้ง shows.
      if (!answered) return
      // No longer returnable since the pick: the asset field reads its reason.
      if (!answered.eligible) {
        fieldErrors.setErrors({ checkoutId: "invalid" })
        focusFirstError()
        return
      }
    }
    setReviewOpen(true)
  }

  // อ่านข้อมูลสรุปไม่สำเร็จ, with ลองอีกครั้ง, in the summary card.
  const detailFailedNotice = chosen && rowDetail === "failed" ? (
    <span role="status" className="grid justify-items-start gap-2">
      <span>{t("detailReadFailed")}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => chosen && void loadRowDetail(chosen.id)}>
        {tCommon("tryAgain")}
      </Button>
    </span>
  ) : null

  async function submitCheckin() {
    // The review opens only after validate() found the checkout, so this only narrows the type.
    const assetId = selectedCheckout ? chosen?.id : undefined
    if (!assetId) return
    setSaving(true)
    const body = new FormData()
    for (const [key, value] of Object.entries(values)) {
      body.set(key, value)
    }
    body.set("returnByEmployeeId", returnByEmployeeId)
    body.set("receiveByEmployeeId", receiveByEmployeeId)
    body.set("photoAfterLabels", JSON.stringify(photosAfter.map((photo) => photo.label)))
    for (const photo of photosAfter) {
      body.append("photoAfterFiles", photo.file)
    }
    if (returnSignatureDataUrl) body.set("returnSignatureFile", dataUrlToFile(returnSignatureDataUrl, signatureFileName("return-signature")))
    if (receiveSignatureDataUrl) body.set("receiveSignatureFile", dataUrlToFile(receiveSignatureDataUrl, signatureFileName("receive-signature")))
    // The components not ticked (P2-R1): one entry per id. When everything came back no key is sent.
    for (const component of missingComponents) body.append("missingComponentIds", component.id)

    try {
      const response = await fetch(`/api/assets/${assetId}/checkin`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        const message = payload?.code === "ASSET_HANDOVER_MODE_MISSING"
          ? t("handoverModeMissing")
          : payload?.code === "ASSET_HANDOVER_STATUS_MISMATCH"
            ? t("handoverStatusMismatch")
            : payload?.error ?? tCommon("error")
        throw new Error(message)
      }
      toast.success(t("success"))
      const documentHref = `/${locale}/asset-management/checkins/${payload.id}`
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
      <form onSubmit={handleSubmit} noValidate id={CHECKIN_FORM_ID}>
        <OperationFormFrame
          title={t("title")}
          description={t("description")}
          actions={legacyLink}
          summaryOnPhone={false}
          summary={<OperationSummaryCard
            title={tOperation("summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={tOperation("summaryNext")}
            rows={summaryRows}
            checklist={checklist}
            warnings={[...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]}
            footnote={t("summaryFootnote")}
            photo={chosen ? <AssetThumbnail photo={chosen.photo} assetTag={chosen.assetTag} assetName={chosen.name} size={64} /> : undefined}
            assetLabel={chosen ? assetOperationRowLabel(chosen) : undefined}
          />}
          footer={{
            description: chosen && values.returnBy
              ? t("footerDescription", { tag: chosen.assetTag, returner: values.returnBy })
              : t("footerIncomplete"),
            cancelHref,
            cancelLabel: tCommon("cancel"),
            submitLabel: tOperation("reviewAndSave"),
            busy: saving || readingForSubmit,
            formId: CHECKIN_FORM_ID,
          }}
        >
          <FormSection number={1} title={t("sectionAsset")}>
            <div className="grid gap-4">
              {/* The arrival banner names the ?checkoutId= row only while it is still the chosen one (look step). */}
              {initialRow?.eligible && chosen?.id === initialRow.id ? (
                <FormContextBanner label={t("asset")} value={`${initialRow.assetTag} - ${initialRow.name}`} />
              ) : null}
              <AssetOperationPicker
                id="checkin-checkout"
                label={t("asset")}
                mode="checkin"
                value={chosen}
                required
                initialQuery={initialQuery}
                error={blockedReason ?? fieldErrors.message("checkoutId")}
                onChange={chooseRow}
                pickedBody={(row) => <CheckinAssetCard row={row} />}
              />
              {selectedCheckout && chosen ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-foreground">{t("currentCustody")}</p>
                  {/* D19: the handover as one shared KeyValueList; an empty value shows Nil. */}
                  <KeyValueList
                    items={[
                      { key: "documentNo", label: t("handoverDocumentNo"), value: selectedCheckout.documentNo ? <span className="tag">{selectedCheckout.documentNo}</span> : null },
                      {
                        key: "handedOverAt",
                        label: t("handedOverAt"),
                        value: isLegacyBackfilledHandover(selectedCheckout.remark)
                          ? t("heldLegacy")
                          : handoverDay && heldDays !== null
                            ? t("heldFor", { date: formatCheckoutDay(handoverDay, locale), days: heldDays })
                            : formatCheckoutDay(handoverDay ?? "", locale) || null,
                      },
                      {
                        key: "custodyType",
                        label: t("custodyType"),
                        value: selectedCheckout.handoverMode === "permanent_assignment"
                          ? t("permanentAssignmentShort")
                          : t("temporaryLoanShort"),
                      },
                      { key: "checkoutType", label: t("checkoutType"), value: selectedCheckout.checkoutType ? t(`type_${selectedCheckout.checkoutType}`) : null },
                      { key: "checkoutTo", label: t("checkoutTo"), value: selectedCheckout.destinationLabel },
                      ...(selectedCheckout.handoverMode === "temporary_loan"
                        ? [{ key: "expectedReturnDate", label: t("expectedReturnDate"), value: formatCheckoutDay(checkinBangkokDay(selectedCheckout.expectedReturnDate), locale) || null }]
                        : []),
                      { key: "conditionBefore", label: t("conditionBefore"), value: conditionLabels[selectedCheckout.conditionBefore] ?? null },
                      // A backfill's remark is the route's own English text, not the person's words.
                      { key: "checkoutRemark", label: t("checkoutRemark"), value: isLegacyBackfilledHandover(selectedCheckout.remark) ? null : selectedCheckout.remark },
                    ]}
                  />
                </div>
              ) : null}
              {travelling.length > 0 ? (
                <FieldGroup legend={t("componentsLegend")} id="checkin-components" hint={t("componentsNote")} error={fieldErrors.message("missingComponentIds")}>
                  <div className="grid gap-2">
                    {travelling.map((component) => (
                      <ChoiceCard
                        key={component.id}
                        type="checkbox"
                        value={component.id}
                        checked={!unticked.has(component.id)}
                        disabled={saving}
                        label={<><span className="tag">{component.assetTag}</span> {component.name}{unticked.has(component.id) ? ` · ${t("componentNotReturned")}` : null}</>}
                        onChange={(event) => toggleComponent(component.id, event.target.checked)}
                      />
                    ))}
                  </div>
                </FieldGroup>
              ) : null}
            </div>
          </FormSection>
          <FormSection number={2} title={t("sectionReturn")}>
            <div className="grid gap-4 md:grid-cols-2">
              <SearchableSelect
                id="checkin-return-by"
                label={t("returnBy")}
                value={returnByEmployeeId}
                required
                options={returnByOptions}
                placeholder={t("selectReturnBy")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={returnByEmployeeId && returnByEmployeeId === choice.returnByEmployeeId ? t("returnByHolder") : undefined}
                error={fieldErrors.message("returnBy")}
                onChange={(value) => setEmployeeField("returnBy", value, value === choice.returnByEmployeeId ? choice.returnByInactiveLabel : null)}
              />
              <SearchableSelect
                id="checkin-receive-by"
                label={t("receiveBy")}
                value={receiveByEmployeeId}
                required
                options={employees}
                placeholder={t("selectReceiveBy")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={receiveByEmployeeId && receiveByEmployeeId === currentEmployeeId ? t("receiveByYou") : undefined}
                error={fieldErrors.message("receiveBy")}
                onChange={(value) => setEmployeeField("receiveBy", value)}
              />
              <div className="md:col-span-2">
                <AssetConditionChoice
                  id="checkin-condition-after"
                  legend={t("conditionAfter")}
                  options={conditions}
                  value={values.conditionAfter}
                  required
                  error={fieldErrors.message("conditionAfter")}
                  onChange={setCondition}
                />
              </div>
              <Field label={t("returnDate")} id="checkin-return-date" required error={fieldErrors.message("returnDate")}>
                <Input type="date" value={values.returnDate} min={handoverDay ?? undefined} max={todayDay} onChange={(event) => setField("returnDate", event.target.value)} required />
              </Field>
              <Field label={t("nextStatusAfterReturn")} id="checkin-next-status" required hint={nextStatusHint} error={fieldErrors.message("nextStatusId")}>
                <NativeSelect value={values.nextStatusId} required onChange={(event) => setField("nextStatusId", event.target.value)}>
                  {repairLocked ? null : <option value="">{t("selectStatus")}</option>}
                  {nextStatusOptions.map((status) => (
                    <option key={status.id} value={status.id}>{status.name === "Under Maintenance" ? t("sendToRepairOption") : status.label}</option>
                  ))}
                </NativeSelect>
              </Field>
              <SearchableSelect
                id="checkin-next-location"
                label={t("nextLocation")}
                value={values.nextLocationId}
                required
                options={locations}
                placeholder={t("selectLocation")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                error={fieldErrors.message("nextLocationId")}
                onChange={(value) => setField("nextLocationId", value)}
              />
              <Field label={t("missingAccessories")}>
                <Input value={values.missingAccessories} onChange={(event) => setField("missingAccessories", event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label={t("damageNote")}>
                  <Textarea value={values.damageNote} onChange={(event) => handleDamageNoteChange(event.target.value)} rows={3} />
                </Field>
              </div>
              {/* An open repair: the return joins it, so no new record and no problem to describe (S-R43). */}
              {repairLocked ? (
                <div className="md:col-span-2">
                  <Notice tone="info" title={t("sendToRepairTitle")}>
                    {t("openRepairReturnNotice")}
                  </Notice>
                </div>
              ) : null}
              {sendsToRepair && !repairLocked ? (
                <div className="md:col-span-2">
                  <Field label={t("maintenanceProblem")}>
                    <Textarea value={values.maintenanceProblem} onChange={(event) => setField("maintenanceProblem", event.target.value)} rows={3} placeholder={t("maintenanceProblemPlaceholder")} />
                  </Field>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <Field label={t("remark")}>
                  <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={3} />
                </Field>
              </div>
            </div>
          </FormSection>
          <FormSection number={3} title={<>{t("sectionEvidence")} <span className="font-normal text-muted-foreground">{t("sectionEvidenceOptional")}</span></>}>
            <div className="grid gap-4">
              <FieldGroup legend={t("photoType")}>
                <div className="flex flex-wrap gap-2">
                  {photoTypes.map((type) => (
                    <ChoiceChip
                      key={type.id}
                      type="radio"
                      name="checkin-photo-type"
                      value={type.id}
                      checked={photoType === type.id}
                      label={type.label}
                      onChange={() => setPhotoType(type.id)}
                    />
                  ))}
                </div>
              </FieldGroup>
              <FileDropzone
                file={null}
                onFileChange={addPhoto}
                disabled={saving}
                accept="image/*"
                capture="environment"
                title={t("photoAfterDropTitle")}
                description={t("photoAfterDescription")}
                browseLabel={t("photoAfterDropHint")}
              />
              <FileQueueList
                items={photosAfter.map((photo) => ({ id: photo.id, name: photo.label, detail: photo.file.name }))}
                emptyLabel={t("noQueuedPhotos")}
                disabled={saving}
                onRemove={(id) => setPhotosAfter((current) => current.filter((item) => item.id !== id))}
              />
              <div className="grid gap-4 md:grid-cols-2">
                {/* Another person remounts the pad, so no ink given for someone else stays. */}
                <SignaturePad
                  key={`return:${returnByEmployeeId}`}
                  label={t("returnSignature")}
                  helper={t("returnSignatureHelp")}
                  clearLabel={t("clearSignature")}
                  disabled={saving}
                  onChange={setReturnSignatureDataUrl}
                />
                <SignaturePad
                  key={`receive:${receiveByEmployeeId}`}
                  label={t("receiveSignature")}
                  helper={t("receiveSignatureHelp")}
                  clearLabel={t("clearSignature")}
                  disabled={saving}
                  onChange={setReceiveSignatureDataUrl}
                />
              </div>
            </div>
          </FormSection>
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
        onConfirm={() => void submitCheckin()}
      />
    </>
  )
}

// The chosen box of section 1 (spec §8.2): the photo, the tag and the status, the name, and the serial when there is one.
function CheckinAssetCard({ row }: { row: AssetOperationSearchRow }) {
  const t = useTranslations("checkin")
  return (
    <span className="flex min-w-0 items-start gap-3">
      <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="tag font-medium">{row.assetTag}</span>
          <StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />
        </span>
        <span className="min-w-0 break-words font-medium text-foreground">{row.name}</span>
        {row.serialNumber ? (
          <span className="min-w-0 break-words text-meta text-muted-foreground">
            {t("serialNumber")} <span className="tag">{row.serialNumber}</span>
          </span>
        ) : null}
      </span>
    </span>
  )
}

// The new handover's row after the backfill, read by id with its detail as the page's preselect is (spec 6.4).
async function fetchCheckinRow(assetId: string): Promise<AssetOperationSearchRow | null> {
  const response = await fetch(buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true }))
  if (!response.ok) return null
  const payload = (await response.json().catch(() => null)) as { data?: AssetOperationSearchAnswer } | null
  return payload?.data?.rows[0] ?? null
}

// The signature's file name, stamped when the save runs (outside render, so the React compiler's purity check holds).
function signatureFileName(prefix: string) {
  return `${prefix}-${Date.now()}.png`
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
