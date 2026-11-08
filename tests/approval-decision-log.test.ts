import assert from "node:assert/strict"
import test from "node:test"

import {
  approvalDecisionFilters,
  buildApprovalHistoryQuery,
  groupDecisionsByDay,
  parseApprovalHistoryFilters,
  summarizeApprovalDecisionChipCounts,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  buildApprovalDecisionLogWhere,
  filterApprovalDecisionLogItems,
  summarizeApprovalDecisionCounts,
  summarizeApprovalDecisionLog,
  type ApprovalDecisionCountRow,
  type ApprovalDecisionLogSource,
} from "../src/lib/approval-decision-log.ts"
import type { SystemLogRecordLabels } from "../src/lib/system-log-presenter.ts"

const labels: SystemLogRecordLabels = {
  disposal: new Map([["disposal-1", "DIS-001 - AS-001"]]),
  auditFinding: new Map([["finding-1", "AUD-001 - AS-002"]]),
  maintenance: new Map([["maintenance-1", "REP-001 - AS-003"]]),
}

const t = (key: string) => {
  const messages: Record<string, string> = {
    "module.disposal": "ตัดจำหน่าย",
    "module.audit": "ตรวจนับ",
    "module.maintenance": "ซ่อมบำรุง",
    "action.approve": "อนุมัติ",
    "action.reject": "ปฏิเสธ",
    "action.approve_finding": "อนุมัติ Finding",
    "action.reject_finding": "ปฏิเสธ Finding",
    "action.execute_historical_without_evidence": "ดำเนินการย้อนหลังโดยไม่มีหลักฐาน",
    "action.close": "ปิด",
    "field.requestStatus": "สถานะคำขอ",
    "field.reviewStatus": "สถานะตรวจสอบ",
    "field.repairStatus": "สถานะงานซ่อม",
    "summary.from": "จาก",
    "summary.changedTo": "เป็น",
    "value.unresolvedReference": "รายการอ้างอิง",
  }
  return messages[key] ?? key
}

test("builds approval decision log items from workflow audit logs", () => {
  const items = buildApprovalDecisionLogItems(
    [
      makeLog({
        id: "ignored",
        action: "update_status",
        module: "maintenance",
        recordId: "maintenance-1",
      }),
      makeLog({
        id: "disposal-approve",
        action: "approve",
        module: "disposal",
        recordId: "disposal-1",
        newValue: { requestStatus: "approved", approvalRemark: "ok" },
      }),
      makeLog({
        id: "audit-approve",
        action: "approve_finding",
        module: "audit",
        recordId: "finding-1",
        createdAt: new Date("2026-05-19T04:00:00.000Z"),
        newValue: { reviewStatus: "approved", actionTaken: "master_asset_updated" },
      }),
    ],
    labels,
    "th",
    t
  )

  assert.deepEqual(items.map((item) => item.id), ["audit-approve", "disposal-approve"])
  assert.equal(items[0].module, "audit")
  assert.equal(items[0].decision, "approve")
  assert.equal(items[0].recordLabel, "AUD-001 - AS-002")
  assert.equal(items[1].module, "disposal")
  assert.equal(items[1].decision, "approve")
})

test("summarizes and filters approval decision log items", () => {
  const items = buildApprovalDecisionLogItems(
    [
      makeLog({ id: "disposal-reject", action: "reject", module: "disposal", recordId: "disposal-1" }),
      makeLog({ id: "maintenance-close", action: "close", module: "maintenance", recordId: "maintenance-1" }),
      makeLog({
        id: "audit-close",
        action: "close",
        module: "audit",
        recordId: "finding-1",
        createdAt: new Date("2026-05-19T04:00:00.000Z"),
      }),
    ],
    labels,
    "th",
    t
  )

  assert.deepEqual(summarizeApprovalDecisionLog(items), {
    total: 3,
    disposal: 1,
    maintenance: 1,
    audit: 1,
    approve: 0,
    reject: 1,
    close: 2,
    execute: 0,
  })
  assert.deepEqual(filterApprovalDecisionLogItems(items, "maintenance", "all").map((item) => item.id), ["maintenance-close"])
  assert.deepEqual(filterApprovalDecisionLogItems(items, "all", "close").map((item) => item.id), ["audit-close", "maintenance-close"])
})

test("includes historical execution without evidence as an execute decision with localized presentation", () => {
  const items = buildApprovalDecisionLogItems(
    [makeLog({
      id: "historical-execute",
      action: "execute_historical_without_evidence",
      module: "disposal",
      recordId: "disposal-1",
      newValue: {
        requestStatus: "disposed",
        evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ",
      },
    })],
    labels,
    "th",
    t,
  )

  assert.equal(items.length, 1)
  assert.equal(items[0].decision, "execute")
  assert.equal(items[0].actionLabel, "ดำเนินการย้อนหลังโดยไม่มีหลักฐาน")
})

