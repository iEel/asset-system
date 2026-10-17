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

test("placeholder labels reach the workspace raw", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx", "utf8")
  assert.match(page, /total: t\.raw\("assetStateReviews\.total"\)/)
  assert.match(page, /scanSuccess: t\.raw\("assetStateReviews\.scanSuccess"\)/)
})

// Phase 2C batch 4 (spec 2C §5.5 row 1, §4.3 F5–F6, K13): the review dialog on the dialog parts. The confirm is busy while
// it saves and keeps its label (plan 2D-1 deleted the unread common.saving); the reason shows the star its required enforces.
test("the asset state review dialog uses the dialog parts, shared fields and a busy confirm that keeps its label (2C batch 4)", () => {
  const dialog = readFileSync("src/components/admin/asset-state-review-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(dialog, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(dialog, /<AccessibleDialogBody className="space-y-4">/)
  // Each Field names its control and shows its error (v-track plan 1 M10).
  assert.match(dialog, /<Field label=\{labels\.nextStatus\} id="state-review-status" error=\{fieldErrors\.message\("statusId"\)\}>\n\s+<NativeSelect\n\s+name="statusId"/)
  assert.match(dialog, /<Field label=\{labels\.nextCondition\} id="state-review-condition" error=\{fieldErrors\.message\("conditionId"\)\}>\n\s+<NativeSelect\n\s+name="conditionId"/)
  assert.match(dialog, /<Field\n\s+label=\{labels\.reason\}\n\s+id="state-review-reason"\n\s+required\n\s+hint=\{labels\.reasonHelp\}\n[^\n]*\n\s+>\n\s+<Textarea\n\s+ref=\{reasonRef\}\n\s+name="resolutionReason"/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button\n\s+type="submit"\n\s+variant=\{mode === "dismiss" \? "destructive" : "default"\}\n\s+busy=\{busy\}\n\s+>\n\s+\{mode === "resolve" \? labels\.confirmResolve : labels\.confirmDismiss\}\n\s+<\/Button>/)
  assert.doesNotMatch(dialog, /ActionButton|labels\.saving|<select|<textarea|<label|p-5/)
})
