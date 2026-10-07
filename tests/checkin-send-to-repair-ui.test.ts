import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("check-in offers send-for-repair instead of a separate repair checkbox", () => {
  const form = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
  assert.doesNotMatch(form, /createMaintenance/)
  assert.match(form, /"Under Maintenance"/)
  assert.match(form, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(form, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/)
})

test("check-in return statuses send damaged assets to repair, not to Pending Repair", () => {
  const flow = readFileSync("src/lib/asset-status-flow.ts", "utf8")
  assert.match(flow, /\["Ready", "Under Maintenance", "Pending Disposal"\]/)
})
