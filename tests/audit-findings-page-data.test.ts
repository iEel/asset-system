import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

import {
  auditFindingCountedStatuses,
  auditFindingReviewableWhere,
  auditFindingsAfterWhere,
  auditFindingsBeforeWhere,
  auditFindingsListOrderBy,
  buildAuditFindingWhere,
  parseAuditFindingsListFilters,
  type AuditFindingStatus,
} from "../src/lib/audit-finding-filters.ts"
import { DEFAULT_WAITING_WORK_RULES, openAuditActionsWhere, startOfBangkokDay } from "../src/lib/waiting-work-rules.ts"

type Args = { where?: unknown; include?: unknown; select?: unknown; orderBy?: unknown; skip?: number; take?: number }
type Call = { call: string; args: Args }
const state: { calls: Call[]; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __findingsPageData: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__findingsPageData
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const { getAuditFindingsPageData } = await import(pathToFileURL("src/lib/audit-findings-page-data.ts").href) as typeof import("../src/lib/audit-findings-page-data.ts")

const now = new Date("2026-10-28T03:00:00.000Z")
const typeSearchLabels = { wrong_location: ["ที่ตั้ง", "ที่ตั้งไม่ตรง"] }
const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
// The list's own read is the findMany that pages; the next finding's candidates select the id alone.
const listCalls = () => callsTo("auditFinding.findMany").filter((args) => args.skip !== undefined)
const nextCandidateCalls = () => callsTo("auditFinding.findMany").filter((args) => isDeepStrictEqual(args.select, { id: true }))
const load = (params: Record<string, string> = {}, options: { canApprove?: boolean; userId?: string } = {}) => {
  const filters = parseAuditFindingsListFilters("th", params)
  return getAuditFindingsPageData({ locale: "th", filters, user: { id: options.userId ?? "user-head" }, canApprove: options.canApprove ?? true, typeSearchLabels, rules: DEFAULT_WAITING_WORK_RULES, now })
}
const whereFor = (params: Record<string, string>, status: AuditFindingStatus) => {
  const filters = parseAuditFindingsListFilters("th", params)
  return buildAuditFindingWhere({ status, search: filters.search, roundId: filters.roundId, findingType: filters.findingType, now, rules: DEFAULT_WAITING_WORK_RULES, typeSearchLabels })
}
const parent = { id: "asset-pc", assetTag: "GRL-COM-26-0001", name: "คอมพิวเตอร์ตั้งโต๊ะ" }
const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, auditRoundId: "round-1", assetId: `asset-${id}`, findingType: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2",
  reportedBy: "user-auditor", reportedAt: new Date("2026-10-20T03:00:00.000Z"), reviewStatus: "pending", actionStatus: "not_required",
  actionOwnerId: null, actionDueDate: null, actionPlan: null,
  auditRound: { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT", status: "open" },
  auditItem: { auditStatus: "reviewed", reconcileStatus: "pending" },
  asset: { id: `asset-${id}`, assetTag: `GRL-${id}`, name: `เครื่อง ${id}`, installedInLinks: [] },
  actionOwner: null,
  ...overrides,
})

beforeEach(() => {
  state.calls = []
  state.respond = () => undefined
})

test("each tab and sub-chip counts with the list's own where, within the round, the type and the search; the list's total is its status's count (spec §5)", async () => {
  const params = { status: "action_open", roundId: "round-1", findingType: "wrong_location", search: "ที่ตั้ง" }
  state.respond = (call, args) => {
    if (call !== "auditFinding.count") return undefined
    const index = auditFindingCountedStatuses.findIndex((status) => isDeepStrictEqual(args.where, whereFor(params, status)))
    return index === -1 ? undefined : 10 + index
  }
  const data = await load(params)
  assert.deepEqual(data.counts, { pending: 10, approved: 11, rejected: 12, follow_up: 13, closed: 14, all: 15, action_open: 16, overdue: 17, exception: 18 })
  assert.equal(data.total, data.counts.action_open)
  const [list] = listCalls()
  assert.deepEqual(list.where, whereFor(params, "action_open"))
  assert.deepEqual(list.orderBy, auditFindingsListOrderBy)
  assert.deepEqual([list.skip, list.take], [0, 25])
  // One count per tab and sub-chip, and the viewer's decidable count (P4-R18): no other.
  assert.equal(callsTo("auditFinding.count").length, auditFindingCountedStatuses.length + 1)
  assert.ok(callsTo("auditFinding.count").some((args) => isDeepStrictEqual(args.where, { AND: [whereFor(params, "action_open"), auditFindingReviewableWhere("user-head")] })))
  assert.equal(data.reviewableTotal, 0)
  assert.equal(callsTo("employee.findMany").filter((args) => isDeepStrictEqual(args.where, { isActive: true })).length, 1, "the plan dialog's owners for audit:approve (P4-R21)")
  assert.equal(data.loadedAt, now)
  assert.deepEqual(data.back, { href: "/th/audit/rounds/round-1", target: "round" })
  assert.equal(data.panel, null)
})

