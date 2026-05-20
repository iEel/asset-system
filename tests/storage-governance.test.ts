import assert from "node:assert/strict"
import test from "node:test"

import { summarizeStorageGovernance } from "../src/lib/storage-governance.ts"

test("summarizes active attachment storage by module and flags governance risks", () => {
  const summary = summarizeStorageGovernance(
    [
      { module: "asset", filePath: "uploads/a.jpg", fileSize: 2_000, isActive: true },
      { module: "asset", filePath: "uploads/b.jpg", fileSize: 12_000, isActive: true },
      { module: "maintenance", filePath: "uploads/a.jpg", fileSize: 3_000, isActive: true },
      { module: "audit_finding", filePath: "", fileSize: 1_000, isActive: true },
      { module: "asset", filePath: "uploads/old.jpg", fileSize: 50_000, isActive: false },
    ],
    { largeFileThresholdBytes: 10_000 }
  )

  assert.equal(summary.activeFiles, 4)
  assert.equal(summary.totalBytes, 18_000)
  assert.equal(summary.largeFileCount, 1)
  assert.equal(summary.missingPathCount, 1)
  assert.equal(summary.duplicatePathCount, 2)
  assert.deepEqual(summary.byModule, [
    { module: "asset", count: 2, totalBytes: 14_000 },
    { module: "maintenance", count: 1, totalBytes: 3_000 },
    { module: "audit_finding", count: 1, totalBytes: 1_000 },
  ])
})
