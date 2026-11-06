// รับคืนหลายรายการ's form rules (group 7 plan 4 Task 4, spec §5.3; G7P4-R2 to R4): which rows tick by default and which
// lock (they go through the single return form, "รับคืนทีละรายการ"), the per-row defaults, the checks before the review,
// the multipart fields of POST /api/asset-checkins/batch and the words of its 409. Pure and client-safe (relative imports
// only); the form draws everything from these values and writes the words.
import { getCheckoutConditionBlock } from "./asset-lifecycle-policy.ts"
import { appendReturnTo } from "./asset-return-navigation.ts"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinReturnDateError } from "./checkin-route-rules.ts"
import type { AssetPhotoPreview } from "./asset-photo-preview.ts"
import type { EmployeeHeldAssetRow } from "./employee-page-data.ts"
import { MAX_BATCH_CHECKIN_ITEMS, type BatchCheckinItemInput } from "./validations/batch-checkin.ts"

/** The facts of one held asset the form reads (the employee page's held row). */
export type BatchCheckinRowFacts = Pick<EmployeeHeldAssetRow, "assetId" | "assetTag" | "name" | "legacy" | "returnBlock" | "outstandingComponent" | "openRepair"> & {
  handover: { id: string; documentNo: string | null } | null
}
/** A row as the page hands it to the form: plain values only (no dates), the photo and the status and room it has now. */
export type BatchCheckinFormRow = BatchCheckinRowFacts & { photo: AssetPhotoPreview | null; statusLabel: string; statusName: string; locationLabel: string }

export function toBatchCheckinFormRow(row: EmployeeHeldAssetRow): BatchCheckinFormRow {
  return {
    assetId: row.assetId,
    assetTag: row.assetTag,
    name: row.name,
    legacy: row.legacy,
    returnBlock: row.returnBlock,
    outstandingComponent: row.outstandingComponent,
    openRepair: row.openRepair,
    handover: row.handover && { id: row.handover.id, documentNo: row.handover.documentNo },
    photo: row.photo,
    statusLabel: row.status.nameTh,
    statusName: row.status.name,
    locationLabel: row.location.name,
  }
}

/** A condition or status option: label is nameTh, name the English name the rules read. */
export type BatchCheckinOption = { id: string; label: string; name: string }
/** One row's own values; nextLocationId "" = the multi-return's room for all (G7P4-R4). */
export type BatchCheckinDraft = {
  conditionAfter: string
  nextStatusId: string
  /** The status was picked by hand: a condition change no longer moves it. */
  statusTouched: boolean
  nextLocationId: string
  damageNote: string
}
export type BatchCheckinTicks = ReadonlySet<string>

const GOOD_CONDITION_NAME = "Good"
const READY_STATUS_NAME = "Ready"
const REPAIR_STATUS_NAME = "Under Maintenance"
const DISPOSAL_STATUS_NAME = "Pending Disposal"

/**
 * G7P4-R2: a row the multi-return does not take, as the reason's full message key; null when it can be ticked. The
 * return form's own block first (under repair, pending disposal, fitted as a component, …), then an outstanding
 * component (the single form's late return) and an open repair (the return joins it there).
 */
export function batchCheckinRowLock(row: BatchCheckinRowFacts): string | null {
  if (row.returnBlock) return row.returnBlock.reasonKey
  if (row.outstandingComponent) return "asset.transactionReasonComponentOutstanding"
  if (row.openRepair) return "asset.transactionReasonActiveMaintenance"
  return null
}

/**
 * A locked row offers "รับคืนทีละรายการ" only when the single return form takes it: an outstanding component (its late
 * return) or an open repair (the return joins it). A return block (licence, fitted component, pending disposal, a
 * status that cannot be returned) is refused by the single form as well, so that row shows its reason only.
 */
export function batchCheckinRowOffersSingle(row: BatchCheckinRowFacts): boolean {
  return !row.returnBlock && (row.outstandingComponent || row.openRepair)
}

/** Every row that is not locked, in row order, up to MAX_BATCH_CHECKIN_ITEMS (G7P4-R3). */
export function initialBatchCheckinTicks(rows: readonly BatchCheckinRowFacts[]): Set<string> {
  const ticks = new Set<string>()
  for (const row of rows) {
    if (ticks.size >= MAX_BATCH_CHECKIN_ITEMS) break
    if (batchCheckinRowLock(row) === null) ticks.add(row.assetId)
  }
  return ticks
}

