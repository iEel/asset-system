import test from "node:test"
import assert from "node:assert/strict"

import {
  getPmAutomationSettingsForUiMode,
  getPmAutomationUiMode,
  shouldShowPmAutomationSchedule,
} from "../src/lib/pm-automation-settings.ts"

test("maps persisted PM automation settings to one UI mode", () => {
  assert.equal(getPmAutomationUiMode({ enabled: "false", mode: "scheduled" }), "off")
  assert.equal(getPmAutomationUiMode({ enabled: "true", mode: "manual" }), "manual")
  assert.equal(getPmAutomationUiMode({ enabled: "true", mode: "scheduled" }), "scheduled")
  assert.equal(getPmAutomationUiMode({ enabled: "true", mode: "unknown" }), "manual")
})

test("maps the PM automation UI mode back to persisted settings", () => {
  assert.deepEqual(getPmAutomationSettingsForUiMode("off"), { enabled: "false", mode: "manual" })
  assert.deepEqual(getPmAutomationSettingsForUiMode("manual"), { enabled: "true", mode: "manual" })
  assert.deepEqual(getPmAutomationSettingsForUiMode("scheduled"), { enabled: "true", mode: "scheduled" })
})

test("shows PM schedule controls only for scheduled mode", () => {
  assert.equal(shouldShowPmAutomationSchedule("off"), false)
  assert.equal(shouldShowPmAutomationSchedule("manual"), false)
  assert.equal(shouldShowPmAutomationSchedule("scheduled"), true)
})
