import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const queuePath = "src/app/[locale]/(dashboard)/disposal/page.tsx"
const batchHistoryPath = "src/app/[locale]/(dashboard)/disposal/batches/page.tsx"

test("disposal queue keeps batch context and exposes batch history", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.doesNotMatch(page, /omit:\s*\{\s*batchId:\s*true\s*\}/)
  assert.match(page, /batch:\s*\{\s*select:\s*\{\s*id:\s*true,\s*batchNo:\s*true\s*\}\s*\}/)
  assert.match(page, /\/disposal\/batches`/)
  assert.ok(existsSync(batchHistoryPath))
})

test("disposal queue communicates range, date errors, compact mobile detail, and sticky actions", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.match(page, /getDisposalDateRangeError/)
  assert.match(page, /resultRange/)
  assert.match(page, /<details/)
  assert.match(page, /sticky right-0/)
  assert.match(page, /hasActiveFilters=\{hasActiveFilters\}/)
})

test("disposal queue exposes bulk approval only through the approval workspace", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.match(page, /<DisposalBulkApprovalProvider/)
  assert.match(page, /<DisposalBulkApprovalToolbar/)
  assert.match(page, /<DisposalBulkApprovalCheckbox/)
  assert.match(page, /<DisposalBulkSelectionToggle/)
  assert.match(page, /canApprove/)
  assert.match(page, /asset:\s*\{\s*select:[\s\S]*?status:/)
  assert.match(page, /selectionKey=\{`\$\{filters\.page\}:\$\{filters\.pageSize\}:\$\{query\}`\}/)
  assert.match(page, /data-no-row-click/)
})

test("bulk approval navigation guard wraps filters as well as the queue", () => {
  const page = readFileSync(queuePath, "utf8")
  const providerStart = page.indexOf("<DisposalBulkApprovalProvider")
  const mobileFilter = page.indexOf("<DisposalFilterForm")
  const desktopFilter = page.indexOf('<form className="grid grid-cols-1 gap-3 lg:grid-cols-')
  const providerEnd = page.lastIndexOf("</DisposalBulkApprovalProvider>")

  assert.ok(providerStart >= 0)
  assert.ok(providerStart < mobileFilter)
  assert.ok(providerStart < desktopFilter)
  assert.ok(providerEnd > mobileFilter)
  assert.ok(providerEnd > desktopFilter)
  assert.match(page, /<DisposalBulkApprovalProvider[^>]*className="space-y-6"/)
})

test("disposal queue passes the complete localized bulk approval copy and exposes initial desktop select-page control", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.match(page, /import type \{ DisposalBulkApprovalCopy \}/)
  assert.match(page, /const bulkApprovalCopy: DisposalBulkApprovalCopy = \{[\s\S]*?errors:/)
  assert.match(page, /<DisposalBulkApprovalProvider[\s\S]*?copy=\{bulkApprovalCopy\}/)
  assert.match(page, /<DisposalBulkApprovalSelectPageControl \/>/)
})

test("disposal queue retrieves ICU bulk approval templates through next-intl raw", () => {
  const page = readFileSync(queuePath, "utf8")

  for (const key of ["bulkSelectedCount", "bulkSelectItem", "bulkRemarkLimit", "bulkConfirmApproval"]) {
    assert.match(page, new RegExp(`\\bt\\.raw\\("${key}"\\)`), `${key} must use raw template retrieval`)
    assert.doesNotMatch(page, new RegExp(`\\bt\\("${key}"\\)`), `${key} must not be evaluated without variables`)
  }
})

test("disposal messages cover queue states in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.resultRange, "string")
    assert.equal(typeof messages.invalidDateRange, "string")
    assert.equal(typeof messages.batchHistory, "string")
    assert.equal(typeof messages.emptyUnfilteredTitle, "string")
  }
})

test("bulk approval copy exists in Thai and English", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of [
      "bulkToolbarLabel",
      "bulkSelection",
      "bulkSelectionMode",
      "bulkCancelSelectionMode",
      "bulkSelectedCount",
      "bulkReviewAndApprove",
      "bulkPreviewTitle",
      "bulkPreviewLoading",
      "bulkPreflightHelp",
      "bulkSelectPage",
      "bulkClearSelection",
      "bulkSharedRemark",
      "bulkSharedRemarkHelp",
      "bulkRemarkLimit",
      "bulkCommitting",
      "bulkResultTitle",
      "bulkRetry",
      "bulkClose",
      "bulkCancel",
      "bulkZeroEligible",
      "bulkSelectItem",
    ]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    for (const code of ["DISPOSAL_REQUEST_NOT_FOUND", "DISPOSAL_INVALID_STAGE", "DISPOSAL_SOD_CONFLICT", "DISPOSAL_ASSET_INELIGIBLE", "DISPOSAL_CONCURRENT_UPDATE", "DISPOSAL_FORBIDDEN", "DISPOSAL_APPROVAL_FAILED"]) {
      assert.equal(typeof messages.bulkErrors[code], "string", `${locale}:${code}`)
    }
  }
})
