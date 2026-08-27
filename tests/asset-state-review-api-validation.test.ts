import assert from "node:assert/strict"
import test from "node:test"

import { assetStateReviewListQuerySchema } from "../src/lib/validations/asset-state-review.ts"

test("review list query applies safe defaults and numeric limits", () => {
  const defaults = assetStateReviewListQuerySchema.parse({})
  assert.deepEqual(defaults, { page: 1, pageSize: 25, reviewStatus: "pending" })

  const parsed = assetStateReviewListQuerySchema.parse({ page: "2", pageSize: "100" })
  assert.equal(parsed.page, 2)
  assert.equal(parsed.pageSize, 100)
  assert.throws(() => assetStateReviewListQuerySchema.parse({ pageSize: "101" }))
})

test("review list query allowlists review status, severity, and issue type", () => {
  assert.equal(assetStateReviewListQuerySchema.parse({ severity: "critical" }).severity, "critical")
  assert.equal(
    assetStateReviewListQuerySchema.parse({ issueType: "open_checkout_status_mismatch" }).issueType,
    "open_checkout_status_mismatch",
  )
  assert.throws(() => assetStateReviewListQuerySchema.parse({ reviewStatus: "deleted" }))
  assert.throws(() => assetStateReviewListQuerySchema.parse({ severity: "urgent" }))
  assert.throws(() => assetStateReviewListQuerySchema.parse({ issueType: "unknown" }))
})