function makeLog(input: Partial<Omit<ApprovalDecisionLogSource, "oldValue" | "newValue">> & { id: string; action: string; module: string; oldValue?: unknown; newValue?: unknown }): ApprovalDecisionLogSource {
  return {
    id: input.id,
    action: input.action,
    module: input.module,
    recordId: input.recordId ?? input.id,
    oldValue: stringifyLogValue(input.oldValue),
    newValue: stringifyLogValue(input.newValue),
    remark: input.remark ?? null,
    createdAt: input.createdAt ?? new Date("2026-05-18T03:00:00.000Z"),
    user: input.user ?? { username: "approver", displayName: "Approver One" },
  }
}

function stringifyLogValue(value: unknown) {
  if (value == null) return null
  return typeof value === "string" ? value : JSON.stringify(value)
}

// Plan 2B-5 Task 5 (spec 2B §5.9.2 row 2, §5.14, §10.4 table B): the decision history pages and counts in the
// database. The where clause must find exactly the rows the decision log shows, for every permission and every tab,
// and the counts folded from a groupBy must equal the counts of the decision items themselves.
const decisionPairs = [
  ["disposal", "approve"], ["disposal", "reject"], ["disposal", "execute"], ["disposal", "execute_historical_without_evidence"], ["disposal", "create"],
  ["maintenance", "close"], ["maintenance", "update_status"],
  ["audit", "approve_finding"], ["audit", "reject_finding"], ["audit", "close"], ["audit", "approve"],
  ["asset", "close"],
] as const
const decisionLogs = decisionPairs.map(([moduleName, action], index) => makeLog({ id: `log-${index}`, module: moduleName, action, recordId: "unknown", createdAt: new Date(Date.UTC(2026, 4, 1, 0, index)) }))

function matchesWhere(log: { module: string; action: string }, where: ReturnType<typeof buildApprovalDecisionLogWhere>) {
  assert.ok(Array.isArray(where.OR), "one OR of { module, action: { in } } conditions")
  return (where.OR as Array<{ module: string; action: { in: string[] } }>).some((condition) => condition.module === log.module && condition.action.in.includes(log.action))
}

test("the decision where clause finds the rows the decision log shows, for every permission and tab (spec 2B §5.9.2 row 2)", () => {
  for (const canApproveDisposal of [true, false]) {
    for (const canApproveAudit of [true, false]) {
      for (const canSeeRepairCloseHistory of [true, false]) {
        for (const moduleFilter of approvalDecisionModuleFilters) {
          for (const decision of approvalDecisionFilters) {
            const where = buildApprovalDecisionLogWhere({ access: { canApproveDisposal, canApproveAudit }, canSeeRepairCloseHistory, module: moduleFilter, decision })
            const found = decisionLogs.filter((log) => matchesWhere(log, where)).map((log) => log.id).sort()
            const visible = decisionLogs.filter((log) => (log.module !== "disposal" || canApproveDisposal) && (log.module !== "audit" || canApproveAudit) && (log.module !== "maintenance" || canSeeRepairCloseHistory))
            const shown = filterApprovalDecisionLogItems(buildApprovalDecisionLogItems(visible, labels, "th", t), moduleFilter, decision).map((item) => item.id).sort()
            assert.deepEqual(found, shown, JSON.stringify({ canApproveDisposal, canApproveAudit, canSeeRepairCloseHistory, moduleFilter, decision }))
          }
        }
      }
    }
  }
})

test("the decision counts folded from a groupBy equal the counts of the decision items (spec 2B §5.9.3)", () => {
  const logs = [...decisionLogs, ...decisionLogs.slice(0, 7).map((log) => ({ ...log, id: `${log.id}-again` }))]
  const rows = new Map<string, ApprovalDecisionCountRow>()
  for (const log of logs) {
    const row = rows.get(`${log.module}:${log.action}`) ?? { module: log.module, action: log.action, _count: { _all: 0 } }
    row._count._all += 1
    rows.set(`${log.module}:${log.action}`, row)
  }
  assert.deepEqual(summarizeApprovalDecisionCounts([...rows.values()]), summarizeApprovalDecisionLog(buildApprovalDecisionLogItems(logs, labels, "th", t)))
})

// Group 12 plan 2 task 4 (spec §5, board AD-ApprovalHistory): the history gains ผู้ตัดสินใจ and ช่วงวันที่ filters, chip
// counts that follow them, and rows grouped under Bangkok days.
test("parses actor and dates", () => {
  assert.deepEqual(parseApprovalHistoryFilters({}), { module: "all", decision: "all", actorId: null, dateFrom: null, dateTo: null })
  assert.deepEqual(
    parseApprovalHistoryFilters({ module: "audit", decision: ["reject", "approve"], actorId: " user-1 ", dateFrom: "2026-10-20", dateTo: "2026-10-01" }),
    { module: "audit", decision: "reject", actorId: "user-1", dateFrom: "2026-10-01", dateTo: "2026-10-20" },
    "the dates swap when reversed, the first of a repeated param wins, the actor is trimmed",
  )
  assert.deepEqual(
    parseApprovalHistoryFilters({ module: "x", decision: "y", actorId: "  ", dateFrom: "2026-02-30", dateTo: "20261020" }),
    { module: "all", decision: "all", actorId: null, dateFrom: null, dateTo: null },
  )
  // The list URL keeps every filter; empty ones, page 1 and page size 25 stay out.
  assert.equal(buildApprovalHistoryQuery(parseApprovalHistoryFilters({}), {}), "")
  assert.equal(
    buildApprovalHistoryQuery({ module: "disposal", decision: "approve", actorId: "user-1", dateFrom: "2026-10-01", dateTo: "2026-10-20" }, { page: 2, pageSize: 50 }),
    "module=disposal&decision=approve&actorId=user-1&dateFrom=2026-10-01&dateTo=2026-10-20&page=2&pageSize=50",
  )
})

