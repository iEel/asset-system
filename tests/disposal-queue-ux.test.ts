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
  assert.match(page, /<DataTableHead align="right" sticky="right" hideLabel>/, "the actions column stays pinned to the right (DataTable sticky, spec 2B §3.4)")
  assert.match(page, /<DataTableCell align="right" sticky="right">/)
  assert.match(page, /hasActiveFilters=\{hasActiveFilters\}/)
})

// Group 6 plan 2 Task 3 (spec §10.2, decision 3, ruling P2-R2): bulk approval moved to the approvals page. The pending
// tab has no ticks; each row links to its item there, and a note above the table counts what the viewer may decide.
test("the pending tab links each request to the approvals page, with no ticks and no bulk approval provider", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.doesNotMatch(page, /DisposalBulkApproval|bulkApprovalCopy|bulkApprovalEnabled|disposal-bulk-approval"/)
  assert.equal(existsSync("src/components/disposal/disposal-bulk-approval.tsx"), false, "the provider is deleted once nothing imports it")
  assert.match(page, /const pendingInboxEnabled = canApprove && filters\.status === "pending"/)
  assert.equal(page.match(/approvalInboxItemHref\(locale, "disposal", request\.id\)/g)?.length, 2, "the phone card and the table row")
  assert.match(page, /return reason === "requester" \|\| reason === "creator"/, "the viewer's own request: ดู, with why")
  assert.match(page, /t\("pendingInboxCount", \{ decidable: formatCount\(Math\.max\(0, total - ownPendingCount\)\), total: formatCount\(total\) \}\)/)
  assert.match(page, /href=\{`\/\$\{locale\}\/admin\/approvals\?tab=disposal`\}/)
  assert.match(page, /review: t\("reviewInInbox"\), view: tCommon\("view"\), ownNote: t\("ownRequestNote"\)/)
})

// Group 6 plan 4 (P4-R1): bulk execution is retired; an approved request is recorded only in a disposal round.
test("the queue no longer carries bulk execution or a per-row execution", () => {
  const page = readFileSync(queuePath, "utf8")
  const mobileFilter = page.indexOf("<DisposalFilterForm")
  // One DisposalFilterForm renders twice (spec 2B §5.10 #5): the phone <details> copy first, then the desktop FilterPanel copy.
  const desktopFilter = page.indexOf("<DisposalFilterForm", mobileFilter + 1)

  assert.ok(mobileFilter >= 0 && desktopFilter > mobileFilter, "two DisposalFilterForm call sites")
  assert.doesNotMatch(page, /DisposalBulkExecution|DisposalExecutionButton|bulkExecution/)
  assert.match(page, /asset:\s*\{\s*select:[\s\S]*?status:/)
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

test("the pending tab's words exist in Thai and English; the bulk-decision reasons stay for the approvals page", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).disposalPage
  assert.equal(th.reviewInInbox, "พิจารณาในงานรออนุมัติ")
  assert.equal(th.ownRequestNote, "คุณเป็นผู้ขอ พิจารณาเองไม่ได้")
  assert.equal(th.pendingInboxCount, "คุณพิจารณาได้ {decidable} จาก {total} รายการ")
  assert.equal(th.pendingInboxLink, "อนุมัติหลายรายการได้ที่งานรออนุมัติ")
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["reviewInInbox", "ownRequestNote", "pendingInboxCount", "pendingInboxLink"]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    for (const key of ["bulkToolbarLabel", "bulkReviewAndApprove", "bulkPreviewTitle", "bulkSelectPage"]) {
      assert.equal(messages[key], undefined, `${locale}:${key} went with the disposal queue's bulk approval`)
    }
    for (const code of ["DISPOSAL_REQUEST_NOT_FOUND", "DISPOSAL_INVALID_STAGE", "DISPOSAL_SOD_CONFLICT", "DISPOSAL_ASSET_INELIGIBLE", "DISPOSAL_CONCURRENT_UPDATE", "DISPOSAL_FORBIDDEN", "DISPOSAL_APPROVAL_FAILED"]) {
      assert.equal(typeof messages.bulkErrors[code], "string", `${locale}:${code}`)
    }
  }
})
