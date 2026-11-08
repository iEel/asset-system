import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRoleListQuery,
  filterRoles,
  inactiveRolesWithUsers,
  isHighRiskRole,
  parseRoleListFilters,
  roleListCounts,
  type RoleListFilters,
  type RoleListItem,
} from "../src/lib/admin-roles-list.ts"

// Page group 11 plan 3 task 1: the /admin/roles list rules.

const defaults: RoleListFilters = { view: "roles", type: "all", check: null, search: "", page: 1, pageSize: 25 }

function role(overrides: Partial<RoleListItem> & { id: string }): RoleListItem {
  return {
    name: overrides.id,
    label: `label-${overrides.id}`,
    displayName: `display-${overrides.id}`,
    description: null,
    isSystem: false,
    isActive: true,
    userCount: 1,
    permissionKeys: ["asset:view"],
    ...overrides,
  }
}

test("parses filters with defaults", () => {
  assert.deepEqual(parseRoleListFilters({}), defaults)
  assert.deepEqual(
    parseRoleListFilters({ view: "junk", type: "nope", check: "x", search: "  ", page: "-1", pageSize: "30" }),
    defaults
  )
  assert.deepEqual(
    parseRoleListFilters({ view: "matrix", type: "custom", check: "noUsers", search: " ผู้ดูแล ", page: "3", pageSize: "50" }),
    { view: "matrix", type: "custom", check: "noUsers", search: "ผู้ดูแล", page: 3, pageSize: 50 }
  )
  assert.equal(parseRoleListFilters({ type: ["system", "custom"] }).type, "system")
})

test("filters and paging over many roles", () => {
  const roles: RoleListItem[] = Array.from({ length: 1040 }, (_, i) =>
    role({
      id: `r${i}`,
      isSystem: i % 10 === 0,
      isActive: i % 7 !== 0,
      userCount: i % 3 === 0 ? 0 : i,
      permissionKeys: i % 5 === 0 ? ["asset:delete"] : ["asset:view"],
    })
  )
  const kept = filterRoles(roles, { ...defaults, type: "custom", check: "noUsers" })
  assert.ok(kept.length > 0)
  assert.ok(kept.every((r) => !r.isSystem && r.userCount === 0))
  assert.equal(kept.length, roles.filter((r) => !r.isSystem && r.userCount === 0).length)

  const counts = roleListCounts(roles, "")
  assert.equal(counts.all, 1040)
  assert.equal(counts.system + counts.custom, counts.all)
  assert.equal(counts.highRisk, roles.filter((r) => r.permissionKeys.includes("asset:delete")).length)
  assert.equal(counts.noUsers, roles.filter((r) => r.userCount === 0).length)
  assert.equal(counts.inactive, roles.filter((r) => !r.isActive).length)

  assert.equal(filterRoles(roles, { ...defaults, check: "highRisk" }).length, counts.highRisk)
  const inactiveSystem = filterRoles(roles, { ...defaults, type: "system", check: "inactive" })
  assert.ok(inactiveSystem.length > 0)
  assert.ok(inactiveSystem.every((r) => r.isSystem && !r.isActive))
})

test("search matches key, label and description, case-insensitive, and counts follow search only", () => {
  const roles = [
    role({ id: "a", name: "ASSET_MANAGER", label: "ผู้จัดการทรัพย์สิน", isSystem: true }),
    role({ id: "b", name: "viewer", label: "Viewer", description: "Read only ACCESS" }),
    role({ id: "c", name: "auditor", label: "ผู้ตรวจนับ", userCount: 0 }),
  ]
  assert.deepEqual(filterRoles(roles, { ...defaults, search: "asset_man" }).map((r) => r.id), ["a"])
  assert.deepEqual(filterRoles(roles, { ...defaults, search: "access" }).map((r) => r.id), ["b"])
  assert.deepEqual(filterRoles(roles, { ...defaults, search: "ตรวจนับ" }).map((r) => r.id), ["c"])
  assert.deepEqual(roleListCounts(roles, "VIEW"), { all: 1, system: 0, custom: 1, highRisk: 0, noUsers: 0, inactive: 0 })
  assert.deepEqual(filterRoles(roles, { ...defaults, type: "system", search: "viewer" }), [])
})

// Ruling (plan 3 task 3): the search also matches the English display name, which the label hides when a Thai name exists.
test("search matches the English display name too", () => {
  const roles = [
    role({ id: "a", name: "asset_manager", label: "ผู้จัดการทรัพย์สิน", displayName: "Asset Manager" }),
    role({ id: "b", name: "viewer", label: "ผู้ดู", displayName: "Read Only" }),
  ]
  assert.deepEqual(filterRoles(roles, { ...defaults, search: "read only" }).map((r) => r.id), ["b"])
  assert.equal(roleListCounts(roles, "ASSET MAN").all, 1)
})

test("high risk means delete, approve or export", () => {
  assert.equal(isHighRiskRole(["asset:view"]), false)
  assert.equal(isHighRiskRole(["asset:export"]), true)
  assert.equal(isHighRiskRole(["disposal:approve"]), true)
  assert.equal(isHighRiskRole(["asset:view", "employee:delete"]), true)
  assert.equal(isHighRiskRole([]), false)
})

test("inactive roles that still have users", () => {
  const roles = [
    role({ id: "a", isActive: false, userCount: 2 }),
    role({ id: "b", isActive: false, userCount: 0 }),
    role({ id: "c", isActive: true, userCount: 5 }),
  ]
  assert.deepEqual(inactiveRolesWithUsers(roles).map((r) => r.id), ["a"])
})

test("the query omits defaults", () => {
  assert.equal(buildRoleListQuery(defaults, { check: "inactive" }), "check=inactive")
  assert.equal(buildRoleListQuery(defaults, {}), "")
  assert.equal(
    buildRoleListQuery({ ...defaults, view: "matrix", type: "custom", search: "abc", page: 2, pageSize: 50 }, { check: null }),
    "view=matrix&type=custom&search=abc&page=2&pageSize=50"
  )
  assert.equal(buildRoleListQuery({ ...defaults, check: "noUsers", page: 3 }, { check: null, page: 1 }), "")
})