/** A locked row never ticks; a tick past the cap is refused (`capped`); an untick always works. */
export function toggleBatchCheckinTick(ticks: BatchCheckinTicks, row: BatchCheckinRowFacts, checked: boolean): { ticks: BatchCheckinTicks; capped: boolean } {
  if (!checked) {
    if (!ticks.has(row.assetId)) return { ticks, capped: false }
    const next = new Set(ticks)
    next.delete(row.assetId)
    return { ticks: next, capped: false }
  }
  if (ticks.has(row.assetId) || batchCheckinRowLock(row) !== null) return { ticks, capped: false }
  if (ticks.size >= MAX_BATCH_CHECKIN_ITEMS) return { ticks, capped: true }
  return { ticks: new Set([...ticks, row.assetId]), capped: false }
}

/** นำรายการที่รับคืนไม่ได้ออก: unticks every named id. */
export function removeBatchCheckinTicks(ticks: BatchCheckinTicks, ids: readonly string[]): BatchCheckinTicks {
  if (!ids.some((id) => ticks.has(id))) return ticks
  const drop = new Set(ids)
  return new Set([...ticks].filter((id) => !drop.has(id)))
}

export function batchCheckinCounts(rows: readonly BatchCheckinRowFacts[], ticks: BatchCheckinTicks): { held: number; ticked: number; needsSingle: number } {
  return {
    held: rows.length,
    ticked: rows.filter((row) => ticks.has(row.assetId)).length,
    needsSingle: rows.filter((row) => batchCheckinRowLock(row) !== null).length,
  }
}

/**
 * The employee page's "รับคืนหลายรายการ" (spec §5.2): at least two returnable machines. The page reads one held page
 * (25 rows); a row on another page is counted as possibly returnable, so the button shows and the form says the rest.
 */
export function showBatchCheckinEntry(input: { rows: readonly BatchCheckinRowFacts[]; total: number }): boolean {
  const returnable = input.rows.filter((row) => batchCheckinRowLock(row) === null).length
  return returnable + Math.max(0, input.total - input.rows.length) >= 2
}

/** The condition the return treats as normal: ดี (Good), "ใช้งานได้ตามปกติ"; "" when the list has none. */
export function batchCheckinDefaultCondition(conditions: readonly BatchCheckinOption[]): string {
  return conditions.find((condition) => condition.name === GOOD_CONDITION_NAME)?.id ?? ""
}

/** หลังรับคืนให้เป็น per row: the single form's options minus ส่งซ่อม (G7P4-R2, R4). */
export function batchCheckinStatusOptions(statuses: readonly BatchCheckinOption[]): BatchCheckinOption[] {
  return statuses.filter((status) => status.name !== REPAIR_STATUS_NAME)
}

// ซาก goes to รอตัดจำหน่าย, anything else to พร้อมใช้งาน (a damaged machine that needs a repair goes through the single form).
function statusForCondition(conditionName: string | null, statuses: readonly BatchCheckinOption[]): string {
  const options = batchCheckinStatusOptions(statuses)
  const name = getCheckoutConditionBlock(conditionName) === "salvage" ? DISPOSAL_STATUS_NAME : READY_STATUS_NAME
  return options.find((option) => option.name === name)?.id ?? ""
}

export function initialBatchCheckinDraft(conditions: readonly BatchCheckinOption[], statuses: readonly BatchCheckinOption[]): BatchCheckinDraft {
  const conditionAfter = batchCheckinDefaultCondition(conditions)
  const conditionName = conditions.find((condition) => condition.id === conditionAfter)?.name ?? null
  return { conditionAfter, nextStatusId: statusForCondition(conditionName, statuses), statusTouched: false, nextLocationId: "", damageNote: "" }
}

/** A condition pick: the status follows it until the person picks one by hand. */
export function changeBatchCheckinCondition(
  draft: BatchCheckinDraft,
  conditionId: string,
  conditions: readonly BatchCheckinOption[],
  statuses: readonly BatchCheckinOption[],
): BatchCheckinDraft {
  if (draft.statusTouched) return { ...draft, conditionAfter: conditionId }
  const conditionName = conditions.find((condition) => condition.id === conditionId)?.name ?? null
  return { ...draft, conditionAfter: conditionId, nextStatusId: statusForCondition(conditionName, statuses) || draft.nextStatusId }
}

/** เสียหาย or ใช้งานไม่ได้: the row says a repair goes through the single form. */
export function batchCheckinNeedsRepairHint(conditionName: string | null): boolean {
  const block = getCheckoutConditionBlock(conditionName)
  return block === "damaged" || block === "nonFunctional"
}

// The form's error keys: the selection, three per row, then the fields of the return in visual order.
export const batchCheckinRowKey = {
  condition: (assetId: string) => `condition:${assetId}`,
  status: (assetId: string) => `status:${assetId}`,
  location: (assetId: string) => `location:${assetId}`,
}
const FORM_FIELDS = ["returnBy", "receiveBy", "returnDate", "nextLocationId", "returnSignatureFile", "receiveSignatureFile"] as const

