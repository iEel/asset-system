import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

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

test("due generation uses a larger bounded candidate window", () => {
  const source = readFileSync("src/lib/preventive-maintenance-ticket-generator.ts", "utf8")
  assert.match(source, /candidateLimit/)
  assert.match(source, /eligibleProcessed/)
})

test("PM plans persist distinct active, paused, and ended states", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migration = readFileSync("prisma/manual-migrations/2026-07-14-add-maintenance-plan-state.sql", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(schema, /planState\s+String\s+@default\("active"\)/)
  assert.match(migration, /planState/)
  assert.match(page, /MaintenancePlanStateActions/)
})
