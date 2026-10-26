// One history of an asset (group 1 spec §7.6): the pure rules of its events, chips, details, counts and Excel row.
// Client-safe and imported by node --test: relative imports only, Prisma for types at most, no database.
import { bangkokDayDiff } from "./waiting-work-rules.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { getAuditRoundItemResultLabelKey, getAuditRoundItemStatusLabelKey } from "./audit-round-result-filters.ts"
import { getAuditItemStatusLabelKey } from "./audit-item-status-labels.ts"
import type { AssetMovementDocumentKind } from "./asset-movement-labels.ts"

export type AssetHistoryCategory = "checkout" | "checkin" | "transfer" | "audit" | "repair" | "disposal" | "component" | "edit"

/** The chips after ทั้งหมด, in the spec's order. */
export const ASSET_HISTORY_CATEGORIES: readonly AssetHistoryCategory[] = [
  "checkout",
  "checkin",
  "transfer",
  "audit",
  "repair",
  "disposal",
  "component",
  "edit",
]

export type AssetHistoryEvent = {
  id: string
  at: Date
  category: AssetHistoryCategory
  /** A full message key: `asset.movementTypes.<type>`, or `asset.history.auditScan` for a scan without a movement. */
  labelKey: string
  detail: string | null
  actor: string | null
  document: { code: string; href: string; kind: AssetMovementDocumentKind } | null
}

export type AssetHistoryCounts = { total: number; counts: Record<AssetHistoryCategory, number> }

export type AssetHistory = AssetHistoryCounts & { events: AssetHistoryEvent[]; capped: boolean }

export const ASSET_HISTORY_DEFAULT_LIMIT = 500
export const ASSET_HISTORY_EXPORT_LIMIT = 5000

// The chips other than แก้ไขข้อมูล. A cancel and a component's copy count with their transaction; any type not listed
// here (registration, register edits, a type without a label) counts as แก้ไขข้อมูล.
const categoryTypes: Record<Exclude<AssetHistoryCategory, "edit">, readonly string[]> = {
  checkout: ["checkout", "checkout_cancel", "parent_checkout_sync"],
  checkin: ["checkin", "checkin_cancel", "parent_checkin_sync"],
  transfer: ["transfer", "transfer_cancel", "parent_transfer_sync", "bulk_location_move", "parent_bulk_move_sync"],
  audit: [
    "audit_correction",
    "audit_location_correction",
    "audit_custodian_correction",
    "audit_department_correction",
    "audit_condition_correction",
    "parent_audit_finding_sync",
    "parent_audit_confirmation_sync",
  ],
  repair: ["maintenance_create", "maintenance_close", "maintenance_cancel", "maintenance_status_update", "maintenance_pm_create"],
  disposal: ["disposal_request", "disposal_approve", "disposal_reject", "disposal_execute"],
  component: ["component_install", "component_remove", "installed_in_parent", "removed_from_parent"],
}

const categoryByType = new Map<string, AssetHistoryCategory>(
  (Object.entries(categoryTypes) as [AssetHistoryCategory, readonly string[]][]).flatMap(([category, types]) =>
    types.map((type) => [type, category] as const),
  ),
)

/** The chip a movement type counts under; anything unknown is แก้ไขข้อมูล. */
export function assetHistoryCategory(movementType: string): AssetHistoryCategory {
  return categoryByType.get(movementType) ?? "edit"
}

/** The types whose reason a person typed. Every other writer stores a fixed English sentence, which never shows. */
export const ASSET_HISTORY_REASON_TYPES: ReadonlySet<string> = new Set([
  "bulk_custodian_update",
  "bulk_location_move",
  "bulk_location_update",
  "checkin_cancel",
  "checkout_cancel",
  "component_install",
  "component_remove",
  "disposal_approve",
  "disposal_execute",
  "disposal_reject",
  "disposal_request",
  "installed_in_parent",
  "maintenance_cancel",
  "removed_from_parent",
  "state_review_resolution",
  "status_correction",
  "transfer",
  "transfer_cancel",
])

