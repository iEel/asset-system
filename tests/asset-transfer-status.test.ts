import assert from "node:assert/strict"
import test from "node:test"

import { getTransferTargetStatusName } from "../src/lib/asset-operation-policy.ts"

test("personal transfer changes the asset status to In Use", () => {
  assert.equal(getTransferTargetStatusName("employee-1"), "In Use")
})

test("location or department transfer preserves the current asset status", () => {
  assert.equal(getTransferTargetStatusName(null), null)
  assert.equal(getTransferTargetStatusName(undefined), null)
})
