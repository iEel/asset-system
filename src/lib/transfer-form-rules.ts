// โอนย้าย's form rules (group 3 spec §9.2-§9.4, plan 3 Task 5). One normalized change set (getTransferFormChange) drives
// the ตอนนี้ cells, the แผนก lock, the สรุปก่อนบันทึก card, the footer, the review and the form's payload. Pure and
// client-safe: the words come in. The department reads the rule the transfer route calls (asset-department-rule.ts) and
// the destinations the route's normalizer (transfer-rules.ts), so the card never promises what the save does not write.
import { getTransferDepartmentSource, getTransferNextDepartmentId, type TransferDepartmentSource } from "./asset-department-rule.ts"
import { getTransferTargetStatusName, normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "./asset-operation-options.ts"
import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"
import { checkoutComponents, checkoutOutstandingComponents, checkoutOutstandingLines, type CheckoutDetailState, type CheckoutOutstandingWords } from "./checkout-form-rules.ts"
import { hasTransferChange, normalizeTransferDestinations, type TransferDestinations } from "./transfer-rules.ts"
import { maxLength, required } from "./validation-rules.ts"

/** The form's picks: "" = ไม่เปลี่ยนแปลง. */
export type TransferFormDestinations = { toLocationId: string; toCustodianId: string; toDepartmentId: string }
export type TransferFormChoice = {
  row: AssetOperationSearchRow | null
  detail: CheckoutDetailState
  destinations: TransferFormDestinations
  employees: AssetOperationEmployeeDepartmentOption[]
  /** The page's options.departments (named: the card reads a free pick by name). */
  departments: AssetOperationNamedOption[]
  locations: AssetOperationLocationBranchOption[]
}
export type TransferFormChange = {
  /** The row carries its detail and the read has not failed. */
  ready: boolean
  /** Normalized, a locked department dropped: what the payload sends. */
  destinations: TransferDestinations
  /** null when not ready. */
  departmentSource: TransferDepartmentSource | null
  /** true also when not ready (no asset, detail not read yet, read failed). */
  departmentLocked: boolean
  /** null when not ready. */
  nextDepartmentId: string | null
  /** department counts the implicit correction. */
  changed: { location: boolean; holder: boolean; department: boolean }
  changedCount: number
  crossBranch: boolean
}
export type TransferSummaryRow = { key: "location" | "holder" | "department" | "status" | "components"; label: string; now: string; next: string; changed: boolean }
export type TransferCheck = { key: "asset" | "change" | "reason"; label: string; done: boolean }
export type TransferReviewDetail = { key: "location" | "holder" | "department" | "components" | "status"; label: string; value: string }
export type TransferWords = {
  location: string
  holder: string
  department: string
  status: string
  components: string
  none: string
  kept: (value: string) => string
  formerHolder: (name: string) => string
  followsHolder: (department: string) => string
  /** The locked แผนก row's text while no asset is chosen (Y5). */
  departmentChooseAssetFirst: string
  inUse: string
  statusUnchanged: string
  count: (count: number) => string
  summaryComponentsMove: (count: number) => string
  summaryComponentsOutstanding: (count: number) => string
  summaryLead: (count: number, list: string) => string
  summaryHolderDepartmentKept: string
  summaryCrossBranch: (branch: string) => string
  footerDescription: (tag: string, changes: string) => string
  footerIncomplete: string
  checkAsset: string
  checkChange: string
  checkReason: string
  toLocation: string
  toCustodian: string
  toDepartment: string
  nextStatus: string
  componentsMove: (count: number, list: string) => string
  componentsStaying: (list: string) => string
  componentsOutstanding: (count: number, list: string) => string
  outstandingLine: CheckoutOutstandingWords
}

/** A ตอนนี้ cell until the chosen asset's detail is ready (Y1): not a message. */
export const TRANSFER_NOW_PENDING = "…"
export const TRANSFER_REASON_CHIPS = ["branch", "user", "restructure", "other"] as const
export type TransferReasonChip = (typeof TRANSFER_REASON_CHIPS)[number]
export type TransferChipWords = Record<Exclude<TransferReasonChip, "other">, string>

const REASON_MAX_LENGTH = 500

export function getTransferFormChange(choice: TransferFormChoice): TransferFormChange {
  const { row } = choice
  const picks = choice.destinations
  if (row === null || row.detail === undefined || choice.detail === "failed") {
    return {
      ready: false,
      destinations: { toLocationId: picks.toLocationId || null, toCustodianId: picks.toCustodianId || null, toDepartmentId: null },
      departmentSource: null,
      departmentLocked: true,
      nextDepartmentId: null,
      changed: { location: false, holder: false, department: false },
      changedCount: 0,
      crossBranch: false,
    }
  }
  const detail = row.detail
  const normalized = normalizeTransferDestinations(picks, {
    currentLocationId: row.currentLocationId,
    custodianId: detail.holderId,
    departmentId: detail.departmentId,
  })
  const departmentSource = getTransferDepartmentSource({
    ownership: detail.ownership,
    currentCustodianId: detail.holderId,
    newCustodianId: normalized.toCustodianId,
  })
  const departmentLocked = departmentSource !== "free"
  const destinations: TransferDestinations = departmentLocked ? { ...normalized, toDepartmentId: null } : normalized
  const newHolder = choice.employees.find((employee) => employee.id === destinations.toCustodianId)
  const nextDepartmentId = getTransferNextDepartmentId({
    ownership: detail.ownership,
    currentCustodianId: detail.holderId,
    newCustodianId: destinations.toCustodianId,
    currentDepartmentId: detail.departmentId,
    currentHolderDepartmentId: detail.holderDepartmentId,
    newHolderDepartmentId: newHolder?.departmentId ?? null,
    chosenDepartmentId: destinations.toDepartmentId,
  })
  const changed = {
    location: destinations.toLocationId !== null,
    holder: destinations.toCustodianId !== null,
    department: nextDepartmentId !== detail.departmentId,
  }
  const room = choice.locations.find((location) => location.id === destinations.toLocationId)
  return {
    ready: true,
    destinations,
    departmentSource,
    departmentLocked,
    nextDepartmentId,
    changed,
    changedCount: [changed.location, changed.holder, changed.department].filter(Boolean).length,
    crossBranch: room !== undefined && room.branchId !== detail.ownerBranchId,
  }
}

// The ready change with what the builders read beside it; null when there is no detail to judge.
function readyChange(choice: TransferFormChoice) {
  const change = getTransferFormChange(choice)
  const row = choice.row
  if (!change.ready || row === null || row.detail === undefined) return null
  const detail = row.detail
  const newHolder = choice.employees.find((employee) => employee.id === change.destinations.toCustodianId)
  const room = choice.locations.find((location) => location.id === change.destinations.toLocationId)
  return { change, row, detail, newHolder, room }
}
type ReadyChange = NonNullable<ReturnType<typeof readyChange>>

// The current room's name; an inactive room is not in the list, so it reads the row's "code - name".
function currentRoomName(choice: TransferFormChoice, ready: ReadyChange): string {
  return choice.locations.find((location) => location.id === ready.row.currentLocationId)?.name ?? ready.row.locationLabel
}

// A department's name by id: the current one, the new holder's (an inactive one included), the current holder's, a picked one.
function departmentName(choice: TransferFormChoice, ready: ReadyChange, id: string | null, words: TransferWords): string {
  if (id === null) return words.none
  const { detail, newHolder } = ready
  if (id === detail.departmentId && detail.departmentName) return detail.departmentName
  if (newHolder && id === newHolder.departmentId) return newHolder.departmentName
  if (id === detail.holderDepartmentId && detail.holderDepartmentName) return detail.holderDepartmentName
  return choice.departments.find((department) => department.id === id)?.name ?? words.none
}

function nextStatus(ready: ReadyChange, words: TransferWords): { value: string; changed: boolean } {
  const changed = getTransferTargetStatusName(ready.change.destinations.toCustodianId) === "In Use"
    && normalizeAssetStateName(ready.detail.statusName) !== "in use"
  return { value: changed ? words.inUse : words.statusUnchanged, changed }
}

// The lead's, the footer's and the checklist's condition: at least one chosen destination differs (P3-R4).
function hasRealChange(ready: ReadyChange | null): ready is ReadyChange {
  return ready !== null && hasTransferChange(ready.change.destinations)
}

export function transferNowCells(choice: TransferFormChoice, words: TransferWords): { location: string; holder: string; department: string } {
  const ready = readyChange(choice)
  if (!ready) return { location: TRANSFER_NOW_PENDING, holder: TRANSFER_NOW_PENDING, department: TRANSFER_NOW_PENDING }
  const { row, detail } = ready
  const holder = detail.holderLabel ? (detail.holderActive === false ? words.formerHolder(detail.holderLabel) : detail.holderLabel) : words.none
  return { location: `${row.locationLabel} · ${detail.locationBranchLabel}`, holder, department: detail.departmentLabel ?? words.none }
}

export function transferDepartmentLockText(choice: TransferFormChoice, words: TransferWords): string | null {
  if (choice.row === null) return words.departmentChooseAssetFirst
  const ready = readyChange(choice)
  if (!ready || !ready.change.departmentLocked) return null
  return words.followsHolder(departmentName(choice, ready, ready.change.nextDepartmentId, words))
}

export function buildTransferSummaryRows(choice: TransferFormChoice, words: TransferWords): TransferSummaryRow[] {
  const ready = readyChange(choice)
  if (!ready) return []
  const { change, row, detail, newHolder, room } = ready
  const roomNow = currentRoomName(choice, ready)
  const holderNow = detail.holderName ? (detail.holderActive === false ? words.formerHolder(detail.holderName) : detail.holderName) : words.none
  const holderKept = detail.holderName ? words.kept(detail.holderName) : words.none
  const departmentKept = detail.departmentName ? words.kept(detail.departmentName) : words.none
  const status = nextStatus(ready, words)
  const rows: TransferSummaryRow[] = [
    { key: "location", label: words.location, now: roomNow, next: change.changed.location ? room?.name ?? words.none : words.kept(roomNow), changed: change.changed.location },
    { key: "holder", label: words.holder, now: holderNow, next: change.changed.holder ? newHolder?.name ?? words.none : holderKept, changed: change.changed.holder },
    {
      key: "department",
      label: words.department,
      now: detail.departmentName ?? words.none,
      next: change.changed.department ? departmentName(choice, ready, change.nextDepartmentId, words) : departmentKept,
      changed: change.changed.department,
    },
    { key: "status", label: words.status, now: row.statusLabel, next: status.value, changed: status.changed },
  ]
  const { travelling } = checkoutComponents(row)
  const outstanding = checkoutOutstandingComponents(row)
  if (travelling.length > 0 || outstanding.length > 0) {
    const move = words.summaryComponentsMove(travelling.length)
    rows.push({
      key: "components",
      label: words.components,
      now: words.count(detail.components.length + outstanding.length),
      next: outstanding.length > 0 ? `${move} · ${words.summaryComponentsOutstanding(outstanding.length)}` : move,
      changed: travelling.length > 0,
    })
  }
  return rows
}

export function buildTransferLead(choice: TransferFormChoice, words: TransferWords): string | null {
  const ready = readyChange(choice)
  if (!hasRealChange(ready)) return null
  const { changed, changedCount } = ready.change
  const list = [changed.location && words.location, changed.holder && words.holder, changed.department && words.department]
    .filter((name): name is string => Boolean(name))
    .join(", ")
  const lead = words.summaryLead(changedCount, list)
  return changed.holder || changed.department ? lead : `${lead} · ${words.summaryHolderDepartmentKept}`
}

export function buildTransferFooterLine(choice: TransferFormChoice, words: TransferWords): string {
  const ready = readyChange(choice)
  if (!hasRealChange(ready)) return words.footerIncomplete
  const { change, row, newHolder, room } = ready
  const changes: string[] = []
  if (change.changed.location) changes.push(`${words.location} → ${room?.name ?? words.none}`)
  if (change.changed.holder) changes.push(`${words.holder} → ${newHolder?.name ?? words.none}`)
  if (change.changed.department) changes.push(`${words.department} → ${departmentName(choice, ready, change.nextDepartmentId, words)}`)
  return words.footerDescription(row.assetTag, changes.join(" · "))
}

export function buildTransferChecklist(choice: TransferFormChoice, reason: string, words: TransferWords): TransferCheck[] {
  return [
    { key: "asset", label: words.checkAsset, done: choice.row?.eligible === true },
    { key: "change", label: words.checkChange, done: hasRealChange(readyChange(choice)) },
    { key: "reason", label: words.checkReason, done: (required(reason) ?? maxLength(reason, REASON_MAX_LENGTH)) === null },
  ]
}

/** The cross-branch line only; the detail-failed notice stays a node in the form. */
export function transferWarningLines(choice: TransferFormChoice, words: TransferWords): string[] {
  const ready = readyChange(choice)
  return ready && ready.change.crossBranch ? [words.summaryCrossBranch(ready.detail.ownerBranchLabel)] : []
}

export function buildTransferReviewDetails(choice: TransferFormChoice, words: TransferWords): TransferReviewDetail[] {
  const ready = readyChange(choice)
  if (!ready) return []
  const { change, row, newHolder, room } = ready
  const details: TransferReviewDetail[] = []
  if (change.changed.location) details.push({ key: "location", label: words.toLocation, value: room?.label ?? words.none })
  if (change.changed.holder) details.push({ key: "holder", label: words.toCustodian, value: newHolder?.label ?? words.none })
  if (change.changed.department) {
    details.push({ key: "department", label: words.toDepartment, value: departmentName(choice, ready, change.nextDepartmentId, words) })
  }
  const { travelling } = checkoutComponents(row)
  if (travelling.length > 0) details.push({ key: "components", label: words.components, value: words.summaryComponentsMove(travelling.length) })
  details.push({ key: "status", label: words.nextStatus, value: nextStatus(ready, words).value })
  return details
}

export function transferComponentLines(choice: TransferFormChoice, words: TransferWords): { travelling: string | null; staying: string | null; outstanding: string | null } {
  const ready = readyChange(choice)
  if (!ready) return { travelling: null, staying: null, outstanding: null }
  const { travelling, staying } = checkoutComponents(ready.row)
  const outstanding = checkoutOutstandingLines(ready.row, words.outstandingLine)
  return {
    travelling: travelling.length > 0 ? words.componentsMove(travelling.length, travelling.map((component) => component.name).join(", ")) : null,
    staying: staying.length > 0 ? words.componentsStaying(staying.map((component) => component.assetTag).join(", ")) : null,
    outstanding: outstanding.length > 0 ? words.componentsOutstanding(outstanding.length, outstanding.join(", ")) : null,
  }
}

// The chip whose "<word>:" starts the text (the space after the colon may be missing), in TRANSFER_REASON_CHIPS order.
function leadingChip(text: string, words: TransferChipWords): Exclude<TransferReasonChip, "other"> | null {
  for (const chip of TRANSFER_REASON_CHIPS) {
    if (chip !== "other" && text.startsWith(`${words[chip]}:`)) return chip
  }
  return null
}

/** Writes "<full chip word>: " at the start, replacing a leading chip prefix and keeping the rest; never cut (validate() refuses past 500). */
export function applyTransferReasonChip(text: string, chip: Exclude<TransferReasonChip, "other">, words: TransferChipWords): string {
  const current = leadingChip(text, words)
  const rest = current ? text.slice(`${words[current]}:`.length).trimStart() : text
  return `${words[chip]}: ${rest}`
}

export function pressedTransferReasonChip(text: string, words: TransferChipWords): TransferReasonChip | null {
  return leadingChip(text, words)
}
