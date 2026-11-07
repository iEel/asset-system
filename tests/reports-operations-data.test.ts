import assert from "node:assert/strict"
import test from "node:test"

import { buildAssetDataQualityWhere } from "../src/lib/asset-list-query.ts"
import {
  OPERATIONS_QUEUE_PAGE_SIZE,
  REPORT_ISSUE_KINDS,
  getReportsOperationsData,
  parseOperationsParams,
  type ReportIssueChoice,
  type ReportsOperationsDb,
  type ReportsOperationsInput,
} from "../src/lib/reports-operations-data.ts"
import { DEFAULT_WAITING_WORK_RULES } from "../src/lib/waiting-work-rules.ts"

// Group 10 plan 2 Task 1 (spec §5, board RP-Ops): the operations queue's reads through a fake db that answers each
// count by its where, so the cells are checked against the register's own dataQuality wheres.

const today = new Date("2026-11-06T17:00:00.000Z")
const whereOptions = { today, rules: { ...DEFAULT_WAITING_WORK_RULES, warrantyExpiryDays: 30 } }
const scope = { isActive: true, companyId: "co-a" }
const issueWhere = (kind: (typeof REPORT_ISSUE_KINDS)[number]) => buildAssetDataQualityWhere(kind, whereOptions)
const key = (where: unknown) => JSON.stringify(where)

type QueueAsset = {
  id: string
  assetTag: string
  name: string
  ownershipType: string | null
  serialNumber: string | null
  warrantyEndDate: Date | null
  custodianId: string | null
  departmentId: string | null
  category: { name: string }
  branch: { name: string }
  installedInLinks: Array<{ id: string }>
  attachments: Array<{ id: string }>
}

const asset = (id: string, patch: Partial<QueueAsset> = {}): QueueAsset => ({
  id,
  assetTag: `TAG-${id}`,
  name: `Asset ${id}`,
  ownershipType: "personal",
  serialNumber: "SN",
  warrantyEndDate: null,
  custodianId: "emp-1",
  departmentId: "dep-1",
  category: { name: "จอภาพ" },
  branch: { name: "สำนักงานใหญ่" },
  installedInLinks: [],
  attachments: [{ id: "img" }],
  ...patch,
})

function fakeDb(counts: Record<string, number>, rows: QueueAsset[]) {
  const findManyCalls: Array<Record<string, unknown>> = []
  const countWheres: unknown[] = []
  const db: ReportsOperationsDb = {
    asset: {
      async count(args) {
        const where = (args as { where: unknown }).where
        countWheres.push(where)
        return counts[key(where)] ?? 0
      },
      async findMany(args) {
        const call = args as Record<string, unknown>
        if ("skip" in call) {
          findManyCalls.push(call)
          return rows
        }
        return []
      },
      async groupBy() {
        return []
      },
    },
    employee: { findMany: async () => [] },
    location: { findMany: async () => [] },
    maintenanceTicket: { groupBy: async () => [] },
  }
  return { db, findManyCalls, countWheres }
}

const anyIssue = { OR: REPORT_ISSUE_KINDS.map(issueWhere) }
const incomplete = { OR: (["responsibility", "serial", "photo"] as const).map(issueWhere) }
const standardCounts = {
  [key({ AND: [scope, issueWhere("responsibility")] })]: 14,
  [key({ AND: [scope, issueWhere("serial")] })]: 29,
  [key({ AND: [scope, issueWhere("photo")] })]: 38,
  [key({ AND: [scope, issueWhere("warranty")] })]: 4,
  [key({ AND: [scope, anyIssue] })]: 70,
  [key({ AND: [scope, incomplete] })]: 66,
}

function input(params: { issue?: ReportIssueChoice; qpage?: number; others?: boolean } = {}): ReportsOperationsInput {
  return {
    locale: "th",
    issue: params.issue ?? "all",
    qpage: params.qpage ?? 1,
    others: params.others ?? false,
    baseQuery: new URLSearchParams("companyId=co-a&view=operations"),
    canEdit: true,
    whereOptions,
    topsWhere: scope,
    loadCrossScope: async () => ({ all: 0, custodianCompany: 0, custodianBranch: 0, locationBranch: 0, rows: [] }),
    labels: { unassigned: "ยังไม่ระบุ" },
  }
}

