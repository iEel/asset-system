import assert from "node:assert/strict"
import test from "node:test"
import { selectReportEmptyCopy } from "../src/lib/report-empty-state.ts"

test("uses filtered empty copy only when active filters match zero assets", () => {
  const copy = { filtered: "No assets match these filters", dataset: "No activity in this dataset" }

  assert.equal(selectReportEmptyCopy({ ...copy, hasActiveFilters: true, hasMatchingAssets: false }), copy.filtered)
  assert.equal(selectReportEmptyCopy({ ...copy, hasActiveFilters: true, hasMatchingAssets: true }), copy.dataset)
  assert.equal(selectReportEmptyCopy({ ...copy, hasActiveFilters: false, hasMatchingAssets: false }), copy.dataset)
})
