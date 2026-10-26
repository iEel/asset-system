import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/page.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

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


test("audit rounds list exposes per-round workflow shortcuts", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")

  assert.match(page, /prisma\.auditScanHistory\.groupBy/)
  assert.match(page, /outOfScopeByRoundId/)
  assert.match(page, /buildAuditRoundWorkflowLinks/)
  assert.match(page, /RoundWorkflowLinks/)
  assert.match(page, /roundActionPending/)
  assert.match(page, /roundActionReview/)
  assert.match(page, /roundActionOutOfScope/)
  assert.match(page, /result=out_of_scope/)
  assert.match(page, /audit\/findings\?status=pending&roundId=/)
  assert.match(page, /audit\/rounds\/\$\{roundId\}\/pending/)
})
test("audit rounds quick filters preserve scroll position", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")

  assert.match(page, /function QuickFilterBar/)
  assert.match(page, /<TabNav\b[\s\S]*?scroll=\{false\}/)
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
    assert.equal(typeof messages.auditRound.viewClosed, "string")
    assert.equal(typeof messages.auditRound.viewReadyToClose, "string")
    assert.equal(typeof messages.auditRound.readyToClose, "string")
    assert.equal(typeof messages.auditRound.blockedPendingItems, "string")
    assert.equal(typeof messages.auditRound.blockedPendingReview, "string")
    assert.equal(typeof messages.auditRound.roundActionPending, "string")
    assert.equal(typeof messages.auditRound.roundActionReview, "string")
    assert.equal(typeof messages.auditRound.roundActionOutOfScope, "string")
  }
})

test("the rounds list counts with the one round count: the strip round-wide, the search on the tabs and table only, coverage on own items (group 2 plan 1 task 5, R1, R4, R6)", () => {
  const page = read(PAGE)
  // Every round once, unsearched; the search gives ids only.
  assert.match(page, /prisma\.auditRound\.findMany\(\{\n\s+where: \{ isActive: true \},\n\s+include: auditRoundListInclude,\n\s+orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+\}\)/)
  assert.match(page, /searchText \? prisma\.auditRound\.findMany\(\{ where: \{ isActive: true, \.\.\.buildAuditRoundSearchWhere\(searchText\) \}, select: \{ id: true \} \}\) : null/)
  assert.match(page, /const rounds = matchedRounds \? allRounds\.filter\(\(round\) => matchedRoundIds\.has\(round\.id\)\) : allRounds/)
  // One round count for own items; decisions and action plans apart; out-of-scope finds from scan history (R4).
  assert.match(page, /getAuditRoundCounts\(roundIds\)/)
  assert.match(page, /by: \["auditRoundId", "reviewStatus", "actionStatus"\]/)
  assert.match(page, /OR: \[\{ reviewStatus: "pending" \}, \{ actionStatus: \{ in: \[\.\.\.openAuditFindingActionStatuses\] \} \}\]/)
  assert.match(page, /prisma\.auditScanHistory\.groupBy/)
  // Coverage: own items, the Bangkok year.
  assert.match(page, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere \} \}\)/)
  assert.match(page, /const currentYear = bangkokYear\(now\)/)
  // The strip and the coverage's open work: every operational round, unsearched (R1).
  assert.match(page, /const operationalRounds = allRounds\.filter\(\(round\) => isAuditRoundOperationalStatus\(round\.status\)\)/)
  assert.match(page, /const openWork = sumAuditRoundWork\(operationalRounds\.map\(insightOf\)\)/)
  assert.match(page, /const pendingRounds = filterRoundsByView\(allRounds, insightsByRoundId, "pending"\)/)
  assert.match(page, /const readyRounds = filterRoundsByView\(allRounds, insightsByRoundId, "readyToClose"\)/)
  // The table and the tab counts follow the search.
  assert.match(page, /const filteredRounds = filterRoundsByView\(rounds, insightsByRoundId, activeView\)/)
  assert.match(page, /count: filterRoundsByView\(rounds, insightsByRoundId, value\)\.length/)
  // The strip's links: the work view without the search, the action plans apart, no link to a ready round at 0 (R3, R8).
  assert.match(page, /: buildAuditRoundsHref\(locale, "pending", "", \{ pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /count: openWork\.pendingReview,/)
  assert.match(page, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/findings\?status=action_open`, auditRoundsReturnHref\)/)
  assert.match(page, /href: readyRounds\[0\] \? appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{readyRounds\[0\]\.id\}`, auditRoundsReturnHref\) : undefined/)
  assert.doesNotMatch(page, /_count: \{ select|round\._count|auditItem\.groupBy|openFollowUpCount|followUps|hasMismatch|"mismatch"|getFullYear\(\)/)
  assert.doesNotMatch(read("src/lib/audit-rounds-list-rules.ts"), /from "@\/|\bprisma\./, "the rules stay pure")
})