test("parseOperationsParams: junk falls back to all, page 1, others off", () => {
  assert.deepEqual(parseOperationsParams({}), { issue: "all", qpage: 1, others: false })
  assert.deepEqual(parseOperationsParams({ issue: "purchase", qpage: "-2", others: "yes" }), { issue: "all", qpage: 1, others: false })
  assert.deepEqual(parseOperationsParams({ issue: "x", qpage: "1.5" }), { issue: "all", qpage: 1, others: false })
  assert.deepEqual(parseOperationsParams({ issue: ["serial", "photo"], qpage: "3", others: "1" }), { issue: "serial", qpage: 3, others: true })
})

test("counts per issue and distinct", async () => {
  const { db, countWheres } = fakeDb(standardCounts, [])
  const { queue } = await getReportsOperationsData(scope, input(), db)
  assert.deepEqual(queue.counts, { responsibility: 14, serial: 29, photo: 38, warranty: 4 })
  assert.equal(queue.distinct, 70)
  assert.equal(queue.incompleteDistinct, 66)
  assert.equal(queue.warrantyOnly, 4)
  assert.equal(queue.issueTotal, 14 + 29 + 38)
  assert.equal(queue.total, 70)
  // Each count is the scope AND the register's where for that dataQuality value.
  for (const kind of REPORT_ISSUE_KINDS) {
    assert.ok(countWheres.some((where) => key(where) === key({ AND: [scope, issueWhere(kind)] })), kind)
  }
})

test("qpage clamps to 1..pageCount", async () => {
  const high = fakeDb(standardCounts, [])
  const { queue } = await getReportsOperationsData(scope, input({ issue: "serial", qpage: 99 }), high.db)
  assert.equal(queue.total, 29)
  assert.equal(queue.pageCount, Math.ceil(29 / OPERATIONS_QUEUE_PAGE_SIZE))
  assert.equal(queue.page, 4)
  assert.equal(high.findManyCalls[0].skip, 3 * OPERATIONS_QUEUE_PAGE_SIZE)
  assert.equal(high.findManyCalls[0].take, OPERATIONS_QUEUE_PAGE_SIZE)
  assert.deepEqual(high.findManyCalls[0].orderBy, { updatedAt: "desc" })
  assert.equal(queue.from, 25)
  assert.equal(queue.to, 29)
  assert.match(queue.links.previous, /qpage=3/)

  const empty = fakeDb({}, [])
  const none = await getReportsOperationsData(scope, input({ qpage: 5 }), empty.db)
  assert.equal(none.queue.page, 1)
  assert.equal(none.queue.pageCount, 1)
  assert.equal(none.queue.from, 0)
  assert.equal(empty.findManyCalls.length, 0, "no rows read for an empty queue")
})

test("issue filters rows; others shows all issues", async () => {
  const rows = [
    asset("a1", { serialNumber: null, custodianId: null }),
    asset("a2", { serialNumber: "", attachments: [] }),
  ]
  const serialOnly = fakeDb(standardCounts, rows)
  const { queue } = await getReportsOperationsData(scope, input({ issue: "serial" }), serialOnly.db)
  assert.deepEqual(serialOnly.findManyCalls[0].where, { AND: [scope, issueWhere("serial")] })
  assert.deepEqual(queue.rows.map((row) => row.issues), [["serial"], ["serial"]])

  const withOthers = fakeDb(standardCounts, rows)
  const shown = await getReportsOperationsData(scope, input({ issue: "serial", others: true }), withOthers.db)
  assert.deepEqual(shown.queue.rows.map((row) => row.issues), [["responsibility", "serial"], ["serial", "photo"]])
  assert.match(shown.queue.links.toggleOthers, /issue=serial/)
  assert.doesNotMatch(shown.queue.links.toggleOthers, /others=1/)
  assert.match(queue.links.toggleOthers, /others=1/)

  const all = fakeDb(standardCounts, rows)
  await getReportsOperationsData(scope, input(), all.db)
  assert.deepEqual(all.findManyCalls[0].where, { AND: [scope, anyIssue] })

  // The cells keep the report's filters and the toggle; "all" drops issue=.
  assert.equal(queue.links.cells.photo, "/th/reports?companyId=co-a&view=operations&issue=photo#report-ops-queue")
  assert.equal(queue.links.cells.all, "/th/reports?companyId=co-a&view=operations#report-ops-queue")
})

