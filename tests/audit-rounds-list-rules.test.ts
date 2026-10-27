import assert from "node:assert/strict"
import test from "node:test"

import { emptyAuditRoundCounts } from "../src/lib/audit-round-counts-rules.ts"
import {
  auditRoundTabOf,
  bangkokYear,
  buildAuditRoundDueLine,
  buildAuditRoundInsights,
  buildAuditRoundNextStep,
  buildAuditRoundProgress,
  buildAuditRoundScopeParts,
  buildAuditRoundSearchWhere,
  buildAuditRoundsHref,
  canCloseAuditRoundFromList,
  emptyAuditRoundListInsight,
  filterRoundsByView,
  foldAuditRoundFindingWork,
  isAuditRoundAwaitingDecision,
  isAuditRoundWorkView,
  parseAuditRoundView,
  sumAuditRoundWork,
} from "../src/lib/audit-rounds-list-rules.ts"

// The rounds list's rules (plan docs/superpowers/plans/2026-10-26-group2-audit-rounds.md, Task 5; spec
// docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md §5, §6, §13 bugs 3-5, §14).

test("the list opens on กำลังดำเนินการ; old and unknown views fall back to it, and a work view keeps that tab (group 2 spec §6, R7)", () => {
  assert.equal(parseAuditRoundView(undefined), "open")
  for (const value of ["open", "closed", "cancelled", "all", "pending", "review", "readyToClose"]) assert.equal(parseAuditRoundView(value), value)
  assert.equal(parseAuditRoundView("mismatch"), "open", "มีรายการไม่ตรง is gone")
  assert.equal(parseAuditRoundView("bogus"), "open")
  assert.equal(parseAuditRoundView(["closed", "all"]), "closed")
  assert.deepEqual(
    ["pending", "review", "readyToClose", "open", "closed", "cancelled", "all"].map((value) => auditRoundTabOf(parseAuditRoundView(value))),
    ["open", "open", "open", "open", "closed", "cancelled", "all"],
  )
  assert.equal(isAuditRoundWorkView("review"), true)
  assert.equal(isAuditRoundWorkView("all"), false)
})

test("the list URL leaves out the default tab and writes every other view, the search and the page (group 2 spec §6, R7)", () => {
  assert.equal(buildAuditRoundsHref("th", "open", ""), "/th/audit/rounds")
  assert.equal(buildAuditRoundsHref("th", "open", "", { page: 1, pageSize: 25 }), "/th/audit/rounds")
  assert.equal(buildAuditRoundsHref("th", "all", ""), "/th/audit/rounds?view=all")
  assert.equal(buildAuditRoundsHref("en", "closed", ""), "/en/audit/rounds?view=closed")
  assert.equal(buildAuditRoundsHref("th", "pending", "AUD-2026", { page: 2, pageSize: 50 }), "/th/audit/rounds?search=AUD-2026&view=pending&page=2&pageSize=50")
})

test("the coverage year is the Bangkok year, whatever the server's time zone (group 2 spec §5 Dates)", () => {
  assert.equal(bangkokYear(new Date("2026-12-31T16:59:59.000Z")), 2026)
  assert.equal(bangkokYear(new Date("2026-12-31T17:30:00.000Z")), 2027, "00:30 on 1 January in Bangkok")
})

test("the scope names every condition the round has, in the form's order, with codes where the record has one (group 2 spec §6, §13 bug 3)", () => {
  const none = { scopeCompany: null, scopeBranch: null, scopeDepartment: null, scopeLocation: null, scopeCategory: null, scopeCustodian: null, scopeStatus: null, scopeCondition: null }
  assert.deepEqual(buildAuditRoundScopeParts(none), [])
  assert.deepEqual(buildAuditRoundScopeParts({ ...none, scopeCategory: { code: "NB", name: "โน้ตบุ๊ก" } }), [{ key: "category", code: "NB", name: "โน้ตบุ๊ก" }], "a category-only round no longer reads ทรัพย์สินทั้งหมด")
  const every = {
    scopeCompany: { code: "GL", nameTh: "จีลิงค์" },
    scopeBranch: { code: "HQ", name: "สำนักงานใหญ่" },
    scopeDepartment: { code: "IT", name: "เทคโนโลยีสารสนเทศ" },
    scopeLocation: { code: "L-01", name: "ห้อง IT" },
    scopeCategory: { code: "NB", name: "โน้ตบุ๊ก" },
    scopeCustodian: { code: "E001", fullNameTh: "สมชาย ใจดี" },
    scopeStatus: { name: "Available", nameTh: "พร้อมใช้งาน" },
    scopeCondition: { name: "Good", nameTh: "" },
  }
  assert.deepEqual(buildAuditRoundScopeParts(every).map((part) => [part.key, part.code, part.name]), [
    ["company", "GL", "จีลิงค์"],
    ["branch", "HQ", "สำนักงานใหญ่"],
    ["department", "IT", "เทคโนโลยีสารสนเทศ"],
    ["location", "L-01", "ห้อง IT"],
    ["category", "NB", "โน้ตบุ๊ก"],
    ["custodian", "E001", "สมชาย ใจดี"],
    ["status", null, "พร้อมใช้งาน"],
    ["condition", null, "Good"],
  ])
})

