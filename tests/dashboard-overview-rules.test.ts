import test from "node:test"
import assert from "node:assert/strict"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"
import {
  auditPace,
  auditPercent,
  buildDashboardAudit,
  buildDashboardStatusRows,
  DASHBOARD_KPI_ORDER,
  DASHBOARD_SECTION_ORDER,
  dashboardRegisterParams,
  formatAsOf,
  getDashboardProfile,
  isBehindPace,
  pickCurrentAuditRound,
  sortBranchesByGap,
} from "../src/lib/dashboard-overview-rules.ts"

// How the round form stores a date: z.coerce.date("YYYY-MM-DD") is UTC midnight, the same calendar day in Bangkok.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

test("the profile comes from permissions, never from role names (spec §6.1)", () => {
  const viewer = { roles: ["e2e_viewer_1"], permissions: ["asset:view", "audit:view", "maintenance:view", "disposal:view", "report:view"] }
  assert.equal(getDashboardProfile(viewer, false), "overview")
  assert.equal(getDashboardProfile(viewer, true), "work", "an approver works")
  assert.equal(getDashboardProfile({ roles: ["system_admin"], permissions: [] }, false), "work")
  for (const permission of ["asset:create", "asset:edit", "maintenance:create", "maintenance:edit", "audit:create", "audit:edit", "disposal:create", "disposal:edit"]) {
    assert.equal(getDashboardProfile({ roles: [], permissions: [permission] }, false), "work", permission)
  }
  for (const permission of ["asset:delete", "report:export", "dashboard:view", "setting:edit"]) {
    assert.equal(getDashboardProfile({ roles: [], permissions: [permission] }, false), "overview", permission)
  }
  assert.equal(getDashboardProfile({ roles: ["executive"], permissions: ["report:view"] }, false), "overview")
})

test("the same parts in a role-based order (spec §6.1)", () => {
  assert.deepEqual(DASHBOARD_KPI_ORDER, {
    work: ["waiting", "audit", "total", "custodian"],
    overview: ["total", "custodian", "audit", "waiting"],
  })
  assert.deepEqual(DASHBOARD_SECTION_ORDER, {
    work: ["waiting", "branches", "status", "recent"],
    overview: ["status", "branches", "waiting", "recent"],
  })
})

test("each overview number's list is the register parsed from the same filters (spec §6.5)", () => {
  assert.deepEqual(dashboardRegisterParams("total", null), {})
  assert.deepEqual(dashboardRegisterParams("idle180", null), { activity: "idle_180d" })
  assert.deepEqual(dashboardRegisterParams("custodianAssigned", "c1"), { companyId: "c1", custodianState: "assigned" })
  assert.deepEqual(dashboardRegisterParams("responsibilityMissing", null), { dataQuality: "responsibility" })
  assert.deepEqual(dashboardRegisterParams("crossScope", "c1"), { companyId: "c1", crossScope: "all" })
  assert.deepEqual(dashboardRegisterParams({ statusId: "s/1" }, null), { statusId: "s/1" })
  const counts = ["total", "idle180", "custodianAssigned", "responsibilityMissing", "crossScope", { statusId: "s/1" }] as const
  for (const count of counts) {
    for (const companyId of [null, "company 1"]) {
      const params = dashboardRegisterParams(count, companyId)
      const query = new URL(buildExactAssetRegisterHref("th", params), "http://localhost").searchParams
      assert.equal(query.get("exact"), "1")
      assert.deepEqual(parseAssetListParams(query), parseAssetListParams(params), JSON.stringify(params))
    }
  }
  // Every value is one the register knows: a typo would parse to "" and count every asset.
  assert.equal(parseAssetListParams(dashboardRegisterParams("idle180", null)).activity, "idle_180d")
  assert.equal(parseAssetListParams(dashboardRegisterParams("custodianAssigned", null)).custodianState, "assigned")
  assert.equal(parseAssetListParams(dashboardRegisterParams("responsibilityMissing", null)).dataQuality, "responsibility")
  assert.equal(parseAssetListParams(dashboardRegisterParams("crossScope", null)).crossScope, "all")
})

test("the pace runs from the round's start to its due date in Bangkok days (spec §6.7)", () => {
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-16T03:00:00Z")), 0.5)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-01T03:00:00Z")), 0)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-09-20T03:00:00Z")), 0)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-10-31T16:59:00Z")), 1)
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-31"), new Date("2026-11-20T03:00:00Z")), 1)
  // 18:00Z on the 5th is already the 6th in Bangkok: 5 of 10 days, not 4.
  assert.equal(auditPace(day("2026-10-01"), day("2026-10-11"), new Date("2026-10-05T18:00:00Z")), 0.5)
  // A one-day round is 1 from its start.
  assert.equal(auditPace(day("2026-10-25"), day("2026-10-25"), new Date("2026-10-25T01:00:00Z")), 1)
  assert.equal(auditPace(day("2026-10-25"), day("2026-10-25"), new Date("2026-10-24T10:00:00Z")), 0)
})

