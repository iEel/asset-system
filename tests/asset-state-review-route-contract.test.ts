import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("review list route requires setting view and parses an allowlisted query", () => {
  const source = readFileSync("src/app/api/admin/asset-state-reviews/route.ts", "utf8")
  assert.match(source, /requirePermission\(user, "setting", "view"\)/)
  assert.match(source, /assetStateReviewListQuerySchema\.parse/)
  assert.match(source, /listAssetStateReviews/)
})

test("review scan route requires setting edit and delegates to the scan service", () => {
  const source = readFileSync("src/app/api/admin/asset-state-reviews/scan/route.ts", "utf8")
  assert.match(source, /requirePermission\(user, "setting", "edit"\)/)
  assert.match(source, /scanAssetStateReviews\(prisma, user\.id\)/)
})
