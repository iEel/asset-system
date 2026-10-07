import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("maintenance notifications remind about due PM instead of SLA or closure", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.doesNotMatch(source, /dueDate|completedMaintenanceAwaitingClose|overdueMaintenance/)
})