test("a bell kind's list counts itself; the tab and sub-chip counts stay the page's", async () => {
  const bell = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  state.respond = (call, args) => (call === "auditFinding.count" && isDeepStrictEqual(args.where, bell) ? 4 : undefined)
  const data = await load({ status: "action_not_due" })
  assert.equal(data.total, 4)
  assert.deepEqual(listCalls()[0].where, bell)
  assert.equal(callsTo("auditFinding.count").length, auditFindingCountedStatuses.length + 2, "the bell's own count and the decidable count")
})

test("rows carry the component's parent, the owner's name (never the id), the values in words, who reported them, whether the viewer may decide them, and their evidence (decision 6, P4-R11, P4-R20)", async () => {
  const uploadedAt = new Date("2026-10-21T03:00:00.000Z")
  state.respond = (call) => {
    if (call === "auditFinding.findMany") {
      return [
        row("f-1", { asset: { id: "asset-f-1", assetTag: "GRL-RAM-01", name: "แรม 16GB", installedInLinks: [{ parentAsset: parent }] }, actionOwnerId: "emp-5", actionOwner: { code: "E005", fullNameTh: "สมชาย ใจดี" } }),
        row("f-2", { reportedBy: "user-head", actualValue: null }),
        row("f-3", { auditRound: { id: "round-9", auditNo: "AUD-2026-0001", name: "ปิดแล้ว", status: "closed" } }),
      ]
    }
    if (call === "attachment.findMany") return [{ id: "att-1", referenceId: "f-1", originalName: "photo.jpg", fileType: "image/jpeg", fileSize: 1024, uploadedAt }]
    if (call === "location.findMany") return [{ id: "loc-1", code: "A01", name: "ห้อง IT" }, { id: "loc-2", code: "B01", name: "บัญชี" }]
    return undefined
  }
  const data = await load({ status: "all" })
  assert.deepEqual(data.rows.map((entry) => [entry.expectedLabel, entry.actualLabel]), [["A01 - ห้อง IT", "B01 - บัญชี"], ["A01 - ห้อง IT", null], ["A01 - ห้อง IT", "B01 - บัญชี"]], "words, and null for an empty value, never a typed dash")
  const [list] = listCalls()
  assert.deepEqual(list.include, {
    auditRound: { select: { id: true, auditNo: true, name: true, status: true } },
    auditItem: { select: { auditStatus: true, reconcileStatus: true } },
    asset: {
      select: {
        id: true, assetTag: true, name: true,
        installedInLinks: { where: { status: "installed", removedAt: null }, select: { parentAsset: { select: { id: true, assetTag: true, name: true } } } },
      },
    },
    actionOwner: { select: { code: true, fullNameTh: true } },
  })
  assert.deepEqual(data.rows.map((entry) => [entry.id, entry.parent, entry.ownerLabel, entry.reportedByViewer, entry.reviewable]), [
    ["f-1", parent, "E005 - สมชาย ใจดี", false, true],
    ["f-2", null, null, true, false],
    ["f-3", null, null, false, false],
  ])
  assert.deepEqual(data.rows[0].evidence, [{ id: "att-1", originalName: "photo.jpg", fileType: "image/jpeg", fileSize: 1024, uploadedAt }])
  assert.deepEqual(data.rows[1].evidence, [])
  const [attachments] = callsTo("attachment.findMany")
  assert.deepEqual(attachments.where, { module: "audit_finding", referenceId: { in: ["f-1", "f-2", "f-3"] }, isActive: true })
  assert.deepEqual(attachments.orderBy, { uploadedAt: "desc" })
})

