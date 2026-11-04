import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { maintenancePlanActionSchema } from "../src/lib/validations/maintenance.ts"

test("maintenance plans expose update, pause, resume, and end mutations", () => {
  const path = "src/app/api/maintenance-plans/[id]/route.ts"
  assert.equal(existsSync(path), true)
  const source = readFileSync(path, "utf8")

  for (const action of ["update", "pause", "resume", "end"]) {
    assert.match(source, new RegExp(`\\b${action}\\b`))
  }
  assert.match(source, /maintenancePlanActionSchema/)
  assert.match(source, /logAudit/)
})

test("PM plans persist distinct active, paused, and ended states", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migration = readFileSync("prisma/manual-migrations/2026-07-14-add-maintenance-plan-state.sql", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/page.tsx", "utf8")
  assert.match(schema, /planState\s+String\s+@default\("active"\)/)
  assert.match(migration, /planState/)
  assert.match(page, /<MaintenancePlanRowActions\b/)
})

test("maintenance plan state migration defers new-column references until runtime", () => {
  const migration = readFileSync("prisma/manual-migrations/2026-07-14-add-maintenance-plan-state.sql", "utf8")

  assert.match(migration, /sp_executesql\s+N'UPDATE \[dbo\]\.\[maintenance_plans\]/i)
  assert.match(migration, /sp_executesql\s+N'ALTER TABLE \[dbo\]\.\[maintenance_plans\][\s\S]*CHECK \(\[planState\]/i)
})

test("a PM edit carries the plan's updatedAt; pause, resume and end need none (G5P1-R12)", () => {
  const update = { action: "update", title: "PM", frequency: "monthly", intervalDays: null, nextDueDate: "2026-12-01" }
  assert.equal(maintenancePlanActionSchema.safeParse(update).success, false)
  const parsed = maintenancePlanActionSchema.parse({ ...update, expectedUpdatedAt: "2026-11-01T00:00:00.000Z" })
  assert.ok(parsed.action === "update" && parsed.expectedUpdatedAt instanceof Date)
  for (const action of ["pause", "resume", "end"]) assert.equal(maintenancePlanActionSchema.safeParse({ action }).success, true, action)
})

test("PM create refuses a written-off asset, keeps its 404 and vendor error, and numbers through the retried create (G5P1-R11)", () => {
  const source = readFileSync("src/app/api/maintenance-plans/route.ts", "utf8")
  assert.match(source, /select: \{ id: true, status: \{ select: \{ name: true \} \} \}/)
  assert.match(source, /assertMaintenancePlanAssetNotWrittenOff\(asset\.status\.name\)/)
  assert.match(source, /getMaintenanceErrorPayload\(/)
  assert.match(source, /createMaintenancePlanRecord\(/)
  assert.match(source, /\{ error: "Asset not found" \}, \{ status: 404 \}/)
  assert.match(source, /vendorId: "pmVendorNotFound"/)
  assert.doesNotMatch(source, /function generateMaintenancePlanNo|getFullYear|getDate\(\)/)
})