test("progress is a whole percent, as the round page shows it; behind means below the pace (spec §6.7)", () => {
  assert.equal(auditPercent(1177, 1731), 68)
  assert.equal(auditPercent(0, 0), 0)
  assert.equal(isBehindPace(41, 100, 0.75), true)
  assert.equal(isBehindPace(75, 100, 0.75), false)
  assert.equal(isBehindPace(746, 1000, 0.75), false, "75% on screen is not behind a 75% pace")
  assert.equal(isBehindPace(744, 1000, 0.75), true)
  assert.equal(isBehindPace(0, 10, null), false)
  assert.equal(isBehindPace(0, 0, 0.5), false)
})

test("the current round: in its dates with the nearest due date, else the one past due most recently (spec §6.4)", () => {
  const round = (auditNo: string, status: string, start: string, end: string) => ({ auditNo, status, startDate: day(start), endDate: day(end) })
  const today = new Date("2026-10-25T03:00:00Z")
  const a = round("A", "open", "2026-10-01", "2026-10-31")
  const b = round("B", "open", "2026-10-20", "2026-10-27")
  const future = round("C", "open", "2026-11-01", "2026-11-30")
  const draft = round("D", "draft", "2026-10-01", "2026-10-26")
  const late = round("E", "open", "2026-09-01", "2026-09-30")
  const later = round("F", "open", "2026-08-01", "2026-10-10")
  assert.deepEqual(pickCurrentAuditRound([a, b, future, draft, late, later], today), { current: b, otherOpen: 5 })
  assert.deepEqual(pickCurrentAuditRound([future, draft, late, later], today), { current: later, otherOpen: 3 })
  assert.deepEqual(pickCurrentAuditRound([future, draft], today), { current: null, otherOpen: 2 })
  assert.deepEqual(pickCurrentAuditRound([], today), { current: null, otherOpen: 0 })
  const closed = [round("X", "closed", "2026-10-01", "2026-10-31"), round("Y", "cancelled", "2026-10-01", "2026-10-31")]
  assert.deepEqual(pickCurrentAuditRound(closed, today), { current: null, otherOpen: 0 })
  // A round due today stays current until Bangkok midnight.
  const dueToday = round("G", "open", "2026-10-01", "2026-10-25")
  assert.equal(pickCurrentAuditRound([dueToday], new Date("2026-10-25T16:30:00Z")).current, dueToday)
  assert.equal(pickCurrentAuditRound([dueToday, a], new Date("2026-10-25T17:30:00Z")).current, a)
  // With a company chosen only an eligible round can be current; every operational round still counts as another one.
  assert.deepEqual(pickCurrentAuditRound([a, b, draft], today, (r) => r.auditNo === "A"), { current: a, otherOpen: 2 })
})

test("the current round's ties: the nearest due date, then the latest start, then the code, whatever the input order", () => {
  const round = (auditNo: string, start: string, end: string) => ({ auditNo, status: "open", startDate: day(start), endDate: day(end) })
  const today = new Date("2026-10-25T03:00:00Z")
  const b = round("AUD-2026-0002", "2026-10-20", "2026-10-27")
  const laterStart = round("AUD-2026-0009", "2026-10-22", "2026-10-27")
  const twin = round("AUD-2026-0001", "2026-10-20", "2026-10-27")
  assert.equal(pickCurrentAuditRound([b, laterStart], today).current, laterStart)
  assert.equal(pickCurrentAuditRound([laterStart, b], today).current, laterStart)
  assert.equal(pickCurrentAuditRound([b, twin], today).current, twin)
  assert.equal(pickCurrentAuditRound([twin, b], today).current, twin)
  // Past due: the most recent due date is the nearest one; then the same two tie-breaks.
  const late = round("AUD-2026-0003", "2026-09-01", "2026-09-30")
  const lateLaterStart = round("AUD-2026-0008", "2026-09-05", "2026-09-30")
  const lateTwin = round("AUD-2026-0004", "2026-09-05", "2026-09-30")
  assert.equal(pickCurrentAuditRound([late, lateLaterStart], today).current, lateLaterStart)
  assert.equal(pickCurrentAuditRound([lateLaterStart, lateTwin, late], today).current, lateTwin)
})

test("branches: the most behind first (spec §6.7)", () => {
  const rows = [
    { name: "สำนักงานใหญ่", processed: 640, expected: 780 },
    { name: "สาขา ก", processed: 41, expected: 100 },
    { name: "สาขา ข", processed: 247, expected: 281 },
    { name: "สาขาบางนา", processed: 290, expected: 410 },
    { name: "สาขา ค", processed: 1, expected: 2 },
    { name: "สาขา ง", processed: 2, expected: 4 },
  ]
  assert.deepEqual(sortBranchesByGap(rows).map((row) => row.name), ["สาขา ก", "สาขา ง", "สาขา ค", "สาขาบางนา", "สำนักงานใหญ่", "สาขา ข"])
  assert.equal(rows[0].name, "สำนักงานใหญ่", "the input is not reordered")
})

