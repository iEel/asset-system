import assert from "node:assert/strict"
import test from "node:test"

import {
  accessPreview,
  fillFromEmployee,
  grantLockReason,
  pickEmployee,
  roleChangeMarks,
  suggestUsername,
  type FormRole,
} from "../src/lib/admin-user-form-model.ts"

// Page group 11 plan 2 task 3: the pure model behind the create/edit user form.

function role(id: string, permissionKeys: string[], isActive = true): FormRole {
  return { id, name: id, label: `label-${id}`, isSystem: false, isActive, permissionKeys, lockReason: null }
}

const r1 = role("r1", ["asset:view", "asset:edit"])
const r2 = role("r2", ["asset:view", "disposal:approve"])
const r3 = role("r3", ["asset:view"])
const inactive = role("inactive", ["asset:delete"], false)
const roles = [r1, r2, r3, inactive]

test("marks added and removed roles", () => {
  assert.deepEqual(roleChangeMarks(["a", "b"], ["b", "c"]), { added: ["c"], removed: ["a"] })
})

test("preview counts active permissions before and after", () => {
  const preview = accessPreview(roles, ["r1", "inactive"], ["r1", "r2"])
  assert.equal(preview.beforeCount, 2)
  assert.equal(preview.afterCount, 3)
  const operations = preview.rows.find((row) => row.group === "operations")
  assert.ok(operations)
  assert.deepEqual(operations.gained, ["approve"])
  assert.deepEqual(operations.lost, [])
  assert.deepEqual(preview.highRiskGained, ["disposal:approve"])
  const assets = preview.rows.find((row) => row.group === "assets")
  assert.ok(assets)
  assert.deepEqual(assets.before, ["view", "edit"])
  assert.deepEqual(assets.after, ["view", "edit"])
  assert.deepEqual(assets.gained, [])
  assert.deepEqual(preview.rows.map((row) => row.group), ["assets", "transactions", "operations", "masterData", "system"])
})

test("a removed role covered by another loses nothing", () => {
  const preview = accessPreview(roles, ["r1", "r3"], ["r1"])
  assert.deepEqual(preview.coveredRemovals, [r3.label])
  const notCovered = accessPreview(roles, ["r1", "r2"], ["r1"])
  assert.deepEqual(notCovered.coveredRemovals, [])
  const assets = notCovered.rows.find((row) => row.group === "assets")
  assert.deepEqual(assets?.lost, [])
  const operations = notCovered.rows.find((row) => row.group === "operations")
  assert.deepEqual(operations?.lost, ["approve"])
})

// Plan 2 task 4 ruling: the "loses nothing" note is only for a removed role that granted something, so an inactive
// role (it grants nothing) and a role with no permission keys never produce it.
test("an inactive or empty removed role is not a covered removal", () => {
  const empty = role("empty", [])
  const preview = accessPreview([...roles, empty], ["r1", "inactive", "empty"], ["r1"])
  assert.deepEqual(preview.coveredRemovals, [])
})

test("system_admin locks for non-admins", () => {
  assert.equal(
    grantLockReason({ name: "system_admin", permissionKeys: ["asset:view"] }, { roles: ["it"], permissions: ["asset:view"] }),
    "systemAdminOnly"
  )
})

test("a role with permissions the actor lacks is locked", () => {
  const target = { name: "approver", permissionKeys: ["asset:view", "disposal:approve"] }
  assert.equal(grantLockReason(target, { roles: ["it"], permissions: ["asset:view"] }), "missingPermissions")
  assert.equal(grantLockReason(target, { roles: ["it"], permissions: ["asset:view", "disposal:approve"] }), null)
  assert.equal(grantLockReason(target, { roles: ["system_admin"], permissions: [] }), null)
  assert.equal(grantLockReason({ name: "system_admin", permissionKeys: [] }, { roles: ["system_admin"], permissions: [] }), null)
})

