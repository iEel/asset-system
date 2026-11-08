import assert from "node:assert/strict"
import test from "node:test"

import {
  accessPreview,
  fillFromEmployee,
  grantLockReason,
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