test("the search finds a round by its number, its name, and the code or name of each coded scope, category and department included (group 2 spec §6, §13 bug 4)", () => {
  const contains = { contains: "NB" }
  assert.deepEqual(buildAuditRoundSearchWhere("NB"), {
    OR: [
      { auditNo: contains },
      { name: contains },
      { scopeCompany: { code: contains } },
      { scopeCompany: { nameTh: contains } },
      { scopeBranch: { code: contains } },
      { scopeBranch: { name: contains } },
      { scopeDepartment: { code: contains } },
      { scopeDepartment: { name: contains } },
      { scopeLocation: { code: contains } },
      { scopeLocation: { name: contains } },
      { scopeCategory: { code: contains } },
      { scopeCategory: { name: contains } },
      { scopeCustodian: { code: contains } },
      { scopeCustodian: { fullNameTh: contains } },
    ],
  })
})

test("pending decisions and open action plans are counted apart, each the way its own list counts it (group 2 R3)", () => {
  const work = foldAuditRoundFindingWork([
    { auditRoundId: "r1", reviewStatus: "pending", actionStatus: "not_required", count: 2 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "planned", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "in_progress", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "done", count: 1 },
    { auditRoundId: "r1", reviewStatus: "approved", actionStatus: "closed", count: 5 },
    { auditRoundId: "r2", reviewStatus: "pending", actionStatus: "planned", count: 1 },
  ])
  assert.deepEqual(work.get("r1"), { pendingReview: 2, openActions: 3 }, "done is still open: it waits for its closing evidence")
  assert.deepEqual(work.get("r2"), { pendingReview: 1, openActions: 1 }, "a pending finding with a plan is in both lists")
  assert.equal(work.get("r3"), undefined)
})

