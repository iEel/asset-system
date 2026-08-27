import assert from "node:assert/strict"
import test from "node:test"

import { getTransferTargetStatusName } from "../src/lib/asset-operation-policy.ts"
import { renderTransferDocumentNo } from "../src/lib/asset-transfer-document-number.ts"

test("personal transfer changes the asset status to In Use", () => {
  assert.equal(getTransferTargetStatusName("employee-1"), "In Use")
})

test("location or department transfer preserves the current asset status", () => {
  assert.equal(getTransferTargetStatusName(null), null)
  assert.equal(getTransferTargetStatusName(undefined), null)
})

test("transfer document numbers use the monthly TR sequence", () => {
  assert.equal(renderTransferDocumentNo(new Date(2026, 7, 27), 7), "TR-202608-0007")
})
