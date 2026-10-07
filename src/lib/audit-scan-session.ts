import { filterAuditItemsByContext, type AuditScanContext } from "./audit-scan-context.ts"
import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"

export const auditScanListPageSize = 50
export const auditScanSearchLimit = 10
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

const foundResults = new Set(["found", "confirmed_with_parent"])

export function isAuditItemChecked(item: Pick<AuditScanItemRow, "auditStatus">) {
  return item.auditStatus !== "pending"
}

export function getAuditItemBadge(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): AuditItemBadge | null {
  if (!isAuditItemChecked(item)) return null
  if (item.auditResult === "not_found") return "not_found"
  if (item.auditResult === "out_of_scope") return "out_of_scope"
  if (!item.auditResult || foundResults.has(item.auditResult)) return "found"
  return "mismatch"
}

export function summarizeProgress(items: readonly AuditScanItemRow[]) {
  let checked = 0
  let mismatched = 0
  for (const item of items) {
    if (!isAuditItemChecked(item)) continue
    checked += 1
    if (getAuditItemBadge(item) === "mismatch") mismatched += 1
  }
  return { total: items.length, checked, mismatched }
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
}: {
  items: readonly AuditScanItemRow[]
  room: AuditScanRoom
  tab: AuditScanListTab
  limit: number
  locationLabels: ReadonlyMap<string, string>
}) {
  const inRoom = filterAuditItemsByContext([...items], room)
  const pending = inRoom.filter((item) => !isAuditItemChecked(item))
  const checked = inRoom.filter(isAuditItemChecked)
  const byPlace = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (room.locationId
      ? 0
      : compareText(locationLabels.get(left.expectedLocationId) ?? left.expectedLocationId, locationLabels.get(right.expectedLocationId) ?? right.expectedLocationId))
    || compareText(left.assetTag, right.assetTag)
  const byRecent = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (right.lastScanAt ?? "").localeCompare(left.lastScanAt ?? "") || compareText(left.assetTag, right.assetTag)
  const source = tab === "pending" ? pending.sort(byPlace) : tab === "checked" ? checked.sort(byRecent) : [...inRoom].sort(byPlace)

  return {
    rows: source.slice(0, limit),
    total: source.length,
    counts: { pending: pending.length, checked: checked.length, all: inRoom.length },
  }
}

export type AuditRoomOption = {
  locationId: string
  label: string
  pending: number
  total: number
  departments: Array<{ departmentId: string; label: string; total: number }>
}

export function buildRoomOptions(
  items: readonly AuditScanItemRow[],
  locations: readonly AuditScanOption[],
  departments: readonly AuditScanOption[],
): AuditRoomOption[] {
  const locationLabels = new Map(locations.map((option) => [option.id, option.label]))
  const departmentLabels = new Map(departments.map((option) => [option.id, option.label]))
  const byLocation = new Map<string, { pending: number; total: number; departments: Map<string, number> }>()

  for (const item of items) {
    const entry = byLocation.get(item.expectedLocationId) ?? { pending: 0, total: 0, departments: new Map<string, number>() }
    entry.total += 1
    if (!isAuditItemChecked(item)) entry.pending += 1
    if (item.expectedDepartmentId) {
      entry.departments.set(item.expectedDepartmentId, (entry.departments.get(item.expectedDepartmentId) ?? 0) + 1)
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
        .map(([departmentId, total]) => ({ departmentId, label: departmentLabels.get(departmentId) ?? departmentId, total }))
        .sort((left, right) => compareText(left.label, right.label)),
    }))
    .sort((left, right) => compareText(left.label, right.label))
}

export type AuditSearchField = "assetTag" | "serialNumber" | "fixedAssetCode" | "name" | "custodian"
export type AuditSearchMatch = { item: AuditScanItemRow; field: AuditSearchField; value: string; tier: 0 | 1 | 2 }

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
  limit = auditScanSearchLimit,
): AuditSearchMatch[] {
  if (!isAuditSearchReady(term)) return []
  const needle = normalizeSearchText(term)
  const matches: AuditSearchMatch[] = []

  for (const item of items) {
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
      if (!best || tier < best.tier) best = { item, field, value: raw, tier }
      if (tier === 0) break
    }
    if (best) matches.push(best)
  }

  return matches
    .sort((left, right) =>
      left.tier - right.tier
      || Number(isAuditItemChecked(left.item)) - Number(isAuditItemChecked(right.item))
      || compareText(left.item.assetTag, right.item.assetTag))
    .slice(0, limit)
}

export function splitSearchHighlight(value: string, term: string): [string, string, string] | null {
  const needle = normalizeSearchText(term)
  if (!needle) return null
  const index = value.toLocaleLowerCase().indexOf(needle)
  if (index < 0) return null
  return [value.slice(0, index), value.slice(index, index + needle.length), value.slice(index + needle.length)]
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

export function requiresCheckPhoto(mode: AuditCheckMode, diff: readonly AuditCheckField[]) {
  return mode === "out_of_scope" ? diff.length > 0 : diff.includes("condition")
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
