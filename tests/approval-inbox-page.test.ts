import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildApprovalInboxPage,
  buildApprovalInboxRows,
  parseApprovalInboxItemParam,
  parseApprovalInboxQuery,
  type ApprovalInboxQuery,
  type ApprovalInboxRow,
} from "../src/lib/approval-inbox.ts"
import { getApprovalAgeStatus } from "../src/lib/approval-aging.ts"

// Group 6 plan 1 Task 4: the approvals-inbox read model (spec §7.2–7.3).
const now = new Date("2026-11-04T05:00:00Z")
const sla = 3

type RowInput = {
  key?: ApprovalInboxRow["key"]
  id: string
  title?: string
  codes?: string
  daysAgo: number
  isOwn?: boolean
  block?: ApprovalInboxRow["block"]
}

function row(input: RowInput): ApprovalInboxRow {
  const key = input.key ?? "disposal"
  const requestedAt = new Date(now.getTime() - input.daysAgo * 24 * 60 * 60 * 1000)
  const title = input.title ?? `Asset ${input.id}`
  const codes = input.codes ?? `TAG-${input.id} · DP-${input.id}`
  const kind = key === "disposal" ? "disposal_review" : key === "finding" ? "audit_finding_review" : "audit_round_close"
  const subtype: ApprovalInboxRow["subtype"] =
    key === "disposal" ? { kind: "method", disposalType: "sale" } : key === "finding" ? { kind: "finding", findingType: "wrong_location" } : { kind: "close" }
  const block = key === "disposal" ? input.block ?? null : null
  return {
    key,
    id: input.id,
    href: `/th/admin/approvals?item=${key}:${input.id}`,
    kind,
    subtype,
    title,
    codes,
    searchText: `${title} ${codes}`.toLowerCase(),
    requesterName: "Somchai",
    isOwn: input.isOwn ?? false,
    requestedAt,
    age: getApprovalAgeStatus(requestedAt, now, sla),
    block,
    photoCount: null,
    tickable: key !== "round" && block === null,
  }
}

function query(overrides: Partial<ApprovalInboxQuery> = {}): ApprovalInboxQuery {
  return { tab: "all", search: "", overdue: false, page: 1, pageSize: 25, ...overrides }
}

test("rows come overdue first, then the oldest", () => {
  const rows = [row({ id: "a", daysAgo: 1 }), row({ id: "b", daysAgo: 5 }), row({ id: "c", daysAgo: 2 }), row({ id: "d", daysAgo: 9 })]
  const page = buildApprovalInboxPage({ rows }, query(), now)
  assert.deepEqual(page.rows.map((r) => r.id), ["d", "b", "c", "a"])
  assert.equal(page.rows[0].age.isOverdue, true)
  assert.equal(page.rows[2].age.isOverdue, false)
})

test("30 rows page by 25: page 2 holds 5, and a page past the end clamps to the last", () => {
  const rows = Array.from({ length: 30 }, (_, index) => row({ id: `r${index}`, daysAgo: index % 7 }))
  const second = buildApprovalInboxPage({ rows }, query({ page: 2 }), now)
  assert.equal(second.rows.length, 5)
  assert.equal(second.filteredTotal, 30)
  assert.equal(second.page, 2)
  assert.equal(second.pageSize, 25)

  const past = buildApprovalInboxPage({ rows }, query({ page: 9 }), now)
  assert.equal(past.page, 2)
  assert.equal(past.rows.length, 5)

  const empty = buildApprovalInboxPage({ rows: [] }, query({ page: 4 }), now)
  assert.equal(empty.page, 1)
  assert.deepEqual(empty.rows, [])
  assert.equal(empty.strip.oldest, null)
})

test("search matches a title or a code, ignoring case and surrounding spaces", () => {
  const rows = [
    row({ id: "d1", title: "ThinkPad T14", codes: "GRL-NB-24-0001 · DP-20261011-0041", daysAgo: 1 }),
    row({ key: "finding", id: "f1", title: "Printer", codes: "GRL-PRN-24-0008 · AUD-2026-0003", daysAgo: 2 }),
    row({ key: "round", id: "r1", title: "HQ count", codes: "AUD-2026-0009", daysAgo: 3 }),
  ]
  assert.deepEqual(buildApprovalInboxPage({ rows }, query({ search: "ThinkPad" }), now).rows.map((r) => r.id), ["d1"])
  assert.deepEqual(buildApprovalInboxPage({ rows }, query({ search: "  thinkpad  " }), now).rows.map((r) => r.id), ["d1"])
  assert.deepEqual(buildApprovalInboxPage({ rows }, query({ search: "AUD-2026-0003" }), now).rows.map((r) => r.id), ["f1"])
  assert.deepEqual(buildApprovalInboxPage({ rows }, query({ search: "aud-2026-0003" }), now).rows.map((r) => r.id), ["f1"])
})

