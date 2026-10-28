import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditFindingCountedStatuses,
  auditFindingFollowUpChips,
  auditFindingReviewableWhere,
  auditFindingStatusView,
  auditFindingTabStatus,
  auditFindingTabs,
  auditFindingTypes,
  auditFindingTypesMatchingSearch,
  auditFindingFilterLabelKeys,
  auditFindingsAfterWhere,
  auditFindingsBack,
  auditFindingsBeforeWhere,
  auditFindingsHrefQuery,
  auditFindingsListOrderBy,
  buildAuditFindingTypeSearchLabels,
  buildAuditFindingWhere,
  buildAuditFindingsHref,
  getAuditFindingToday,
  parseAuditFindingsListFilters,
  pickAuditFindingNextReviewId,
  resolveAuditFindingStatus,
  resolveAuditFindingsListPage,
  resolveAuditFindingType,
} from "../src/lib/audit-finding-filters.ts"
import { normalizeAuditFindingsReturnTo } from "../src/lib/operational-return-navigation.ts"
import { DEFAULT_WAITING_WORK_RULES, openAuditActionsWhere, startOfBangkokDay } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const th = JSON.parse(read("messages/th.json"))
const en = JSON.parse(read("messages/en.json"))
const translators = [th, en].map((messages) => ({ finding: (key: string) => messages.auditFinding[key], round: (key: string) => messages.auditRound[key] }))
const typeSearchLabels = buildAuditFindingTypeSearchLabels(translators)
const now = new Date("2026-10-28T03:00:00.000Z")
const today = getAuditFindingToday(now)
const operational = { isActive: true, status: { notIn: ["closed", "cancelled"] } }
const coverage = { isActive: true, status: { not: "cancelled" } }
const open = { in: ["planned", "in_progress", "done"] }
const where = (input: Parameters<typeof buildAuditFindingWhere>[0]) => buildAuditFindingWhere({ now, typeSearchLabels, ...input })

test("six tabs and ต้องติดตาม's three sub-chips; every old link lands on its tab and sub-chip (spec §10, P4-R3)", () => {
  assert.deepEqual(auditFindingTabs.map((tab) => auditFindingTabStatus[tab]), ["pending", "approved", "rejected", "follow_up", "closed", "all"])
  assert.deepEqual([...auditFindingCountedStatuses], ["pending", "approved", "rejected", "follow_up", "closed", "all", ...auditFindingFollowUpChips])
  const view = (status: string) => auditFindingStatusView(resolveAuditFindingStatus(status))
  assert.deepEqual(view("follow_up"), { tab: "followUp", chip: null, waiting: null })
  assert.deepEqual(view("action_open"), { tab: "followUp", chip: "action_open", waiting: null })
  assert.deepEqual(view("overdue"), { tab: "followUp", chip: "overdue", waiting: null })
  assert.deepEqual(view("exception"), { tab: "followUp", chip: "exception", waiting: null })
  assert.deepEqual(view("action_not_due"), { tab: "followUp", chip: null, waiting: "action_not_due" }, "the bell's kinds keep their chip")
  assert.deepEqual(view("action_due_soon"), { tab: "followUp", chip: null, waiting: "action_due_soon" })
  for (const tab of ["pending", "approved", "rejected", "closed", "all"]) assert.deepEqual(view(tab), { tab, chip: null, waiting: null })
  assert.equal(resolveAuditFindingStatus("followUp"), "pending", "the URL value is follow_up")
  assert.equal(resolveAuditFindingStatus(""), "pending")
  assert.equal(resolveAuditFindingStatus(null), "pending")
})

test("each status keeps today's round scope; ต้องติดตาม is one OR of its two arms, each with its own scope (P4-R3)", () => {
  assert.deepEqual(where({ status: "pending" }), { reviewStatus: "pending", auditRound: operational })
  assert.deepEqual(where({ status: "action_open" }), { actionStatus: open, auditRound: operational })
  assert.deepEqual(where({ status: "overdue" }), { actionStatus: open, actionDueDate: { lt: today }, auditRound: operational })
  assert.deepEqual(where({ status: "exception" }), { reviewStatus: "exception", auditRound: coverage })
  assert.deepEqual(where({ status: "approved" }), { reviewStatus: "approved", auditRound: coverage })
  assert.deepEqual(where({ status: "rejected" }), { reviewStatus: "rejected", auditRound: coverage })
  assert.deepEqual(where({ status: "closed" }), { actionStatus: "closed", auditRound: coverage })
  assert.deepEqual(where({ status: "all" }), { auditRound: coverage })
  // One count over the OR, not a sum: an exception can also hold an open plan.
  assert.deepEqual(where({ status: "follow_up" }), {
    AND: [{ OR: [{ actionStatus: open, auditRound: operational }, { reviewStatus: "exception", auditRound: coverage }] }],
  })
  // A round drops the scope, as every status does today (audit-finding-filters.ts:112-113).
  assert.deepEqual(where({ status: "follow_up", roundId: "round-1" }), { auditRoundId: "round-1", AND: [{ OR: [{ actionStatus: open }, { reviewStatus: "exception" }] }] })
  assert.deepEqual(where({ status: "pending", roundId: "round-1" }), { reviewStatus: "pending", auditRoundId: "round-1" }, "still the round page's step-2 count (P2-R26)")
})

