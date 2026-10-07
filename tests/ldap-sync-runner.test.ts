import assert from "node:assert/strict"
import test from "node:test"

import { resolveLdapSyncAction } from "../scripts/ldap-sync.mjs"

test("the LDAP sync runner previews by default so a bare run never deactivates accounts", () => {
  assert.equal(resolveLdapSyncAction([]), "preview")
})

test("applying LDAP changes requires an explicit --apply flag", () => {
  assert.equal(resolveLdapSyncAction(["--apply"]), "apply")
})

test("the scheduled runner keeps using the scheduled action", () => {
  assert.equal(resolveLdapSyncAction(["--scheduled"]), "scheduled")
})

test("conflicting LDAP sync flags are rejected", () => {
  assert.throws(() => resolveLdapSyncAction(["--apply", "--scheduled"]), /Choose only one/)
})
