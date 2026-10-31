// The late return of an outstanding component on รับคืน (group 3 spec §8.6, P2-R4): which row, its outcome, its checks,
// its request, and its สรุปก่อนบันทึก rows. Pure and client-safe. The department row asks the late-return route's rule
// (getLateReturnDepartmentId), so the card never promises what the save does not write.
import { getLateReturnDepartmentId } from "./asset-department-rule.ts"
import type { AssetOperationLateReturn, AssetOperationSearchRow } from "./asset-operation-search-rules.ts"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinReturnDateError } from "./checkin-route-rules.ts"
import { getLateReturnDateError, type ComponentLateReturnOutcome } from "./component-late-return.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { maxLength, required } from "./validation-rules.ts"

export type LateReturnField = "receiveBy" | "returnDate" | "conditionId" | "nextLocationId"
/** The panel's own values; ผู้รับคืน and วันที่คืน are shared with the return's section 2. */
export type LateReturnDraft = { conditionId: string; nextLocationId: string; remark: string }
export const EMPTY_LATE_RETURN_DRAFT: LateReturnDraft = { conditionId: "", nextLocationId: "", remark: "" }
/** The component-return route's body (P2-R3). */
export type LateReturnRequestBody = {
  componentLinkId: string
  checkinId: string
  expectedOutcome: ComponentLateReturnOutcome
  returnDate: string
  receiveBy: string
  receiveByEmployeeId?: string
  conditionId?: string
  nextLocationId?: string
  remark?: string
}

/** The chosen row's late return; a blocked outstanding row keeps its reason under the asset field and gets no panel. */
export function lateReturnOf(row: AssetOperationSearchRow | null): AssetOperationLateReturn | null {
  return row?.eligible && row.lateReturn ? row.lateReturn : null
}

/** The row brings its outcome: Task 4 computed parentInStock from the IT-stock rule (getLateReturnOutcome). */
export function lateReturnOutcome(lateReturn: AssetOperationLateReturn): ComponentLateReturnOutcome {
  return lateReturn.parentInStock ? "reattached" : "standalone"
}

/** Today and the RT-'s return date as Bangkok days; the RT- day is null when it was not read. */
export function lateReturnDays(lateReturn: AssetOperationLateReturn | null, now: Date): { todayDay: string; checkinDay: string | null } {
  return {
    todayDay: getBangkokDateKey(now),
    checkinDay: lateReturn?.checkinDate ? getBangkokDateKey(new Date(lateReturn.checkinDate)) : null,
  }
}

const LATE_DATE_ERROR_KEYS = {
  CHECKIN_RETURN_DATE_IN_FUTURE: CHECKIN_RETURN_DATE_ERROR_KEYS.CHECKIN_RETURN_DATE_IN_FUTURE,
  COMPONENT_RETURN_DATE_BEFORE_CHECKIN: "componentReturnDateBeforeCheckin",
} as const

function lateReturnDateError(returnDate: string, context: { todayDay: string; checkinDay: string | null }): string | null {
  const missing = required(returnDate)
  if (missing) return missing
  if (context.checkinDay !== null) {
    const code = getLateReturnDateError({ returnDay: returnDate, todayDay: context.todayDay, checkinDay: context.checkinDay })
    return code ? LATE_DATE_ERROR_KEYS[code] : null
  }
  // The RT- date was not read: only the future bound applies.
  const code = checkinReturnDateError({ returnDay: returnDate, todayDay: context.todayDay, handoverDay: null })
  return code ? CHECKIN_RETURN_DATE_ERROR_KEYS[code] : null
}

/** ผู้รับคืน, วันที่คืน from the RT-'s day to today, and the room only when it stands alone; the condition is never required. */
export function validateLateReturn(
  values: LateReturnDraft & { receiveBy: string; returnDate: string },
  context: { outcome: ComponentLateReturnOutcome; todayDay: string; checkinDay: string | null },
): Partial<Record<LateReturnField, string>> {
  const errors: Partial<Record<LateReturnField, string>> = {}
  const receiveBy = required(values.receiveBy) ?? maxLength(values.receiveBy, 100)
  if (receiveBy) errors.receiveBy = receiveBy
  const returnDate = lateReturnDateError(values.returnDate, context)
  if (returnDate) errors.returnDate = returnDate
  if (context.outcome === "standalone") {
    const nextLocationId = required(values.nextLocationId)
    if (nextLocationId) errors.nextLocationId = nextLocationId
  }
  return errors
}

/**
 * The request: the link and its RT- as the stale guard, the outcome the panel showed, and only the values given. A
 * re-attach never sends a room, so the server never answers a field error for a field the panel did not show (P2-R3).
 */
