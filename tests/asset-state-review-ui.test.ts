import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("data quality page exposes the asset state review workspace", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx", "utf8")
  const workspace = readFileSync("src/components/admin/asset-state-review-workspace.tsx", "utf8")
  const dialog = readFileSync("src/components/admin/asset-state-review-dialog.tsx", "utf8")

  assert.match(page, /AssetStateReviewWorkspace/)
  assert.match(workspace, /\/api\/admin\/asset-state-reviews\/scan/)
  assert.match(workspace, /reviewStatus/)
  assert.match(workspace, /severity/)
  assert.match(dialog, /AccessibleDialog/)
  assert.match(dialog, /minLength=\{10\}/)
  assert.match(dialog, /statusId/)
  assert.match(dialog, /conditionId/)
})

test("Thai and English expose the same review workspace message keys", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).dataQualityPage.assetStateReviews
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).dataQualityPage.assetStateReviews
  assert.deepEqual(Object.keys(th).sort(), Object.keys(en).sort())
  assert.ok(Object.keys(th.issueTypes).length >= 10)
  assert.ok(th.issueTypes.open_checkout_mode_missing)
  assert.ok(en.issueTypes.open_checkout_mode_missing)
})

test("snapshot loading groups active checkouts by handover mode", () => {
  const service = readFileSync("src/lib/asset-state-review-service.ts", "utf8")
  assert.match(service, /handoverMode:\s*true/)
  assert.match(service, /openPermanentAssignments/)
  assert.match(service, /openTemporaryLoans/)
  assert.match(service, /openUnknownHandovers/)
})
