import assert from "node:assert/strict"
import test from "node:test"

import {
  columnState,
  groupSummary,
  permissionMarks,
  segregationWarnings,
  setMany,
} from "../src/lib/role-editor-model.ts"

// Page group 11 plan 3 task 1: the pure model behind the role editor.

test("marks added and removed permissions", () => {
  const initial = new Set(["asset:view", "asset:edit", "audit:view"])
  const current = new Set(["asset:view", "disposal:create", "asset:delete"])
  assert.deepEqual(permissionMarks(initial, current), {
    added: ["asset:delete", "disposal:create"],
    removed: ["asset:edit", "audit:view"],
  })
  assert.deepEqual(permissionMarks(initial, new Set(initial)), { added: [], removed: [] })
})

test("group summary counts per action", () => {
  // ทรัพย์สิน = the "assets" group (dashboard, asset)
  const current = new Set(["dashboard:view", "asset:view", "asset:edit", "audit:view"])
  const summary = groupSummary(current, "assets")
  assert.equal(summary.modules, 2)
  assert.equal(summary.selected, 3)
  assert.equal(summary.total, 12)
  assert.equal(summary.byAction.view, 2)
  assert.equal(summary.byAction.edit, 1)
  assert.equal(summary.byAction.delete, 0)
  assert.equal(groupSummary(new Set(), "masterData").total, 60)
})

test("column state", () => {
  const modules = ["checkout", "checkin", "transfer"]
  assert.equal(columnState(new Set(), "view", modules), "none")
  assert.equal(columnState(new Set(["checkout:view"]), "view", modules), "some")
  assert.equal(columnState(new Set(["checkout:view", "checkin:view", "transfer:view"]), "view", modules), "all")
  assert.equal(columnState(new Set(["checkout:view", "checkin:view", "transfer:view"]), "edit", modules), "none")
  assert.equal(columnState(new Set(["checkout:view"]), "view", []), "none")
})

test("setMany keeps locked keys", () => {
  const current = new Set(["role:view", "user:view"])
  const locked = (key: string) => key === "role:view" || key === "role:edit"
  const on = setMany(current, ["role:view", "role:edit", "user:edit"], true, locked)
  assert.deepEqual([...on].sort(), ["role:view", "user:edit", "user:view"])
  const off = setMany(current, ["role:view", "user:view"], false, locked)
  assert.deepEqual([...off].sort(), ["role:view"])
  assert.notEqual(on, current)
  assert.deepEqual([...current].sort(), ["role:view", "user:view"])
})

test("segregation warning says whether the setting is on", () => {
  assert.deepEqual(segregationWarnings(new Set(["disposal:create", "disposal:approve"]), false), [
    { module: "disposal", settingOn: false },
  ])
  assert.deepEqual(segregationWarnings(new Set(["disposal:create", "disposal:approve"]), true), [
    { module: "disposal", settingOn: true },
  ])
  assert.deepEqual(segregationWarnings(new Set(["audit:create", "audit:approve"]), true), [
    { module: "audit", settingOn: null },
  ])
  assert.deepEqual(segregationWarnings(new Set(["disposal:create"]), true), [])
  assert.deepEqual(segregationWarnings(new Set(["audit:approve"]), false), [])
})