test("the audit tab holds findings and rounds; tab counts follow the filters, the strip does not", () => {
  const rows = [
    row({ id: "d1", title: "ThinkPad", daysAgo: 6 }),
    row({ id: "d2", title: "Monitor", daysAgo: 1 }),
    row({ key: "finding", id: "f1", title: "Printer", daysAgo: 5 }),
    row({ key: "finding", id: "f2", title: "Chair", daysAgo: 0 }),
    row({ key: "round", id: "r1", title: "HQ count", daysAgo: 2 }),
  ]
  const audit = buildApprovalInboxPage({ rows }, query({ tab: "audit" }), now)
  assert.deepEqual(audit.rows.map((r) => r.key).sort(), ["finding", "finding", "round"])
  assert.equal(audit.filteredTotal, 3)
  assert.deepEqual(audit.tabs, { all: 5, disposal: 2, audit: 3, findings: 2, rounds: 1 })

  const overdue = buildApprovalInboxPage({ rows }, query({ overdue: true }), now)
  assert.ok(overdue.rows.every((r) => r.age.isOverdue))
  assert.deepEqual(overdue.rows.map((r) => r.id), ["d1", "f1"])
  assert.deepEqual(overdue.tabs, { all: 2, disposal: 1, audit: 1, findings: 1, rounds: 0 })

  const searched = buildApprovalInboxPage({ rows }, query({ search: "printer" }), now)
  assert.deepEqual(searched.tabs, { all: 1, disposal: 0, audit: 1, findings: 1, rounds: 0 })

  const hidden = buildApprovalInboxPage({ rows }, query({ search: "nothing matches this" }), now)
  assert.equal(hidden.filteredTotal, 0)
  assert.deepEqual(hidden.rows, [])
  assert.deepEqual(hidden.tabs, { all: 0, disposal: 0, audit: 0, findings: 0, rounds: 0 })
  assert.equal(hidden.strip.total.total, 5)
  assert.deepEqual(hidden.strip, audit.strip)
})

test("the strip: overdue by kind, the oldest by sent date, and overdue + within = total", () => {
  const rows = [
    row({ id: "d1", daysAgo: 6 }),
    row({ id: "d2", daysAgo: 1 }),
    row({ key: "finding", id: "f1", title: "Printer", daysAgo: 8 }),
    row({ key: "round", id: "r1", title: "HQ count", daysAgo: 4 }),
    row({ key: "finding", id: "f2", daysAgo: 3 }),
  ]
  const { strip } = buildApprovalInboxPage({ rows }, query(), now)
  assert.deepEqual(strip.overdue, { total: 3, disposal: 1, audit: 2 })
  assert.equal(strip.total.total, 5)
  assert.equal(strip.total.overdue + strip.total.within, strip.total.total)
  assert.deepEqual(strip.total, { total: 5, overdue: 3, within: 2 })
  assert.deepEqual(strip.oldest, { key: "finding", id: "f1", title: "Printer", ageDays: 8, requestedAt: rows[2].requestedAt })
})

test("the viewer's own disposal request stays in the rows and counts but cannot be ticked; rounds never can", () => {
  const own = row({ id: "own", daysAgo: 1, isOwn: true, block: { code: "DISPOSAL_SOD_CONFLICT", sodReason: "requester" } })
  const rows = [own, row({ id: "d2", daysAgo: 2 }), row({ key: "round", id: "r1", daysAgo: 1 }), row({ key: "finding", id: "f1", daysAgo: 1 })]
  const page = buildApprovalInboxPage({ rows }, query(), now)
  const ownRow = page.rows.find((r) => r.id === "own")
  assert.ok(ownRow)
  assert.equal(ownRow.isOwn, true)
  assert.equal(ownRow.block?.sodReason, "requester")
  assert.equal(ownRow.tickable, false)
  assert.equal(page.tabs.disposal, 2)
  assert.equal(page.strip.total.total, 4)
  assert.equal(page.rows.find((r) => r.id === "r1")?.tickable, false)
  assert.equal(page.rows.find((r) => r.id === "f1")?.tickable, true)
  assert.equal(page.rows.find((r) => r.id === "d2")?.tickable, true)
})

