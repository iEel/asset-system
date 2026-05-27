import assert from "node:assert/strict"
import test from "node:test"

import { getAssetOperationStatusError } from "../src/lib/asset-operation-policy.ts"

test("blocks checkout for closed and review-required asset statuses", () => {
  for (const statusName of ["Disposed", "Retired", "Pending Disposal", "Under Maintenance", "Lost", "Missing"]) {
    assert.equal(
      getAssetOperationStatusError("checkout", { name: statusName, nameTh: statusName }),
      "Asset status does not allow checkout",
      statusName
    )
  }

  assert.equal(getAssetOperationStatusError("checkout", { name: "Ready", nameTh: "พร้อมใช้งาน" }), null)
})

test("blocks normal transfer for closed and pending-disposal asset statuses", () => {
  for (const statusName of ["Disposed", "Retired", "Pending Disposal"]) {
    assert.equal(
      getAssetOperationStatusError("transfer", { name: statusName, nameTh: statusName }),
      "Asset status does not allow transfer",
      statusName
    )
  }

  assert.equal(getAssetOperationStatusError("transfer", { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม" }), null)
  assert.equal(getAssetOperationStatusError("transfer", { name: "Ready", nameTh: "พร้อมใช้งาน" }), null)
})
