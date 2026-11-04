import assert from "node:assert/strict"
import test from "node:test"

import {
  approvalInboxSelectionScope,
  approvalInboxSeenStorageKey,
  approvalInboxSelectionStorageKey,
  parseApprovalInboxSeen,
  parseStoredSelection,
  restoreSelection,
  selectAll,
  selectAllKind,
  toggleSelection,
  unopened,
  type StoredSelection,
} from "../src/lib/approval-inbox-selection.ts"

// Group 6 plan 2 Task 3 (spec §7.4): the inbox selection, kept across pages in sessionStorage, one kind at a time,
// up to 200.

const scope = approvalInboxSelectionScope({ tab: "all", search: "", overdue: false })
const ids = (count: number, prefix = "d") => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`)

test("the storage keys are the inbox's own", () => {
  assert.equal(approvalInboxSelectionStorageKey, "approval-inbox-selection")
  assert.equal(approvalInboxSeenStorageKey, "approval-inbox-seen")
})

test("the scope joins the tab, the search and the overdue filter, and changes with each", () => {
  const base = { tab: "all" as const, search: "", overdue: false }
  const scopes = new Set([
    approvalInboxSelectionScope(base),
    approvalInboxSelectionScope({ ...base, tab: "disposal" }),
    approvalInboxSelectionScope({ ...base, search: "printer" }),
    approvalInboxSelectionScope({ ...base, overdue: true }),
  ])
  assert.equal(scopes.size, 4)
})

test("restoreSelection drops ids that are no longer tickable (Review Focus 2)", () => {
  const stored: StoredSelection = { kind: "disposal", ids: ["a", "b", "c"], scope }
  assert.deepEqual(restoreSelection(stored, scope, { disposal: ["a", "c", "z"], finding: ["b"] }), { kind: "disposal", ids: ["a", "c"], scope })
})

test("restoreSelection returns null when the scope changed", () => {
  const stored: StoredSelection = { kind: "disposal", ids: ["a"], scope }
  const other = approvalInboxSelectionScope({ tab: "disposal", search: "", overdue: false })
  assert.equal(restoreSelection(stored, other, { disposal: ["a"], finding: [] }), null)
})

test("restoreSelection returns null when nothing is left, or nothing was stored", () => {
  const stored: StoredSelection = { kind: "finding", ids: ["f1"], scope }
  assert.equal(restoreSelection(stored, scope, { disposal: ["f1"], finding: [] }), null)
  assert.equal(restoreSelection(null, scope, { disposal: ["a"], finding: [] }), null)
})

test("toggleSelection: ticking a finding while disposal ids are held restarts the selection with it", () => {
  const current: StoredSelection = { kind: "disposal", ids: ["a", "b"], scope }
  assert.deepEqual(toggleSelection(current, "finding", "f1", scope), {
    next: { kind: "finding", ids: ["f1"], scope },
    refused: null,
    restarted: true,
  })
})

test("toggleSelection: the first tick starts a selection, a second adds to it, without a restart", () => {
  const first = toggleSelection(null, "disposal", "a", scope)
  assert.deepEqual(first, { next: { kind: "disposal", ids: ["a"], scope }, refused: null, restarted: false })
  assert.deepEqual(toggleSelection(first.next, "disposal", "b", scope).next, { kind: "disposal", ids: ["a", "b"], scope })
})

test("toggleSelection: the 201st tick is refused and the selection stays", () => {
  const current: StoredSelection = { kind: "disposal", ids: ids(200), scope }
  const result = toggleSelection(current, "disposal", "d201", scope)
  assert.equal(result.refused, "limit")
  assert.equal(result.restarted, false)
  assert.equal(result.next, current)
})

test("toggleSelection: unticking the last id leaves no selection", () => {
  const current: StoredSelection = { kind: "finding", ids: ["f1"], scope }
  assert.deepEqual(toggleSelection(current, "finding", "f1", scope), { next: null, refused: null, restarted: false })
})

test("toggleSelection: a stored selection of another scope is not added to", () => {
  const old: StoredSelection = { kind: "disposal", ids: ["a"], scope: "old" }
  assert.deepEqual(toggleSelection(old, "disposal", "b", scope).next, { kind: "disposal", ids: ["b"], scope })
})

test("selectAll with 250 ids takes the first 200 in order and says it was capped (Review Focus 1)", () => {
  const all = ids(250)
  const result = selectAll("disposal", all, scope)
  assert.equal(result.capped, true)
  assert.equal(result.next.ids.length, 200)
  assert.deepEqual(result.next.ids, all.slice(0, 200))
  assert.equal(result.next.kind, "disposal")
  assert.equal(result.next.scope, scope)
  assert.equal(selectAll("finding", ids(3, "f"), scope).capped, false)
})

test("unopened lists the ids not seen in the panel, in order", () => {
  assert.deepEqual(unopened(["a", "b", "c"], new Set(["disposal:b"]), "disposal"), ["a", "c"])
  assert.deepEqual(unopened(["a", "b"], new Set(["finding:a"]), "disposal"), ["a", "b"])
})

test("a stored selection is read defensively: anything malformed is no selection", () => {
  assert.deepEqual(parseStoredSelection(JSON.stringify({ kind: "finding", ids: ["f1"], scope })), { kind: "finding", ids: ["f1"], scope })
  for (const raw of [null, "", "{", "[]", JSON.stringify({ kind: "round", ids: ["r"], scope }), JSON.stringify({ kind: "disposal", ids: [1], scope }), JSON.stringify({ kind: "disposal", ids: ["a"] })]) {
    assert.equal(parseStoredSelection(raw), null, String(raw))
  }
})

test("the seen list is a JSON array of <key>:<id>; anything else is empty", () => {
  assert.deepEqual([...parseApprovalInboxSeen(JSON.stringify(["disposal:a", "finding:b", 3]))], ["disposal:a", "finding:b"])
  assert.equal(parseApprovalInboxSeen(null).size, 0)
  assert.equal(parseApprovalInboxSeen("nope").size, 0)
})

// Fix round 1 (controller review): "เลือกทั้งหมดที่อนุมัติได้" above the queue picks its kind before any tick.
test("selectAllKind: the disposal tab selects disposal, the audit tab findings, each only when it has tickable rows", () => {
  const both = { disposal: ["d1"], finding: ["f1"] }
  assert.equal(selectAllKind("disposal", null, both), "disposal")
  assert.equal(selectAllKind("audit", null, both), "finding")
  assert.equal(selectAllKind("disposal", null, { disposal: [], finding: [] }), null)
  assert.equal(selectAllKind("audit", null, { disposal: ["d1"], finding: [] }), null)
})

test("selectAllKind: the all tab takes the kind already ticked, else disposal when it has tickable rows, else findings", () => {
  const both = { disposal: ["d1"], finding: ["f1"] }
  assert.equal(selectAllKind("all", { kind: "finding", ids: ["f1"], scope }, both), "finding")
  assert.equal(selectAllKind("all", { kind: "disposal", ids: ["d1"], scope }, both), "disposal")
  assert.equal(selectAllKind("all", null, both), "disposal")
  assert.equal(selectAllKind("all", null, { disposal: [], finding: ["f1"] }), "finding")
  assert.equal(selectAllKind("all", null, { disposal: [], finding: [] }), null)
  // A ticked kind with nothing left to tick falls back to the other kind.
  assert.equal(selectAllKind("all", { kind: "finding", ids: ["gone"], scope }, { disposal: ["d1"], finding: [] }), "disposal")
})
