import { filterAuditItemsByContext, type AuditScanContext } from "./audit-scan-context.ts"
import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"
import { isSuccessfulAuditResult } from "./audit-result-summary.ts"
import { isAuditRoundOwnItem } from "./audit-round-counts-rules.ts"
import { foldAuditRoundResultCounts } from "./audit-round-result-filters.ts"

export const auditScanListPageSize = 50
/** The search shows this many matches at a time, and "แสดงเพิ่ม" adds as many again (bug 20, P3-R5). The rule returns them all. */
export const auditScanSearchPageSize = 10
export const auditScanMinSearchLength = 2
export const auditScanPollIntervalMs = 30_000

export type AuditScanOption = { id: string; label: string }
export type AuditScanEmployeeOption = AuditScanOption & { departmentId: string | null }
export type AuditScanOptions = {
  locations: AuditScanOption[]
  departments: AuditScanOption[]
  employees: AuditScanEmployeeOption[]
  conditions: AuditScanOption[]
}

/** One audit item as the scan screen needs it; ISO strings so it crosses the server/client boundary. */
export type AuditScanItemRow = {
  itemId: string
  assetId: string
  assetTag: string
  name: string
  serialNumber: string | null
  fixedAssetCode: string | null
  categoryId: string
  ownershipType: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  auditStatus: string
  auditResult: string | null
  lastScanAt: string | null
  scannedByName: string | null
  currentLocationId: string
  currentCustodianId: string | null
  currentDepartmentId: string | null
  componentCount: number
}

export type AuditScanRoom = AuditScanContext
export type AuditScanListTab = "pending" | "checked" | "all"
export type AuditItemBadge = "found" | "mismatch" | "not_found" | "out_of_scope"

// The round's own items (group 2 spec §5, P3-R1). An out-of-scope find is an AuditItem of the round (scan route), but
// no phone count, room, tab, chip, search or match reads it. Each rule filters here, so a caller cannot forget;
// applyScanResult and mergeStatusUpdates keep every item, so a saved find stays in state for the next poll.
function ownItems<T extends { auditResult: string | null }>(items: readonly T[]): T[] {
  return items.filter(isAuditRoundOwnItem)
}

function isInAuditScanTab(item: Pick<AuditScanItemRow, "auditStatus">, tab: AuditScanListTab) {
  return tab === "all" || (tab === "checked") === isAuditItemChecked(item)
}

export function isAuditItemChecked(item: Pick<AuditScanItemRow, "auditStatus">) {
  return item.auditStatus !== "pending"
}

export function getAuditItemBadge(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): AuditItemBadge | null {
  if (!isAuditItemChecked(item)) return null
  if (item.auditResult === "not_found") return "not_found"
  if (item.auditResult === "out_of_scope") return "out_of_scope"
  // P2-R2: a checked item with no result reads ไม่ตรง, as the header and the round page count it.
  return isSuccessfulAuditResult(item.auditResult) ? "found" : "mismatch"
}

export type AuditScanProgress = { total: number; checked: number; mismatched: number }

/** The header (spec §11, P3-R2): the round page's fold over the same rows, so "ไม่ตรง N" is the round page's ไม่ตรง. */
export function summarizeProgress(items: readonly AuditScanItemRow[]): AuditScanProgress {
  const counts = foldAuditRoundResultCounts(items.map((item) => ({ auditStatus: item.auditStatus, auditResult: item.auditResult, count: 1 })))
  return { total: counts.all, checked: counts.all - counts.pending, mismatched: counts.mismatch }
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "th")
}

