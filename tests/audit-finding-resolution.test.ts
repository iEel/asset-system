import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit findings page exposes the resolution center workflow", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(page, /resolutionSummaryItems/)
  assert.match(page, /resolutionFilters/)
  assert.match(page, /ResolutionMetric/)
  assert.match(page, /FindingComparison/)
  assert.match(page, /resolveFindingState/)
})

test("audit finding exports use the same resolution filters as the page", () => {
  const excelRoute = readFileSync("src/app/api/audit-findings/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-findings/export-pdf/route.ts", "utf8")

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /buildAuditFindingWhere/)
    assert.match(route, /resolveAuditFindingStatus/)
  }
})

test("audit finding resolution copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditFinding.resolutionTitle, "string")
    assert.equal(typeof messages.auditFinding.resolutionHelp, "string")
    assert.equal(typeof messages.auditFinding.summaryPendingReview, "string")
    assert.equal(typeof messages.auditFinding.summaryOpenActions, "string")
    assert.equal(typeof messages.auditFinding.summaryOverdue, "string")
    assert.equal(typeof messages.auditFinding.summaryClosed, "string")
    assert.equal(typeof messages.auditFinding.filterActionOpen, "string")
    assert.equal(typeof messages.auditFinding.filterOverdue, "string")
    assert.equal(typeof messages.auditFinding.filterClosed, "string")
    assert.equal(typeof messages.auditFinding.comparison, "string")
    assert.equal(typeof messages.auditFinding.systemValue, "string")
    assert.equal(typeof messages.auditFinding.foundValue, "string")
    assert.equal(typeof messages.auditFinding.resolutionStatePendingReview, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateOpenAction, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateOverdue, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateClosed, "string")
  }
})
