import assert from "node:assert/strict"
import test from "node:test"

import {
  getSettingsTabOrder,
  settingsGovernanceSettingKeys,
} from "../src/lib/settings-information-architecture.ts"

test("places governance before LDAP and advanced settings", () => {
  const order = getSettingsTabOrder()

  assert.ok(order.indexOf("governance") > order.indexOf("automation"))
  assert.ok(order.indexOf("governance") < order.indexOf("ldap-login"))
  assert.ok(order.indexOf("advanced") > order.indexOf("governance"))
})

test("groups retention settings under the governance tab", () => {
  assert.deepEqual(settingsGovernanceSettingKeys, [
    "retention_attachment_days",
    "retention_audit_log_days",
    "retention_orphan_file_days",
  ])
})
