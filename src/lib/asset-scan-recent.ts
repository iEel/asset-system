// "เปิดล่าสุด" on the scan page (group 4 plan 4): the last assets a person opened from it, per user and locale,
// in this browser only. Pure and client-safe; storage is passed in and every access is guarded.
export const ASSET_SCAN_RECENT_LIMIT = 10

export type AssetScanRecentItem = { id: string; assetTag: string; name: string }

export function assetScanRecentKey(userId: string, locale: string): string {
  return `asset-scan-recent:v1:${userId}:${locale}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function toItem(value: unknown): AssetScanRecentItem | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Record<string, unknown>
  if (!isNonEmptyString(candidate.id) || !isNonEmptyString(candidate.assetTag) || !isNonEmptyString(candidate.name)) return null
  return { id: candidate.id, assetTag: candidate.assetTag, name: candidate.name }
}

/** The stored list read defensively: malformed entries drop, each id once, at most ten; never throws. */
export function readAssetScanRecent(storage: Pick<Storage, "getItem"> | null, key: string): AssetScanRecentItem[] {
  let parsed: unknown
  try {
    const raw = storage?.getItem(key)
    if (!raw) return []
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const items: AssetScanRecentItem[] = []
  const seen = new Set<string>()
  for (const value of parsed) {
    const entry = toItem(value)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    items.push(entry)
    if (items.length === ASSET_SCAN_RECENT_LIMIT) break
  }
  return items
}

/** Newest first, once per id, at most ten. */
export function addAssetScanRecent(list: AssetScanRecentItem[], item: AssetScanRecentItem): AssetScanRecentItem[] {
  return [item, ...list.filter((existing) => existing.id !== item.id)].slice(0, ASSET_SCAN_RECENT_LIMIT)
}

/** Saves the list, or removes the key when it is empty. Blocked or full storage is ignored. */
export function writeAssetScanRecent(
  storage: Pick<Storage, "setItem" | "removeItem"> | null,
  key: string,
  list: AssetScanRecentItem[]
): void {
  if (!storage) return
  try {
    if (list.length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(list.slice(0, ASSET_SCAN_RECENT_LIMIT)))
  } catch {
    // Storage blocked or full: the list is a convenience, so nothing else happens.
  }
}
