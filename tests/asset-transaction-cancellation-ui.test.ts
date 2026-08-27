import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("cancel dialog previews blockers and preserves the required reason", () => {
  const source = readFileSync("src/components/asset-operations/transaction-cancel-dialog.tsx", "utf8")
  assert.match(source, /AccessibleDialog/)
  assert.match(source, /cancel-preview/)
  assert.match(source, /expectedUpdatedAt/)
  assert.match(source, /reason/)
  assert.match(source, /reason\.trim\(\)\.length < 5/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /min-h-11/)
})

test("void documents retain evidence and render cancellation metadata", () => {
  const printSource = readFileSync("src/components/asset-operations/operation-document-print.tsx", "utf8")
  const bannerSource = readFileSync("src/components/asset-operations/void-document-banner.tsx", "utf8")
  assert.match(printSource, /VoidDocumentBanner/)
  assert.match(printSource, /data-void-watermark/)
  assert.match(bannerSource, /voidReason/)
  assert.match(bannerSource, /voidedBy/)
  assert.match(bannerSource, /voidedAt/)
})

test("checkout, checkin, transfer, and asset detail surfaces expose cancellation", () => {
  const paths = [
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx",
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx",
    "src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx",
    "src/app/[locale]/(dashboard)/assets/[id]/page.tsx",
  ]
  for (const path of paths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /TransactionCancelDialog/, path)
    assert.match(source, /transactionStatus === "active"/, path)
  }
})

test("transaction cancellation copy is complete in Thai and English", () => {
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    const copy = messages.transactionCancellation
    for (const key of [
      "action",
      "title",
      "description",
      "reasonLabel",
      "confirm",
      "voidLabel",
      "blockedTitle",
      "success",
    ]) {
      assert.equal(typeof copy?.[key], "string", `${locale}.${key}`)
    }
  }
})
