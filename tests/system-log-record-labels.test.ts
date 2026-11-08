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

test("collects the disposal round's own id and the round an executed request names (group 6 plan 4)", () => {
  const refs = collectSystemLogRecordLabelRefs([
    { recordId: "round-1", action: "create_round", module: "disposal_round", oldValue: null, newValue: JSON.stringify({ roundNo: "DPR-20261105-0001" }) },
    { recordId: "dp-1", action: "execute", module: "disposal", oldValue: null, newValue: JSON.stringify({ roundId: "round-2" }) },
  ])
  assert.deepEqual(Array.from(refs.get("disposalRound") ?? []), ["round-1", "round-2"])
  assert.deepEqual(Array.from(refs.get("disposal") ?? []), ["dp-1"])
})

test("collects the person ids that employee, disposal and repair logs carry (group 12 plan 2 final review)", () => {
  const refs = collectSystemLogRecordLabelRefs([
    {
      recordId: "x",
      action: "update",
      module: "disposal",
      oldValue: JSON.stringify({ managerId: "emp-1" }),
      newValue: JSON.stringify({ managerId: "emp-2", requestedById: "emp-3", approverId: "emp-4", reportedById: "emp-5", employeeId: "emp-6" }),
    },
  ])
  assert.deepEqual(Array.from(refs.get("employee") ?? []).sort(), ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5", "emp-6"])
})