export function batchCheckinFieldOrder(tickedIds: readonly string[]): string[] {
  return [
    "rows",
    ...tickedIds.flatMap((id) => [batchCheckinRowKey.condition(id), batchCheckinRowKey.status(id), batchCheckinRowKey.location(id)]),
    ...FORM_FIELDS,
  ]
}

export type BatchCheckinValidationInput = {
  tickedIds: readonly string[]
  drafts: Readonly<Record<string, BatchCheckinDraft>>
  returnBy: string
  receiveBy: string
  returnDate: string
  todayDay: string
  nextLocationId: string
  returnSigned: boolean
  receiveSigned: boolean
}

function requiredText(value: string, max: number): string | null {
  if (!value.trim()) return "required"
  return value.trim().length > max ? "tooLong" : null
}

/**
 * noValidate turns the browser's check off, so this restates the route's rules: at least one row, each ticked row's
 * condition and status, the two names (≤ 100), the return date (≤ today in Bangkok days; the handover bound is the
 * server's, per row), the room for all and both signatures (Review Focus 4).
 */
export function validateBatchCheckin(input: BatchCheckinValidationInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.tickedIds.length === 0) errors.rows = "batchCheckinNothingSelected"
  for (const id of input.tickedIds) {
    const draft = input.drafts[id]
    if (!draft?.conditionAfter) errors[batchCheckinRowKey.condition(id)] = "required"
    if (!draft?.nextStatusId) errors[batchCheckinRowKey.status(id)] = "required"
  }
  const returnBy = requiredText(input.returnBy, 100)
  if (returnBy) errors.returnBy = returnBy
  const receiveBy = requiredText(input.receiveBy, 100)
  if (receiveBy) errors.receiveBy = receiveBy
  if (!input.returnDate) errors.returnDate = "required"
  else {
    const dateError = checkinReturnDateError({ returnDay: input.returnDate, todayDay: input.todayDay, handoverDay: null })
    if (dateError) errors.returnDate = CHECKIN_RETURN_DATE_ERROR_KEYS[dateError]
  }
  if (!input.nextLocationId) errors.nextLocationId = "required"
  if (!input.returnSigned) errors.returnSignatureFile = "batchCheckinSignatureRequired"
  if (!input.receiveSigned) errors.receiveSignatureFile = "batchCheckinSignatureRequired"
  return errors
}

/** The route's `items`: ticked rows in row order; a ข้อมูลเก่า row sends a null handover (G7P4-R6); a room only when overridden. */
export function buildBatchCheckinItems(
  rows: readonly BatchCheckinRowFacts[],
  ticks: BatchCheckinTicks,
  drafts: Readonly<Record<string, BatchCheckinDraft>>,
): BatchCheckinItemInput[] {
  return rows
    .filter((row) => ticks.has(row.assetId))
    .map((row) => {
      const draft = drafts[row.assetId]
      const item: BatchCheckinItemInput = {
        assetId: row.assetId,
        checkoutId: row.handover?.id ?? null,
        conditionAfter: draft?.conditionAfter ?? "",
        nextStatusId: draft?.nextStatusId ?? "",
      }
      if (draft?.nextLocationId) item.nextLocationId = draft.nextLocationId
      const damageNote = draft?.damageNote.trim()
      if (damageNote) item.damageNote = damageNote
      return item
    })
}

export type BatchCheckinFieldsInput = {
  employeeId: string
  returnDate: string
  returnBy: string
  returnByEmployeeId: string
  receiveBy: string
  receiveByEmployeeId: string
  nextLocationId: string
  items: readonly BatchCheckinItemInput[]
}

/** The multipart's text fields (Task 2's request); the signatures and photos are appended as files by the form. */
export function buildBatchCheckinFields(input: BatchCheckinFieldsInput): Record<string, string> {
  return {
    employeeId: input.employeeId,
    returnDate: input.returnDate,
    returnBy: input.returnBy,
    returnByEmployeeId: input.returnByEmployeeId,
    receiveBy: input.receiveBy,
    receiveByEmployeeId: input.receiveByEmployeeId,
    nextLocationId: input.nextLocationId,
    items: JSON.stringify(input.items),
  }
}

/** One machine's photos travel under `photoAfterFiles[<assetId>]`. */
export function batchCheckinPhotoField(assetId: string): string {
  return `photoAfterFiles[${assetId}]`
}

