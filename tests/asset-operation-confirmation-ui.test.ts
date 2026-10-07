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

test("checkout review names the selected handover mode and resulting status", () => {
  const source = readFileSync("src/components/asset-operations/checkout-form.tsx", "utf8")
  assert.match(source, /t\("handoverMode"\)/)
  assert.match(source, /t\("resultingStatus"\)/)
})

test("operation review dialog is focus-managed and mobile-safe", () => {
  const dialogPath = "src/components/ui/operation-review-dialog.tsx"
  assert.ok(existsSync(dialogPath))
  const source = readFileSync(dialogPath, "utf8")
  assert.match(source, /<AccessibleDialog/)
  assert.match(source, /initialFocusRef=\{confirmButtonRef\}/)
  assert.match(source, /<Button/)
  assert.doesNotMatch(source, /onKeyDown=|restoreFocusRef|role="dialog"/)
})
