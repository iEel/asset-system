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
