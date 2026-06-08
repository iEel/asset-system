import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit rounds page exposes action-first workflow controls", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")

  assert.match(page, /view\?: string/)
  assert.match(page, /activeView/)
  assert.match(page, /ActionPanel/)
  assert.match(page, /QuickFilterBar/)
  assert.match(page, /ReadyToCloseBadge/)
  assert.match(page, /buildAuditRoundInsights/)
  assert.match(page, /filterRoundsByView/)
  assert.match(page, /t\("nextActionsTitle"\)/)
  assert.match(page, /t\("quickFiltersTitle"\)/)
  assert.match(page, /t\("readyToClose"\)/)
})

test("audit rounds UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.nextActionsTitle, "string")
    assert.equal(typeof messages.auditRound.nextActionsHelp, "string")
    assert.equal(typeof messages.auditRound.actionContinueScan, "string")
    assert.equal(typeof messages.auditRound.actionReviewFindings, "string")
    assert.equal(typeof messages.auditRound.actionCloseReadyRounds, "string")
    assert.equal(typeof messages.auditRound.quickFiltersTitle, "string")
    assert.equal(typeof messages.auditRound.viewAll, "string")
    assert.equal(typeof messages.auditRound.viewOpen, "string")
    assert.equal(typeof messages.auditRound.viewPending, "string")
    assert.equal(typeof messages.auditRound.viewReview, "string")
    assert.equal(typeof messages.auditRound.viewMismatch, "string")
    assert.equal(typeof messages.auditRound.viewReadyToClose, "string")
    assert.equal(typeof messages.auditRound.readyToClose, "string")
    assert.equal(typeof messages.auditRound.blockedPendingItems, "string")
    assert.equal(typeof messages.auditRound.blockedPendingReview, "string")
  }
})
