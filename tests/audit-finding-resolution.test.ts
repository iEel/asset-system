import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildAuditFindingWhere,
  isAuditFindingWaitingStatus,
  resolveAuditFindingStatus,
} from "../src/lib/audit-finding-filters.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  auditActionsDueSoonWhere,
  openAuditActionsWhere,
  startOfBangkokDay,
  type WaitingWorkRules,
} from "../src/lib/waiting-work-rules.ts"

test("audit findings page exposes the findings workflow", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(readFileSync("src/components/audit/audit-finding-review-panel.tsx", "utf8"), /<DataFreshnessBanner\b/)
  assert.match(page, /resolutionFilters/)
  assert.match(page, /followUpChips/)
  assert.match(page, /FindingValueChange/)
  assert.match(page, /resolveFindingState/)
  assert.doesNotMatch(page, /resolutionSummaryItems|ResolutionMetric|<StatStrip\b/, "the tab and sub-chip counts replace the strip (group 2 plan 4, P4-R1)")
})

test("audit finding exports use the same resolution filters as the page", () => {
  const excelRoute = readFileSync("src/app/api/audit-findings/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-findings/export-pdf/route.ts", "utf8")

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /buildAuditFindingWhere/)
    assert.match(route, /resolveAuditFindingStatus/)
  }
})

test("audit finding review decides in the panel with the conflict guard: a 409 warns and the next approve confirms it (group 2 spec §10)", () => {
  const decision = readFileSync("src/components/audit/audit-finding-decision.tsx", "utf8")
  const route = readFileSync("src/app/api/audit-findings/[id]/review/route.ts", "utf8")

  assert.match(decision, /reviewConflictTitle/)
  assert.match(decision, /action === "approve" && conflict !== null/)
  assert.match(decision, /confirmConflict/)
  assert.doesNotMatch(decision, /window\.prompt|AccessibleDialog/)
  assert.match(route, /hasAuditFindingConflict/)
  assert.match(route, /buildAuditFindingConflictPayload/)
  assert.match(route, /status: 409/)
})

test("audit finding freshness and review panel copy is translated; the decision dialog's words are gone (group 2 spec §10)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditFinding.freshnessFreshTitle, "string")
    assert.equal(typeof messages.auditFinding.freshnessStaleTitle, "string")
    assert.equal(typeof messages.auditFinding.freshnessRefresh, "string")
    assert.equal(typeof messages.auditFinding.reviewConflictTitle, "string")
    assert.equal(typeof messages.auditFinding.reviewConfirmConflict, "string")
    assert.equal(typeof messages.auditFinding.reviewReasonLabel, "string")
    assert.equal(typeof messages.auditFinding.effectChange, "string")
    assert.equal(messages.auditFinding.reviewDecisionTitle_approve, undefined)
    assert.equal(messages.auditFinding.reviewDecisionHelp_approve, undefined)
  }
})

test("audit finding resolution copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    for (const gone of ["resolutionTitle", "resolutionHelp", "summaryPendingReview", "summaryOpenActions", "summaryOverdue", "summaryClosed"]) {
      assert.equal(messages.auditFinding[gone], undefined, `${gone}: the StatStrip went in group 2 plan 4`)
    }
    assert.equal(typeof messages.auditFinding.filterActionOpen, "string")
    assert.equal(typeof messages.auditFinding.filterOverdue, "string")
    assert.equal(typeof messages.auditFinding.filterClosed, "string")
    assert.equal(messages.auditFinding.comparison, undefined)
    assert.equal(typeof messages.auditFinding.systemValue, "string")
    assert.equal(typeof messages.auditFinding.foundValue, "string")
    assert.equal(typeof messages.auditFinding.comparisonColumn, "string")
    assert.equal(typeof messages.auditFinding.dueOn, "string")
    assert.equal(messages.auditFinding.ownerDueColumn, undefined)
    assert.equal(typeof messages.auditFinding.resolutionStatePendingReview, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateOpenAction, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateOverdue, "string")
    assert.equal(typeof messages.auditFinding.resolutionStateClosed, "string")
  }
})

test("audit finding filters can drill into a specific round and finding type", () => {
  assert.deepEqual(
    buildAuditFindingWhere({
      status: "all",
      search: "",
      roundId: "round-1",
      findingType: "wrong_location",
    }),
    {
      auditRoundId: "round-1",
      findingType: "wrong_location",
    }
  )

  assert.deepEqual(
    buildAuditFindingWhere({
      status: "pending",
      search: "SNI-EQU",
      roundId: "round-1",
      findingType: "wrong_custodian",
    }),
    {
      reviewStatus: "pending",
      auditRoundId: "round-1",
      findingType: "wrong_custodian",
      // The search is one entry of AND (plan 4 P4-R3, FP §1), and a code is no longer searched (bug 19).
      AND: [{
        OR: [
          { asset: { assetTag: { contains: "SNI-EQU" } } },
          { asset: { name: { contains: "SNI-EQU" } } },
          { auditRound: { auditNo: { contains: "SNI-EQU" } } },
          { auditRound: { name: { contains: "SNI-EQU" } } },
        ],
      }],
    }
  )
})