export type AssetHistoryField =
  | "location"
  | "custodian"
  | "department"
  | "status"
  | "condition"
  | "branch"
  | "component"
  | "parent"
  | "role"
  | "slot"

export type AssetHistoryLabels = {
  fields: Record<AssetHistoryField, string>
  none: string
  unknownRecord: string
  ownershipTypes: Readonly<Record<string, string>>
  returnedFrom: (name: string) => string
  repairDays: (days: number) => string
}

export type AssetHistoryMovementInput = {
  movementType: string
  fromValue: string | null
  toValue: string | null
  reason: string | null
  checkout: { destination: string | null; handoverMode: string | null } | null
  checkin: { returnBy: string } | null
  repair: {
    problem: string
    resolution: string | null
    reportedDate: Date
    returnDate: Date | null
    repairStatus: string
    hasCloseMovement: boolean
  } | null
}

// A snapshot's fields, in the order they read, each with the keys the writers use for it. Any other key is left out.
const snapshotFields: readonly (readonly [AssetHistoryField, readonly string[]])[] = [
  ["location", ["locationId", "currentLocationId"]],
  ["custodian", ["custodianId"]],
  ["department", ["departmentId"]],
  ["status", ["statusId"]],
  ["condition", ["conditionId"]],
  ["branch", ["branchId"]],
  ["component", ["componentAssetTag"]],
  ["parent", ["parentAssetTag"]],
  ["role", ["componentRole"]],
  ["slot", ["slotNo"]],
]

const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const wholeUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const separator = " · "

function parseSnapshot(value: string | null): Record<string, unknown> | null {
  if (!value || !value.trimStart().startsWith("{")) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function rawText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = (typeof value === "string" ? value : String(value)).trim()
  return text.length > 0 ? text : null
}

function readValue(value: string, lookup: ReadonlyMap<string, string>, labels: AssetHistoryLabels): string {
  const looked = lookup.get(value.toLowerCase())
  if (looked !== undefined) return looked
  if (Object.hasOwn(labels.ownershipTypes, value)) return labels.ownershipTypes[value]
  if (wholeUuidPattern.test(value)) return labels.unknownRecord
  return value
}

/** A change as before → after in words: a snapshot's changed fields, or a plain value through the lookup. */
export function movementChangeText(
  fromValue: string | null,
  toValue: string | null,
  lookup: ReadonlyMap<string, string>,
  labels: AssetHistoryLabels,
): string | null {
  const fromSnapshot = parseSnapshot(fromValue)
  const toSnapshot = parseSnapshot(toValue)
  if (fromSnapshot || toSnapshot) {
    const before = fromSnapshot ?? {}
    const after = toSnapshot ?? {}
    const parts: string[] = []
    for (const [field, keys] of snapshotFields) {
      const beforeKey = keys.find((key) => Object.hasOwn(before, key))
      const afterKey = keys.find((key) => Object.hasOwn(after, key))
      const fieldLabel = labels.fields[field]
      if (beforeKey !== undefined && afterKey !== undefined) {
        const beforeRaw = rawText(before[beforeKey])
        const afterRaw = rawText(after[afterKey])
        if (beforeRaw === afterRaw) continue
        const beforeText = beforeRaw === null ? labels.none : readValue(beforeRaw, lookup, labels)
        const afterText = afterRaw === null ? labels.none : readValue(afterRaw, lookup, labels)
        parts.push(`${fieldLabel}: ${beforeText} → ${afterText}`)
        continue
      }
      const onlyKey = beforeKey ?? afterKey
      if (onlyKey === undefined) continue
      const raw = rawText(beforeKey !== undefined ? before[onlyKey] : after[onlyKey])
      if (raw !== null) parts.push(`${fieldLabel}: ${readValue(raw, lookup, labels)}`)
    }
    return parts.length > 0 ? parts.join(separator) : null
  }

  const beforeRaw = rawText(fromValue)
  const afterRaw = rawText(toValue)
  const beforeText = beforeRaw === null ? null : readValue(beforeRaw, lookup, labels)
  const afterText = afterRaw === null ? null : readValue(afterRaw, lookup, labels)
  if (beforeText !== null && afterText !== null) return `${beforeText} → ${afterText}`
  return beforeText ?? afterText
}

