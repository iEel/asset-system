import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPmPlanHref,
  buildPmPlanListWhere,
  buildPmPlanSearchWhere,
  parsePmPlanQuery,
  pmPlanListOrder,
  toPmPlanRowView,
  type PmPlanRecord,
} from "../src/lib/pm-plan-list.ts"
import { buildPmDueBucketWhere, getPmDueBadge } from "../src/lib/preventive-maintenance.ts"

// Group 5 plan 4 Task 1 (spec §9, G5P4-R1..R5): the PM list's query, wheres, order, links and row view.
const now = new Date("2026-11-02T17:30:00Z") // 3 Nov 00:30 in Bangkok
const bangkokToday = new Date("2026-11-02T17:00:00.000Z")

test("parsePmPlanQuery defaults to the active tab, no search, no due filter, page 1 of 25", () => {
  assert.deepEqual(parsePmPlanQuery({}), { tab: "active", q: "", due: null, page: 1, pageSize: 25 })
  assert.deepEqual(parsePmPlanQuery(new URLSearchParams()), { tab: "active", q: "", due: null, page: 1, pageSize: 25 })
})

test("parsePmPlanQuery keeps due only on the active tab and ignores an unknown value (G5P4-R2)", () => {
  assert.equal(parsePmPlanQuery({ state: "ended", due: "overdue" }).due, null)
  assert.equal(parsePmPlanQuery({ state: "paused", due: "week" }).due, null)
  assert.equal(parsePmPlanQuery({ due: "bogus" }).due, null)
  assert.equal(parsePmPlanQuery({ due: "overdue" }).due, "overdue")
  assert.equal(parsePmPlanQuery(new URLSearchParams("due=week")).due, "week")
  assert.equal(parsePmPlanQuery({ state: "bogus" }).tab, "active")
  assert.equal(parsePmPlanQuery({ state: ["ended", "paused"] }).tab, "ended", "a repeated key reads its first value")
})

test("parsePmPlanQuery trims q to 100 characters and reads the page like every list", () => {
  assert.equal(parsePmPlanQuery({ q: "  UPS  " }).q, "UPS")
  assert.equal(parsePmPlanQuery({ q: "x".repeat(150) }).q.length, 100)
  assert.deepEqual(parsePmPlanQuery({ page: "3", pageSize: "50" }), { tab: "active", q: "", due: null, page: 3, pageSize: 50 })
  assert.deepEqual(parsePmPlanQuery({ page: "0", pageSize: "7" }), { tab: "active", q: "", due: null, page: 1, pageSize: 25 })
})

test("buildPmPlanSearchWhere is an OR over the title, the plan no, the asset name and the tag, or nothing", () => {
  assert.deepEqual(buildPmPlanSearchWhere(""), {})
  assert.deepEqual(buildPmPlanSearchWhere("UPS"), {
    OR: [
      { title: { contains: "UPS" } },
      { planNo: { contains: "UPS" } },
      { asset: { name: { contains: "UPS" } } },
      { asset: { assetTag: { contains: "UPS" } } },
    ],
  })
})

test("buildPmPlanListWhere ANDs the tab, the search and the due bucket on the active tab", () => {
  const where = buildPmPlanListWhere({ tab: "active", q: "UPS", due: "overdue", page: 1, pageSize: 25 }, now)
  assert.deepEqual(where, {
    AND: [{ planState: "active" }, buildPmPlanSearchWhere("UPS"), buildPmDueBucketWhere("overdue", now)],
  })
  const bucket = (where.AND as Array<{ nextDueDate?: { lt?: Date } }>)[2]
  assert.deepEqual(bucket.nextDueDate, { lt: bangkokToday }, "overdue is before the Bangkok start of today")
  assert.deepEqual(buildPmPlanListWhere({ tab: "paused", q: "", due: null, page: 1, pageSize: 25 }, now), { AND: [{ planState: "paused" }] })
  assert.deepEqual(buildPmPlanListWhere({ tab: "ended", q: "", due: "overdue", page: 1, pageSize: 25 }, now), { AND: [{ planState: "ended" }] }, "due never applies off the active tab")
})

test("pmPlanListOrder: active and paused by next due date, ended newest first, then id (G5P4-R4)", () => {
  assert.deepEqual(pmPlanListOrder("active"), [{ nextDueDate: "asc" }, { id: "asc" }])
  assert.deepEqual(pmPlanListOrder("paused"), [{ nextDueDate: "asc" }, { id: "asc" }])
  assert.deepEqual(pmPlanListOrder("ended"), [{ updatedAt: "desc" }, { id: "asc" }])
})

