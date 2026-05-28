import assert from "node:assert/strict"
import test from "node:test"

import { resolveLdapSyncAuditMetadata } from "../src/lib/ldap-sync-audit.ts"

test("omits synthetic scheduler user id from scheduled LDAP sync audit metadata", () => {
  assert.deepEqual(resolveLdapSyncAuditMetadata("system:ldap", "scheduled"), {
    userId: undefined,
    remark: "LDAP employee sync applied (scheduled)",
  })
})

test("keeps the authenticated user id for manual LDAP sync audit metadata", () => {
  assert.deepEqual(resolveLdapSyncAuditMetadata("user-1", "manual"), {
    userId: "user-1",
    remark: "LDAP employee sync applied",
  })
})