test("auto-fill never overwrites typed fields", () => {
  assert.deepEqual(
    fillFromEmployee({ displayName: "ชื่อเอง", email: "", username: "" }, { fullNameTh: "สมชาย", email: "somchai.k@x.com" }),
    { displayName: "ชื่อเอง", email: "somchai.k@x.com", username: "somchai.k" }
  )
  assert.deepEqual(
    fillFromEmployee({ displayName: "", email: "", username: "typed" }, { fullNameTh: "สมชาย", email: null }),
    { displayName: "สมชาย", email: "", username: "typed" }
  )
})

test("no suggestion without an email", () => {
  assert.equal(suggestUsername(null), null)
  assert.equal(suggestUsername(undefined), null)
  assert.equal(suggestUsername("abc"), null)
  assert.equal(suggestUsername("@x"), null)
  assert.equal(suggestUsername("  somchai.k@x.com "), "somchai.k")
})

// Final review: a group row reads เหมือนเดิม only when its permission keys are equal. New module rights for an action the
// group already had show as module gains (for example +แก้ไข (ผู้ใช้)), lost ones as module losses.
test("new module rights for an action already held are not Unchanged", () => {
  const roleEditor = role("re", ["role:edit"])
  const userEditor = role("ue", ["user:edit"])
  const userManager = role("um", ["user:create", "user:edit"])
  const all = [roleEditor, userEditor, userManager]

  const widened = accessPreview(all, ["re"], ["re", "ue"]).rows.find((row) => row.group === "system")
  assert.ok(widened)
  assert.deepEqual(widened.gained, [])
  assert.deepEqual(widened.moduleGains, [{ action: "edit", modules: ["user"] }])
  assert.deepEqual(widened.moduleLosses, [])

  const managed = accessPreview(all, ["re"], ["re", "um"]).rows.find((row) => row.group === "system")
  assert.deepEqual(managed?.gained, ["create"])
  assert.deepEqual(managed?.moduleGains, [{ action: "edit", modules: ["user"] }])

  const narrowed = accessPreview(all, ["re", "ue"], ["re"]).rows.find((row) => row.group === "system")
  assert.deepEqual(narrowed?.lost, [])
  assert.deepEqual(narrowed?.moduleLosses, [{ action: "edit", modules: ["user"] }])

  const same = accessPreview(all, ["re"], ["re"]).rows.find((row) => row.group === "system")
  assert.deepEqual([same?.gained, same?.lost, same?.moduleGains, same?.moduleLosses], [[], [], [], []])
})

// Final review: values a pick filled count as auto-filled, so a new pick (or เลิกผูก) replaces (or clears) them; a field
// the administrator typed, or changed after the fill, stays.
test("re-picking an employee replaces the previous auto-filled fields", () => {
  const a = { fullNameTh: "สมชาย ก", email: "somchai.k@x.com" }
  const b = { fullNameTh: "สมหญิง ข", email: "somying.b@x.com" }
  const empty = { displayName: "", email: "", username: "" }

  const first = pickEmployee(empty, {}, a)
  assert.deepEqual(first.values, { displayName: "สมชาย ก", email: "somchai.k@x.com", username: "somchai.k" })
  assert.deepEqual(first.autoFilled, first.values)

  const second = pickEmployee(first.values, first.autoFilled, b)
  assert.deepEqual(second.values, { displayName: "สมหญิง ข", email: "somying.b@x.com", username: "somying.b" })

  const typed = pickEmployee({ ...first.values, displayName: "ชื่อที่พิมพ์" }, first.autoFilled, b)
  assert.equal(typed.values.displayName, "ชื่อที่พิมพ์")
  assert.equal("displayName" in typed.autoFilled, false)
  assert.equal(typed.values.username, "somying.b")

  const unlinked = pickEmployee(first.values, first.autoFilled, null)
  assert.deepEqual(unlinked, { values: empty, autoFilled: {} })

  // B has no email: A's email and the username made from it are cleared, not kept.
  const noEmail = pickEmployee(first.values, first.autoFilled, { fullNameTh: "สมหญิง ข", email: null })
  assert.deepEqual(noEmail.values, { displayName: "สมหญิง ข", email: "", username: "" })
})
