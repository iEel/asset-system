import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetImportBatchAuditValue,
  buildAssetImportBatchId,
  buildAssetImportRollbackPlan,
  createAssetImportBatchSummary,
} from "../src/lib/asset-import-batch.ts"

const createdAt = new Date("2026-05-20T08:30:15.000Z")

test("builds readable import batch id from timestamp and file name", () => {
  assert.equal(buildAssetImportBatchId({ fileName: "legacy assets.xlsx", createdAt }), "IMPORT-20260520083015-LEGACY-ASSETS-16DD")
})

test("summarizes import batch readiness and mapping coverage", () => {
  const batch = createAssetImportBatchSummary({
    fileName: "legacy assets.xlsx",
    fileSize: 2048,
    createdAt,
    preview: {
      summary: { totalRows: 3, readyRows: 2, errorRows: 1 },
      rows: [],
      mapping: [
        { key: "assetTag", label: "Asset Tag", sourceColumn: 1, sourceHeader: "รหัส", confidence: "alias" },
        { key: "name", label: "Asset Name", sourceColumn: 2, sourceHeader: "ชื่อ", confidence: "alias" },
        { key: "categoryCode", label: "Category Code", sourceColumn: null, sourceHeader: null, confidence: "missing" },
      ],
    },
  })

  assert.equal(batch.status, "partial")
  assert.equal(batch.mappedColumns, 2)
  assert.equal(batch.missingColumns, 1)
  assert.equal(batch.readyRows, 2)
  assert.equal(batch.errorRows, 1)
})

test("builds batch audit value with import result", () => {
  const batch = createAssetImportBatchSummary({
    fileName: "legacy assets.xlsx",
    fileSize: 2048,
    createdAt,
    preview: {
      summary: { totalRows: 2, readyRows: 2, errorRows: 0 },
      rows: [],
      mapping: [],
    },
  })

  assert.deepEqual(buildAssetImportBatchAuditValue({ batch, imported: 2, skipped: 0, approvedBy: "user-1" }), {
    ...batch,
    imported: 2,
    skipped: 0,
    approvedBy: "user-1",
  })
})

test("builds rollback plan for imported assets in a batch", () => {
  assert.deepEqual(
    buildAssetImportRollbackPlan({
      batchId: "IMPORT-1",
      assets: [
        { id: "asset-1", assetTag: "SNI-EQU-26-0001", name: "Notebook" },
        { id: "asset-2", assetTag: "SNI-EQU-26-0002", name: "Monitor" },
      ],
    }),
    {
      batchId: "IMPORT-1",
      reversible: true,
      assetCount: 2,
      actions: [
        { action: "deactivate_imported_asset", assetId: "asset-1", assetTag: "SNI-EQU-26-0001", name: "Notebook" },
        { action: "deactivate_imported_asset", assetId: "asset-2", assetTag: "SNI-EQU-26-0002", name: "Monitor" },
      ],
    }
  )
})