export function buildRoomList({
  items,
  room,
  tab,
  limit,
  locationLabels,
  categoryId = null,
}: {
  items: readonly AuditScanItemRow[]
  room: AuditScanRoom
  tab: AuditScanListTab
  limit: number
  locationLabels: ReadonlyMap<string, string>
  categoryId?: string | null
}) {
  const inRoom = filterAuditItemsByContext(ownItems(items), room)
  const pending = inRoom.filter((item) => !isAuditItemChecked(item))
  const checked = inRoom.filter(isAuditItemChecked)
  const byPlace = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (room.locationId
      ? 0
      : compareText(locationLabels.get(left.expectedLocationId) ?? left.expectedLocationId, locationLabels.get(right.expectedLocationId) ?? right.expectedLocationId))
    || compareText(left.assetTag, right.assetTag)
  const byRecent = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (right.lastScanAt ?? "").localeCompare(left.lastScanAt ?? "") || compareText(left.assetTag, right.assetTag)
  const inTab = inRoom.filter((item) => isInAuditScanTab(item, tab) && (!categoryId || item.categoryId === categoryId))
  const source = inTab.sort(tab === "checked" ? byRecent : byPlace)

  return {
    rows: source.slice(0, limit),
    total: source.length,
    // Within the room, not the category: each tab's count is its chip row's ทุกหมวดหมู่ (P3-R6, P3-R16).
    counts: { pending: pending.length, checked: checked.length, all: inRoom.length },
  }
}

export type AuditRoomDepartmentOption = { departmentId: string; label: string; pending: number; total: number }

export type AuditRoomOption = {
  locationId: string
  label: string
  pending: number
  total: number
  departments: AuditRoomDepartmentOption[]
}

export function buildRoomOptions(
  items: readonly AuditScanItemRow[],
  locations: readonly AuditScanOption[],
  departments: readonly AuditScanOption[],
): AuditRoomOption[] {
  const locationLabels = new Map(locations.map((option) => [option.id, option.label]))
  const departmentLabels = new Map(departments.map((option) => [option.id, option.label]))
  const byLocation = new Map<string, { pending: number; total: number; departments: Map<string, { pending: number; total: number }> }>()

  for (const item of ownItems(items)) {
    const entry = byLocation.get(item.expectedLocationId) ?? { pending: 0, total: 0, departments: new Map<string, { pending: number; total: number }>() }
    const isPending = !isAuditItemChecked(item)
    entry.total += 1
    if (isPending) entry.pending += 1
    if (item.expectedDepartmentId) {
      const department = entry.departments.get(item.expectedDepartmentId) ?? { pending: 0, total: 0 }
      department.total += 1
      if (isPending) department.pending += 1
      entry.departments.set(item.expectedDepartmentId, department)
    }
    byLocation.set(item.expectedLocationId, entry)
  }

  return [...byLocation.entries()]
    .map(([locationId, entry]) => ({
      locationId,
      label: locationLabels.get(locationId) ?? locationId,
      pending: entry.pending,
      total: entry.total,
      departments: [...entry.departments.entries()]
        .map(([departmentId, counts]) => ({ departmentId, label: departmentLabels.get(departmentId) ?? departmentId, pending: counts.pending, total: counts.total }))
        .sort((left, right) => compareText(left.label, right.label)),
    }))
    .sort((left, right) => compareText(left.label, right.label))
}

export type AuditRoomProgress = { checked: number; total: number; pending: number }

/** The room button (spec §11, bug 21, P3-R13): the chosen room, within the chosen department when there is one, as the list counts it. */
export function selectAuditRoomProgress(rooms: readonly AuditRoomOption[], room: AuditScanRoom): AuditRoomProgress | null {
  const option = room.locationId ? rooms.find((entry) => entry.locationId === room.locationId) : undefined
  if (!option) return null
  const scope = room.departmentId
    ? option.departments.find((entry) => entry.departmentId === room.departmentId) ?? { pending: 0, total: 0 }
    : option
  return { checked: scope.total - scope.pending, total: scope.total, pending: scope.pending }
}

/** The footer link (P3-R14): the pending list it opens filters by room only, so the department, category and tab do not narrow it. */
export function countAuditScanPendingForLink(items: readonly AuditScanItemRow[], room: AuditScanRoom): number {
  return ownItems(items).filter((item) => !isAuditItemChecked(item) && (!room.locationId || item.expectedLocationId === room.locationId)).length
}

export type AuditScanListScope = "room" | "round"

