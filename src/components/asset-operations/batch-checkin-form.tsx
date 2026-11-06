"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AssetConditionChoice } from "@/components/asset-operations/condition-choice"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import type { AssetOperationEmployeePlainOption, AssetOperationNamedOption } from "@/lib/asset-operation-options"
import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"
import {
  batchCheckinBlockedReasonKey,
  batchCheckinCounts,
  batchCheckinFieldOrder,
  batchCheckinNeedsRepairHint,
  batchCheckinPhotoField,
  batchCheckinRowKey,
  batchCheckinRowLock,
  batchCheckinRowOffersSingle,
  batchCheckinSingleHref,
  batchCheckinStatusOptions,
  batchCheckinStatusTally,
  buildBatchCheckinFields,
  buildBatchCheckinItems,
  changeBatchCheckinCondition,
  initialBatchCheckinDraft,
  initialBatchCheckinTicks,
  mapBatchCheckinServerErrors,
  readBatchCheckinCreated,
  removeBatchCheckinTicks,
  toggleBatchCheckinTick,
  validateBatchCheckin,
  type BatchCheckinDraft,
  type BatchCheckinFormRow,
  type BatchCheckinTicks,
} from "@/lib/batch-checkin-form-rules"
import { bulkMoveBlockedList, readBulkMoveBlocked, type BulkMoveBlockedAsset } from "@/lib/bulk-move-blocked"
import { checkinTodayDay } from "@/lib/checkin-form-rules"
import { formatCheckoutDay } from "@/lib/checkout-phone-steps"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import type { EmployeeReturnBatchEmployee } from "@/lib/employee-page-data"
import { readFieldErrors } from "@/lib/field-error-client"
import { waitForDialogToClose } from "@/lib/field-focus"
import { cn } from "@/lib/utils"
import { MAX_BATCH_CHECKIN_ITEMS } from "@/lib/validations/batch-checkin"

const BATCH_CHECKIN_FORM_ID = "batch-checkin-form"
type QueuedPhoto = { id: string; file: File }

// The id focus moves to for each error key (v-track M-R1): the selection's banner, a row's controls, then the fields.
function fieldIdFor(key: string): string {
  if (key === "rows") return "batch-checkin-rows"
  const [kind, assetId] = key.split(":")
  if (assetId) return `batch-checkin-${kind}-${assetId}`
  return {
    returnBy: "batch-checkin-return-by",
    receiveBy: "batch-checkin-receive-by",
    returnDate: "batch-checkin-return-date",
    nextLocationId: "batch-checkin-next-location",
    returnSignatureFile: "batch-checkin-return-signature",
    receiveSignatureFile: "batch-checkin-receive-signature",
  }[key] ?? key
}