test("groups by Bangkok day with today and yesterday", () => {
  const now = new Date("2026-10-20T03:00:00.000Z") // 10:00 on 20 Oct in Bangkok
  const at = (iso: string, id: string) => buildApprovalDecisionLogItems([makeLog({ id, action: "approve", module: "disposal", recordId: "disposal-1", createdAt: new Date(iso) })], labels, "th", t)[0]
  const items = [
    at("2026-10-20T02:00:00.000Z", "a"), // 09:00 on the 20th
    at("2026-10-19T17:30:00.000Z", "b"), // 00:30 on the 20th (still today in Bangkok)
    at("2026-10-19T16:59:00.000Z", "c"), // 23:59 on the 19th
    at("2026-10-19T01:00:00.000Z", "d"), // 08:00 on the 19th
    at("2026-10-17T20:00:00.000Z", "e"), // 03:00 on the 18th
  ]
  assert.deepEqual(
    groupDecisionsByDay(items, now).map((group) => ({ key: group.key, ids: group.items.map((item) => item.id) })),
    [
      { key: "today", ids: ["a", "b"] },
      { key: "yesterday", ids: ["c", "d"] },
      { key: "2026-10-18", ids: ["e"] },
    ],
  )
  assert.deepEqual(groupDecisionsByDay([], now), [])
})

test("actor filter never widens what the viewer may see", () => {
  const access = { canApproveDisposal: true, canApproveAudit: false }
  const plain = buildApprovalDecisionLogWhere({ access, canSeeRepairCloseHistory: false, module: "all", decision: "all" })
  const filtered = buildApprovalDecisionLogWhere({ access, canSeeRepairCloseHistory: false, module: "all", decision: "all", actorId: "user-1", dateFrom: "2026-10-01", dateTo: "2026-10-20" })
  // The same permission OR (no repair-close and no audit rows), ANDed with the actor and the Bangkok day bounds.
  assert.deepEqual(filtered.OR, plain.OR)
  assert.ok((filtered.OR as Array<{ module: string }>).every((condition) => condition.module === "disposal"))
  assert.equal(filtered.userId, "user-1")
  assert.deepEqual(filtered.createdAt, { gte: new Date("2026-09-30T17:00:00.000Z"), lt: new Date("2026-10-20T17:00:00.000Z") })
  assert.equal("AND" in filtered, false)
  // No actor and no dates: the where is the permission OR alone, as before.
  assert.deepEqual(Object.keys(plain), ["OR"])
  // A viewer who may see nothing finds nothing, whoever the actor is.
  const none = buildApprovalDecisionLogWhere({ access: { canApproveDisposal: false, canApproveAudit: false }, canSeeRepairCloseHistory: false, module: "all", decision: "all", actorId: "user-1" })
  assert.deepEqual(none.OR, [])
})

test("chip counts apply actor and date, and each group ignores only its own selection", () => {
  const rows: ApprovalDecisionCountRow[] = [
    { module: "disposal", action: "approve", _count: { _all: 5 } },
    { module: "disposal", action: "execute", _count: { _all: 2 } },
    { module: "disposal", action: "execute_historical_without_evidence", _count: { _all: 1 } },
    { module: "audit", action: "approve_finding", _count: { _all: 3 } },
    { module: "audit", action: "close", _count: { _all: 4 } },
    { module: "maintenance", action: "close", _count: { _all: 6 } },
    { module: "maintenance", action: "update_status", _count: { _all: 9 } },
  ]
  assert.deepEqual(summarizeApprovalDecisionChipCounts(rows, "all", "all"), {
    module: { all: 21, disposal: 8, audit: 7, maintenance: 6 },
    decision: { all: 21, approve: 8, reject: 0, close: 10, execute: 3 },
  })
  // ตรวจนับ chosen: the decision chips count audit only; the module chips stay whole for the decision "all".
  assert.deepEqual(summarizeApprovalDecisionChipCounts(rows, "audit", "all"), {
    module: { all: 21, disposal: 8, audit: 7, maintenance: 6 },
    decision: { all: 7, approve: 3, reject: 0, close: 4, execute: 0 },
  })
  // ปิดงาน chosen: the module chips count closes only.
  assert.deepEqual(summarizeApprovalDecisionChipCounts(rows, "all", "close").module, { all: 10, disposal: 0, audit: 4, maintenance: 6 })
})
