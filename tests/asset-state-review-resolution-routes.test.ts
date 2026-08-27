import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

for (const action of ["resolve", "dismiss"] as const) {
  test(`${action} route requires setting edit and validates input`, () => {
    const source = readFileSync(`src/app/api/admin/asset-state-reviews/[id]/${action}/route.ts`, "utf8")
    assert.match(source, /requirePermission\(user, "setting", "edit"\)/)
    assert.match(source, action === "resolve" ? /assetStateReviewResolutionSchema\.parse/ : /assetStateReviewDismissSchema\.parse/)
    assert.match(source, /getAssetStateReviewErrorResponse/)
  })
}
