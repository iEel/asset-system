import { LABEL_PRINT_BATCH_MAX, type LabelPrintQueueMode, type LabelPrintQueueSort } from "./asset-label-print-tracking.ts"
import type { LabelQueueLocale, LabelQueueRow } from "./asset-label-queue.ts"

// The labels page's queue rules (group 4 plan 6 Task 4, spec §11): the add-all numbers (P6-R3), the print list's cap
// (P6-R2), the queue's paging (P6-R7), the lookup (P6-R11) and the words of a row. Pure, so node --test runs them.

// The queue shows 20 rows first, then "แสดงอีก 10 รายการ" asks for 10 more from where it is (P6-R7).
export const LABEL_QUEUE_FIRST_PAGE = 20
export const LABEL_QUEUE_MORE_STEP = 10

export type LabelQueueFilters = {
  mode: LabelPrintQueueMode
  sort: LabelPrintQueueSort
  companyId: string
  branchId: string
  categoryId: string
  locationId: string
  createdFrom: string
  createdTo: string
}

export const defaultLabelQueueFilters: LabelQueueFilters = {
  mode: "unprinted",
  sort: "created_desc",
  companyId: "all",
  branchId: "all",
  categoryId: "all",
  locationId: "all",
  createdFrom: "",
  createdTo: "",
}

const filterKeys = ["companyId", "branchId", "categoryId", "locationId", "createdFrom", "createdTo"] as const

/** The queue GET's query: mode, sort, one page (skip + pageSize) and the filters that are set. */
export function buildLabelQueueSearch(filters: LabelQueueFilters, page: { pageSize: number; skip: number; locale: LabelQueueLocale }) {
  const params = new URLSearchParams({
    mode: filters.mode,
    sort: filters.sort,
    pageSize: String(page.pageSize),
    skip: String(page.skip),
    locale: page.locale,
  })
  for (const key of filterKeys) {
    const value = filters[key]
    if (value && value !== "all") params.set(key, value)
  }
  return params.toString()
}

/** The lookup's query (`?ids=`, at most 100): rows for given ids, in their order, with their real print state. */
export function buildLabelLookupSearch(ids: readonly string[], locale: LabelQueueLocale) {
  return new URLSearchParams({ ids: ids.join(","), locale }).toString()
}

/** "แสดงอีก 10 รายการ" appends; a row the queue already shows is not shown twice. */
export function appendQueueRows<T extends { id: string }>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(current.map((item) => item.id))
  const next = [...current]
  for (const item of incoming) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    next.push(item)
  }
  return next
}

/** P6-R13: on coming back to the page the queue asks again from the top for as many rows as it shows (20 to 100). */
export function queueRefreshPageSize(shown: number) {
  return Math.min(Math.max(shown, LABEL_QUEUE_FIRST_PAGE), LABEL_PRINT_BATCH_MAX)
}

/** Ids the lookup did not return (deactivated since the queue loaded): add-all says how many it could not add. */
export function lookupMissingCount(ids: readonly string[], rows: readonly { id: string }[]) {
  const found = new Set(rows.map((row) => row.id))
  return ids.filter((id) => !found.has(id)).length
}

/** How many more labels the print list takes (P6-R2): 100 less what it holds, never below 0. */
export function printListRoom(size: number, max = LABEL_PRINT_BATCH_MAX) {
  return Math.max(0, max - size)
}

export type PrintListAdd<T> = { next: T[]; added: number; requested: number }

/**
 * Adds rows to the print list in their order, from any source (search, a row, add-all, the incoming ids). A row already
 * listed is no request; the rest go in while there is room (P6-R2), so the list never passes 100.
 */
export function mergeIntoPrintList<T extends { id: string }>(current: readonly T[], incoming: readonly T[], max = LABEL_PRINT_BATCH_MAX): PrintListAdd<T> {
  const seen = new Set(current.map((item) => item.id))
  const fresh: T[] = []
  for (const item of incoming) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    fresh.push(item)
  }
  const taken = fresh.slice(0, printListRoom(current.length, max))
  return { next: [...current, ...taken], added: taken.length, requested: fresh.length }
}

export type PrintListStatus = { key: "listRefused"; values: { added: number; requested: number; max: number } } | { key: "listFull" } | null

