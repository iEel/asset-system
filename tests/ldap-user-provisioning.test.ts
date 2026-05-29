import assert from "node:assert/strict"
import test from "node:test"

import {
  buildLdapEmployeeLookup,
  buildLdapUserLookup,
  shouldCreateLdapUser,
} from "../src/lib/ldap-user-provisioning.ts"

test("looks up employee records by LDAP email or employee code before auto provisioning", () => {
  assert.deepEqual(
    buildLdapEmployeeLookup({
      username: "veerapon.l",
      displayName: "Veerapon Laoharotkul",
      email: "veerapon.l@sonic.co.th",
      employeeCode: "3041",
    }),
    {
      OR: [
        { email: "veerapon.l@sonic.co.th" },
        { code: "3041" },
      ],
      isActive: true,
    }
  )
})

test("matches existing app users by employee id after resolving LDAP employee", () => {
  assert.deepEqual(
    buildLdapUserLookup({
      profile: {
        username: "veerapon.l",
        displayName: "Veerapon Laoharotkul",
        email: "veerapon.l@sonic.co.th",
      },
      employeeId: "employee-1",
    }),
    {
      OR: [
        { username: "veerapon.l" },
        { email: "veerapon.l@sonic.co.th" },
        { employeeId: "employee-1" },
      ],
    }
  )
})

test("requires an employee link before LDAP auto provisioning creates a user", () => {
  assert.equal(shouldCreateLdapUser("employee-1"), true)
  assert.equal(shouldCreateLdapUser(null), false)
  assert.equal(shouldCreateLdapUser(undefined), false)
})