test("every OR goes in one AND list: the search never overwrites ต้องติดตาม's union (FP §1)", () => {
  const search = [
    { asset: { assetTag: { contains: "ที่ตั้ง" } } },
    { asset: { name: { contains: "ที่ตั้ง" } } },
    { auditRound: { auditNo: { contains: "ที่ตั้ง" } } },
    { auditRound: { name: { contains: "ที่ตั้ง" } } },
    { findingType: { in: ["wrong_location"] } },
  ]
  assert.deepEqual(where({ status: "follow_up", search: " ที่ตั้ง ", findingType: "wrong_location" }), {
    findingType: "wrong_location",
    AND: [{ OR: [{ actionStatus: open, auditRound: operational }, { reviewStatus: "exception", auditRound: coverage }] }, { OR: search }],
  })
  assert.deepEqual(where({ status: "pending", search: "ที่ตั้ง" }), { reviewStatus: "pending", auditRound: operational, AND: [{ OR: search }] })
})

test("เรื่อง: takes only a known type; the search reads the types' words in Thai and English, never a code (bug 19, P4-R5b)", () => {
  assert.equal(resolveAuditFindingType(" wrong_custodian "), "wrong_custodian")
  assert.equal(resolveAuditFindingType("wrong_branch"), null)
  assert.deepEqual(where({ status: "all", findingType: "wrong_branch" }), { auditRound: coverage }, "an unknown type is ignored, never shown")
  assert.deepEqual([...auditFindingTypes], ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition", "not_found", "out_of_scope"])
  assert.deepEqual(typeSearchLabels.wrong_custodian, ["ผู้ถือครอง", "ผู้ถือครองไม่ตรง", "Custodian", "Wrong Custodian"])
  assert.deepEqual(typeSearchLabels.not_found, ["ไม่พบ", "ไม่พบทรัพย์สิน", "Not Found"], "one word once")
  assert.deepEqual(typeSearchLabels.out_of_scope, ["นอกขอบเขต", "ทรัพย์สินนอกขอบเขต", "Out of Scope"])
  const match = (text: string) => auditFindingTypesMatchingSearch(text, typeSearchLabels)
  assert.deepEqual(match("ที่ตั้ง"), ["wrong_location"])
  assert.deepEqual(match("ผู้ถือครอง"), ["wrong_custodian"])
  assert.deepEqual(match("สภาพ"), ["wrong_condition"])
  // M-2: a type matches only when the search starts its label or one of its words, so a fragment of an asset's name
  // ("ไม่", "on") no longer pulls in every finding of most types.
  assert.deepEqual(match("ไม่"), ["not_found"], "ไม่พบ and ไม่พบทรัพย์สิน only")
  assert.deepEqual(match("ไม่ตรง"), [], "inside a word, not its start")
  assert.deepEqual(match("ทรัพย์สิน"), ["out_of_scope"], "ทรัพย์สินนอกขอบเขต only")
  assert.deepEqual(match("on"), [])
  assert.deepEqual(match("loc"), ["wrong_location"])
  assert.deepEqual(match("wrong"), ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition"])
  assert.deepEqual(match("scope"), ["out_of_scope"])
  assert.deepEqual(match("Wrong Loc"), ["wrong_location"], "a prefix of the whole label")
  assert.deepEqual(match("LOCATION"), ["wrong_location"])
  assert.deepEqual(match("wrong_location"), [], "a code is not a word")
  assert.deepEqual(match("GRL-COM"), [])
  assert.deepEqual(auditFindingTypesMatchingSearch("ที่ตั้ง"), [], "no words given: no type")
  assert.doesNotMatch(JSON.stringify(where({ status: "pending", search: "wrong_location" })), /"findingType":\{"contains"/)
})

test("a bell kind keeps its own where, narrowed by the round, the checked type and the new search", () => {
  const base = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  assert.deepEqual(where({ status: "action_not_due" }), base)
  assert.deepEqual(where({ status: "action_not_due", roundId: "round-1", findingType: "wrong_branch", search: "SNI" }), {
    AND: [
      base,
      { auditRoundId: "round-1" },
      { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }, { auditRound: { auditNo: { contains: "SNI" } } }, { auditRound: { name: { contains: "SNI" } } }] },
    ],
  })
})

test("the queue's findings are the ones the review route lets the viewer decide; before and after follow the list's order", () => {
  assert.deepEqual(auditFindingsListOrderBy, [{ reportedAt: "desc" }, { id: "asc" }])
  assert.deepEqual(auditFindingReviewableWhere("user-head"), { reviewStatus: "pending", reportedBy: { not: "user-head" }, auditRound: { status: { notIn: ["closed", "cancelled"] } } })
  const reportedAt = new Date("2026-10-20T03:00:00.000Z")
  assert.deepEqual(auditFindingsBeforeWhere({ id: "f-7", reportedAt }), { OR: [{ reportedAt: { gt: reportedAt } }, { reportedAt, id: { lt: "f-7" } }] })
  assert.deepEqual(auditFindingsAfterWhere({ id: "f-7", reportedAt }), { OR: [{ reportedAt: { lt: reportedAt } }, { reportedAt, id: { gt: "f-7" } }] })
  // The next finding (P4-R18): the first after the decided one, else the first before it, never a skipped one.
  assert.equal(pickAuditFindingNextReviewId(["f-8", "f-9"], ["f-1"], new Set()), "f-8")
  assert.equal(pickAuditFindingNextReviewId(["f-8", "f-9"], ["f-1"], new Set(["f-8"])), "f-9", "approve-all decided f-8 as well")
  assert.equal(pickAuditFindingNextReviewId([], ["f-1", "f-2"], new Set()), "f-1", "none after it: the first before it")
  assert.equal(pickAuditFindingNextReviewId(["f-8"], ["f-1"], new Set(["f-8", "f-1"])), null, "none left: the tab is done")
  assert.equal(pickAuditFindingNextReviewId([], [], new Set()), null)
  // A link with the finding and no page opens the page that holds it; a page in the link wins.
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 25 }, { pageGiven: false, findingIndex: 27 }), { page: 2, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 25 }, { pageGiven: false, findingIndex: 24 }), { page: 1, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 3, pageSize: 25 }, { pageGiven: true, findingIndex: 0 }), { page: 3, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 50 }, { pageGiven: false, findingIndex: null }), { page: 1, pageSize: 50 })
})