const chosen = {
  ...row("f-7", { assetId: "asset-1", asset: { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "Laptop", installedInLinks: [] } }),
  auditItem: {
    auditStatus: "reviewed", reconcileStatus: "pending",
    expectedLocationId: "loc-1", expectedCustodianId: "emp-1", expectedDepartmentId: "dept-1", expectedConditionId: "cond-good",
    actualLocationId: "loc-2", actualCustodianId: "emp-1", actualDepartmentId: "dept-1", actualConditionId: "cond-good",
    scannedAt: new Date("2026-10-20T02:00:00.000Z"), scannedBy: "user-auditor", remark: "อยู่ห้องบัญชี",
  },
}

test("the chosen finding loads off the page; a link with it and no page opens the page that holds it; k จาก N and the next finding count what the viewer may decide (P4-R18, P4-R20)", async () => {
  const params = { status: "pending", roundId: "round-1", finding: "f-7" }
  const list = whereFor(params, "pending")
  const reviewable = { AND: [list, auditFindingReviewableWhere("user-head")] }
  const siblingRows = [
    { id: "f-9", findingType: "wrong_department", assetId: "asset-1", expectedValue: "dept-1", actualValue: "dept-2", reviewStatus: "pending", reportedBy: "user-auditor" },
    { id: "f-10", findingType: "wrong_condition", assetId: "asset-1", expectedValue: "cond-good", actualValue: "cond-fair", reviewStatus: "pending", reportedBy: "user-head" },
  ]
  state.respond = (call, args) => {
    if (call === "auditFinding.findUnique") return chosen
    if (call === "location.findMany") return [{ id: "loc-2", code: "B01", name: "บัญชี" }]
    if (call === "user.findMany") return [{ id: "user-auditor", username: "somsri", displayName: "สมศรี" }]
    if (call === "auditFinding.findMany" && (args.where as { assetId?: string }).assetId === "asset-1") return siblingRows
    // The candidates after f-7: its sibling f-9 first, then f-8; nothing before it is asked for once one is found.
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsAfterWhere(chosen)] })) return [{ id: "f-9" }, { id: "f-8" }]
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return [{ id: "f-1" }]
    if (call !== "auditFinding.count") return undefined
    if (isDeepStrictEqual(args.where, { AND: [list, { id: "f-7" }] })) return 1
    if (isDeepStrictEqual(args.where, { AND: [list, auditFindingsBeforeWhere(chosen)] })) return 27
    if (isDeepStrictEqual(args.where, reviewable)) return 14
    if (isDeepStrictEqual(args.where, { AND: [reviewable, { id: "f-7" }] })) return 1
    if (isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return 2
    return undefined
  }
  const data = await load(params)
  assert.deepEqual(callsTo("auditFinding.findUnique")[0].where, { id: "f-7" })
  assert.deepEqual(data.listPage, { page: 2, pageSize: 25 }, "the 28th row of the list is on page 2")
  assert.equal(listCalls()[0].skip, 25)
  assert.ok(data.panel)
  assert.equal(data.panel.inList, true)
  assert.equal(data.panel.readOnly, false)
  assert.equal(data.reviewableTotal, 14)
  // The next finding is the server's (P4-R18): its link carries the finding and no page.
  assert.deepEqual(data.panel.queue, {
    position: 3,
    total: 14,
    nextHref: "/th/audit/findings?status=pending&roundId=round-1&finding=f-9",
    nextHrefAfterSiblings: "/th/audit/findings?status=pending&roundId=round-1&finding=f-8",
  })
  // Enough candidates to step over every sibling the viewer may approve with it (one here), in the list's order.
  assert.deepEqual(nextCandidateCalls().map((args) => [args.orderBy, args.take]), [[auditFindingsListOrderBy, 2], [auditFindingsListOrderBy, 2]])
  // The asset's other pending findings in this round, the viewer's own marked.
  assert.deepEqual(callsTo("auditFinding.findMany").find((args) => (args.where as { assetId?: string }).assetId)?.where, { auditRoundId: "round-1", assetId: "asset-1", reviewStatus: "pending", id: { not: "f-7" } })
  assert.deepEqual(data.panel.siblings, [{ ...siblingRows[0], reportedByViewer: false }, { ...siblingRows[1], reportedByViewer: true }])
  assert.equal(data.panel.reporterLabel, "สมศรี (somsri)")
  assert.equal(data.panel.scannedByLabel, "สมศรี (somsri)")
  assert.equal(data.panel.finding.auditItem.remark, "อยู่ห้องบัญชี")
  // The panel's finding carries the row's extras under the rows' names (P4-R20): Task 4 reads them, never a second loader.
  assert.deepEqual(
    [data.panel.finding.parent, data.panel.finding.ownerLabel, data.panel.finding.evidence, data.panel.finding.reportedByViewer, data.panel.finding.reviewable, data.panel.finding.actualLabel],
    [null, null, [], false, true, "B01 - บัญชี"],
  )
  assert.equal(data.valueLabels.get("loc-2"), "B01 - บัญชี")
  assert.equal(data.panel.labels, data.valueLabels, "the panel reads the same labels")
})