/** Every id in the values, plain or inside a snapshot: lower case, once each, in first-seen order. */
export function assetHistoryLookupIds(values: readonly (string | null)[]): string[] {
  const ids = new Set<string>()
  for (const value of values) {
    if (!value) continue
    for (const id of value.match(uuidPattern) ?? []) ids.add(id.toLowerCase())
  }
  return [...ids]
}

function repairCloseParts(repair: NonNullable<AssetHistoryMovementInput["repair"]>, labels: AssetHistoryLabels): string[] {
  const parts: string[] = []
  const resolution = repair.resolution?.trim()
  if (resolution) parts.push(resolution)
  if (repair.returnDate) {
    const days = bangkokDayDiff(repair.reportedDate, repair.returnDate)
    if (days >= 1) parts.push(labels.repairDays(days))
  }
  return parts
}

function mainParts(input: AssetHistoryMovementInput, lookup: ReadonlyMap<string, string>, labels: AssetHistoryLabels): string[] {
  const type = input.movementType
  if (type === "checkout" && input.checkout && (input.checkout.destination || input.checkout.handoverMode)) {
    return [input.checkout.destination, input.checkout.handoverMode].filter((part): part is string => Boolean(part))
  }
  if (type === "checkin" && input.checkin) return [labels.returnedFrom(input.checkin.returnBy)]
  if ((type === "maintenance_create" || type === "maintenance_pm_create") && input.repair) {
    const problem = input.repair.problem.trim()
    const parts = problem ? [problem] : []
    // Recorded as done in one save: the one movement carries the close details.
    if (input.repair.repairStatus === "closed" && !input.repair.hasCloseMovement) parts.push(...repairCloseParts(input.repair, labels))
    return parts
  }
  if (type === "maintenance_close" && input.repair) return repairCloseParts(input.repair, labels)
  if ((type === "maintenance_cancel" || type === "maintenance_status_update") && input.repair) return []
  const change = movementChangeText(input.fromValue, input.toValue, lookup, labels)
  return change ? [change] : []
}

/** A movement's detail: what changed or who it went to, a repair record's details merged in, then a person's own reason. */
export function assetHistoryMovementDetail(
  input: AssetHistoryMovementInput,
  lookup: ReadonlyMap<string, string>,
  labels: AssetHistoryLabels,
): string | null {
  const parts = mainParts(input, lookup, labels)
  const reason = input.reason?.trim()
  if (reason && ASSET_HISTORY_REASON_TYPES.has(input.movementType) && !parts.includes(reason)) parts.push(reason)
  return parts.length > 0 ? parts.join(separator) : null
}

export type AssetHistoryAuditItem = { id: string; lastScanAt: Date | null; findingIds: readonly string[] }

/** The audit items whose scan wrote no movement; a scan that corrected the register is already its movement. */
export function auditItemsWithoutMovement<T extends AssetHistoryAuditItem>(
  items: readonly T[],
  movements: readonly { referenceType: string | null; referenceId: string | null; performedAt: Date }[],
): T[] {
  return items.filter((item) => {
    if (!item.lastScanAt) return true
    const scannedAt = item.lastScanAt.getTime()
    return !movements.some((movement) => {
      if (movement.performedAt.getTime() !== scannedAt || !movement.referenceId) return false
      if (movement.referenceType === "audit_finding") return item.findingIds.includes(movement.referenceId)
      if (movement.referenceType === "audit_scan") return movement.referenceId === item.id
      return false
    })
  })
}

