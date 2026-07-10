import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAuditScanContextStorageKey,
  filterAuditItemsByContext,
  normalizeAuditScanContext,
  summarizeAuditScanContext,
} from "../src/lib/audit-scan-context.ts"

const items = [
  { id: "1", expectedLocationId: "hq", expectedDepartmentId: "it", auditStatus: "pending" },
  { id: "2", expectedLocationId: "hq", expectedDepartmentId: "it", auditStatus: "found" },
  { id: "3", expectedLocationId: "warehouse", expectedDepartmentId: "ops", auditStatus: "pending" },
]

test("normalizes context and keeps it scoped to a single audit round", () => {
  assert.deepEqual(normalizeAuditScanContext({ locationId: " hq ", departmentId: " it " }), { locationId: "hq", departmentId: "it" })
  assert.equal(buildAuditScanContextStorageKey("round-123"), "asset-system:audit-scan-context:round-123")
})

test("filters the walking queue and summarizes its progress without changing the audit round", () => {
  const scopedItems = filterAuditItemsByContext(items, { locationId: "hq", departmentId: "it" })

  assert.deepEqual(scopedItems.map((item) => item.id), ["1", "2"])
  assert.deepEqual(summarizeAuditScanContext(scopedItems), { total: 2, pending: 1, processed: 1 })
})
