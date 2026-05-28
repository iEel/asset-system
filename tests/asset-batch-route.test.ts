import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset batch summary audit log uses a bounded synthetic record id", () => {
  const route = readFileSync("src/app/api/assets/batch/route.ts", "utf8")

  assert.match(route, /assetBatchCreateAuditRecordId/)
  assert.doesNotMatch(route, /assets\.map\(\(asset\) => asset\.id\)\.join\(","\)/)
  assert.match(route, /assetIds: assets\.map\(\(asset\) => asset\.id\)/)
})
