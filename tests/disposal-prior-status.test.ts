import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getDisposalRestoreStatusError } from "../src/lib/disposal-policy.ts"

test("disposal rejection restores the recorded active prior status", () => {
  assert.equal(
    getDisposalRestoreStatusError(
      { name: "Pending Disposal", isActive: true },
      { name: "In Use", isActive: true },
    ),
    null,
  )
  assert.equal(
    getDisposalRestoreStatusError(
      { name: "Pending Disposal", isActive: true },
      { name: "Ready", isActive: true },
    ),
    null,
  )
})

test("disposal rejection fails closed when prior status is unavailable", () => {
  assert.equal(
    getDisposalRestoreStatusError({ name: "Pending Disposal", isActive: true }, null),
    "DISPOSAL_PREVIOUS_STATUS_MISSING",
  )
  assert.equal(
    getDisposalRestoreStatusError(
      { name: "Ready", isActive: true },
      { name: "In Use", isActive: true },
    ),
    "DISPOSAL_ASSET_STATUS_CHANGED",
  )
  assert.equal(
    getDisposalRestoreStatusError(
      { name: "Pending Disposal", isActive: true },
      { name: "In Use", isActive: false },
    ),
    "DISPOSAL_PREVIOUS_STATUS_INACTIVE",
  )
})

test("disposal request schema stores a nullable prior status relation", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  assert.match(schema, /previousAssetStatusId\s+String\?/)
  assert.match(schema, /previousAssetStatus\s+AssetStatus\?\s+@relation\("DisposalPreviousAssetStatus"/)
})