test("the list's params: the status, the checked type, the finding, the way back and whether a page was asked for", () => {
  assert.deepEqual(parseAuditFindingsListFilters("th", {}), {
    status: "pending", search: "", roundId: null, findingType: null, findingId: null, returnTo: null, listPage: { page: 1, pageSize: 25 }, pageGiven: false,
  })
  assert.deepEqual(
    parseAuditFindingsListFilters("th", { status: "overdue", search: "  SNI ", roundId: " round-1 ", findingType: "wrong_branch", finding: "f-7", page: "2", pageSize: "50", returnTo: "/th/audit/rounds?status=open" }),
    { status: "overdue", search: "SNI", roundId: "round-1", findingType: null, findingId: "f-7", returnTo: "/th/audit/rounds?status=open", listPage: { page: 2, pageSize: 50 }, pageGiven: true },
  )
})

test("one href writer keeps returnTo on every link and writes the finding only when asked (P4-R12, P4-R18)", () => {
  const filters = parseAuditFindingsListFilters("th", { status: "action_open", search: "ที่ตั้ง", roundId: "round-1", findingType: "wrong_location", returnTo: "/th/audit/rounds?status=open" })
  const query = (href: string) => [...auditFindingsHrefQuery(href)]
  assert.equal(buildAuditFindingsHref("th", parseAuditFindingsListFilters("th", {})), "/th/audit/findings?status=pending")
  assert.deepEqual(query(buildAuditFindingsHref("th", filters)), [["status", "action_open"], ["search", "ที่ตั้ง"], ["roundId", "round-1"], ["findingType", "wrong_location"], ["returnTo", "/th/audit/rounds?status=open"]])
  assert.deepEqual(
    query(buildAuditFindingsHref("th", filters, { status: "follow_up", roundId: null, findingType: null, page: 3, pageSize: 50, finding: "f-7" })),
    [["status", "follow_up"], ["search", "ที่ตั้ง"], ["page", "3"], ["pageSize", "50"], ["finding", "f-7"], ["returnTo", "/th/audit/rounds?status=open"]],
  )
  assert.deepEqual(query(buildAuditFindingsHref("th", filters, { search: "", page: 1, pageSize: 25 })), [["status", "action_open"], ["roundId", "round-1"], ["findingType", "wrong_location"], ["returnTo", "/th/audit/rounds?status=open"]], "the search form's hidden inputs")
  assert.ok(buildAuditFindingsHref("th", filters).startsWith("/th/audit/findings?"))
})

