import assert from "node:assert/strict"
import test from "node:test"

import { buildAuditAssetWhere, filterAuditStatusOptions, isClosedAuditStatusName } from "../src/lib/audit-round-scope.ts"
import type { AuditRoundInput } from "../src/lib/validations/audit.ts"

const baseInput: AuditRoundInput = {
  name: "Annual audit",
  auditYear: 2026,
  scopeCompanyId: null,
  scopeBranchId: null,
  scopeDepartmentId: null,
  scopeLocationId: null,
  scopeCategoryId: null,
  scopeCustodianId: null,
  scopeStatusId: null,
  scopeConditionId: null,
  includeClosedAssets: false,
  riskPreset: "all",
  sampleRate: 100,
  startDate: new Date("2026-05-01T00:00:00.000Z"),
  endDate: new Date("2026-05-31T00:00:00.000Z"),
  status: "draft",
}

test("audit round all-status scope excludes disposed and retired assets by default", () => {
  const where = buildAuditAssetWhere(baseInput)

  assert.deepEqual(where.status, {
    name: { notIn: ["Disposed", "Retired"] },
    nameTh: { notIn: ["ตัดจำหน่ายแล้ว", "ปลดระวาง"] },
  })
})

test("audit round can include disposed and retired assets when explicitly requested", () => {
  const where = buildAuditAssetWhere({ ...baseInput, includeClosedAssets: true })

  assert.equal(where.status, undefined)
})

test("audit round respects an explicit asset status even when it is a closed status", () => {
  const where = buildAuditAssetWhere({ ...baseInput, scopeStatusId: "disposed-status-id" })

  assert.equal(where.status, undefined)
  assert.equal(where.statusId, "disposed-status-id")
})

test("audit status dropdown hides closed statuses until explicitly included", () => {
  const statuses = [
    { id: "ready", label: "พร้อมใช้งาน", isClosed: false },
    { id: "pending-disposal", label: "รอตัดจำหน่าย", isClosed: false },
    { id: "disposed", label: "ตัดจำหน่ายแล้ว", isClosed: true },
    { id: "retired", label: "ปลดระวาง", isClosed: true },
  ]

  assert.deepEqual(filterAuditStatusOptions(statuses, false).map((status) => status.id), ["ready", "pending-disposal"])
  assert.deepEqual(filterAuditStatusOptions(statuses, true).map((status) => status.id), ["ready", "pending-disposal", "disposed", "retired"])
})

test("detects closed audit statuses from English or Thai status names", () => {
  assert.equal(isClosedAuditStatusName("Disposed", "ตัดจำหน่ายแล้ว"), true)
  assert.equal(isClosedAuditStatusName("Retired", "ปลดระวาง"), true)
  assert.equal(isClosedAuditStatusName("Ready", "พร้อมใช้งาน"), false)
})