test("buildPmPlanHref: a cell in use links back without due, a tab drops due and page, q and the page size stay", () => {
  const query = { tab: "active" as const, q: "UPS", due: "overdue" as const, page: 3, pageSize: 25 }
  assert.equal(buildPmPlanHref("th", query, { due: "overdue" }), "/th/maintenance/pm?q=UPS", "the overdue cell in use")
  assert.equal(buildPmPlanHref("th", query, { due: null }), "/th/maintenance/pm?q=UPS")
  assert.equal(buildPmPlanHref("th", query, { due: "soon" }), "/th/maintenance/pm?q=UPS&due=soon")
  assert.equal(buildPmPlanHref("th", query, { tab: "paused" }), "/th/maintenance/pm?state=paused&q=UPS")
  assert.equal(buildPmPlanHref("th", { ...query, pageSize: 50 }, { tab: "ended" }), "/th/maintenance/pm?state=ended&q=UPS&pageSize=50")
  assert.equal(buildPmPlanHref("th", query, { page: 4 }), "/th/maintenance/pm?q=UPS&due=overdue&page=4")
  assert.equal(buildPmPlanHref("en", { tab: "active", q: "", due: null, page: 1, pageSize: 25 }, {}), "/en/maintenance/pm")
  assert.equal(buildPmPlanHref("th", query, { tab: "active" }), "/th/maintenance/pm?q=UPS&due=overdue", "the same tab keeps due")
})

function plan(overrides: Partial<PmPlanRecord> = {}): PmPlanRecord {
  return {
    id: "plan-1",
    planNo: "PM-0001",
    title: "ล้างแอร์",
    frequency: "monthly",
    intervalDays: 30,
    nextDueDate: new Date("2026-10-20T00:00:00Z"),
    planState: "active",
    isActive: true,
    updatedAt: new Date("2026-10-01T03:00:00Z"),
    asset: { id: "asset-1", name: "UPS 1", assetTag: "AT-1", isActive: true, status: { name: "In Use", nameTh: "ใช้งาน" } },
    vendor: { code: "V01", name: "ร้านแอร์" },
    ...overrides,
  }
}

test("toPmPlanRowView: an active plan in scope shows its due badge", () => {
  const view = toPmPlanRowView(plan(), new Map(), now)
  assert.deepEqual(view, {
    id: "plan-1",
    planNo: "PM-0001",
    title: "ล้างแอร์",
    assetId: "asset-1",
    assetName: "UPS 1",
    assetTag: "AT-1",
    frequency: "monthly",
    intervalDays: 30,
    nextDueDate: new Date("2026-10-20T00:00:00Z"),
    planState: "active",
    updatedAt: new Date("2026-10-01T03:00:00Z"),
    vendor: { code: "V01", name: "ร้านแอร์" },
    due: { kind: "badge", badge: getPmDueBadge(new Date("2026-10-20T00:00:00Z"), now) },
    openRecord: null,
  })
})

test("toPmPlanRowView: an active plan of a Retired or inactive asset shows the asset's status (Review Focus 5)", () => {
  const retired = plan({ asset: { ...plan().asset, status: { name: "Retired", nameTh: "ปลดระวาง" } } })
  assert.deepEqual(toPmPlanRowView(retired, new Map(), now).due, { kind: "assetStatus", statusName: "Retired", statusLabel: "ปลดระวาง" })
  const disposed = plan({ asset: { ...plan().asset, status: { name: "Disposed", nameTh: "จำหน่ายแล้ว" } } })
  assert.equal(toPmPlanRowView(disposed, new Map(), now).due.kind, "assetStatus")
  const inactive = plan({ asset: { ...plan().asset, isActive: false } })
  assert.deepEqual(toPmPlanRowView(inactive, new Map(), now).due, { kind: "assetStatus", statusName: "In Use", statusLabel: "ใช้งาน" })
})

test("toPmPlanRowView: a paused plan shows its date only, an ended plan when it ended", () => {
  assert.deepEqual(toPmPlanRowView(plan({ planState: "paused", isActive: false }), new Map(), now).due, { kind: "dateOnly" })
  const ended = toPmPlanRowView(plan({ planState: "ended", isActive: false }), new Map(), now)
  assert.deepEqual(ended.due, { kind: "endedAt", at: new Date("2026-10-01T03:00:00Z") })
  assert.equal(ended.planState, "ended")
})

test("toPmPlanRowView: an asset with an open record keeps the due badge and names the record (Review Focus 2)", () => {
  const records = new Map([["asset-1", { id: "rec-1", repairNo: "RP-2026-0007" }]])
  const view = toPmPlanRowView(plan(), records, now)
  assert.deepEqual(view.openRecord, { id: "rec-1", repairNo: "RP-2026-0007" })
  assert.equal(view.due.kind, "badge")
  assert.equal(view.due.kind === "badge" ? view.due.badge.key : null, "overdue")
  assert.equal(toPmPlanRowView(plan({ vendor: null }), new Map(), now).vendor, null)
})
