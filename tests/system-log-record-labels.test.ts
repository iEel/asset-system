import assert from "node:assert/strict"
import test from "node:test"

import { collectSystemLogRecordLabelRefs } from "../src/lib/system-log-record-label-refs.ts"

test("collects record and referenced ids needed for system log label resolution", () => {
  const refs = collectSystemLogRecordLabelRefs([
    {
      recordId: "asset-1",
      action: "transfer",
      module: "asset",
      oldValue: JSON.stringify({ currentLocationId: "loc-1" }),
      newValue: JSON.stringify({ locationId: "loc-2", custodianId: "emp-1", statusId: "status-1" }),
    },
    {
      recordId: "system_settings",
      action: "update",
      module: "setting",
      oldValue: null,
      newValue: null,
    },
  ])

  assert.deepEqual(Array.from(refs.get("asset") ?? []), ["asset-1"])
  assert.deepEqual(Array.from(refs.get("location") ?? []), ["loc-1", "loc-2"])
  assert.deepEqual(Array.from(refs.get("employee") ?? []), ["emp-1"])
  assert.deepEqual(Array.from(refs.get("status") ?? []), ["status-1"])
  assert.equal(refs.has("setting"), false)
})

test("collects the employee, status, supplier, location and department ids that disposal, audit and repair logs carry (critique 2026-10-20 F2)", () => {
  const refs = collectSystemLogRecordLabelRefs([
    {
      recordId: "dp-1",
      action: "execute",
      module: "disposal",
      oldValue: null,
      newValue: JSON.stringify({
        executedById: "emp-exec",
        actionOwnerId: "emp-owner",
        actualCustodianId: "emp-found",
        assetStatusId: "status-disposed",
        vendorId: "sup-1",
        actualLocationId: "loc-found",
        actualDepartmentId: "dep-found",
      }),
    },
  ])

  assert.deepEqual(Array.from(refs.get("employee") ?? []), ["emp-exec", "emp-owner", "emp-found"])
  assert.deepEqual(Array.from(refs.get("status") ?? []), ["status-disposed"])
  assert.deepEqual(Array.from(refs.get("supplier") ?? []), ["sup-1"])
  assert.deepEqual(Array.from(refs.get("location") ?? []), ["loc-found"])
  assert.deepEqual(Array.from(refs.get("department") ?? []), ["dep-found"])
})

test("collects ambiguous audit record ids across audit round, item, and finding labels", () => {
  const refs = collectSystemLogRecordLabelRefs([
    {
      recordId: "audit-record",
      action: "close",
      module: "audit",
      oldValue: null,
      newValue: JSON.stringify({ status: "closed" }),
    },
  ])

  assert.equal(refs.get("auditRound")?.has("audit-record"), true)
  assert.equal(refs.get("auditFinding")?.has("audit-record"), true)
  assert.equal(refs.get("auditItem")?.has("audit-record"), true)
})

test("collects legacy brand attachment uploads as model record labels", () => {
  const refs = collectSystemLogRecordLabelRefs([
    {
      recordId: "model-1",
      action: "upload",
      module: "brand",
      oldValue: null,
      newValue: JSON.stringify({
        attachmentId: "df011eeb-398a-44b3-a5db-78ecc18b6e82",
        originalName: "front-view.jpg",
      }),
    },
  ])

  assert.equal(refs.get("model")?.has("model-1"), true)
  assert.equal(refs.has("brand"), false)
})
