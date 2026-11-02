import assert from "node:assert/strict"
import test from "node:test"

import { buildAssetImportHistory } from "../src/lib/asset-import-history.ts"

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
        skippedRows: [
          { row: 4, name: "Monitor", assetTag: null, issues: [{ code: "notFound", field: "categoryCode", value: "XX" }] },
          { row: "5", name: "Bad" },
          null,
          { row: 6, name: 7, assetTag: "T-6", issues: "not a list" },
        ],
        skippedRowsHidden: 3,
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
  // What happened, from the counts (P5-R7); the rollback plan is still stored but never read for the page (call 21).
  assert.equal(history[0].outcome, "partial")
  assert.deepEqual(history[0].skippedRows, [
    { row: 4, name: "Monitor", assetTag: null, issues: [{ code: "notFound", field: "categoryCode", value: "XX" }] },
    { row: 6, name: null, assetTag: "T-6", issues: [] },
  ])
  assert.equal(history[0].skippedRowsHidden, 3)
  assert.equal("rollbackSummary" in history[0], false)
})

test("an old batch log with no skipped rows and the preview's status still reads, its outcome from the counts (Review Focus 5)", () => {
  const history = buildAssetImportHistory([
    {
      id: "log-old",
      recordId: "IMPORT-20260101000000-OLD-0001",
      newValue: JSON.stringify({
        batchId: "IMPORT-20260101000000-OLD-0001",
        fileName: "old.xlsx",
        fileSize: 1024,
        totalRows: 2,
        readyRows: 2,
        errorRows: 0,
        imported: 2,
        skipped: 0,
        status: "ready",
        approvedBy: "user-1",
      }),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      user: { username: "admin", displayName: null },
    },
  ])

  assert.equal(history[0].outcome, "complete")
  assert.deepEqual(history[0].skippedRows, [])
  assert.equal(history[0].skippedRowsHidden, 0)
  assert.equal(history[0].status, "ready")
  assert.equal(history[0].approvedByLabel, "admin")
})

test("a malformed import batch log still reads as a history row", () => {
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
  assert.equal(history[0].outcome, "complete")
  assert.deepEqual(history[0].skippedRows, [])
  assert.equal(history[0].approvedByLabel, "-")
})
