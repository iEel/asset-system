// ย้ายที่ตั้งหลายรายการ's form rules (group 3 spec §10.1-§10.2; plan 4 Task 5, P4-R1, P4-R3, P4-R8 to P4-R10, P4-R15,
// P4-R17, P4-R18). The selection is a map of row snapshots keyed by asset id, in the order the rows were ticked, kept
// across pages and filters (DESIGN.md's bulk-move exception) and capped at bulkMoveMaxAssets. Pure and client-safe:
// the page draws the header, the boxes, the review and the result line from these values and writes the words.
import { bulkMoveMaxAssets, type BulkMoveListRow, type BulkMoveRoomOption } from "./bulk-move-list-rules.ts"

export type BulkMoveSelection = ReadonlyMap<string, BulkMoveListRow>
/** `capped`: a tick the caller asked for was refused because the selection was already full (informational, Z3). */
export type BulkMoveTickResult = { selection: BulkMoveSelection; capped: boolean }

/** A tick appends the row's snapshot; an untick always works; a ticked or refused row is never ticked again. */
export function toggleBulkMoveRow(selection: BulkMoveSelection, row: BulkMoveListRow, checked: boolean): BulkMoveTickResult {
  if (!checked) {
    if (!selection.has(row.id)) return { selection, capped: false }
    const next = new Map(selection)
    next.delete(row.id)
    return { selection: next, capped: false }
  }
  if (selection.has(row.id) || !row.eligible) return { selection, capped: false }
  if (selection.size >= bulkMoveMaxAssets) return { selection, capped: true }
  const next = new Map(selection)
  next.set(row.id, row)
  return { selection: next, capped: false }
}

/** เลือกทั้งหมดในหน้านี้: ticks the page's eligible rows in order up to the cap; unticking drops every ticked id of the page. */
export function setBulkMovePage(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[], checked: boolean): BulkMoveTickResult {
  let next: Map<string, BulkMoveListRow> | null = null
  if (!checked) {
    for (const row of rows) {
      if (!selection.has(row.id)) continue
      next ??= new Map(selection)
      next.delete(row.id)
    }
    return { selection: next ?? selection, capped: false }
  }
  let capped = false
  for (const row of rows) {
    if (selection.has(row.id) || !row.eligible) continue
    if ((next ?? selection).size >= bulkMoveMaxAssets) {
      capped = true
      break
    }
    next ??= new Map(selection)
    next.set(row.id, row)
  }
  return { selection: next ?? selection, capped }
}

/** The header box for the page on screen: "all" when a row is ticked and nothing more on the page can be ticked. */
export function getBulkMovePageState(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): "none" | "some" | "all" {
  if (!rows.some((row) => selection.has(row.id))) return "none"
  const canTickMore = selection.size < bulkMoveMaxAssets && rows.some((row) => row.eligible && !selection.has(row.id))
  return canTickMore ? "some" : "all"
}

/** null = the box is enabled. A ticked row can always be unticked; a refused row's own reason wins over the cap. */
export function getBulkMoveRowLock(selection: BulkMoveSelection, row: BulkMoveListRow): "blocked" | "cap" | null {
  if (selection.has(row.id)) return null
  if (!row.eligible) return "blocked"
  if (selection.size >= bulkMoveMaxAssets) return "cap"
  return null
}

/** A fetched page replaces the snapshot of every ticked row it shows, in its place; it never ticks or unticks (P4-R9). */
export function refreshBulkMoveSelection(selection: BulkMoveSelection, rows: readonly BulkMoveListRow[]): BulkMoveSelection {
  let next: Map<string, BulkMoveListRow> | null = null
  for (const row of rows) {
    if (!selection.has(row.id)) continue
    next ??= new Map(selection)
    next.set(row.id, row)
  }
  return next ?? selection
}

/** นำรายการที่ย้ายไม่ได้ออก: unticks every named id, wherever its row is (P4-R8). */
export function removeBulkMoveIds(selection: BulkMoveSelection, ids: readonly string[]): BulkMoveSelection {
  let next: Map<string, BulkMoveListRow> | null = null
  for (const id of ids) {
    if (!selection.has(id)) continue
    next ??= new Map(selection)
    next.delete(id)
  }
  return next ?? selection
}

export type BulkMoveReviewCounts = { assets: number; tags: string[]; componentsFollow: number; alreadyThere: number; otherBranch: number; componentsAlone: number }

/** The review's numbers, read from the snapshots only; a row already in the room counts in alreadyThere only (P4-R15, Z11). */
export function getBulkMoveReviewCounts(selection: BulkMoveSelection, room: BulkMoveRoomOption): BulkMoveReviewCounts {
  const tags: string[] = []
  const following = new Set<string>()
  let alreadyThere = 0
  let otherBranch = 0
  let componentsAlone = 0
  for (const row of selection.values()) {
    tags.push(row.assetTag)
    if (row.locationId === room.id) {
      alreadyThere += 1
      continue
    }
    if (row.branchId !== room.branchId) otherBranch += 1
    if (row.componentOf && !selection.has(row.componentOf.parentId)) componentsAlone += 1
    for (const component of row.travellingComponents) {
      if (!selection.has(component.id) && component.currentLocationId !== room.id) following.add(component.id)
    }
  }
  return { assets: selection.size, tags, componentsFollow: following.size, alreadyThere, otherBranch, componentsAlone }
}

export type BulkMoveSaveAnswer = { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The save's 200 answer with exactly its six counts; anything else reads null. */
export function readBulkMoveSaveAnswer(payload: unknown): BulkMoveSaveAnswer | null {
  if (!isRecord(payload) || !isRecord(payload.componentSync)) return null
  const { updated, unchanged } = payload
  const sync = payload.componentSync
  if (!count(updated) || !count(unchanged) || !count(sync.updated) || !count(sync.skipped) || !count(sync.movements)) return null
  return { updated, unchanged, componentSync: { updated: sync.updated, skipped: sync.skipped, movements: sync.movements } }
}

/** The result line: moved, then the ส่วนควบ that followed, then the assets already in the room (P4-R18). */
export function getBulkMoveResultParts(answer: BulkMoveSaveAnswer): { moved: number; components: number; unchanged: number } {
  return { moved: answer.updated, components: answer.componentSync.updated, unchanged: answer.unchanged }
}