test("a round is ready to close only on the close API's three conditions: no pending item, no pending decision, no open action plan (done included) (group 2 R2)", () => {
  const rounds = [
    { id: "ready", status: "open" },
    { id: "draft", status: "draft" },
    { id: "done", status: "open" },
    { id: "review", status: "open" },
    { id: "pending", status: "open" },
    { id: "closed", status: "closed" },
    { id: "empty", status: "open" },
  ]
  const counts = new Map([
    ["ready", { ...emptyAuditRoundCounts, total: 3, checked: 3 }],
    ["draft", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["done", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["review", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
    ["pending", { ...emptyAuditRoundCounts, total: 2, pending: 1, checked: 1, outOfScope: 9 }],
    ["closed", { ...emptyAuditRoundCounts, total: 2, checked: 2 }],
  ])
  const work = foldAuditRoundFindingWork([
    { auditRoundId: "done", reviewStatus: "approved", actionStatus: "done", count: 1 },
    { auditRoundId: "review", reviewStatus: "pending", actionStatus: "not_required", count: 2 },
  ])
  const insights = buildAuditRoundInsights(rounds, counts, work)
  assert.deepEqual(rounds.filter((round) => insights.get(round.id)?.readyToClose).map((round) => round.id), ["ready", "draft", "empty"])
  // The out-of-scope count is the items' (P2-R4), as the round page's list it opens.
  assert.deepEqual(insights.get("pending"), { operational: true, total: 2, pending: 1, checked: 1, pendingReview: 0, openActions: 0, outOfScope: 9, readyToClose: false })
  assert.equal(insights.get("done")?.openActions, 1)
  assert.equal(insights.get("closed")?.operational, false)
  assert.equal(isAuditRoundAwaitingDecision(insights.get("review")!), true, "fully scanned, decisions pending: the badge reads รอพิจารณา")
  assert.equal(isAuditRoundAwaitingDecision(insights.get("pending")!), false)
  assert.equal(isAuditRoundAwaitingDecision({ ...insights.get("review")!, operational: false }), false)
})

test("the tabs split rounds by status, a draft under กำลังดำเนินการ; the work views take open rounds with that work (group 2 spec §6, §14)", () => {
  const rounds = [
    { id: "o1", status: "open" },
    { id: "d1", status: "draft" },
    { id: "o2", status: "open" },
    { id: "c1", status: "closed" },
    { id: "x1", status: "cancelled" },
  ]
  const insight = (patch: Partial<typeof emptyAuditRoundListInsight>) => ({ ...emptyAuditRoundListInsight, operational: true, ...patch })
  const insights = new Map([
    ["o1", insight({ total: 2, pending: 2 })],
    ["d1", insight({ total: 2, checked: 2, pendingReview: 1 })],
    ["o2", insight({ total: 1, checked: 1, readyToClose: true })],
    ["c1", insight({ operational: false, total: 3, pending: 1, pendingReview: 1 })],
    ["x1", insight({ operational: false })],
  ])
  const ids = (view: Parameters<typeof filterRoundsByView>[2]) => filterRoundsByView(rounds, insights, view).map((round) => round.id)
  assert.deepEqual(ids("open"), ["o1", "d1", "o2"])
  assert.deepEqual(ids("closed"), ["c1"])
  assert.deepEqual(ids("cancelled"), ["x1"])
  assert.deepEqual(ids("all"), ["o1", "d1", "o2", "c1", "x1"])
  assert.deepEqual(ids("pending"), ["o1"], "a closed round's leftover items are not work")
  assert.deepEqual(ids("review"), ["d1"])
  assert.deepEqual(ids("readyToClose"), ["o2"])
  assert.deepEqual(sumAuditRoundWork([insights.get("o1")!, insights.get("d1")!, insights.get("o2")!]), { pending: 2, checked: 3, pendingReview: 1, openActions: 0 })
})

test("progress: checked over the round's own items, or not started (group 2 spec §6)", () => {
  assert.deepEqual(buildAuditRoundProgress({ total: 342, checked: 330 }), { started: true, value: 330 / 342, percent: 96 })
  assert.deepEqual(buildAuditRoundProgress({ total: 2, checked: 0 }), { started: false, value: 0, percent: 0 })
  assert.deepEqual(buildAuditRoundProgress({ total: 0, checked: 0 }), { started: false, value: 0, percent: 0 })
})

test("the dates line: days left counting the end day, or days overdue, on open rounds only, in Bangkok days (group 2 spec §6)", () => {
  const today = new Date("2026-10-26T00:00:00+07:00")
  const day = (key: string) => new Date(`${key}T00:00:00+07:00`)
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-11-05"), today), { kind: "left", days: 11 })
  assert.deepEqual(buildAuditRoundDueLine("draft", day("2026-10-26"), today), { kind: "left", days: 1 }, "the last day still counts")
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-10-25"), today), { kind: "overdue", days: 1 })
  assert.deepEqual(buildAuditRoundDueLine("open", day("2026-10-16"), today), { kind: "overdue", days: 10 })
  assert.equal(buildAuditRoundDueLine("closed", day("2026-10-16"), today), null)
  assert.equal(buildAuditRoundDueLine("cancelled", day("2026-11-05"), today), null)
  // A date stored at UTC midnight is still its Bangkok day; late evening is still today.
  assert.deepEqual(buildAuditRoundDueLine("open", new Date("2026-10-27T00:00:00.000Z"), new Date("2026-10-26T23:30:00+07:00")), { kind: "left", days: 2 })
})

test("the next step: เดินตรวจต่อ goes to the scan page for audit:edit and to the pending list for anyone else; then the second task and the out-of-scope link; a viewer never gets a scan link (group 2 spec §6, §13 bug 1)", () => {
  const insight = { ...emptyAuditRoundListInsight, operational: true, total: 10, pending: 4, checked: 6, pendingReview: 5, openActions: 2, outOfScope: 3 }
  const base = { locale: "th", roundId: "r1", insight, canClose: true, returnTo: "/th/audit/rounds?view=all" }
  const back = "returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dall"
  const editor = buildAuditRoundNextStep({ ...base, canScan: true })
  assert.deepEqual(editor.main, { key: "walk", count: 4, href: `/th/audit/rounds/r1/scan?${back}` })
  assert.deepEqual(editor.second, { key: "review", count: 5 })
  assert.deepEqual(editor.outOfScope, { key: "outOfScope", count: 3, href: `/th/audit/rounds/r1?result=out_of_scope&${back}#audit-result-list` })
  assert.deepEqual(editor.more.map((link) => [link.key, link.count, link.href]), [
    ["pendingList", 4, `/th/audit/rounds/r1/pending?${back}`],
    ["review", 5, `/th/audit/findings?status=pending&roundId=r1&${back}`],
    ["actions", 2, `/th/audit/findings?status=action_open&roundId=r1&${back}`],
  ])
  const viewer = buildAuditRoundNextStep({ ...base, canScan: false, canClose: false })
  assert.deepEqual(viewer.main, { key: "walk", count: 4, href: `/th/audit/rounds/r1/pending?${back}` })
  assert.deepEqual(viewer.more.map((link) => link.key), ["review", "actions"])
  assert.ok(![viewer.main, viewer.outOfScope, ...viewer.more].some((link) => link?.href.includes("/scan")), "no scan href for a viewer (E2E M5)")
})

test("after the walk the next step is the decision, then the action plans, then the close; a closed round has none (group 2 spec §6, R2, R3)", () => {
  const base = { locale: "th", roundId: "r1", canScan: true, canClose: true, returnTo: "/th/audit/rounds" }
  const back = "returnTo=%2Fth%2Faudit%2Frounds"
  const scanned = { ...emptyAuditRoundListInsight, operational: true, total: 10, checked: 10, pendingReview: 5, openActions: 2 }
  const review = buildAuditRoundNextStep({ ...base, insight: scanned })
  assert.deepEqual(review.main, { key: "review", count: 5, href: `/th/audit/findings?status=pending&roundId=r1&${back}` })
  assert.deepEqual(review.second, { key: "actions", count: 2 })
  assert.deepEqual(review.more.map((link) => link.key), ["actions"])
  assert.equal(review.outOfScope, null)
  const actions = buildAuditRoundNextStep({ ...base, insight: { ...scanned, pendingReview: 0 } })
  assert.deepEqual(actions.main, { key: "actions", count: 2, href: `/th/audit/findings?status=action_open&roundId=r1&${back}` })
  assert.equal(actions.second, null)
  const ready = { ...emptyAuditRoundListInsight, operational: true, total: 3, checked: 3, readyToClose: true }
  assert.deepEqual(buildAuditRoundNextStep({ ...base, insight: ready }).main, { key: "close", count: null, href: `/th/audit/rounds/r1?${back}` })
  assert.equal(buildAuditRoundNextStep({ ...base, canClose: false, insight: ready }).main, null, "only audit:approve closes a round")
  assert.deepEqual(buildAuditRoundNextStep({ ...base, insight: { ...scanned, operational: false, outOfScope: 2 } }), { main: null, second: null, outOfScope: null, more: [] })
})

test("the list offers ปิดรอบตรวจ only with audit:approve and not to the round's creator, as the close API refuses them (group 2 final review M5)", () => {
  assert.equal(canCloseAuditRoundFromList({ canApprove: true, userId: "u1", createdBy: "u2" }), true)
  assert.equal(canCloseAuditRoundFromList({ canApprove: true, userId: "u1", createdBy: "u1" }), false, "the creator")
  assert.equal(canCloseAuditRoundFromList({ canApprove: false, userId: "u1", createdBy: "u2" }), false, "no audit:approve")
  assert.equal(canCloseAuditRoundFromList({ canApprove: true, userId: "u1", createdBy: null }), true, "an unknown creator, as the API")
  const ready = { ...emptyAuditRoundListInsight, operational: true, total: 3, checked: 3, readyToClose: true }
  const step = (createdBy: string) =>
    buildAuditRoundNextStep({ locale: "th", roundId: "r1", insight: ready, canScan: true, canClose: canCloseAuditRoundFromList({ canApprove: true, userId: "u1", createdBy }), returnTo: "/th/audit/rounds" }).main
  assert.equal(step("u1"), null, "the creator is offered no close")
  assert.equal(step("u2")?.key, "close")
})