test("the next finding wraps to the first before the decided one, and none left means the tab is done (P4-R18)", async () => {
  const params = { status: "pending", finding: "f-7" }
  const reviewable = { AND: [whereFor(params, "pending"), auditFindingReviewableWhere("user-head")] }
  let before: { id: string }[] = [{ id: "f-1" }]
  state.respond = (call, args) => {
    if (call === "auditFinding.findUnique") return chosen
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return before
    return undefined
  }
  assert.equal((await load(params)).panel?.queue?.nextHref, "/th/audit/findings?status=pending&finding=f-1")
  before = []
  const done = await load(params)
  assert.equal(done.panel?.queue?.nextHref, null)
  assert.equal(done.panel?.queue?.nextHrefAfterSiblings, null)
})

test("a page in the link wins; a finding outside the list still opens, with no place in the queue; no reviewer, no queue and no owner list", async () => {
  state.respond = (call) => (call === "auditFinding.findUnique" ? { ...chosen, reportedBy: "user-head", auditItem: { ...chosen.auditItem, scannedBy: "user-gone" } } : undefined)
  const outside = await load({ status: "approved", finding: "f-7", page: "3" })
  assert.deepEqual(outside.listPage, { page: 3, pageSize: 25 })
  assert.ok(outside.panel)
  assert.equal(outside.panel.inList, false)
  assert.equal(outside.panel.queue?.position, null)
  assert.equal(outside.panel.scannedByLabel, null, "a user who is gone reads as nothing, never an id")
  assert.equal(outside.panel.finding.reportedByViewer, true)

  state.calls = []
  const viewer = await load({ finding: "f-7" }, { canApprove: false })
  assert.equal(viewer.panel?.queue, null)
  assert.equal(viewer.reviewableTotal, null)
  assert.equal(nextCandidateCalls().length, 0)
  // The value labels still read employees by id; only the owner list (where isActive) follows audit:approve (P4-R21).
  assert.equal(callsTo("employee.findMany").filter((args) => isDeepStrictEqual(args.where, { isActive: true })).length, 0, "no owner list without audit:approve (P4-R21)")
  assert.deepEqual(viewer.employees, [])

  state.respond = () => undefined
  state.calls = []
  assert.equal((await load({ finding: "f-gone" })).panel, null)
})

test("รอบ: lists every active round that is not cancelled; a chosen round is named; returnTo is the way back", async () => {
  state.respond = (call) => {
    if (call === "auditRound.findMany") return [{ id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" }]
    if (call === "auditRound.findUnique") return { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" }
    return undefined
  }
  const data = await load({ roundId: "round-1", returnTo: "/th/audit/rounds?status=open" })
  assert.deepEqual(callsTo("auditRound.findMany")[0], { where: { isActive: true, status: { not: "cancelled" } }, select: { id: true, auditNo: true, name: true }, orderBy: [{ startDate: "desc" }, { id: "asc" }] })
  assert.deepEqual(callsTo("auditRound.findUnique")[0], { where: { id: "round-1" }, select: { id: true, auditNo: true, name: true } })
  assert.deepEqual(data.filterRound, { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" })
  assert.equal(data.roundOptions.length, 1)
  assert.deepEqual(data.back, { href: "/th/audit/rounds?status=open", target: "rounds" })
})
