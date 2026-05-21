import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetImportHistory,
  summarizeImportRollbackPlan,
} from "../src/lib/asset-import-history.ts"

test("builds readable import batch history from audit logs", () => {
  const history = buildAssetImportHistory([
    {
      id: "log-1",
      recordId: "IMPORT-1",
      newValue: JSON.stringify({
        batchId: "IMPORT-1",
        fileName: "legacy.xlsx",
        fileSize: 2048,
        totalRows: 3,
        readyRows: 2,
        errorRows: 1,
        imported: 2,
        skipped: 1,
        status: "partial",
        rollbackPlan: {
          batchId: "IMPORT-1",
          reversible: true,
          assetCount: 2,
          actions: [
            { action: "deactivate_imported_asset", assetId: "asset-1", assetTag: "SNI-EQU-26-0001", name: "Notebook" },
            { action: "deactivate_imported_asset", assetId: "asset-2", assetTag: "SNI-EQU-26-0002", name: "Monitor" },
          ],
        },
      }),
      createdAt: new Date("2026-05-21T08:00:00.000Z"),
      user: { username: "admin", displayName: "System Admin" },
    },
  ])

  assert.equal(history.length, 1)
  assert.equal(history[0].batchId, "IMPORT-1")
  assert.equal(history[0].fileName, "legacy.xlsx")
  assert.equal(history[0].approvedByLabel, "System Admin")
  assert.equal(history[0].imported, 2)
  assert.equal(history[0].skipped, 1)
  assert.equal(history[0].rollbackSummary.assetCount, 2)
  assert.equal(history[0].rollbackSummary.previewAssets[0], "SNI-EQU-26-0001 - Notebook")
})

test("marks malformed import batch logs as non rollbackable history rows", () => {
  const history = buildAssetImportHistory([
    {
      id: "log-2",
      recordId: "IMPORT-BAD",
      newValue: "{bad-json",
      createdAt: new Date("2026-05-21T08:00:00.000Z"),
      user: null,
    },
  ])

  assert.equal(history.length, 1)
  assert.equal(history[0].batchId, "IMPORT-BAD")
  assert.equal(history[0].fileName, "-")
  assert.equal(history[0].rollbackSummary.reversible, false)
  assert.equal(history[0].approvedByLabel, "-")
})

test("summarizes rollback plan preview with hidden remainder", () => {
  const summary = summarizeImportRollbackPlan({
    batchId: "IMPORT-1",
    reversible: true,
    assetCount: 4,
    actions: [
      { action: "deactivate_imported_asset", assetId: "asset-1", assetTag: "A-001", name: "A" },
      { action: "deactivate_imported_asset", assetId: "asset-2", assetTag: "A-002", name: "B" },
      { action: "deactivate_imported_asset", assetId: "asset-3", assetTag: "A-003", name: "C" },
      { action: "deactivate_imported_asset", assetId: "asset-4", assetTag: "A-004", name: "D" },
    ],
  }, 2)

  assert.equal(summary.reversible, true)
  assert.equal(summary.assetCount, 4)
  assert.deepEqual(summary.previewAssets, ["A-001 - A", "A-002 - B"])
  assert.equal(summary.hiddenAssetCount, 2)
})
