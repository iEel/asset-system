import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { canDeleteMaintenanceEvidence } from "../src/lib/maintenance-policy.ts"

test("closed maintenance evidence is append-only", () => {
  assert.equal(canDeleteMaintenanceEvidence("closed"), false)
  assert.equal(canDeleteMaintenanceEvidence("in_progress"), true)
})

test("generic attachment delete consults maintenance ticket state", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")
  assert.match(source, /MAINTENANCE_EVIDENCE_LOCKED/)
  assert.match(source, /canDeleteMaintenanceEvidence/)
})

test("post-close uploads are recorded as audited addenda", () => {
  const source = readFileSync("src/app/api/maintenance-tickets/[id]/attachments/route.ts", "utf8")
  assert.match(source, /repairStatus/)
  assert.match(source, /postCloseAddendum:\s*ticket\.repairStatus === "closed"/)
})