test("the round's progress, pace and branches from one count of items (spec §6.2, §6.4, §6.7)", () => {
  const rounds = [
    { id: "r1", auditNo: "AUD-2026-0001", name: "รอบหนึ่ง", status: "open", startDate: day("2026-10-01"), endDate: day("2026-10-31") },
    { id: "r2", auditNo: "AUD-2026-0002", name: "รอบสอง", status: "open", startDate: day("2026-10-20"), endDate: day("2026-10-27") },
    { id: "r3", auditNo: "AUD-2026-0003", name: "รอบสาม", status: "draft", startDate: day("2026-10-01"), endDate: day("2026-10-31") },
  ]
  const branches = new Map([
    ["b1", { name: "สำนักงานใหญ่", companyCode: "SNI" }],
    ["b2", { name: "สาขาบางนา", companyCode: "SNI" }],
  ])
  const today = new Date("2026-10-24T03:00:00Z")
  const allCompanies = buildDashboardAudit({
    rounds,
    itemCounts: [
      { auditRoundId: "r2", expectedBranchId: "b1", auditStatus: "pending", count: 3 },
      { auditRoundId: "r2", expectedBranchId: "b1", auditStatus: "scanned", count: 7 },
      { auditRoundId: "r2", expectedBranchId: "b2", auditStatus: "pending", count: 5 },
      { auditRoundId: "r2", expectedBranchId: "b2", auditStatus: "reviewed", count: 5 },
      { auditRoundId: "r1", expectedBranchId: "b1", auditStatus: "pending", count: 10 },
    ],
    branches,
    today,
    narrowedToCompany: false,
  })
  assert.deepEqual(allCompanies, {
    round: { id: "r2", code: "AUD-2026-0002", name: "รอบสอง", startDate: day("2026-10-20"), endDate: day("2026-10-27") },
    otherOpen: 2,
    processed: 12,
    expected: 20,
    pace: 4 / 7,
    branches: [
      { branchId: "b2", name: "SNI / สาขาบางนา", processed: 5, expected: 10, behind: true },
      { branchId: "b1", name: "SNI / สำนักงานใหญ่", processed: 7, expected: 10, behind: false },
    ],
  })
  // One company: only rounds holding its items can be current, and the branch names drop the company code.
  const oneCompany = buildDashboardAudit({
    rounds,
    itemCounts: [{ auditRoundId: "r1", expectedBranchId: "b1", auditStatus: "pending", count: 10 }],
    branches,
    today,
    narrowedToCompany: true,
  })
  assert.equal(oneCompany.round?.id, "r1")
  assert.equal(oneCompany.otherOpen, 2)
  assert.equal(oneCompany.pace, 23 / 30)
  assert.deepEqual(oneCompany.branches, [{ branchId: "b1", name: "สำนักงานใหญ่", processed: 0, expected: 10, behind: true }])
  assert.deepEqual(buildDashboardAudit({ rounds: [], itemCounts: [], branches, today, narrowedToCompany: false }), {
    round: null, otherOpen: 0, processed: 0, expected: 0, pace: null, branches: [],
  })
})

test("the status rows: every status with assets, in the status order, none merged (spec §6.6)", () => {
  const statuses = [
    { id: "s-disposed", name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว", sortOrder: 9 },
    { id: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน", sortOrder: 1 },
    { id: "s-lost", name: "Lost", nameTh: "สูญหาย", sortOrder: 5 },
    { id: "s-use", name: "In Use", nameTh: "ใช้งานอยู่", sortOrder: 2 },
    { id: "s-maint", name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", sortOrder: 4 },
    { id: "s-repair", name: "Pending Repair", nameTh: "รอซ่อม", sortOrder: 4 },
  ]
  const groups = [
    { statusId: "s-use", count: 1380 },
    { statusId: "s-disposed", count: 35 },
    { statusId: "s-ready", count: 127 },
    { statusId: "s-maint", count: 4 },
    { statusId: "s-repair", count: 6 },
  ]
  const rows = buildDashboardStatusRows(groups, statuses)
  assert.deepEqual(rows.map((row) => [row.name, row.count]), [["Ready", 127], ["In Use", 1380], ["Pending Repair", 6], ["Under Maintenance", 4], ["Disposed", 35]])
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1552, "the rows add up to the total")
  assert.deepEqual(rows[0], { statusId: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน", count: 127 })
})

test("the as-of time is Bangkok's, with the Thai short month and the Buddhist year (spec §6.2)", () => {
  assert.equal(formatAsOf(new Date("2026-10-25T07:05:00Z"), "th"), "25 ต.ค. 2569 14:05")
  assert.equal(formatAsOf(new Date("2026-10-25T07:05:00Z"), "en"), "25 Oct 2026 14:05")
  assert.equal(formatAsOf(new Date("2026-12-31T17:30:00Z"), "th"), "1 ม.ค. 2570 00:30")
  assert.equal(formatAsOf(new Date("2026-12-31T17:30:00Z"), "en"), "1 Jan 2027 00:30")
})
