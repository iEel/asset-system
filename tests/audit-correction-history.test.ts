import assert from "node:assert/strict"
import test from "node:test"

import { buildAuditCorrectionHistoryByItemId, summarizeAuditCorrectionLog } from "../src/lib/audit-correction-history.ts"

const baseLog = {
  id: "log-1",
  action: "scan_result_corrected",
  module: "audit",
  recordId: "item-1",
  remark: "แก้หลังตรวจซ้ำ",
  createdAt: new Date("2026-06-26T10:00:00.000Z"),
  user: { username: "auditor", displayName: "Auditor One" },
}

test("summarizes audit scan correction logs into readable item history", () => {
  const history = summarizeAuditCorrectionLog({
    ...baseLog,
    oldValue: JSON.stringify({ auditResult: "found", actualLocationId: "loc-old", actualCustodianId: "emp-old" }),
    newValue: JSON.stringify({ auditRoundId: "round-1", assetId: "asset-1", auditResult: "wrong_location", actualLocationId: "loc-new", actualCustodianId: "emp-old" }),
  })

  assert.deepEqual(history, {
    id: "log-1",
    auditItemId: "item-1",
    assetId: "asset-1",
    createdAt: new Date("2026-06-26T10:00:00.000Z"),
    userLabel: "Auditor One",
    remark: "แก้หลังตรวจซ้ำ",
    beforeResult: "found",
    afterResult: "wrong_location",
    changedFields: ["auditResult", "actualLocationId"],
  })
})

test("groups audit correction history by item and keeps the newest correction first", () => {
  const grouped = buildAuditCorrectionHistoryByItemId([
    {
      ...baseLog,
      id: "old-log",
      createdAt: new Date("2026-06-26T09:00:00.000Z"),
      oldValue: JSON.stringify({ auditResult: "found" }),
      newValue: JSON.stringify({ assetId: "asset-1", auditResult: "wrong_location" }),
    },
    {
      ...baseLog,
      id: "new-log",
      createdAt: new Date("2026-06-26T11:00:00.000Z"),
      oldValue: JSON.stringify({ auditResult: "wrong_location" }),
      newValue: JSON.stringify({ assetId: "asset-1", auditResult: "found" }),
    },
  ])

  assert.equal(grouped.get("item-1")?.[0]?.id, "new-log")
  assert.equal(grouped.get("item-1")?.length, 2)
})
