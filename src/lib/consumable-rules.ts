// ของใช้สิ้นเปลือง (consumables spec): stock state, adjust and issue-target checks, and the "changed often" signal.
// Pure and client-safe: no Prisma import, so node --test and the consumables pages import it.

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

/** Out (onHand 0) wins over low. */
export function consumableStockState(item: { onHand: number; minQuantity: number }): ConsumableStockState {
  if (item.onHand === 0) return "out"
  if (isConsumableLow(item)) return "low"
  return "ok"
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