// Review Focus 4: a reporter or creator id with no user row shows the raw id.
test("rows: names, codes, search text, blocks and the raw-id fallback", () => {
  const rows = buildApprovalInboxRows({
    locale: "th",
    now,
    slaDays: sla,
    viewer: { userId: "user-me", employeeId: "emp-me" },
    segregationRequired: true,
    userNames: new Map([["user-a", "Narin A."]]),
    findingTypeLabel: (type) => (type === "wrong_location" ? "ที่ตั้ง" : type),
    disposalRequests: [
      {
        id: "dsp-1",
        disposalNo: "DP-20261011-0041",
        disposalType: "sale",
        isActive: true,
        requestStatus: "pending",
        requestedById: "emp-me",
        createdBy: "user-other",
        requestDate: new Date("2026-11-01T03:00:00Z"),
        requesterName: "Somchai",
        asset: { assetTag: "GRL-PRN-24-0008", name: "ThinkPad T14", status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", isActive: true } },
      },
      {
        id: "dsp-2",
        disposalNo: "DP-20261011-0042",
        disposalType: "scrap",
        isActive: true,
        requestStatus: "pending",
        requestedById: "emp-other",
        createdBy: "user-other",
        requestDate: new Date("2026-11-02T03:00:00Z"),
        requesterName: "Somsri",
        asset: { assetTag: "GRL-NB-24-0001", name: "Notebook", status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", isActive: true } },
      },
    ],
    auditFindings: [
      { id: "fnd-1", auditNo: "AUD-2026-0003", findingType: "wrong_location", assetTag: "GRL-CAM-0003", assetName: "Camera", reportedBy: "user-a", reportedAt: new Date("2026-10-30T03:00:00Z") },
      { id: "fnd-2", auditNo: "AUD-2026-0003", findingType: "not_found", assetTag: null, assetName: null, reportedBy: "removed-user", reportedAt: new Date("2026-10-31T03:00:00Z") },
    ],
    auditRounds: [{ id: "rnd-1", auditNo: "AUD-2026-0009", name: "HQ Annual Count", createdBy: "gone-user", updatedAt: new Date("2026-11-03T03:00:00Z") }],
  })

  const byId = new Map(rows.map((r) => [r.id, r]))
  const own = byId.get("dsp-1")!
  assert.equal(own.href, "/th/admin/approvals?item=disposal:dsp-1")
  assert.equal(own.kind, "disposal_review")
  assert.deepEqual(own.subtype, { kind: "method", disposalType: "sale" })
  assert.equal(own.title, "ThinkPad T14")
  assert.equal(own.codes, "GRL-PRN-24-0008 · DP-20261011-0041")
  assert.equal(own.isOwn, true)
  assert.deepEqual(own.block, { code: "DISPOSAL_SOD_CONFLICT", sodReason: "requester" })
  assert.equal(own.tickable, false)
  assert.equal(own.photoCount, null)
  assert.equal(own.requesterName, "Somchai")
  assert.equal(own.age.ageDays, 3)
  assert.match(own.searchText, /thinkpad t14/)
  assert.match(own.searchText, /dp-20261011-0041/)

  const other = byId.get("dsp-2")!
  assert.equal(other.isOwn, false)
  assert.equal(other.block, null)
  assert.equal(other.tickable, true)

  const finding = byId.get("fnd-1")!
  assert.equal(finding.href, "/th/admin/approvals?item=finding:fnd-1")
  assert.equal(finding.requesterName, "Narin A.")
  assert.equal(finding.title, "Camera")
  assert.equal(finding.codes, "GRL-CAM-0003 · AUD-2026-0003")
  assert.deepEqual(finding.subtype, { kind: "finding", findingType: "wrong_location" })
  assert.match(finding.searchText, /ที่ตั้ง/)
  assert.match(finding.searchText, /aud-2026-0003/)
  assert.equal(finding.block, null)
  assert.equal(finding.photoCount, null)
  assert.equal(finding.tickable, true)

  assert.equal(byId.get("fnd-2")!.requesterName, "removed-user")
  assert.equal(byId.get("fnd-2")!.codes, "AUD-2026-0003")

  const round = byId.get("rnd-1")!
  assert.equal(round.href, "/th/admin/approvals?item=round:rnd-1")
  assert.equal(round.kind, "audit_round_close")
  assert.deepEqual(round.subtype, { kind: "close" })
  assert.equal(round.title, "HQ Annual Count")
  assert.equal(round.codes, "AUD-2026-0009")
  assert.equal(round.requesterName, "gone-user")
  assert.equal(round.requestedAt.toISOString(), "2026-11-03T03:00:00.000Z")
  assert.equal(round.tickable, false)
  assert.match(round.searchText, /hq annual count/)
})

test("parseApprovalInboxItemParam: a known key and a safe id, else null", () => {
  assert.deepEqual(parseApprovalInboxItemParam("disposal:3f2a-9c1d-0042"), { key: "disposal", id: "3f2a-9c1d-0042" })
  assert.deepEqual(parseApprovalInboxItemParam("finding:x"), { key: "finding", id: "x" })
  assert.deepEqual(parseApprovalInboxItemParam("round:AB12"), { key: "round", id: "AB12" })
  assert.equal(parseApprovalInboxItemParam("round:"), null)
  assert.equal(parseApprovalInboxItemParam("bad:1"), null)
  assert.equal(parseApprovalInboxItemParam("disposal:../etc"), null)
  assert.equal(parseApprovalInboxItemParam(["disposal:a", "x"]), null)
  assert.equal(parseApprovalInboxItemParam(undefined), null)
  assert.equal(parseApprovalInboxItemParam("disposal"), null)
  assert.equal(parseApprovalInboxItemParam(`disposal:${"a".repeat(101)}`), null)
  assert.deepEqual(parseApprovalInboxItemParam(`disposal:${"a".repeat(100)}`), { key: "disposal", id: "a".repeat(100) })
})

test("parseApprovalInboxQuery: defaults, page size, page floor and the search cap", () => {
  assert.deepEqual(parseApprovalInboxQuery({}), { tab: "all", search: "", overdue: false, page: 1, pageSize: 25 })
  assert.equal(parseApprovalInboxQuery({ pageSize: "40" }).pageSize, 25)
  assert.equal(parseApprovalInboxQuery({ pageSize: "50" }).pageSize, 50)
  assert.equal(parseApprovalInboxQuery({ pageSize: "100" }).pageSize, 100)
  assert.equal(parseApprovalInboxQuery({ page: "-2" }).page, 1)
  assert.equal(parseApprovalInboxQuery({ page: "abc" }).page, 1)
  assert.equal(parseApprovalInboxQuery({ page: "3" }).page, 3)
  assert.equal(parseApprovalInboxQuery({ search: "x".repeat(150) }).search.length, 100)
  assert.equal(parseApprovalInboxQuery({ search: "  ThinkPad  " }).search, "ThinkPad")
  assert.equal(parseApprovalInboxQuery({ overdue: "1" }).overdue, true)
  assert.equal(parseApprovalInboxQuery({ overdue: "0" }).overdue, false)
  assert.equal(parseApprovalInboxQuery({ tab: "audit" }).tab, "audit")
  assert.equal(parseApprovalInboxQuery({ tab: "disposal" }).tab, "disposal")
  assert.equal(parseApprovalInboxQuery({ tab: "other" }).tab, "all")
})

test("source pins: no disposalRequired gate, no 50-row cap, no hard-coded copy, names from displayName", () => {
  const query = readFileSync("src/lib/approval-inbox-query.ts", "utf8").replace(/\r/g, "")
  const lib = readFileSync("src/lib/approval-inbox.ts", "utf8").replace(/\r/g, "")
  assert.doesNotMatch(query, /disposalRequired/)
  assert.doesNotMatch(query, /take: 50/)
  assert.doesNotMatch(lib, /function approvalInboxCopy/)
  const pageFn = query.slice(query.indexOf("export async function getApprovalInboxPage"))
  assert.ok(pageFn.length > 0 && query.includes("export async function getApprovalInboxPage"))
  assert.match(query, /displayName: true/)
  assert.match(query, /user\.findMany/)
  assert.match(query, /listDisposalPhotos\(/)
  assert.match(query, /isDisposalBatchSchemaReady\(\)/)
})
