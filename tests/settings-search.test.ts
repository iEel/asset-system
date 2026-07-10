import assert from "node:assert/strict"
import test from "node:test"

import { findSystemSettingsSearchResults, getSystemSettingsTabForKey } from "../src/lib/settings-search.ts"

test("maps setting keys to the tab where they are edited", () => {
  assert.equal(getSystemSettingsTabForKey("asset_label_18_width_mm"), "label-template")
  assert.equal(getSystemSettingsTabForKey("checkout_document_template"), "documents")
  assert.equal(getSystemSettingsTabForKey("workflow_approval_sla_days"), "workflow-approval")
  assert.equal(getSystemSettingsTabForKey("ldap_sync_schedule"), "ldap-sync")
  assert.equal(getSystemSettingsTabForKey("custom_legacy_setting"), "advanced")
})

test("finds settings by their key, description, or tab label", () => {
  const results = findSystemSettingsSearchResults(
    [
      { key: "asset_label_18_width_mm", description: "18mm label width" },
      { key: "notification_warranty_expiry_days", description: "Warranty reminder" },
    ],
    "warranty",
    { "label-template": "Label printing", notifications: "Notifications" },
  )

  assert.deepEqual(results, [
    { key: "notification_warranty_expiry_days", description: "Warranty reminder", tab: "notifications", tabLabel: "Notifications" },
  ])
})