/** One rule for the words that follow the room (P3-R7): the third tab, the search line and the footer. */
export function auditScanListScope(room: AuditScanRoom): AuditScanListScope {
  return room.locationId ? "room" : "round"
}

export type AuditSearchField = "assetTag" | "serialNumber" | "fixedAssetCode" | "name" | "custodian"
export type AuditSearchMatch = { item: AuditScanItemRow; field: AuditSearchField; value: string; tier: 0 | 1 | 2; elsewhere: boolean }
export type AuditSearchResult = { matches: AuditSearchMatch[]; total: number; inRoom: number; otherRooms: number }

const exactMatchFields = new Set<AuditSearchField>(["assetTag", "serialNumber", "fixedAssetCode"])

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function isAuditSearchReady(term: string) {
  return Array.from(term.trim()).length >= auditScanMinSearchLength
}

export function searchAuditItems(
  items: readonly AuditScanItemRow[],
  term: string,
  custodianLabels: ReadonlyMap<string, string>,
  room: AuditScanRoom,
): AuditSearchResult {
  if (!isAuditSearchReady(term)) return { matches: [], total: 0, inRoom: 0, otherRooms: 0 }
  const needle = normalizeSearchText(term)
  const matches: AuditSearchMatch[] = []

  for (const item of ownItems(items)) {
    const elsewhere = Boolean(room.locationId) && item.expectedLocationId !== room.locationId
    const fields: Array<[AuditSearchField, string | null]> = [
      ["assetTag", item.assetTag],
      ["serialNumber", item.serialNumber],
      ["fixedAssetCode", item.fixedAssetCode],
      ["name", item.name],
      ["custodian", item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) ?? null : null],
    ]
    let best: AuditSearchMatch | null = null
    for (const [field, raw] of fields) {
      if (!raw) continue
      const value = normalizeSearchText(raw)
      const tier = value === needle && exactMatchFields.has(field) ? 0 : value.startsWith(needle) ? 1 : value.includes(needle) ? 2 : null
      if (tier === null) continue
      if (!best || tier < best.tier) best = { item, field, value: raw, tier, elsewhere }
      if (tier === 0) break
    }
    if (best) matches.push(best)
  }

  // An exact code first wherever its room is, so Enter opens what was typed whole (P3-R17); then the chosen room
  // (spec §11: a moved asset is what the audit must find, so the rest follow), then today's relevance in each group.
  // The rule keeps every match; the screen shows auditScanSearchPageSize at a time (bug 20).
  matches.sort((left, right) =>
    Number(left.tier !== 0) - Number(right.tier !== 0)
    || Number(left.elsewhere) - Number(right.elsewhere)
    || left.tier - right.tier
    || Number(isAuditItemChecked(left.item)) - Number(isAuditItemChecked(right.item))
    || compareText(left.item.assetTag, right.item.assetTag))
  const otherRooms = matches.filter((match) => match.elsewhere).length
  return { matches, total: matches.length, inRoom: room.locationId ? matches.length - otherRooms : 0, otherRooms }
}

export { splitSearchHighlight } from "./search-highlight.ts"

export type AuditScanCategoryChip = { id: string; count: number }
export type AuditScanCategoryNames = ReadonlyMap<string, { code: string; name: string }>

/** The category chips (decision 3, P3-R6): within the room and tab, largest first, then by name; hidden at one or none. */
export function foldAuditScanCategoryChips(
  items: readonly AuditScanItemRow[],
  { room, tab, names }: { room: AuditScanRoom; tab: AuditScanListTab; names: AuditScanCategoryNames },
): AuditScanCategoryChip[] {
  const counts = new Map<string, number>()
  for (const item of filterAuditItemsByContext(ownItems(items), room)) {
    if (isInAuditScanTab(item, tab)) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
  }
  if (counts.size <= 1) return []
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) =>
      right.count - left.count
      || Number(!names.has(left.id)) - Number(!names.has(right.id))
      || compareText(names.get(left.id)?.name ?? "", names.get(right.id)?.name ?? "")
      || compareText(names.get(left.id)?.code ?? "", names.get(right.id)?.code ?? "")
      || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
}

