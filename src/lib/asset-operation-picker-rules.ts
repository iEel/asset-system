import type { AssetOperationMode } from "./asset-operation-eligibility.ts"
import {
  buildAssetOperationSearchHref,
  isAssetOperationSearchReady,
  isAssetOperationSearchTooLong,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchGroup,
  type AssetOperationSearchRow,
} from "./asset-operation-search-rules.ts"

// What AssetOperationPicker shows, as plain data (server search spec 6.1, 6.3). Client-safe and pure. The parameter
// names and the 2-character rule stay in asset-operation-search-rules.ts (S-R21); this file only reads them.

export const assetOperationPickerDebounceMs = 250
/** The รับคืน group of assets nobody holds (S-R23). */
export const assetOperationNoHolderGroupKey = "none"

export type AssetOperationPickerContext = { assignCustodian?: boolean; handedOverAssetId?: string | null }

/** The URL to ask, or null while there is nothing to ask (no id, and fewer than 2 or more than 100 characters). With an id, q is ignored. */
export function buildAssetOperationSearchUrl(input: {
  mode: AssetOperationMode
  q?: string
  id?: string
  context?: AssetOperationPickerContext
}): string | null {
  const { mode, id, context } = input
  if (!id && (!isAssetOperationSearchReady(input.q ?? "") || isAssetOperationSearchTooLong(input.q ?? ""))) return null
  return buildAssetOperationSearchHref({
    mode,
    ...(id ? { id } : { q: (input.q ?? "").trim() }),
    assignCustodian: context?.assignCustodian,
    handedOverAssetId: context?.handedOverAssetId,
  })
}

/** An answer keyed by the URL it answers; answer null = the request failed. */
export type AssetOperationPickerResult = { key: string; answer: AssetOperationSearchAnswer | null }
export type AssetOperationPickerState = "hint" | "loading" | "error" | "empty" | "results"

/** An answer counts only for the very URL being asked, so an older answer never shows for a newer text. */
export function getAssetOperationPickerState(input: {
  query: string
  requestKey: string | null
  result: AssetOperationPickerResult | null
}): AssetOperationPickerState {
  const { query, requestKey, result } = input
  if (!isAssetOperationSearchReady(query) || requestKey === null) return "hint"
  if (!result || result.key !== requestKey) return "loading"
  if (result.answer === null) return "error"
  return result.answer.rows.length === 0 ? "empty" : "results"
}

export function getAssetOperationCountLine(answer: Pick<AssetOperationSearchAnswer, "total" | "rows">): {
  count: number
  shown: number
  more: boolean
} {
  const shown = answer.rows.length
  return { count: answer.total, shown, more: answer.total > shown }
}

export type AssetOperationRowNote = { kind: "chosen" } | { kind: "reason"; key: string } | null

/** Chosen already wins over the transaction's reason. */
export function getAssetOperationRowView(
  row: Pick<AssetOperationSearchRow, "id" | "eligible" | "reasonKey">,
  chosenIds: ReadonlySet<string>,
): { selectable: boolean; note: AssetOperationRowNote } {
  if (chosenIds.has(row.id)) return { selectable: false, note: { kind: "chosen" } }
  if (!row.eligible) return { selectable: false, note: row.reasonKey ? { kind: "reason", key: row.reasonKey } : null }
  return { selectable: true, note: null }
}

export type AssetOperationRowDetail =
  | { kind: "handover"; documentNo: string; checkoutDate: string }
  | { kind: "legacy"; locationLabel: string }
  | { kind: "place"; statusLabel: string; placeLabel: string }

/** The second line: the handover document (only with a number, S-R22), ข้อมูลเก่า and where it is (S-R47), else status and place. */
export function getAssetOperationRowDetail(row: AssetOperationSearchRow): AssetOperationRowDetail {
  if (row.checkout?.documentNo) return { kind: "handover", documentNo: row.checkout.documentNo, checkoutDate: row.checkout.checkoutDate }
  if (row.legacy) return { kind: "legacy", locationLabel: row.locationLabel }
  return { kind: "place", statusLabel: row.statusLabel, placeLabel: row.placeLabel }
}

export type AssetOperationSection = { group: AssetOperationSearchGroup | null; rows: AssetOperationSearchRow[] }

/** One flat section without groups; else the server's group order, empty groups dropped, stray rows in a last section. */
export function buildAssetOperationSections(answer: AssetOperationSearchAnswer): AssetOperationSection[] {
  if (!answer.groups) return [{ group: null, rows: answer.rows }]
  const keys = new Set(answer.groups.map((group) => group.key))
  const sections: AssetOperationSection[] = []
  for (const group of answer.groups) {
    const rows = answer.rows.filter((row) => row.holderKey === group.key)
    if (rows.length > 0) sections.push({ group, rows })
  }
  const stray = answer.rows.filter((row) => row.holderKey === undefined || !keys.has(row.holderKey))
  if (stray.length > 0) sections.push({ group: null, rows: stray })
  return sections
}

/**
 * The active row: the one the pointer or the arrows chose while it can still be taken; else the first row only when it
 * can be taken, so Enter never takes a lower row when the exact match cannot be taken.
 */
export function resolveAssetOperationActive(options: readonly { id: string; selectable: boolean }[], activeId: string | null): number {
  const index = activeId === null ? -1 : options.findIndex((option) => option.id === activeId)
  if (index >= 0) return options[index].selectable ? index : -1
  return options[0]?.selectable ? 0 : -1
}

/** The next row that can be taken in the step's direction, wrapping; -1 when none can be taken. */
export function moveAssetOperationActive(options: readonly { selectable: boolean }[], current: number, step: 1 | -1): number {
  const n = options.length
  if (n === 0) return -1
  let index = current < 0 ? (step === 1 ? -1 : n) : current
  for (let tried = 0; tried < n; tried += 1) {
    index = (index + step + n) % n
    if (options[index].selectable) return index
  }
  return -1
}
