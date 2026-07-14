import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("maintenance notifications query overdue and completed tickets separately", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")

  assert.match(source, /repairStatus:\s*\{\s*notIn:\s*\["completed",\s*"closed"\]\s*\}/)
  assert.match(source, /repairStatus:\s*"completed"/)
  assert.match(source, /completedMaintenanceAwaitingClose/)
})
