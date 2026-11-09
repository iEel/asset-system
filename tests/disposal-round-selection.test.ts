import assert from "node:assert/strict"
import test from "node:test"

import {
  DISPOSAL_ROUND_SELECTION_MAX,
  disposalRoundSelectionScope,
  disposalRoundSelectionStorageKey,
  parseStoredRoundSelection,
  restoreRoundSelection,
  selectAllRound,
  toggleRoundSelection,
  type StoredRoundSelection,
} from "../src/lib/disposal-round-selection.ts"
import { MAX_DISPOSAL_ROUND_ITEMS } from "../src/lib/validations/disposal-round.ts"

// Group 6 plan 4 Task 3 (spec §10.2, P4-R2): the queue's approved tab keeps its ticks across pages in sessionStorage,
// up to 200 (one round), and hands them to /disposal/rounds/new. The same cases as the inbox selection (plan 2).

const scope = disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "" })
const ids = (count: number, prefix = "r") => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`)

test("the storage key is the round's own, and the limit is the round's 200", () => {
  assert.equal(disposalRoundSelectionStorageKey, "disposal-round-selection")
  assert.equal(DISPOSAL_ROUND_SELECTION_MAX, 200)
  assert.equal(DISPOSAL_ROUND_SELECTION_MAX, MAX_DISPOSAL_ROUND_ITEMS)
})

test("the scope joins the search, the type and the request dates, and changes with each", () => {
  const base = { search: "", disposalType: "", dateFrom: "", dateTo: "" }
  const scopes = new Set([
    disposalRoundSelectionScope(base),
    disposalRoundSelectionScope({ ...base, search: "printer" }),
    disposalRoundSelectionScope({ ...base, disposalType: "sell" }),
    disposalRoundSelectionScope({ ...base, dateFrom: "2026-11-01" }),
    disposalRoundSelectionScope({ ...base, dateTo: "2026-11-04" }),
  ])
  assert.equal(scopes.size, 5)
  assert.equal(disposalRoundSelectionScope({ ...base, search: "  printer " }), disposalRoundSelectionScope({ ...base, search: "printer" }))
})

test("restoreRoundSelection prunes the ids that are no longer tickable", () => {
  const stored: StoredRoundSelection = { ids: ["a", "b", "c"], scope }
  assert.deepEqual(restoreRoundSelection(stored, scope, ["a", "c", "z"]), { ids: ["a", "c"], scope })
})

test("restoreRoundSelection returns null when the scope changed, nothing is left, or nothing was stored", () => {
  const other = disposalRoundSelectionScope({ search: "x", disposalType: "", dateFrom: "", dateTo: "" })
  assert.equal(restoreRoundSelection({ ids: ["a"], scope }, other, ["a"]), null)
  assert.equal(restoreRoundSelection({ ids: ["gone"], scope }, scope, ["a"]), null)
  assert.equal(restoreRoundSelection(null, scope, ["a"]), null)
})

test("toggleRoundSelection: the first tick starts a selection, a second adds to it, an untick removes it", () => {
  const first = toggleRoundSelection(null, "a", scope)
  assert.deepEqual(first, { next: { ids: ["a"], scope }, refused: null })
  const second = toggleRoundSelection(first.next, "b", scope)
  assert.deepEqual(second.next, { ids: ["a", "b"], scope })
  assert.deepEqual(toggleRoundSelection(second.next, "a", scope).next, { ids: ["b"], scope })
})

test("toggleRoundSelection: unticking the last id leaves no selection", () => {
  assert.deepEqual(toggleRoundSelection({ ids: ["a"], scope }, "a", scope), { next: null, refused: null })
})

test("toggleRoundSelection: the 201st tick is refused and the selection stays", () => {
  const current: StoredRoundSelection = { ids: ids(200), scope }
  const result = toggleRoundSelection(current, "r201", scope)
  assert.equal(result.refused, "limit")
  assert.equal(result.next, current)
})

test("toggleRoundSelection: a stored selection of another scope is not added to", () => {
  assert.deepEqual(toggleRoundSelection({ ids: ["a"], scope: "old" }, "b", scope).next, { ids: ["b"], scope })
})

test("selectAllRound with 250 ids takes the first 200 in order and says it was capped", () => {
  const all = ids(250)
  const result = selectAllRound(all, scope)
  assert.equal(result.capped, true)
  assert.equal(result.next.ids.length, 200)
  assert.deepEqual(result.next.ids, all.slice(0, 200))
  assert.equal(result.next.scope, scope)
  assert.equal(selectAllRound(ids(3), scope).capped, false)
})

test("a stored selection is read defensively: anything malformed is no selection", () => {
  assert.deepEqual(parseStoredRoundSelection(JSON.stringify({ ids: ["a"], scope })), { ids: ["a"], scope })
  for (const raw of [null, "", "{", "[]", JSON.stringify({ ids: [1], scope }), JSON.stringify({ ids: ["a"] }), JSON.stringify({ ids: "a", scope })]) {
    assert.equal(parseStoredRoundSelection(raw), null, String(raw))
  }
})

// ยืนยันผลตรวจ plan 4 task 2: the audit round filter is part of the scope, and only when set.
test("the scope carries the audit round only when set, and changes with it", () => {
  const base = { search: "", disposalType: "", dateFrom: "", dateTo: "" }
  assert.equal(disposalRoundSelectionScope({ ...base, auditRound: "" }), disposalRoundSelectionScope(base))
  assert.equal(disposalRoundSelectionScope(base), JSON.stringify(["", "", "", ""]), "a scope without a round reads as before")
  assert.notEqual(disposalRoundSelectionScope({ ...base, auditRound: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" }), disposalRoundSelectionScope(base))
})