/** A chosen category narrows the list only while it is on the row, so a saved last item never leaves an empty list with no chip to clear. */
export function resolveAuditScanCategory(chips: readonly AuditScanCategoryChip[], categoryId: string | null): string | null {
  return categoryId && chips.some((chip) => chip.id === categoryId) ? categoryId : null
}

/** An asset's own item, for a component, a register pick or a lookup (P3-R1). */
export function findAuditScanOwnItem(items: readonly AuditScanItemRow[], assetId: string): AuditScanItemRow | null {
  return items.find((item) => item.assetId === assetId && isAuditRoundOwnItem(item)) ?? null
}

/** The camera's match (P3-R1): an own item by asset id, tag or serial; anything else goes to the register lookup. */
export function findAuditScanItemByCodes(items: readonly AuditScanItemRow[], candidates: readonly string[]): AuditScanItemRow | null {
  const codes = new Set(candidates.map((value) => value.toLocaleLowerCase()))
  if (codes.size === 0) return null
  return ownItems(items).find((item) =>
    codes.has(item.assetId.toLocaleLowerCase())
    || codes.has(item.assetTag.toLocaleLowerCase())
    || (item.serialNumber ? codes.has(item.serialNumber.toLocaleLowerCase()) : false)) ?? null
}

/**
 * The round's recorded out-of-scope finds, apart from every count (P3-R25: spec §5 counts = lists, so they are no row
 * of a tab): where each was found (the snapshot's room when no place was recorded), in the chosen room or the whole
 * round, most recent first. The ตรวจแล้ว tab shows them as their own section, each opening its out-of-scope form.
 */
export function listAuditScanRecordedOutOfScope(items: readonly AuditScanItemRow[], { roomId }: { roomId: string }): AuditScanItemRow[] {
  return items
    .filter((item) => !isAuditRoundOwnItem(item) && (!roomId || (item.actualLocationId ?? item.expectedLocationId) === roomId))
    .sort((left, right) => (right.lastScanAt ?? "").localeCompare(left.lastScanAt ?? "") || compareText(left.assetTag, right.assetTag))
}

export type AuditCheckMode = "scan" | "edit" | "out_of_scope"
export type AuditCheckField = "location" | "custodian" | "department" | "condition"
export type AuditCheckValues = Record<AuditCheckField, string>
export type AuditMasterValues = {
  locationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
}

export function getCheckMode(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): "scan" | "edit" {
  if (item.auditStatus === "pending" || item.auditResult === "not_found") return "scan"
  return "edit"
}

export function expectedCheckValues(item: AuditScanItemRow): AuditCheckValues {
  return {
    location: item.expectedLocationId,
    custodian: item.expectedCustodianId ?? "",
    department: item.expectedDepartmentId ?? "",
    condition: item.expectedConditionId ?? "",
  }
}

export function masterCheckValues(master: AuditMasterValues): AuditCheckValues {
  return {
    location: master.locationId,
    custodian: master.custodianId ?? "",
    department: master.departmentId ?? "",
    condition: master.conditionId ?? "",
  }
}

export function buildCheckDefaults(
  input:
    | { mode: "scan" | "edit"; item: AuditScanItemRow; room: AuditScanRoom }
    | { mode: "out_of_scope"; master: AuditMasterValues; room: AuditScanRoom },
): AuditCheckValues {
  if (input.mode === "out_of_scope") {
    const values = masterCheckValues(input.master)
    return { ...values, location: input.room.locationId || values.location }
  }
  if (input.mode === "edit") {
    return {
      location: input.item.actualLocationId ?? input.item.expectedLocationId,
      custodian: input.item.actualCustodianId ?? "",
      department: input.item.actualDepartmentId ?? "",
      condition: input.item.actualConditionId ?? "",
    }
  }
  const expected = expectedCheckValues(input.item)
  return { ...expected, location: input.room.locationId || expected.location }
}