test("an empty issue shows no export", async () => {
  const counts = { ...standardCounts, [key({ AND: [scope, issueWhere("warranty")] })]: 0 }
  const empty = await getReportsOperationsData(scope, input({ issue: "warranty" }), fakeDb(counts, []).db)
  assert.equal(empty.queue.exportIssue, null)
  const all = await getReportsOperationsData(scope, input(), fakeDb(standardCounts, []).db)
  assert.equal(all.queue.exportIssue, null, "ทั้งหมดในคิว exports nothing")
  const serial = await getReportsOperationsData(scope, input({ issue: "serial" }), fakeDb(standardCounts, []).db)
  assert.equal(serial.queue.exportIssue, "serial")
})

test("fix link and field per first issue", async () => {
  const warrantyEnd = new Date(today.getTime() + 5 * 86_400_000)
  const rows = [
    asset("r1", { custodianId: null, serialNumber: null }),
    asset("s1", { serialNumber: null }),
    asset("p1", { attachments: [] }),
    asset("w1", { warrantyEndDate: warrantyEnd }),
  ]
  const { queue } = await getReportsOperationsData(scope, input(), fakeDb(standardCounts, rows).db)
  assert.deepEqual(queue.rows.map((row) => row.issues), [["responsibility", "serial"], ["serial"], ["photo"], ["warranty"]])
  assert.deepEqual(queue.rows[0].fix, { href: "/th/assets/r1/edit", fieldKey: "responsibility", place: "edit" })
  assert.deepEqual(queue.rows[1].fix, { href: "/th/assets/s1/edit", fieldKey: "serialNumber", place: "edit" })
  assert.equal(queue.rows[2].fix.fieldKey, "photos")
  assert.match(queue.rows[2].fix.href, /^\/th\/assets\/p1\?.*#photos$/)
  assert.equal(queue.rows[3].fix.fieldKey, "warranty")
  assert.match(queue.rows[3].fix.href, /^\/th\/assets\/w1\?.*#purchase$/)
  assert.equal(queue.rows[0].categoryName, "จอภาพ")
  assert.equal(queue.rows[0].branchName, "สำนักงานใหญ่")
})

test("idle and the top lists keep today's reads, names first", async () => {
  const { db } = fakeDb(standardCounts, [])
  db.asset.groupBy = async (args) => {
    const by = (args as { by: string[] }).by[0]
    if (by === "custodianId") return [{ custodianId: "emp-1", _count: { _all: 9 } }]
    return [{ currentLocationId: "loc-1", _count: { _all: 132 } }]
  }
  db.employee.findMany = async () => [{ id: "emp-1", code: "E001", fullNameTh: "สมชาย" }]
  db.location.findMany = async () => [{ id: "loc-1", code: "HQ-IT-ST", name: "คลัง IT ชั้น 2" }]
  db.maintenanceTicket.groupBy = async () => [{ assetId: "x1", _count: { _all: 4 } }]
  const findMany = db.asset.findMany
  db.asset.findMany = async (args) => ("skip" in (args as object) ? findMany(args) : [{ id: "x1", assetTag: "GRL-PRN-24-0008", name: "Printer Brother" }])
  const data = await getReportsOperationsData(scope, input(), db)
  assert.deepEqual(data.tops.custodians, [{ key: "emp-1", name: "สมชาย", code: "E001", count: 9 }])
  assert.deepEqual(data.tops.locations, [{ key: "loc-1", name: "คลัง IT ชั้น 2", code: "HQ-IT-ST", count: 132 }])
  assert.deepEqual(data.tops.repairs, [{ key: "x1", name: "Printer Brother", code: "GRL-PRN-24-0008", count: 4, href: "/th/assets/x1" }])
  assert.equal(data.warrantyDays, 30)
})