const itemFieldKeys: Readonly<Record<string, (assetId: string) => string>> = {
  conditionAfter: batchCheckinRowKey.condition,
  nextStatusId: batchCheckinRowKey.status,
  nextLocationId: batchCheckinRowKey.location,
}

/** The route's fieldErrors on the form's keys: `items` and `items.<i>.assetId` on the selection, `items.<i>.<field>` on that row. */
export function mapBatchCheckinServerErrors(fieldErrors: Readonly<Record<string, string>>, tickedIds: readonly string[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, code] of Object.entries(fieldErrors)) {
    if (key === "items") {
      errors.rows = code
      continue
    }
    const itemMatch = /^items\.(\d+)\.(\w+)$/.exec(key)
    if (itemMatch) {
      const assetId = tickedIds[Number(itemMatch[1])]
      const rowKey = itemFieldKeys[itemMatch[2]]
      if (assetId && rowKey) errors[rowKey(assetId)] = code
      else errors.rows ??= code
      continue
    }
    if ((FORM_FIELDS as readonly string[]).includes(key)) errors[key] = code
  }
  return errors
}

// The 409's row codes in the return picker's words (getCheckinVerdict's reason keys), so a refused row and the picker
// agree; a code with no picker words reads its own catalogue entry.
const blockedReasonKeys: Readonly<Record<string, string>> = {
  ASSET_HANDOVER_MODE_MISSING: "asset.transactionReasonHandoverModeMissing",
  ASSET_HANDOVER_STATUS_MISMATCH: "asset.transactionReasonHandoverStatusMismatch",
  ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "asset.transactionReasonComponentCheckin",
  ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "asset.transactionReasonLicenseCheckin",
  ASSET_STATUS_CHECKIN_NOT_ALLOWED: "asset.transactionReasonStatusNotReturnable",
  BATCH_CHECKIN_NEEDS_SINGLE: "apiErrors.batchCheckinNeedsSingle",
  BATCH_CHECKIN_NOT_HELD: "apiErrors.batchCheckinNotHeld",
}

/** A row code's full message key; null for any other code (the caller falls back to apiError.describe). */
export function batchCheckinBlockedReasonKey(code: string): string | null {
  return Object.hasOwn(blockedReasonKeys, code) ? blockedReasonKeys[code] : null
}

/** The 201 answer: the RT- number, the first record (the RT- page) and how many records were written. */
export function readBatchCheckinCreated(payload: unknown): { documentNo: string; firstCheckinId: string; count: number } | null {
  if (!payload || typeof payload !== "object") return null
  const { documentNo, firstCheckinId, checkinIds } = payload as Record<string, unknown>
  if (typeof documentNo !== "string" || typeof firstCheckinId !== "string" || !Array.isArray(checkinIds)) return null
  return { documentNo, firstCheckinId, count: checkinIds.length }
}

/** หลังรับคืน: the ticked rows by next status, in the options' order. */
export function batchCheckinStatusTally(
  rows: readonly BatchCheckinRowFacts[],
  ticks: BatchCheckinTicks,
  drafts: Readonly<Record<string, BatchCheckinDraft>>,
  statuses: readonly BatchCheckinOption[],
): { id: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!ticks.has(row.assetId)) continue
    const id = drafts[row.assetId]?.nextStatusId
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return statuses.filter((status) => counts.has(status.id)).map((status) => ({ id: status.id, label: status.label, count: counts.get(status.id) ?? 0 }))
}

/** The multi-return page of one holder, with its way back. */
export function batchCheckinPageHref(locale: string, employeeId: string, returnTo?: string): string {
  const href = `/${locale}/asset-management/checkin/batch?employeeId=${encodeURIComponent(employeeId)}`
  return returnTo ? appendReturnTo(href, returnTo) : href
}

/** รับคืนทีละรายการ: the single form for the row (its handover, or the asset with no handover), back to this page. */
export function batchCheckinSingleHref(locale: string, row: BatchCheckinRowFacts, returnTo: string): string {
  const href = row.handover
    ? `/${locale}/asset-management/checkin?checkoutId=${encodeURIComponent(row.handover.id)}`
    : `/${locale}/asset-management/checkin?assetId=${encodeURIComponent(row.assetId)}`
  return appendReturnTo(href, returnTo)
}

/** The return page's holder group: "รับคืนทั้งหมดของ {holder}" for an employee group of 2+ machines, else null. */
export function batchCheckinHolderHref(locale: string, group: { key: string; count: number }, returnTo?: string): string | null {
  if (group.count < 2 || !group.key.startsWith("employee:")) return null
  const employeeId = group.key.slice("employee:".length)
  return employeeId ? batchCheckinPageHref(locale, employeeId, returnTo) : null
}
