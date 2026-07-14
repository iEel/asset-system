import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("schema links PM plans to generated maintenance tickets", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8")
  assert.match(schema, /tickets\s+MaintenanceTicket\[\]\s+@relation\("MaintenancePlanTickets"\)/)
  assert.match(schema, /maintenancePlanId\s+String\?/)
  assert.match(schema, /maintenancePlan\s+MaintenancePlan\?\s+@relation\("MaintenancePlanTickets"/)
  assert.match(schema, /@@index\(\[maintenancePlanId\], map: "IX_maintenance_tickets_maintenancePlanId"\)/)
})

test("manual SQL migration adds the nullable PM ticket link idempotently", async () => {
  const migration = await readFile("prisma/manual-migrations/2026-07-14-add-maintenance-plan-ticket-link.sql", "utf8")
  assert.match(migration, /COL_LENGTH\('maintenance_tickets', 'maintenancePlanId'\) IS NULL/)
  assert.match(migration, /FK_maintenance_tickets_maintenancePlanId/)
  assert.match(migration, /IX_maintenance_tickets_maintenancePlanId/)
})
