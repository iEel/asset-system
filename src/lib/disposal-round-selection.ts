// The disposal queue's approved-tab selection (group 6 plan 4 Task 3, spec §10.2, P4-R2): up to 200 requests (one
// round), kept across pages in sessionStorage and reset when the search, the type, the request dates or the audit round
// change. The round page (/disposal/rounds/new) reads the ids from the same key. It mirrors the inbox selection
// (approval-inbox-selection.ts) with one kind only. Pure and client-safe: no imports, so node --test loads it.

export const disposalRoundSelectionStorageKey = "disposal-round-selection"
/** One round holds at most 200 machines (validations/disposal-round.ts MAX_DISPOSAL_ROUND_ITEMS). */
export const DISPOSAL_ROUND_SELECTION_MAX = 200

export type StoredRoundSelection = { ids: string[]; scope: string }

/**
 * The approved tab's search, type, request dates and audit round joined: a selection belongs to one of these. The
 * round (ยืนยันผลตรวจ plan 4) is a fifth entry only when set, so a scope without it reads as before.
 */
export function disposalRoundSelectionScope(query: { search: string; disposalType: string; dateFrom: string; dateTo: string; auditRound?: string }): string {
  const parts = [query.search.trim(), query.disposalType, query.dateFrom, query.dateTo]
  return JSON.stringify(query.auditRound ? [...parts, query.auditRound] : parts)
}

/** sessionStorage's text as a selection; anything malformed (or nothing) is no selection. */
export function parseStoredRoundSelection(raw: string | null | undefined): StoredRoundSelection | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null
    const { ids, scope } = value as Record<string, unknown>
    if (typeof scope !== "string" || !Array.isArray(ids)) return null
    if (!ids.every((id): id is string => typeof id === "string")) return null
    return { ids, scope }
  } catch {
    return null
  }
}

/**
 * The stored selection for the list now shown: null when it belongs to another search, type or date range; otherwise
 * only the ids still tickable (recorded elsewhere, or now filtered out, drop away), or null when none is left.
 */
export function restoreRoundSelection(stored: StoredRoundSelection | null, scope: string, tickableIds: readonly string[]): StoredRoundSelection | null {
  if (!stored || stored.scope !== scope) return null
  const allowed = new Set(tickableIds)
  const ids = stored.ids.filter((id) => allowed.has(id))
  return ids.length > 0 ? { ids, scope } : null
}

/**
 * One tick or untick. A tick into a selection of another scope starts over with this id; a tick past `max` is refused
 * and the selection stays; unticking the last id leaves no selection.
 */
export function toggleRoundSelection(
  current: StoredRoundSelection | null,
  id: string,
  scope: string,
  max: number = DISPOSAL_ROUND_SELECTION_MAX,
): { next: StoredRoundSelection | null; refused: "limit" | null } {
  const held = current && current.scope === scope && current.ids.length > 0 ? current : null
  if (!held) return { next: { ids: [id], scope }, refused: null }
  if (held.ids.includes(id)) {
    const ids = held.ids.filter((entry) => entry !== id)
    return { next: ids.length > 0 ? { ids, scope } : null, refused: null }
  }
  if (held.ids.length >= max) return { next: held, refused: "limit" }
  return { next: { ids: [...held.ids, id], scope }, refused: null }
}

/** Every tickable id of the filtered tab, in list order, up to `max`; `capped` when some were left out. */
export function selectAllRound(
  tickableIds: readonly string[],
  scope: string,
  max: number = DISPOSAL_ROUND_SELECTION_MAX,
): { next: StoredRoundSelection; capped: boolean } {
  return { next: { ids: tickableIds.slice(0, max), scope }, capped: tickableIds.length > max }
}

/**
 * The approved tab with the search, type, dates and audit round the selection was made under (group 6 plan 4 Task 4): the round
 * page's "เพิ่มจากรายการอนุมัติแล้ว" goes back there, so the queue restores the same selection. A missing or malformed
 * scope gives the bare approved tab.
 */
export function disposalRoundApprovedTabHref(locale: string, scope: string | null | undefined): string {
  const params = new URLSearchParams({ status: "approved" })
  let value: unknown = null
  try {
    value = scope ? JSON.parse(scope) : null
  } catch {
    value = null
  }
  const parts: unknown[] = Array.isArray(value) ? value : []
  const keys = ["search", "disposalType", "dateFrom", "dateTo", "auditRound"] as const
  keys.forEach((key, index) => {
    const entry = parts[index]
    if (typeof entry === "string" && entry !== "") params.set(key, entry)
  })
  return `/${locale}/disposal?${params.toString()}`
}
