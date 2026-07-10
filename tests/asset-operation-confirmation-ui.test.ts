import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("asset operation forms use a shared review dialog before submitting", () => {
  const files = [
    "src/components/asset-operations/checkout-form.tsx",
    "src/components/asset-operations/checkin-form.tsx",
    "src/components/asset-operations/transfer-form.tsx",
  ]

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /OperationReviewDialog/)
    assert.match(source, /buildOperationReviewSummary/)
  }
})

test("operation review dialog is focus-managed and mobile-safe", () => {
  const dialogPath = "src/components/ui/operation-review-dialog.tsx"
  assert.ok(existsSync(dialogPath))
  const source = readFileSync(dialogPath, "utf8")

  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /restoreFocusRef/)
  assert.match(source, /min-h-11/)
})