/** The print list's status line: what an add could not take, or that the list is full. */
export function printListStatusKey(size: number, lastAdd: { added: number; requested: number } | null, max = LABEL_PRINT_BATCH_MAX): PrintListStatus {
  if (lastAdd && lastAdd.added < lastAdd.requested) return { key: "listRefused", values: { added: lastAdd.added, requested: lastAdd.requested, max } }
  if (size >= max) return { key: "listFull" }
  return null
}

export type AddAllCounts = {
  // ตรงตัวกรอง: every match of the filters.
  a: number
  // อยู่ในรายการพิมพ์แล้ว: of the first 100 matches (the ids the queue answers).
  b: number
  // จะเพิ่มใหม่: what the button adds, never more than the list's room.
  c: number
  // The list's room cut c.
  capped: boolean
  // เหลืออีก: the matches past the first 100.
  left: number
  // The ids c adds, in queue order.
  addIds: string[]
}

/**
 * The add-all box (P6-R3). `total` is the queue's total and `matchIds` its first ≤ 100 matching ids in queue order;
 * the number on the button is c, what will be added.
 */
export function addAllCounts({ total, matchIds, selectedIds, room }: {
  total: number
  matchIds: readonly string[]
  selectedIds: ReadonlySet<string>
  room: number
}): AddAllCounts {
  const a = Math.max(total, matchIds.length)
  const fresh = matchIds.filter((id) => !selectedIds.has(id))
  const c = Math.min(fresh.length, Math.max(0, room))
  return {
    a,
    b: matchIds.length - fresh.length,
    c,
    capped: c < fresh.length,
    left: Math.max(0, a - matchIds.length),
    addIds: fresh.slice(0, c),
  }
}

/**
 * The add-all button's words (P6-R3): "เพิ่ม 100 รายการแรก" when it adds the first 100 of more; "เพิ่มทั้งหมด {c}" when
 * nothing is listed and the room takes all; otherwise "เพิ่ม {c}".
 */
export function labelButtonKey({ b, c, capped, left }: Pick<AddAllCounts, "b" | "c" | "capped" | "left">): "addFirst100" | "addAll" | "addSome" {
  if (left > 0 && c === LABEL_PRINT_BATCH_MAX) return "addFirst100"
  if (b === 0 && !capped) return "addAll"
  return "addSome"
}

/** The line under the add-all numbers: why nothing is added, or that the room cut it. */
export function addAllNoteKey({ a, c, capped }: Pick<AddAllCounts, "a" | "c" | "capped">, room: number): "queueEmpty" | "listFull" | "addAllNone" | "addAllRoom" | null {
  if (a === 0) return "queueEmpty"
  if (room <= 0) return "listFull"
  if (c === 0) return "addAllNone"
  if (capped) return "addAllRoom"
  return null
}

/** The holder part of a row's second line: ส่วนกลาง for a shared asset, else the holder's name. */
export function labelQueueRowHolder(row: Pick<LabelQueueRow, "ownershipType" | "holder">, sharedLabel: string): string | null {
  if (row.ownershipType === "shared") return sharedLabel
  return row.holder?.name ?? null
}

/** ป้ายเดิม: the tag on the label when it is not today's tag (a change of case counts, P6-R6). */
export function labelQueueOldTag(row: Pick<LabelQueueRow, "assetTag" | "lastPrint">): string | null {
  if (!row.lastPrint || row.lastPrint.assetTag === row.assetTag) return null
  return row.lastPrint.assetTag
}

/** Names shown on more than one row; their add buttons carry the tag too, as the board names them. */
export function labelDuplicateNames(rows: readonly Pick<LabelQueueRow, "name">[]): Set<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.name)) duplicates.add(row.name)
    seen.add(row.name)
  }
  return duplicates
}

export type LabelRowName =
  | { key: "rowListed"; values: { name: string } }
  | { key: "rowAddWithTag"; values: { name: string; tag: string } }
  | { key: "rowAdd"; values: { name: string } }

/** A row button's name (board): "อยู่ในรายการพิมพ์แล้ว: <name>" or "เพิ่ม <name> [<tag>] เข้ารายการพิมพ์". */
export function labelRowNameKey(row: Pick<LabelQueueRow, "name" | "assetTag">, { listed, duplicateNames }: { listed: boolean; duplicateNames: ReadonlySet<string> }): LabelRowName {
  if (listed) return { key: "rowListed", values: { name: row.name } }
  if (duplicateNames.has(row.name)) return { key: "rowAddWithTag", values: { name: row.name, tag: row.assetTag } }
  return { key: "rowAdd", values: { name: row.name } }
}
