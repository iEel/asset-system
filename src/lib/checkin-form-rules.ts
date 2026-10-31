// รับคืน's form rules (group 3 spec §8.1-§8.4, plan 2 Task 8): the สรุปก่อนบันทึก rows and checklist, the components
// that come back, หลังรับคืนให้เป็น and its auto-pick, the days held and the warning lines. Pure and client-safe; the
// department row reads the same rule the checkin route calls (asset-department-rule.ts), and the days are the Bangkok
// days the route's date bound counts (getBangkokDateKey). The handover day and the legacy mark are Task 2's
// (checkin-route-rules.ts); this module does not define them.
import { getCheckinNextDepartmentId } from "./asset-department-rule.ts"
import { getCheckoutConditionBlock } from "./asset-lifecycle-policy.ts"
import { checkoutComponents } from "./checkout-form-rules.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import type { AssetOperationNamedOption } from "./asset-operation-options.ts"
import type { AssetOperationChosenComponent, AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

/** A status of หลังรับคืนให้เป็น: label is nameTh, name the English name the rules read. */
export type CheckinStatusOption = AssetOperationNamedOption
export type CheckinReturnDepartment = { id: string; code: string; name: string }
export type CheckinFormChoice = {
  row: AssetOperationSearchRow | null
  returnDepartment: CheckinReturnDepartment | null
  status: CheckinStatusOption | null
  location: AssetOperationNamedOption | null
  condition: AssetOperationNamedOption | null
  /** Every condition's nameTh by id, inactive ones too (readConditionLabels). */
  conditionLabels: Readonly<Record<string, string>>
  /** The travelling components not ticked as returned. */
  unticked: ReadonlySet<string>
}
export type CheckinSummaryWords = {
  holder: string
  department: string
  status: string
  location: string
  condition: string
  components: string
  none: string
  notChosen: string
  count: (count: number) => string
  componentsBack: (returned: number, missing: number) => string
}
export type CheckinSummaryRow = { key: "holder" | "department" | "status" | "location" | "condition" | "components"; label: string; now: string; next: string; changed: boolean }
export type CheckinCheckWords = {
  asset: string
  returnBy: string
  receiveBy: string
  condition: string
  nextStatus: string
  location: string
  returnSignature: string
  receiveSignature: string
  signatureMissing: string
}
export type CheckinCheck = {
  key: "asset" | "returnBy" | "receiveBy" | "condition" | "nextStatus" | "location" | "returnSignature" | "receiveSignature"
  label: string
  done: boolean
  note?: string
}
export type CheckinWarningWords = {
  departmentUnavailable: string
  missing: (input: { component: string; returner: string; room: string }) => string
  repairOpens: string
  repairJoins: (repairNo: string) => string
  brokenReady: string
  salvageReady: string
}

const REPAIR_STATUS_NAME = "Under Maintenance"
const DISPOSAL_STATUS_NAME = "Pending Disposal"
const READY_STATUS_NAME = "Ready"
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/** Today in Bangkok, "YYYY-MM-DD": the return date's max, as the route's bound counts it. */
export function checkinTodayDay(now: Date = new Date()): string {
  return getBangkokDateKey(now)
}

/** An ISO time's Bangkok day; "" when there is none or it is not a date (getBangkokDateKey throws on one). */
export function checkinBangkokDay(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return getBangkokDateKey(date)
}

function dayTime(day: string): number | null {
  if (!DAY_PATTERN.test(day)) return null
  const time = Date.parse(`${day}T00:00:00.000Z`)
  return Number.isNaN(time) ? null : time
}

/** ถือมา N วัน: whole days from the handover day to the return day; null without a handover day or before it. */
export function checkinHeldDays(input: { handoverDay: string | null; returnDay: string }): number | null {
  if (input.handoverDay === null) return null
  const from = dayTime(input.handoverDay)
  const to = dayTime(input.returnDay)
  if (from === null || to === null || to < from) return null
  return Math.round((to - from) / DAY_MS)
}

/**
 * The components that travel with the parent (plan 1's checkoutComponents), and those of them not ticked. A component
 * with its own open handover is not listed: it is not the returner's to bring back.
 */
export function checkinComponents(
  row: AssetOperationSearchRow | null,
  unticked: ReadonlySet<string>,
): { travelling: AssetOperationChosenComponent[]; missing: AssetOperationChosenComponent[] } {
  const { travelling } = checkoutComponents(row)
  return { travelling, missing: travelling.filter((component) => unticked.has(component.id)) }
}

/**
 * หลังรับคืนให้เป็น (spec §5, §8.3, P2-R14): a row with an open repair returns into ส่งซ่อม alone, whoever returns it;
 * otherwise ส่งซ่อม is offered only to someone who may open a repair record.
 */
export function checkinNextStatusOptions(input: {
  statuses: readonly CheckinStatusOption[]
  repairLocked: boolean
  canCreateRepair: boolean
}): CheckinStatusOption[] {
  if (input.repairLocked) return input.statuses.filter((status) => status.name === REPAIR_STATUS_NAME)
  if (!input.canCreateRepair) return input.statuses.filter((status) => status.name !== REPAIR_STATUS_NAME)
  return [...input.statuses]
}

/**
 * The auto-pick (spec §8.3, P2-R16): a choice made stays; else ซาก picks รอตัดจำหน่าย, and เสียหาย, ใช้งานไม่ได้ or
 * damage text picks ส่งซ่อม. Only among the options offered, so ส่งซ่อม is never picked for someone who cannot open a
 * repair record; "" when nothing is picked.
 */
export function checkinAutoNextStatus(input: {
  nextStatusId: string
  conditionName: string | null
  damageNote: string
  options: readonly CheckinStatusOption[]
}): string {
  if (input.nextStatusId) return input.nextStatusId
  const block = getCheckoutConditionBlock(input.conditionName)
  const name = block === "salvage"
    ? DISPOSAL_STATUS_NAME
    : block === "damaged" || block === "nonFunctional" || input.damageNote.trim()
      ? REPAIR_STATUS_NAME
      : null
  if (!name) return ""
  return input.options.find((option) => option.name === name)?.id ?? ""
}

/**
 * สรุปก่อนบันทึก (spec §8.4): ตอนนี้ and หลังบันทึก per field the return writes; none without the asset's detail. The
 * holder always goes; the department follows the shared rule; the status, room and condition promise nothing before
 * they are chosen; the components row shows only when some travel.
 */
export function buildCheckinSummaryRows(choice: CheckinFormChoice, words: CheckinSummaryWords): CheckinSummaryRow[] {
  const { row } = choice
  const detail = row?.detail
  if (!row || !detail) return []
  const rows: CheckinSummaryRow[] = []

  rows.push({ key: "holder", label: words.holder, now: detail.holderName ?? words.none, next: words.none, changed: detail.holderName !== null })

  const departmentNow = detail.departmentName ?? words.none
  if (choice.returnDepartment) {
    const nextId = getCheckinNextDepartmentId({
      ownership: detail.ownership,
      returnDepartmentId: choice.returnDepartment.id,
      currentDepartmentId: detail.departmentId,
    })
    const next = nextId === detail.departmentId ? departmentNow : nextId === choice.returnDepartment.id ? choice.returnDepartment.name : departmentNow
    rows.push({ key: "department", label: words.department, now: departmentNow, next, changed: nextId !== detail.departmentId })
  } else {
    // No return department: the save is refused, and a warning line says so.
    rows.push({ key: "department", label: words.department, now: departmentNow, next: departmentNow, changed: false })
  }

  rows.push({
    key: "status",
    label: words.status,
    now: row.statusLabel,
    next: choice.status?.label ?? words.notChosen,
    changed: choice.status !== null && choice.status.label !== row.statusLabel,
  })
  rows.push({
    key: "location",
    label: words.location,
    now: row.locationLabel,
    next: choice.location?.label ?? words.notChosen,
    changed: choice.location !== null && choice.location.id !== row.currentLocationId,
  })
  rows.push({
    key: "condition",
    label: words.condition,
    // A name, never the raw id.
    now: choice.conditionLabels[row.conditionId] ?? words.none,
    next: choice.condition?.label ?? words.notChosen,
    changed: choice.condition !== null && choice.condition.id !== row.conditionId,
  })

  const { travelling, missing } = checkinComponents(row, choice.unticked)
  if (travelling.length > 0) {
    rows.push({
      key: "components",
      label: words.components,
      now: words.count(travelling.length),
      next: words.componentsBack(travelling.length - missing.length, missing.length),
      changed: true,
    })
  }
  return rows
}

/** ยังขาด (spec §8.4): the asset, both people, the condition, หลังรับคืนให้เป็น and the room; both signatures optional. */
export function buildCheckinChecklist(
  input: {
    row: AssetOperationSearchRow | null
    returnBy: string
    receiveBy: string
    conditionAfter: string
    nextStatusId: string
    nextLocationId: string
    returnSigned: boolean
    receiveSigned: boolean
  },
  words: CheckinCheckWords,
): CheckinCheck[] {
  const signature = (key: "returnSignature" | "receiveSignature", label: string, signed: boolean): CheckinCheck =>
    signed ? { key, label, done: true } : { key, label, done: false, note: words.signatureMissing }
  return [
    { key: "asset", label: words.asset, done: input.row?.eligible === true && input.row.checkout !== undefined },
    { key: "returnBy", label: words.returnBy, done: input.returnBy !== "" },
    { key: "receiveBy", label: words.receiveBy, done: input.receiveBy !== "" },
    { key: "condition", label: words.condition, done: input.conditionAfter !== "" },
    { key: "nextStatus", label: words.nextStatus, done: input.nextStatusId !== "" },
    { key: "location", label: words.location, done: input.nextLocationId !== "" },
    signature("returnSignature", words.returnSignature, input.returnSigned),
    signature("receiveSignature", words.receiveSignature, input.receiveSigned),
  ]
}

/**
 * The card's warning lines (spec §8.4, §12, P2-R16): no return department, each component not back and where it stays,
 * ส่งซ่อม opening or joining a record, and a broken or salvage asset made พร้อมใช้งาน. Nothing is refused here.
 */
export function checkinWarningLines(
  input: {
    row: AssetOperationSearchRow | null
    returnDepartment: CheckinReturnDepartment | null
    unticked: ReadonlySet<string>
    returnerLabel: string
    status: CheckinStatusOption | null
    conditionName: string | null
    repairLocked: boolean
  },
  words: CheckinWarningWords,
): string[] {
  const lines: string[] = []
  if (!input.returnDepartment) lines.push(words.departmentUnavailable)
  for (const component of checkinComponents(input.row, input.unticked).missing) {
    lines.push(words.missing({ component: `${component.assetTag} ${component.name}`, returner: input.returnerLabel, room: component.locationLabel }))
  }
  if (input.status?.name === REPAIR_STATUS_NAME) {
    if (input.repairLocked) {
      // Without the record's number the open-repair notice says it.
      if (input.row?.openRepairNo) lines.push(words.repairJoins(input.row.openRepairNo))
    } else {
      lines.push(words.repairOpens)
    }
  }
  if (input.status?.name === READY_STATUS_NAME) {
    const block = getCheckoutConditionBlock(input.conditionName)
    if (block === "damaged" || block === "nonFunctional") lines.push(words.brokenReady)
    if (block === "salvage") lines.push(words.salvageReady)
  }
  return lines
}
