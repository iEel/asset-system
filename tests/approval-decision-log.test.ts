import assert from "node:assert/strict"
import test from "node:test"

import {
  buildApprovalDecisionLogItems,
  filterApprovalDecisionLogItems,
  summarizeApprovalDecisionLog,
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

function makeLog(input: Partial<ApprovalDecisionLogSource> & { id: string; action: string; module: string }): ApprovalDecisionLogSource {
  return {
    id: input.id,
    action: input.action,
    module: input.module,
    recordId: input.recordId ?? input.id,
    oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
    newValue: input.newValue ? JSON.stringify(input.newValue) : null,
    remark: input.remark ?? null,
    createdAt: input.createdAt ?? new Date("2026-05-18T03:00:00.000Z"),
    user: input.user ?? { username: "approver", displayName: "Approver One" },
  }
}