test("audit findings page and exports preserve round drilldown filters", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")
  const excelRoute = readFileSync("src/app/api/audit-findings/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-findings/export-pdf/route.ts", "utf8")

  assert.match(page, /roundId\?: string/)
  assert.match(page, /findingType\?: string/)
  assert.match(page, /exportParams\.set\("roundId", roundId\)/)
  assert.match(page, /exportParams\.set\("findingType", findingType\)/)

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /const roundId = request\.nextUrl\.searchParams\.get\("roundId"\)/)
    assert.match(route, /const findingType = request\.nextUrl\.searchParams\.get\("findingType"\)/)
    assert.match(route, /const rules = isAuditFindingWaitingStatus\(status\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
    assert.match(route, /buildAuditFindingWhere\(\{ status, search, roundId, findingType, rules, typeSearchLabels \}\)/)
    assert.match(route, /const typeSearchLabels = await getAuditFindingTypeSearchLabels\(\)/)
  }
})

const now = new Date("2026-10-26T03:00:00.000Z") // 10:00 in Bangkok
const waitingRules: WaitingWorkRules = { ...DEFAULT_WAITING_WORK_RULES, auditActionDueSoonDays: 14 }

test("the two action filters are the bell's two kinds, with the rules they are given (group 1 spec §6.3)", () => {
  const today = startOfBangkokDay(now)
  assert.deepEqual(buildAuditFindingWhere({ status: "action_not_due", now, rules: waitingRules }), openAuditActionsWhere(today, waitingRules))
  assert.deepEqual(buildAuditFindingWhere({ status: "action_due_soon", now, rules: waitingRules }), auditActionsDueSoonWhere(today, waitingRules))
  assert.deepEqual(buildAuditFindingWhere({ status: "action_due_soon", now }), auditActionsDueSoonWhere(today, DEFAULT_WAITING_WORK_RULES), "no rules: today's defaults")
  for (const status of ["action_not_due", "action_due_soon"]) {
    assert.equal(resolveAuditFindingStatus(status), status)
    assert.equal(isAuditFindingWaitingStatus(status), true)
  }
  assert.equal(isAuditFindingWaitingStatus("action_open"), false)
})

test("a search, round or type narrows an action filter without replacing its own conditions", () => {
  const base = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  assert.deepEqual(buildAuditFindingWhere({ status: "action_not_due", search: " SNI ", roundId: "round-1", findingType: "wrong_location", now }), {
    AND: [
      base,
      { auditRoundId: "round-1" },
      { findingType: "wrong_location" },
      {
        OR: [
          { asset: { assetTag: { contains: "SNI" } } },
          { asset: { name: { contains: "SNI" } } },
          { auditRound: { auditNo: { contains: "SNI" } } },
          { auditRound: { name: { contains: "SNI" } } },
        ],
      },
    ],
  })
})

test("the findings page reads its lists through Task 2's page data, with the bell's rules for its two kinds, and a bell filter opens ต้องติดตาม with its chip (group 1 spec §6.5; group 2 spec §10, P4-R3)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8").replace(/\r\n/g, "\n")
  const data = readFileSync("src/lib/audit-findings-page-data.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(page, /const waitingRules = isAuditFindingWaitingStatus\(status\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
  assert.match(page, /getAuditFindingsPageData\(\{ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt \}\)/)
  assert.doesNotMatch(page, /buildAuditFindingWhere|prisma\./, "the wheres and the counts live in the page data (Task 2)")
  assert.match(data, /const whereFor = \(status: AuditFindingStatus\) => buildAuditFindingWhere\(\{ \.\.\.base, status \}\)/)
  assert.match(data, /const base = \{ search: filters\.search, roundId: filters\.roundId, findingType: filters\.findingType, now, rules, typeSearchLabels \}/)
  assert.doesNotMatch(data, /now: today/)
  assert.match(page, /const tNotifications = await getTranslations\("notifications"\)/)
  assert.match(page, /action_not_due: tNotifications\("openAuditActions"\),\n\s+action_due_soon: tNotifications\("auditActionsDueSoon"\),/)
  assert.match(page, /\.\.\.\(isAuditFindingWaitingStatus\(status\) \? \[\{ key: "status", label: waitingLabels\[status\], href: filterHref\(\{ status: "follow_up" \}\) \}\] : \[\]\),/)
  assert.match(page, /const resolutionFilters = auditFindingTabs\.map\(/, "the tabs come from the six tabs only")
})
