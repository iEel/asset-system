import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { retiredSystemSettingKeys } from "../src/lib/retired-system-settings.ts"

test("PM reminders replace automatic PM work orders", () => {
  for (const file of [
    "src/app/api/maintenance-plans/generate-due/route.ts",
    "src/app/api/maintenance-plans/[id]/generate-ticket/route.ts",
    "src/lib/preventive-maintenance-ticket-generator.ts",
    "src/components/maintenance/maintenance-plan-generate-button.tsx",
    "src/lib/pm-automation-settings.ts",
    "scripts/generate-due-pm.mjs",
  ]) {
    assert.equal(existsSync(file), false, file)
  }
  assert.doesNotMatch(readFileSync("scripts/run-scheduled-jobs.mjs", "utf8"), /pm_generate_due|MAINTENANCE_PM_GENERATION_TOKEN/)
  assert.doesNotMatch(readFileSync("src/components/admin/system-settings-form.tsx", "utf8"), /pmAutoGeneration/)
})

test("old PM and maintenance-approval setting rows stay hidden in the settings screen", () => {
  for (const key of ["pm_auto_generation_enabled", "pm_auto_generation_mode", "pm_auto_generation_schedule", "pm_auto_generation_last_run_at", "pm_auto_generation_last_status", "pm_auto_generation_last_error", "workflow_approval_maintenance_close_required"]) {
    assert.equal(retiredSystemSettingKeys.has(key), true, key)
  }
  assert.match(readFileSync("src/components/admin/system-settings-form.tsx", "utf8"), /retiredSystemSettingKeys\.has\(setting\.key\)/)
})
