import assert from "node:assert/strict"
import test from "node:test"

import {
  assetStateReviewIssueTypes,
  assetStateReviewSeverities,
  assetStateReviewStatuses,
  isAssetStateReviewIssueType,
} from "../src/lib/asset-state-review-types.ts"

test("review issue types cover every approved inconsistency", () => {
  assert.deepEqual(assetStateReviewIssueTypes, [
    "repair_status_without_active_ticket",
    "active_repair_ticket_status_mismatch",
    "checked_out_without_open_checkout",
    "open_checkout_status_mismatch",
    "open_checkout_mode_missing",
    "personal_in_use_without_custodian",
    "personal_ready_with_custodian",
    "incompatible_status_condition",
    "legacy_condition_value",
    "controlled_legacy_status",
    "legacy_disposal_missing_previous_status",
    "transaction_cancellation_blocked",
  ])
})

test("review status, severity, and issue guards reject unknown values", () => {
  assert.deepEqual(assetStateReviewStatuses, ["pending", "resolved", "dismissed"])
  assert.deepEqual(assetStateReviewSeverities, ["critical", "warning", "info"])
  assert.equal(isAssetStateReviewIssueType("checked_out_without_open_checkout"), true)
  assert.equal(isAssetStateReviewIssueType("unknown_issue"), false)
  assert.equal(isAssetStateReviewIssueType(null), false)
})