test("the way back: the rounds list or a round page from returnTo, else the round, else the rounds list (P4-R12)", () => {
  assert.equal(normalizeAuditFindingsReturnTo("th", "/th/audit/rounds?status=open&page=2"), "/th/audit/rounds?status=open&page=2")
  assert.equal(normalizeAuditFindingsReturnTo("th", "/th/audit/rounds/round-1"), "/th/audit/rounds/round-1")
  assert.equal(normalizeAuditFindingsReturnTo("th", ["/th/audit/rounds", "/th/assets"]), "/th/audit/rounds")
  for (const value of [undefined, "", "/th/audit/rounds/round-1/scan", "/th/audit/rounds/", "/th/audit/rounds/new", "/en/audit/rounds", "/th/assets", "https://evil.example/th/audit/rounds", "//evil.example/th/audit/rounds"]) {
    assert.equal(normalizeAuditFindingsReturnTo("th", value), null, String(value))
  }
  assert.deepEqual(auditFindingsBack("th", { returnTo: "/th/audit/rounds?status=open", roundId: "round-1" }), { href: "/th/audit/rounds?status=open", target: "rounds" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: "/th/audit/rounds/round-9", roundId: "round-1" }), { href: "/th/audit/rounds/round-9", target: "round" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: null, roundId: "round-1" }), { href: "/th/audit/rounds/round-1", target: "round" })
  assert.deepEqual(auditFindingsBack("en", { returnTo: null, roundId: "a b" }), { href: "/en/audit/rounds/a%20b", target: "round" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: null, roundId: null }), { href: "/th/audit/rounds", target: "rounds" })
})

test("the filter in use, in words: the tab, then its sub-chip or the bell's chip (Task 6's findings PDF title)", () => {
  assert.deepEqual(auditFindingFilterLabelKeys("pending"), ["auditFinding.status_pending"])
  assert.deepEqual(auditFindingFilterLabelKeys("follow_up"), ["auditFinding.tabFollowUp"])
  assert.deepEqual(auditFindingFilterLabelKeys("overdue"), ["auditFinding.tabFollowUp", "auditFinding.filterOverdue"])
  assert.deepEqual(auditFindingFilterLabelKeys("exception"), ["auditFinding.tabFollowUp", "auditFinding.status_exception"])
  assert.deepEqual(auditFindingFilterLabelKeys("action_due_soon"), ["auditFinding.tabFollowUp", "notifications.auditActionsDueSoon"])
  assert.deepEqual(auditFindingFilterLabelKeys("closed"), ["auditFinding.filterClosed"])
  for (const key of auditFindingCountedStatuses.flatMap((status) => auditFindingFilterLabelKeys(status))) {
    const [namespace, name] = key.split(".")
    assert.equal(typeof th[namespace][name], "string", key)
    assert.equal(typeof en[namespace][name], "string", key)
  }
})

test("the page and both exports read the type words of both languages through one helper (bug 19)", () => {
  const helper = read("src/lib/audit-finding-search-labels.ts")
  assert.match(helper, /routing\.locales\.map\(/)
  assert.match(helper, /getTranslations\(\{ locale, namespace: "auditFinding" \}\)/)
  assert.match(helper, /getTranslations\(\{ locale, namespace: "auditRound" \}\)/)
  assert.match(helper, /return buildAuditFindingTypeSearchLabels\(translators\)/)
  for (const path of ["src/app/[locale]/(dashboard)/audit/findings/page.tsx", "src/app/api/audit-findings/export/route.ts", "src/app/api/audit-findings/export-pdf/route.ts"]) {
    assert.match(read(path), /const typeSearchLabels = await getAuditFindingTypeSearchLabels\(\)/, path)
  }
})
