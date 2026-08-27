import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("review queue stores observed snapshots and resolution history", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  assert.match(schema, /model AssetStateReview/)
  for (const field of [
    "issueType",
    "reviewStatus",
    "severity",
    "observedStatusId",
    "observedConditionId",
    "observedCustodianId",
    "observedAssetUpdatedAt",
    "suggestedStatusId",
    "suggestedConditionId",
    "resolutionReason",
    "resolvedStatusId",
    "resolvedConditionId",
  ]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`), field)
  }
  assert.match(schema, /stateReviews\s+AssetStateReview\[\]/)
})

test("manual migration is idempotent and never rewrites asset state", () => {
  const sql = readFileSync("prisma/manual-migrations/2026-08-27-add-asset-state-governance.sql", "utf8")
  assert.match(sql, /IF NOT EXISTS[\s\S]*CREATE TABLE \[dbo\]\.\[asset_state_reviews\]/i)
  assert.match(sql, /UX_asset_state_reviews_pending_asset_issue/)
  assert.match(sql, /WHERE \[reviewStatus\] = N'pending'/)
  assert.match(sql, /COL_LENGTH\('dbo\.disposal_requests', 'previousAssetStatusId'\)/)
  assert.match(sql, /N'Not Assessed'/)
  assert.doesNotMatch(sql, /UPDATE\s+\[dbo\]\.\[assets\]/i)
})