export function buildLateReturnBody(
  lateReturn: AssetOperationLateReturn,
  values: LateReturnDraft & { receiveBy: string; receiveByEmployeeId: string; returnDate: string },
): LateReturnRequestBody {
  const outcome = lateReturnOutcome(lateReturn)
  const remark = values.remark.trim()
  return {
    componentLinkId: lateReturn.linkId,
    checkinId: lateReturn.checkinId,
    expectedOutcome: outcome,
    returnDate: values.returnDate,
    receiveBy: values.receiveBy,
    ...(values.receiveByEmployeeId ? { receiveByEmployeeId: values.receiveByEmployeeId } : {}),
    ...(values.conditionId ? { conditionId: values.conditionId } : {}),
    ...(outcome === "standalone" && values.nextLocationId ? { nextLocationId: values.nextLocationId } : {}),
    ...(remark ? { remark } : {}),
  }
}

export type LateReturnSummaryWords = {
  parent: string
  holder: string
  location: string
  department: string
  condition: string
  none: string
  notChosen: string
  kept: (value: string) => string
  outstandingOf: (parentTag: string) => string
  departmentUnavailable: string
}
export type LateReturnSummaryRow = { key: "parent" | "holder" | "location" | "department" | "condition"; label: string; now: string; next: string; changed: boolean }

/**
 * สรุปก่อนบันทึก of a late return (spec §8.6, P2-R7, P2-R8): ส่วนควบของ, ผู้ถือครอง, ที่ตั้ง, แผนก and สภาพตอนคืน. None without
 * the detail, and none for a re-attach whose parent was not read (spec §4 anti-goal).
 */
export function buildLateReturnSummaryRows(
  input: {
    row: AssetOperationSearchRow
    lateReturn: AssetOperationLateReturn
    draft: LateReturnDraft
    conditions: readonly { id: string; label: string }[]
    locations: readonly { id: string; label: string }[]
    currentConditionLabel: string | null
    returnDepartment: { id: string; name: string } | null
  },
  words: LateReturnSummaryWords,
): LateReturnSummaryRow[] {
  const { row, lateReturn, draft, returnDepartment } = input
  const detail = row.detail
  const outcome = lateReturnOutcome(lateReturn)
  const parent = detail?.lateReturnParent
  if (!detail || (outcome === "reattached" && !parent)) return []
  const rows: LateReturnSummaryRow[] = []

  rows.push({
    key: "parent",
    label: words.parent,
    now: words.outstandingOf(lateReturn.parent.assetTag),
    next: outcome === "reattached" ? lateReturn.parent.assetTag : words.none,
    changed: true,
  })

  rows.push({ key: "holder", label: words.holder, now: detail.holderName ?? words.none, next: words.none, changed: Boolean(detail.holderLabel) })

  if (outcome === "reattached" && parent) {
    rows.push({ key: "location", label: words.location, now: row.locationLabel, next: parent.locationLabel, changed: parent.locationId !== row.currentLocationId })
  } else {
    const chosen = input.locations.find((location) => location.id === draft.nextLocationId) ?? null
    rows.push({
      key: "location",
      label: words.location,
      now: row.locationLabel,
      next: chosen?.label ?? words.notChosen,
      changed: chosen !== null && chosen.id !== row.currentLocationId,
    })
  }

  const departmentNow = detail.departmentName ?? words.none
  if (!returnDepartment) {
    rows.push({ key: "department", label: words.department, now: departmentNow, next: words.departmentUnavailable, changed: false })
  } else {
    const nextId = getLateReturnDepartmentId({
      outcome,
      ownership: detail.ownership,
      parentDepartmentId: parent?.departmentId ?? null,
      returnDepartmentId: returnDepartment.id,
      currentDepartmentId: detail.departmentId,
    })
    const next = nextId === detail.departmentId
      ? departmentNow
      : nextId === returnDepartment.id
        ? returnDepartment.name
        : parent && nextId === parent.departmentId
          ? parent.departmentName ?? words.none
          : words.none
    rows.push({ key: "department", label: words.department, now: departmentNow, next, changed: nextId !== detail.departmentId })
  }

  const conditionNow = input.currentConditionLabel ?? words.none
  const condition = draft.conditionId ? input.conditions.find((option) => option.id === draft.conditionId) ?? null : null
  rows.push({
    key: "condition",
    label: words.condition,
    now: conditionNow,
    next: condition ? condition.label : words.kept(conditionNow),
    changed: condition !== null && condition.id !== row.conditionId,
  })
  return rows
}

/** The still-missing list (spec §5): the asset, ผู้รับคืน, and เก็บไว้ที่ only when it stands alone. */
export function buildLateReturnChecklist(
  input: { eligible: boolean; receiveBy: string; outcome: ComponentLateReturnOutcome; nextLocationId: string },
  words: { asset: string; receiver: string; location: string },
): Array<{ key: "asset" | "receiver" | "location"; label: string; done: boolean }> {
  return [
    { key: "asset", label: words.asset, done: input.eligible },
    { key: "receiver", label: words.receiver, done: input.receiveBy.trim() !== "" },
    ...(input.outcome === "standalone" ? [{ key: "location" as const, label: words.location, done: input.nextLocationId !== "" }] : []),
  ]
}
