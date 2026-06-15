import assert from "node:assert/strict"
import test from "node:test"
import { buildAuditFindingConflictPayload, hasAuditFindingConflict } from "../src/lib/audit-finding-conflict.ts"

test("audit finding conflict guard ignores unchanged asset field", () => {
  assert.equal(
    hasAuditFindingConflict({
      assetUpdatedAt: "2026-06-15T08:00:00.000Z",
      findingReportedAt: "2026-06-15T07:00:00.000Z",
      currentValue: "location-a",
      expectedValue: "location-a",
      actualValue: "location-b",
    }),
    false
  )
})

test("audit finding conflict guard detects master data changed after the finding", () => {
  assert.equal(
    hasAuditFindingConflict({
      assetUpdatedAt: "2026-06-15T08:00:00.000Z",
      findingReportedAt: "2026-06-15T07:00:00.000Z",
      currentValue: "location-c",
      expectedValue: "location-a",
      actualValue: "location-b",
    }),
    true
  )
})

test("audit finding conflict payload keeps traceable timestamps and values", () => {
  const payload = buildAuditFindingConflictPayload({
    assetUpdatedAt: "2026-06-15T08:00:00.000Z",
    findingReportedAt: "2026-06-15T07:00:00.000Z",
    currentValue: " location-c ",
    expectedValue: "location-a",
    actualValue: "location-b",
  })

  assert.equal(payload.code, "asset_updated_after_finding")
  assert.equal(payload.assetUpdatedAt, "2026-06-15T08:00:00.000Z")
  assert.equal(payload.findingReportedAt, "2026-06-15T07:00:00.000Z")
  assert.equal(payload.currentValue, "location-c")
})
