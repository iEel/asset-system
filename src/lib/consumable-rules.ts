// ของใช้สิ้นเปลือง (consumables spec): stock state, adjust and issue-target checks, and the "changed often" signal.
// Pure and client-safe: Prisma for types only, so node --test and the consumables pages import it.
import type { Prisma } from "@prisma/client"

import { formatCount } from "./display-format.ts"

export const CONSUMABLE_ISSUE_MAX = 9999
export const CONSUMABLE_ADJUST_MAX = 99999
export const CONSUMABLE_OFTEN_DAYS = 90
export const CONSUMABLE_OFTEN_COUNT = 2

/** An asset in one of these statuses cannot take an issued consumable. */
export const consumableBlockedIssueStatusNames: readonly string[] = Object.freeze([
  "Disposed",
  "Retired",
  "Lost",
  "Missing",
  "Pending Disposal",
])

export type ConsumableStockState = "ok" | "low" | "out"

/** Low only when a minimum is set: minQuantity > 0 and onHand <= minQuantity. */
export function isConsumableLow(item: { onHand: number; minQuantity: number }): boolean {
  return item.minQuantity > 0 && item.onHand <= item.minQuantity
}

/**
 * The database's "active and low" (consumables plan 4): isConsumableLow as a where, shared by the bell's counter and the
 * list's ?state=low. onHand <= minQuantity compares two columns, which Prisma does through a field reference held by the
 * client (its consumableItem.fields.minQuantity); the caller passes it so this module never imports the client.
 */
export function consumableLowWhere(
  minQuantity: Prisma.IntFieldRefInput<"ConsumableItem">,
): Prisma.ConsumableItemWhereInput {
  return { isActive: true, minQuantity: { gt: 0 }, onHand: { lte: minQuantity } }
}

/** Out (onHand 0) wins over low. */
export function consumableStockState(item: { onHand: number; minQuantity: number }): ConsumableStockState {
  if (item.onHand === 0) return "out"
  if (isConsumableLow(item)) return "low"
  return "ok"
}

/** The list's ?state= (consumables plan 4): "low" keeps the kinds to restock; any other value is no filter. */
export type ConsumableListState = "low"

export function parseConsumableListState(value: string | undefined): ConsumableListState | null {
  return value === "low" ? "low" : null
}

/** ?state=low keeps the low and out kinds (the banner's list); no filter returns the list as it is. */
export function filterConsumablesByListState<Row extends { state: ConsumableStockState }>(rows: Row[], state: ConsumableListState | null): Row[] {
  return state === "low" ? rows.filter((row) => row.state !== "ok") : rows
}

/** A count is a whole number 0–99999 and must differ from the current on-hand. */
export function consumableAdjustError(onHand: number, counted: number): "noChange" | "range" | null {
  if (!Number.isInteger(counted) || counted < 0 || counted > CONSUMABLE_ADJUST_MAX) return "range"
  if (counted === onHand) return "noChange"
  return null
}

/** Issue targets: an active asset whose status is not blocked. */
export function consumableIssueAssetError(
  asset: { isActive: boolean; statusName: string } | null,
): "assetNotFound" | "assetStatus" | null {
  if (!asset) return "assetNotFound"
  if (!asset.isActive || consumableBlockedIssueStatusNames.includes(asset.statusName)) return "assetStatus"
  return null
}

const dayMs = 86_400_000

/**
 * Per item, the issues within CONSUMABLE_OFTEN_DAYS of `now`; kept when the count reaches CONSUMABLE_OFTEN_COUNT.
 * The caller passes the issues of one asset, so a kept item was issued to that asset often. Order: first seen.
 */
export function consumableOftenChanged(
  issues: ReadonlyArray<{ itemId: string; performedAt: Date }>,
  now: Date,
): Array<{ itemId: string; count: number }> {
  const since = now.getTime() - CONSUMABLE_OFTEN_DAYS * dayMs
  const counts = new Map<string, number>()
  for (const issue of issues) {
    const at = issue.performedAt.getTime()
    if (at < since) continue
    counts.set(issue.itemId, (counts.get(issue.itemId) ?? 0) + 1)
  }
  return [...counts]
    .filter(([, count]) => count >= CONSUMABLE_OFTEN_COUNT)
    .map(([itemId, count]) => ({ itemId, count }))
}

/** The history's จำนวน: "+3" for a receipt or a higher count, "−2" (U+2212) for an issue or a lower count, grouped. */
export function formatConsumableQuantityChange(change: number): string {
  return change > 0 ? `+${formatCount(change)}` : `−${formatCount(Math.abs(change))}`
}

/** The history's ?page=: a whole number from 1 (the first of repeated values); anything else is page 1. */
export function parseConsumableHistoryPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !/^\d{1,6}$/.test(value)) return 1
  const page = Number(value)
  return page >= 1 ? page : 1
}
