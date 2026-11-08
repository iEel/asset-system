import assert from "node:assert/strict"
import test from "node:test"

import {
  buildUserListQuery,
  EMPLOYEE_LEFT_WHERE,
  employeeHasLeft,
  parseUserListFilters,
  resolveUserListFilters,
  splitRoleChips,
  userRoleWhere,
  userStatusWhere,
} from "../src/lib/admin-users-list.ts"

// Page group 11 plan 1 task 1 (spec §4.1–4.2): the /admin/users list filters by status and role.

test("parses status and role, defaulting to all", () => {
  assert.deepEqual(parseUserListFilters({}), { status: "all", roleId: null })
  assert.deepEqual(parseUserListFilters({ status: "never", role: "r1" }), { status: "never", roleId: "r1" })
  assert.equal(parseUserListFilters({ status: "junk" }).status, "all")
  assert.deepEqual(parseUserListFilters({ status: ["review", "active"], role: ["r2", "r3"] }), {
    status: "review",
    roleId: "r2",
  })
})

test("an unknown role id is ignored", () => {
  assert.equal(resolveUserListFilters({ status: "all", roleId: "x" }, new Set(["r1"]), null).roleId, null)
  assert.equal(resolveUserListFilters({ status: "all", roleId: "r1" }, new Set(["r1"]), null).roleId, "r1")
})

test("defaultOnly falls back when the default role is missing", () => {
  assert.equal(resolveUserListFilters({ status: "defaultOnly", roleId: null }, new Set(), null).status, "all")
  assert.equal(resolveUserListFilters({ status: "defaultOnly", roleId: null }, new Set(), "d1").status, "defaultOnly")
})

test("defaultOnly needs at least one role", () => {
  assert.deepEqual(userStatusWhere("defaultOnly", "d1"), {
    isActive: true,
    userRoles: { some: {}, every: { roleId: "d1" } },
  })
})

test("the simple statuses map to their where clauses", () => {
  assert.deepEqual(userStatusWhere("all", null), {})
  assert.deepEqual(userStatusWhere("active", null), { isActive: true })
  assert.deepEqual(userStatusWhere("inactive", null), { isActive: false })
  assert.deepEqual(userStatusWhere("never", null), { lastLoginAt: null })
  assert.deepEqual(userRoleWhere(null), {})
  assert.deepEqual(userRoleWhere("r1"), { userRoles: { some: { roleId: "r1" } } })
})

test("review matches active accounts whose employee has left", () => {
  assert.deepEqual(EMPLOYEE_LEFT_WHERE, { OR: [{ isActive: false }, { employmentStatus: "resigned" }] })
  assert.deepEqual(userStatusWhere("review", "d1"), {
    isActive: true,
    employee: { OR: [{ isActive: false }, { employmentStatus: "resigned" }] },
  })
})

test("only resigned or inactive employees have left", () => {
  assert.equal(employeeHasLeft({ isActive: true, employmentStatus: "suspended" }), false)
  assert.equal(employeeHasLeft({ isActive: false, employmentStatus: "active" }), true)
  assert.equal(employeeHasLeft({ isActive: true, employmentStatus: "resigned" }), true)
  assert.equal(employeeHasLeft(null), false)
})

test("splits role chips after two", () => {
  const five = splitRoleChips(["a", "b", "c", "d", "e"])
  assert.equal(five.shown.length, 2)
  assert.equal(five.rest.length, 3)
  const two = splitRoleChips(["a", "b"])
  assert.equal(two.shown.length, 2)
  assert.equal(two.rest.length, 0)
})

test("the query keeps search, sort, page size and filters", () => {
  const query = buildUserListQuery(
    { search: "ab", page: 3, pageSize: 50, sort: "lastLoginAt", direction: "desc" },
    { status: "review", roleId: "r1" },
    { page: 1 }
  )
  for (const part of ["search=ab", "page=1", "pageSize=50", "sort=lastLoginAt", "direction=desc", "status=review", "role=r1"]) {
    assert.ok(query.includes(part), `${part} missing from ${query}`)
  }
  const all = buildUserListQuery(
    { search: "", page: 1, pageSize: 25, sort: "name", direction: "asc" },
    { status: "all", roleId: null }
  )
  assert.ok(!all.includes("status="))
  assert.ok(!all.includes("role="))
})
