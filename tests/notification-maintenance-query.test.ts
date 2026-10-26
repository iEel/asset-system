import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("maintenance notifications remind about due PM instead of SLA or closure", () => {
  const source = ["src/lib/waiting-work-rules.ts", "src/lib/waiting-work.ts"].map((path) => readFileSync(path, "utf8")).join("\n")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.doesNotMatch(source, /dueDate|completedMaintenanceAwaitingClose|overdueMaintenance/)
})
