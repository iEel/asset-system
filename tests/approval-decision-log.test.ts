import assert from "node:assert/strict"
import test from "node:test"

import {
  approvalDecisionFilters,
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
