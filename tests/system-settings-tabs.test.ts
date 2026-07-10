import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSystemSettingsTabHref,
  parseSystemSettingsTab,
} from "../src/lib/system-settings-tabs.ts"

test("parses only known System Settings tabs and safely falls back", () => {
  assert.equal(parseSystemSettingsTab("ldap-sync"), "ldap-sync")
  assert.equal(parseSystemSettingsTab("not-a-tab"), "asset-numbering")
  assert.equal(parseSystemSettingsTab(null), "asset-numbering")
})

test("updates the tab query while preserving unrelated Settings query parameters", () => {
  assert.equal(
    buildSystemSettingsTabHref("/th/admin/settings", "source=readiness", "governance"),
    "/th/admin/settings?source=readiness&tab=governance",
  )
})