// รับคืนหลายรายการ (group 7 plan 4 Task 4, spec §5.3): one holder's machines, each ticked (default on) with its own
// condition (default ดี), next status, optional photos and damage note; one returner, one receiver, one date, one room for
// all (changeable per row) and two signatures; the review, then one save that is all or nothing. A machine the
// multi-return does not take (G7P4-R2) is listed unticked and locked with its reason; "รับคืนทีละรายการ" and the single
// form's link only where the single form takes it (an outstanding component or an open repair, not a return block).
export function BatchCheckinForm({
  holder,
  rows,
  total,
  employees,
  locations,
  statuses,
  conditions,
  currentEmployeeId,
  pageHref,
  returnTo,
}: {
  holder: EmployeeReturnBatchEmployee
  rows: BatchCheckinFormRow[]
  /** Every asset the holder has; more than rows.length when the read was capped. */
  total: number
  employees: AssetOperationEmployeePlainOption[]
  locations: AssetOperationNamedOption[]
  statuses: AssetOperationNamedOption[]
  conditions: AssetOperationNamedOption[]
  /** The signed-in person's employee: ผู้รับคืน starts as them. */
  currentEmployeeId: string | null
  /** This page with its way back: a locked row's single form comes back here. */
  pageHref: string
  returnTo?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("batchCheckin")
  const tCheckin = useTranslations("checkin")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const fieldErrors = useFieldErrors<string>()
  const employeeIds = useMemo(() => new Set(employees.map((employee) => employee.id)), [employees])
  // The holder returns them; one who has left is offered once more, named as a former employee (S-R46).
  const returnByOptions = employeeIds.has(holder.id)
    ? employees
    : [...employees, { id: holder.id, label: tCheckin("returnByFormer", { name: holder.fullNameTh }), departmentId: "" }]
  const initialReceiverId = currentEmployeeId && employeeIds.has(currentEmployeeId) ? currentEmployeeId : ""
  const statusOptions = batchCheckinStatusOptions(statuses)

  const [ticks, setTicks] = useState<BatchCheckinTicks>(() => initialBatchCheckinTicks(rows))
  const [capped, setCapped] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, BatchCheckinDraft>>(() =>
    Object.fromEntries(rows.map((row) => [row.assetId, initialBatchCheckinDraft(conditions, statuses)])),
  )
  const [overridden, setOverridden] = useState<ReadonlySet<string>>(new Set())
  const [photos, setPhotos] = useState<Record<string, QueuedPhoto[]>>({})
  const [returnByEmployeeId, setReturnByEmployeeId] = useState(holder.id)
  const [receiveByEmployeeId, setReceiveByEmployeeId] = useState(initialReceiverId)
  const [returnDate, setReturnDate] = useState(() => checkinTodayDay())
  const [nextLocationId, setNextLocationId] = useState("")
  const [returnSignature, setReturnSignature] = useState<string | null>(null)
  const [receiveSignature, setReceiveSignature] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BulkMoveBlockedAsset[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const returnByLabel = returnByOptions.find((employee) => employee.id === returnByEmployeeId)?.label ?? ""
  // The former holder's name is written as it is, without the (พ้นสภาพ) mark.
  const returnByName = returnByEmployeeId === holder.id && !employeeIds.has(holder.id) ? holder.fullNameTh : returnByLabel
  const receiveByLabel = employees.find((employee) => employee.id === receiveByEmployeeId)?.label ?? ""
  const location = locations.find((option) => option.id === nextLocationId) ?? null
  const counts = batchCheckinCounts(rows, ticks)
  const tickedIds = rows.filter((row) => ticks.has(row.assetId)).map((row) => row.assetId)
  const tally = batchCheckinStatusTally(rows, ticks, drafts, statuses)
  const photoCount = tickedIds.reduce((sum, id) => sum + (photos[id]?.length ?? 0), 0)
  const blockedById = new Map(blocked.map((asset) => [asset.assetId, asset.code]))
  const cancelHref = getOperationCancelHref(locale, returnTo)
  const todayDay = checkinTodayDay()

  function blockedReason(code: string) {
    const key = batchCheckinBlockedReasonKey(code)
    return key ? tAll(key) : apiError.describe(code).message
  }

  // The selection's one error: the refused machines by tag and reason, none ticked, or a server error on items.
  const rowsError = fieldErrors.errors.rows === "blocked"
    ? `${t("blockedTitle", { count: formatCount(blocked.length) })}: ${bulkMoveBlockedList(blocked, blockedReason)}`
    : fieldErrors.errors.rows === "batchCheckinNothingSelected"
      ? t("nothingSelected")
      : fieldErrors.message("rows")

  function changeTicks(next: BatchCheckinTicks) {
    setTicks(next)
    fieldErrors.clear("rows")
  }

  function toggleRow(row: BatchCheckinFormRow, checked: boolean) {
    const result = toggleBatchCheckinTick(ticks, row, checked)
    setCapped(result.capped)
    changeTicks(result.ticks)
  }

  // นำรายการที่รับคืนไม่ได้ออก: unticks every refused machine; everything typed stays (Review Focus 1).
  function removeBlocked() {
    changeTicks(removeBatchCheckinTicks(ticks, blocked.map((asset) => asset.assetId)))
    setBlocked([])
  }

  function setDraft(assetId: string, patch: (draft: BatchCheckinDraft) => BatchCheckinDraft) {
    setDrafts((current) => ({ ...current, [assetId]: patch(current[assetId] ?? initialBatchCheckinDraft(conditions, statuses)) }))
  }

  function setCondition(assetId: string, conditionId: string) {
    setDraft(assetId, (draft) => changeBatchCheckinCondition(draft, conditionId, conditions, statuses))
    fieldErrors.clear(batchCheckinRowKey.condition(assetId), batchCheckinRowKey.status(assetId))
  }

  function setStatus(assetId: string, statusId: string) {
    setDraft(assetId, (draft) => ({ ...draft, nextStatusId: statusId, statusTouched: true }))
    fieldErrors.clear(batchCheckinRowKey.status(assetId))
  }

  function setRowLocation(assetId: string, locationId: string) {
    setDraft(assetId, (draft) => ({ ...draft, nextLocationId: locationId }))
    fieldErrors.clear(batchCheckinRowKey.location(assetId))
  }

  // เปลี่ยนเฉพาะรายการนี้ opens the row's room; ใช้ที่ตั้งเดียวกับทุกรายการ closes it and forgets the row's pick.
  function setOverride(assetId: string, on: boolean) {
    setOverridden((current) => {
      const next = new Set(current)
      if (on) next.add(assetId)
      else next.delete(assetId)
      return next
    })
    if (!on) setRowLocation(assetId, "")
  }

  function addPhotos(assetId: string, files: File[]) {
    if (files.length === 0) return
    setPhotos((current) => ({ ...current, [assetId]: [...(current[assetId] ?? []), ...files.map((file) => ({ id: crypto.randomUUID(), file }))] }))
  }

  function removePhoto(assetId: string, photoId: string) {
    setPhotos((current) => ({ ...current, [assetId]: (current[assetId] ?? []).filter((photo) => photo.id !== photoId) }))
  }

  // Another person clears that side's signature; the pad's key remounts it.
  function setReturnBy(employeeId: string) {
    if (employeeId !== returnByEmployeeId) setReturnSignature(null)
    setReturnByEmployeeId(employeeId)
    fieldErrors.clear("returnBy")
  }

  function setReceiveBy(employeeId: string) {
    if (employeeId !== receiveByEmployeeId) setReceiveSignature(null)
    setReceiveByEmployeeId(employeeId)
    fieldErrors.clear("receiveBy")
  }

  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(batchCheckinFieldOrder(tickedIds), { idFor: fieldIdFor, reveal: leaveReview })

  // noValidate turns the browser's check off; the rules restate the route's (validateBatchCheckin).
  const validate = () =>
    validateBatchCheckin({
      tickedIds,
      drafts,
      returnBy: returnByName,
      receiveBy: receiveByLabel,
      returnDate,
      todayDay,
      nextLocationId,
      returnSigned: returnSignature !== null,
      receiveSigned: receiveSignature !== null,
    })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate())
    if (focusFirstError()) return
    setReviewOpen(true)
  }

  async function submitBatch() {
    setSaving(true)
    const body = new FormData()
    const fields = buildBatchCheckinFields({
      employeeId: holder.id,
      returnDate,
      returnBy: returnByName,
      returnByEmployeeId,
      receiveBy: receiveByLabel,
      receiveByEmployeeId,
      nextLocationId,
      items: buildBatchCheckinItems(rows, ticks, drafts),
    })
    for (const [key, value] of Object.entries(fields)) body.set(key, value)
    if (returnSignature) body.set("returnSignatureFile", dataUrlToFile(returnSignature, signatureFileName("return-signature")))
    if (receiveSignature) body.set("receiveSignatureFile", dataUrlToFile(receiveSignature, signatureFileName("receive-signature")))
    for (const assetId of tickedIds) {
      for (const photo of photos[assetId] ?? []) body.append(batchCheckinPhotoField(assetId), photo.file)
    }

    try {
      const response = await fetch("/api/asset-checkins/batch", { method: "POST", body })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // Refused machines: the review closes, each row says why and the banner names them; nothing typed is lost
        // (Review Focus 1).
        const refused = readBulkMoveBlocked(payload)
        if (refused.length > 0) {
          setBlocked(refused)
          fieldErrors.setErrors({ rows: "blocked" })
          focusFirstError()
          return
        }
        const serverErrors = readFieldErrors(payload)
        if (serverErrors) {
          fieldErrors.setErrors(mapBatchCheckinServerErrors(serverErrors, tickedIds))
          if (focusFirstError()) return
        }
        throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))
      }
      const created = readBatchCheckinCreated(payload)
      if (!created) throw new Error(tCommon("error"))
      toast.success(t("success", { count: formatCount(created.count) }))
      const documentHref = `/${locale}/asset-management/checkins/${created.firstCheckinId}`
      router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const reviewItems = [
    { label: t("reviewAssets"), value: rows.filter((row) => ticks.has(row.assetId)).map((row) => row.assetTag).join(", ") },
    { label: tCheckin("returnBy"), value: returnByName },
    { label: tCheckin("receiveBy"), value: receiveByLabel },
    { label: tCheckin("returnDate"), value: formatCheckoutDay(returnDate, locale) },
    { label: t("nextLocationAll"), value: location?.label ?? "" },
    { label: tCheckin("nextStatusAfterReturn"), value: tally.map((entry) => `${entry.label} ${formatCount(entry.count)}`).join(" · ") },
    { label: tCheckin("reviewEvidence"), value: t("reviewEvidenceCount", { count: formatCount(photoCount) }) },
  ]

  const summaryRows = [
    { key: "count", label: t("reviewAssets"), now: t("summaryCount", { count: formatCount(counts.held) }), next: t("summaryCount", { count: formatCount(counts.ticked) }), changed: true },
    { key: "holder", label: tOperation("summaryHolder"), now: holder.fullNameTh, next: tOperation("summaryNone"), changed: true },
    { key: "location", label: tOperation("summaryLocation"), now: "", next: location?.label ?? tOperation("summaryNotChosen"), changed: Boolean(location) },
    {
      key: "status",
      label: tOperation("summaryStatus"),
      now: "",
      next: tally.length > 0 ? tally.map((entry) => `${entry.label} ${formatCount(entry.count)}`).join(" · ") : tOperation("summaryNotChosen"),
      changed: tally.length > 0,
    },
  ]
  const checklist = [
    { key: "rows", label: t("reviewAssets"), done: counts.ticked > 0 },
    { key: "returnBy", label: tCheckin("returnBy"), done: Boolean(returnByName) },
    { key: "receiveBy", label: tCheckin("receiveBy"), done: Boolean(receiveByLabel) },
    { key: "location", label: t("nextLocationAll"), done: Boolean(location) },
    { key: "returnSignature", label: tCheckin("returnSignature"), done: returnSignature !== null },
    { key: "receiveSignature", label: tCheckin("receiveSignature"), done: receiveSignature !== null },
  ]

  return (
    <>
      <form onSubmit={handleSubmit} noValidate id={BATCH_CHECKIN_FORM_ID}>
        <OperationFormFrame
          title={t("title")}
          description={t("holderLine", { holder: holder.fullNameTh, count: formatCount(total) })}
          summaryOnPhone={false}
          summary={
            <OperationSummaryCard
              title={t("summaryAfter")}
              nowLabel={tOperation("summaryNow")}
              nextLabel={tOperation("summaryNext")}
              rows={summaryRows}
              checklist={checklist}
              footnote={t("description")}
            />
          }
          footer={{
            description: counts.ticked > 0 ? t("footer", { count: formatCount(counts.ticked) }) : t("footerNone"),
            cancelHref,
            cancelLabel: tCommon("cancel"),
            submitLabel: t("footer", { count: formatCount(counts.ticked) }),
            busy: saving,
            formId: BATCH_CHECKIN_FORM_ID,
          }}
        >
          <FormSection number={1} title={t("sectionAssets")}>
            <div className="grid gap-3">
              {total > rows.length ? (
                <Notice tone="info">{t("notAllListed", { shown: formatCount(rows.length), count: formatCount(total) })}</Notice>
              ) : null}
              {capped ? <Notice tone="info" role="status">{t("capReached", { max: formatCount(MAX_BATCH_CHECKIN_ITEMS) })}</Notice> : null}
              {rowsError ? (
                <div id="batch-checkin-rows" tabIndex={-1} className="grid justify-items-start gap-2 focus-visible:outline-none">
                  <FieldError id="batch-checkin-rows-error">{rowsError}</FieldError>
                  {blocked.length > 0 ? (
                    <Button variant="outline" size="md" aria-describedby="batch-checkin-rows-error" onClick={removeBlocked}>
                      {t("removeBlocked")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {rows.length === 0 ? (
                <EmptyNote>{t("emptyHelp")}</EmptyNote>
              ) : (
                <ul className="grid gap-3">
                  {rows.map((row) => (
                    <BatchCheckinRow
                      key={row.assetId}
                      row={row}
                      ticked={ticks.has(row.assetId)}
                      draft={drafts[row.assetId]}
                      overridden={overridden.has(row.assetId)}
                      photos={photos[row.assetId] ?? []}
                      blockedReason={blockedById.has(row.assetId) ? blockedReason(blockedById.get(row.assetId) ?? "") : null}
                      singleHref={batchCheckinSingleHref(locale, row, pageHref)}
                      conditions={conditions}
                      statusOptions={statusOptions}
                      locations={locations}
                      disabled={saving}
                      errors={{
                        condition: fieldErrors.message(batchCheckinRowKey.condition(row.assetId)),
                        status: fieldErrors.message(batchCheckinRowKey.status(row.assetId)),
                        location: fieldErrors.message(batchCheckinRowKey.location(row.assetId)),
                      }}
                      onToggle={(checked) => toggleRow(row, checked)}
                      onCondition={(value) => setCondition(row.assetId, value)}
                      onStatus={(value) => setStatus(row.assetId, value)}
                      onOverride={(on) => setOverride(row.assetId, on)}
                      onLocation={(value) => setRowLocation(row.assetId, value)}
                      onDamageNote={(value) => setDraft(row.assetId, (draft) => ({ ...draft, damageNote: value }))}
                      onAddPhotos={(files) => addPhotos(row.assetId, files)}
                      onRemovePhoto={(photoId) => removePhoto(row.assetId, photoId)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </FormSection>
          <FormSection number={2} title={t("sectionReturn")}>
            <div className="grid gap-4 md:grid-cols-2">
              <SearchableSelect
                id="batch-checkin-return-by"
                label={tCheckin("returnBy")}
                value={returnByEmployeeId}
                required
                options={returnByOptions}
                placeholder={tCheckin("selectReturnBy")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={returnByEmployeeId === holder.id ? tCheckin("returnByHolder") : undefined}
                error={fieldErrors.message("returnBy")}
                onChange={setReturnBy}
              />
              <SearchableSelect
                id="batch-checkin-receive-by"
                label={tCheckin("receiveBy")}
                value={receiveByEmployeeId}
                required
                options={employees}
                placeholder={tCheckin("selectReceiveBy")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={receiveByEmployeeId && receiveByEmployeeId === currentEmployeeId ? tCheckin("receiveByYou") : undefined}
                error={fieldErrors.message("receiveBy")}
                onChange={setReceiveBy}
              />
              <Field label={tCheckin("returnDate")} id="batch-checkin-return-date" required error={fieldErrors.message("returnDate")}>
                <Input type="date" value={returnDate} max={todayDay} required onChange={(event) => {
                  setReturnDate(event.target.value)
                  fieldErrors.clear("returnDate")
                }} />
              </Field>
              <SearchableSelect
                id="batch-checkin-next-location"
                label={t("nextLocationAll")}
                value={nextLocationId}
                required
                options={locations}
                placeholder={tCheckin("selectLocation")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                error={fieldErrors.message("nextLocationId")}
                onChange={(value) => {
                  setNextLocationId(value)
                  fieldErrors.clear("nextLocationId")
                }}
              />
            </div>
          </FormSection>
          <FormSection number={3} title={t("sectionSignatures")}>
            {/* Full width on the phone, side by side from md; another person remounts the pad. */}
            <div className="grid gap-4 md:grid-cols-2">
              <div id="batch-checkin-return-signature" tabIndex={-1} className="grid min-w-0 gap-1.5 focus-visible:outline-none">
                <SignaturePad
                  key={`return:${returnByEmployeeId}`}
                  label={tCheckin("returnSignature")}
                  helper={tCheckin("returnSignatureHelp")}
                  clearLabel={tCheckin("clearSignature")}
                  disabled={saving}
                  onChange={(value) => {
                    setReturnSignature(value)
                    if (value) fieldErrors.clear("returnSignatureFile")
                  }}
                />
                {fieldErrors.message("returnSignatureFile") ? <FieldError>{fieldErrors.message("returnSignatureFile")}</FieldError> : null}
              </div>
              <div id="batch-checkin-receive-signature" tabIndex={-1} className="grid min-w-0 gap-1.5 focus-visible:outline-none">
                <SignaturePad
                  key={`receive:${receiveByEmployeeId}`}
                  label={tCheckin("receiveSignature")}
                  helper={tCheckin("receiveSignatureHelp")}
                  clearLabel={tCheckin("clearSignature")}
                  disabled={saving}
                  onChange={(value) => {
                    setReceiveSignature(value)
                    if (value) fieldErrors.clear("receiveSignatureFile")
                  }}
                />
                {fieldErrors.message("receiveSignatureFile") ? <FieldError>{fieldErrors.message("receiveSignatureFile")}</FieldError> : null}
              </div>
            </div>
          </FormSection>
        </OperationFormFrame>
      </form>
      <OperationReviewDialog
        open={reviewOpen}
        title={t("reviewTitle", { count: formatCount(counts.ticked) })}
        description={t("reviewDescription")}
        items={reviewItems}
        confirmLabel={tCheckin("reviewConfirm")}
        cancelLabel={tCommon("cancel")}
        busy={saving}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void submitBatch()}
      />
    </>
  )
}

type BatchCheckinRowProps = {
  row: BatchCheckinFormRow
  ticked: boolean
  draft: BatchCheckinDraft | undefined
  overridden: boolean
  photos: QueuedPhoto[]
  blockedReason: string | null
  singleHref: string
  conditions: AssetOperationNamedOption[]
  statusOptions: AssetOperationNamedOption[]
  locations: AssetOperationNamedOption[]
  disabled: boolean
  errors: { condition?: string; status?: string; location?: string }
  onToggle: (checked: boolean) => void
  onCondition: (value: string) => void
  onStatus: (value: string) => void
  onOverride: (on: boolean) => void
  onLocation: (value: string) => void
  onDamageNote: (value: string) => void
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (photoId: string) => void
}

// One machine as a card (the phone's layout, and the desktop's row): the tick, the photo, the tag and name with its
// HO- or ข้อมูลเก่า, then its own condition, next status, room override, photos and damage note while ticked. A locked
// row reads its reason, and "รับคืนทีละรายการ" with the single form's link when the single form takes it (G7P4-R2).
function BatchCheckinRow(props: BatchCheckinRowProps) {
  const { row, ticked, draft, overridden, photos, blockedReason, singleHref, conditions, statusOptions, locations, disabled, errors } = props
  const t = useTranslations("batchCheckin")
  const tCheckin = useTranslations("checkin")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const lock = batchCheckinRowLock(row)
  const reasonId = `batch-checkin-reason-${row.assetId}`
  const conditionName = conditions.find((condition) => condition.id === draft?.conditionAfter)?.name ?? null

  return (
    <li
      data-batch-checkin-row={row.assetTag}
      className={cn("grid min-w-0 gap-3 rounded-md border border-border bg-background p-3", blockedReason ? "border-danger" : null)}
    >
      <div className="flex min-w-0 items-start gap-3">
        <label className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            id={`batch-checkin-tick-${row.assetId}`}
            type="checkbox"
            className={checkboxVariants()}
            aria-label={t("selectRow", { tag: row.assetTag })}
            aria-describedby={lock || blockedReason ? reasonId : undefined}
            checked={ticked}
            disabled={disabled || (lock !== null && !ticked)}
            onChange={(event) => props.onToggle(event.target.checked)}
          />
        </label>
        <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="tag font-medium">{row.assetTag}</span>
            <StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.statusName)} />
          </span>
          <span className="min-w-0 break-words font-medium text-foreground">{row.name}</span>
          <span className="text-meta text-muted-foreground">
            {row.handover?.documentNo ? <span className="tag">{row.handover.documentNo}</span> : row.legacy ? tAll("employee.detail.legacy") : null}
            {" · "}
            {row.locationLabel}
          </span>
          {lock ? (
            <span id={reasonId} className="grid justify-items-start gap-1 text-meta text-muted-foreground">
              <span>{tAll(lock)}</span>
              {batchCheckinRowOffersSingle(row) ? (
                <a href={singleHref} className={linkVariants({ size: "meta" })}>{t("needsSingle")}</a>
              ) : null}
            </span>
          ) : blockedReason ? (
            <FieldError id={reasonId}>{blockedReason}</FieldError>
          ) : null}
        </div>
      </div>
      {ticked && draft ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-2 md:pl-14">
          <div className="md:col-span-2">
            <AssetConditionChoice
              id={`batch-checkin-condition-${row.assetId}`}
              legend={tCheckin("conditionAfter")}
              options={conditions}
              value={draft.conditionAfter}
              required
              disabled={disabled}
              error={errors.condition}
              onChange={props.onCondition}
            />
          </div>
          <Field
            label={tCheckin("nextStatusAfterReturn")}
            id={`batch-checkin-status-${row.assetId}`}
            required
            hint={batchCheckinNeedsRepairHint(conditionName) ? t("repairHint") : undefined}
            error={errors.status}
          >
            <NativeSelect value={draft.nextStatusId} required disabled={disabled} onChange={(event) => props.onStatus(event.target.value)}>
              <option value="">{tCheckin("selectStatus")}</option>
              {statusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </NativeSelect>
          </Field>
          <div className="grid min-w-0 content-start gap-1.5">
            {overridden ? (
              <>
                <SearchableSelect
                  id={`batch-checkin-location-${row.assetId}`}
                  label={t("rowLocation")}
                  value={draft.nextLocationId}
                  options={locations}
                  placeholder={tCheckin("selectLocation")}
                  searchPlaceholder={tCommon("searchSelectPlaceholder")}
                  emptyLabel={tCommon("searchSelectNoResults")}
                  error={errors.location}
                  onChange={props.onLocation}
                />
                <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => props.onOverride(false)}>
                  {t("useLocationAll")}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" className="justify-self-start md:mt-6" disabled={disabled} onClick={() => props.onOverride(true)}>
                {t("overrideLocation")}
              </Button>
            )}
          </div>
          <details className="md:col-span-2">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-foreground md:min-h-0">
              {t("rowDetails")}
              {photos.length > 0 ? ` · ${photos.length}` : null}
            </summary>
            <div className="mt-2 grid gap-3">
              <FileDropzone
                file={null}
                onFileChange={(file) => props.onAddPhotos(file ? [file] : [])}
                onFilesChange={props.onAddPhotos}
                multiple
                compact
                disabled={disabled}
                accept="image/*"
                capture="environment"
                title={t("rowPhotos")}
                browseLabel={t("rowPhotosAdd")}
              />
              <FileQueueList
                items={photos.map((photo) => ({ id: photo.id, name: photo.file.name }))}
                emptyLabel={tCheckin("noQueuedPhotos")}
                disabled={disabled}
                onRemove={props.onRemovePhoto}
              />
              <Field label={tCheckin("damageNote")} id={`batch-checkin-damage-${row.assetId}`}>
                <Textarea value={draft.damageNote} rows={2} disabled={disabled} onChange={(event) => props.onDamageNote(event.target.value)} />
              </Field>
            </div>
          </details>
        </div>
      ) : null}
    </li>
  )
}

// The signature's file name, stamped when the save runs (outside render, so the React compiler's purity check holds).
function signatureFileName(prefix: string) {
  return `${prefix}-${Date.now()}.png`
}

// The single return form's own conversion (checkin-form.tsx), repeated here so that form stays untouched.
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