/** Same comparison as the scan route: location skipped for licences, custodian only for personal assets. */
export function diffCheckValues(values: AuditCheckValues, expected: AuditCheckValues, ownershipType: string | null): AuditCheckField[] {
  const type = normalizeAssetOwnershipType(ownershipType)
  const fields: AuditCheckField[] = []
  if (type !== "software_license" && values.location !== expected.location) fields.push("location")
  if (requiresCustodian(type) && values.custodian !== expected.custodian) fields.push("custodian")
  if (values.department !== expected.department) fields.push("department")
  if (values.condition !== expected.condition) fields.push("condition")
  return fields
}

/** In scope a condition, department or location mismatch needs a photo, a custodian alone does not (N-AU1). */
export function requiresCheckPhoto(mode: AuditCheckMode, diff: readonly AuditCheckField[]) {
  return mode === "out_of_scope" ? diff.length > 0 : diff.includes("condition") || hasPlacementMismatch(diff)
}

function hasPlacementMismatch(diff: readonly AuditCheckField[]) {
  return diff.includes("department") || diff.includes("location")
}

/** The auditScan message the waiting save shows: it names what differs (N-AU1). */
export function checkPhotoReasonKey(mode: AuditCheckMode, diff: readonly AuditCheckField[]) {
  if (mode === "out_of_scope") return "auditPhotoRequiredForMismatch" as const
  const condition = diff.includes("condition")
  const placement = hasPlacementMismatch(diff)
  if (condition && placement) return "photoRequiredMismatch" as const
  return placement ? ("photoRequiredPlacement" as const) : ("photoRequiredCondition" as const)
}

export function suggestDepartmentForCustodian(employees: readonly AuditScanEmployeeOption[], custodianId: string) {
  if (!custodianId) return null
  return employees.find((employee) => employee.id === custodianId)?.departmentId ?? null
}

export function getLatestValueNotes(item: AuditScanItemRow) {
  const notes: Partial<Record<"location" | "custodian" | "department", string>> = {}
  if (item.currentLocationId !== item.expectedLocationId) notes.location = item.currentLocationId
  if ((item.currentCustodianId ?? "") !== (item.expectedCustodianId ?? "")) notes.custodian = item.currentCustodianId ?? ""
  if ((item.currentDepartmentId ?? "") !== (item.expectedDepartmentId ?? "")) notes.department = item.currentDepartmentId ?? ""
  return notes
}

export function toScanPayloadValues(values: AuditCheckValues) {
  return {
    actualLocationId: values.location || null,
    actualCustodianId: values.custodian || null,
    actualDepartmentId: values.department || null,
    actualConditionId: values.condition || null,
  }
}

export type AuditScanResultItem = {
  id: string
  auditStatus: string
  auditResult: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  lastScanAt: string | Date | null
}

function toIsoString(value: string | Date | null) {
  if (!value) return null
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString()
}

export function applyScanResult(
  items: readonly AuditScanItemRow[],
  result: { item: AuditScanResultItem; scannedByName?: string | null },
): AuditScanItemRow[] {
  return items.map((row) =>
    row.itemId !== result.item.id
      ? row
      : {
          ...row,
          auditStatus: result.item.auditStatus,
          auditResult: result.item.auditResult,
          actualLocationId: result.item.actualLocationId,
          actualCustodianId: result.item.actualCustodianId,
          actualDepartmentId: result.item.actualDepartmentId,
          actualConditionId: result.item.actualConditionId,
          lastScanAt: toIsoString(result.item.lastScanAt),
          scannedByName: result.scannedByName ?? row.scannedByName,
        },
  )
}

export function mergeStatusUpdates(items: readonly AuditScanItemRow[], updates: readonly AuditScanItemRow[]): AuditScanItemRow[] {
  const byItemId = new Map(updates.map((update) => [update.itemId, update]))
  const merged = items.map((row) => {
    const update = byItemId.get(row.itemId)
    if (!update) return row
    byItemId.delete(row.itemId)
    return update
  })
  return [...merged, ...byItemId.values()]
}
