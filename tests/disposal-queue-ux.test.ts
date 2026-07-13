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

test("disposal messages cover queue states in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.resultRange, "string")
    assert.equal(typeof messages.invalidDateRange, "string")
    assert.equal(typeof messages.batchHistory, "string")
    assert.equal(typeof messages.emptyUnfilteredTitle, "string")
  }
})