/** The message key of an audit item's result or status; null when the code has no label. */
export function auditItemResultKey(auditStatus: string, auditResult: string | null): string | null {
  const result = getAuditRoundItemResultLabelKey(auditResult)
  if (result) return `auditRound.${result}`
  const status = getAuditRoundItemStatusLabelKey(auditStatus)
  if (status) return `auditRound.${status}`
  const itemStatus = getAuditItemStatusLabelKey(auditStatus)
  if (itemStatus) return `auditFinding.${itemStatus}`
  return null
}

/** Each chip's count and the total, from the movements grouped by type and the scans that wrote no movement. */
export function countAssetHistory(
  movementCounts: readonly { movementType: string; count: number }[],
  auditEvents: number,
): AssetHistoryCounts {
  const counts = Object.fromEntries(ASSET_HISTORY_CATEGORIES.map((category) => [category, 0])) as Record<AssetHistoryCategory, number>
  for (const group of movementCounts) counts[assetHistoryCategory(group.movementType)] += group.count
  counts.audit += auditEvents
  const total = ASSET_HISTORY_CATEGORIES.reduce((sum, category) => sum + counts[category], 0)
  return { total, counts }
}

/** Newest first, then by id for events at the same instant, at most `limit`. The input is not reordered. */
export function orderAssetHistory(events: readonly AssetHistoryEvent[], limit: number): AssetHistoryEvent[] {
  return [...events]
    .sort((left, right) => {
      const byTime = right.at.getTime() - left.at.getTime()
      if (byTime !== 0) return byTime
      return left.id < right.id ? 1 : left.id > right.id ? -1 : 0
    })
    .slice(0, limit)
}

/** Who recorded an event, as the transaction pages name an operator. */
export function assetHistoryActorLabel(user: {
  username: string
  displayName: string
  email: string | null
  employee: { code: string; fullNameTh: string } | null
}): string {
  if (user.employee) return `${user.employee.code} - ${user.employee.fullNameTh}`
  if (user.displayName) return `${user.displayName} (${user.username})`
  return user.email ?? user.username
}

const bangkokOffsetMs = 7 * 60 * 60 * 1000

/** The Excel's date and time: YYYY-MM-DD HH:mm in Bangkok. */
export function formatAssetHistoryDateTime(at: Date): string {
  return new Date(at.getTime() + bangkokOffsetMs).toISOString().slice(0, 16).replace("T", " ")
}

export const ASSET_HISTORY_EXCEL_COLUMNS = [
  { key: "at", headerKey: "asset.history.columns.at", width: 18 },
  { key: "type", headerKey: "asset.history.columns.type", width: 14 },
  { key: "event", headerKey: "asset.history.columns.event", width: 28 },
  { key: "detail", headerKey: "asset.history.columns.detail", width: 60 },
  { key: "actor", headerKey: "asset.history.columns.actor", width: 28 },
  { key: "document", headerKey: "asset.history.columns.document", width: 20 },
] as const

/** One Excel row. It reads no user: the route passes no document for a kind the downloader may not open. */
export function assetHistoryExcelRow(
  event: AssetHistoryEvent,
  t: (key: string) => string,
): { at: string; type: string; event: string; detail: string; actor: string; document: string } {
  return {
    at: formatAssetHistoryDateTime(event.at),
    type: t(`asset.history.types.${event.category}`),
    event: t(event.labelKey),
    detail: event.detail ?? "",
    actor: event.actor ?? "",
    document: event.document?.code ?? "",
  }
}

/** The file's name, ASCII only for the header: the tag with anything else as "_", and the Bangkok date. */
export function buildAssetHistoryExportFilename(assetTag: string, now: Date): string {
  return `asset-history-${assetTag.replace(/[^A-Za-z0-9._-]/g, "_")}-${getBangkokDateKey(now)}.xlsx`
}
