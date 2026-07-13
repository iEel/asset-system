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
    for (const key of ["bulkSelectedCount", "bulkReviewAndApprove", "bulkPreviewTitle", "bulkResultTitle", "bulkSelectPage", "bulkClearSelection"]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    assert.equal(typeof messages.bulkErrors.DISPOSAL_SOD_CONFLICT, "string")
    assert.equal(typeof messages.bulkErrors.DISPOSAL_CONCURRENT_UPDATE, "string")
  }
})
