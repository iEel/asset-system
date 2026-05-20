import assert from "node:assert/strict"
import test from "node:test"

import { evaluateLdapDeactivationSafety } from "../src/lib/ldap-sync-safety.ts"

test("allows manual LDAP deactivation review even when count exceeds scheduled threshold", () => {
  const result = evaluateLdapDeactivationSafety({
    isScheduled: false,
    deactivateMissingEnabled: true,
    deactivationCount: 25,
    maxScheduledDeactivations: "10",
  })

  assert.equal(result.status, "safe")
})

test("blocks scheduled LDAP deactivation when missing employees exceed configured threshold", () => {
  const result = evaluateLdapDeactivationSafety({
    isScheduled: true,
    deactivateMissingEnabled: true,
    deactivationCount: 11,
    maxScheduledDeactivations: "10",
  })

  assert.equal(result.status, "blocked")
  assert.equal(result.threshold, 10)
  assert.match(result.reason, /11/)
})
