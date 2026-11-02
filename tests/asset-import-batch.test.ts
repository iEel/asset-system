import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetImportBatchAuditValue,
  buildAssetImportBatchId,
  buildAssetImportRollbackPlan,
  buildAssetImportSkippedRows,
  createAssetImportBatchSummary,
  getAssetImportBatchStatusTone,
  isAssetImportBatchId,
} from "../src/lib/asset-import-batch.ts"

const createdAt = new Date("2026-05-20T08:30:15.000Z")

test("builds readable import batch id from timestamp and file name", () => {
  assert.equal(buildAssetImportBatchId({ fileName: "legacy assets.xlsx", createdAt, nonce: "" }), "IMPORT-20260520083015-LEGACY-ASSETS-16DD")
})

// Group 4 plan 5 final review: the id is the double-confirm key (P5-R2), so two people checking files of the same name
// in the same second must not share it: the last part mixes in a random value, and the shape stays the same.
test("two batch ids of the same file name and second differ", () => {
  const ids = new Set(Array.from({ length: 20 }, () => buildAssetImportBatchId({ fileName: "asset-import-template.xlsx", createdAt })))
  assert.ok(ids.size > 1)
  for (const id of ids) {
    assert.match(id, /^IMPORT-20260520083015-ASSET-IMPORT-TEMPLATE-[0-9A-Z]{4}$/)
    assert.equal(isAssetImportBatchId(id), true)
  }
  assert.notEqual(buildAssetImportBatchId({ fileName: "a.xlsx", createdAt, nonce: "one" }), buildAssetImportBatchId({ fileName: "a.xlsx", createdAt, nonce: "two" }))
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

test("a batch status badge takes the tone of what is left to do, and an unknown status is muted (plan 2D-3)", () => {
  assert.deepEqual(
    ["ready", "partial", "blocked", "empty", "unknown"].map(getAssetImportBatchStatusTone),
    ["success", "warning", "danger", "muted", "muted"],
  )
})

test("the batch log keeps the first 50 skipped rows with their issues, and counts the rest (P5-R7)", () => {
  const errorRows = Array.from({ length: 60 }, (_, index) => ({
    rowNumber: index + 2,
    status: "error" as const,
    issues: [{ code: "notFound" as const, field: "categoryCode", value: "XX" }],
    values: { name: index === 0 ? null : `Asset ${index}`, assetTag: index === 0 ? "T-0" : null },
  }))
  const readyRow = { rowNumber: 62, status: "ready" as const, issues: [], values: { name: "Ready", assetTag: "R-1" } }

  const skipped = buildAssetImportSkippedRows([readyRow, ...errorRows])
  assert.equal(skipped.skippedRows.length, 50)
  assert.equal(skipped.skippedRowsHidden, 10)
  assert.deepEqual(skipped.skippedRows[0], { row: 2, name: null, assetTag: "T-0", issues: [{ code: "notFound", field: "categoryCode", value: "XX" }] })
  assert.deepEqual(skipped.skippedRows[1], { row: 3, name: "Asset 1", assetTag: null, issues: [{ code: "notFound", field: "categoryCode", value: "XX" }] })
  assert.equal(skipped.skippedRows.some((row) => row.row === 62), false)

  const batch = createAssetImportBatchSummary({
    fileName: "legacy assets.xlsx",
    fileSize: 2048,
    createdAt,
    preview: { summary: { totalRows: 61, readyRows: 1, errorRows: 60 }, rows: [], mapping: [] },
  })
  const value = buildAssetImportBatchAuditValue({ batch, imported: 1, skipped: 60, approvedBy: "user-1", skippedRows: skipped })
  assert.equal(value.skippedRows?.length, 50)
  assert.equal(value.skippedRowsHidden, 10)
})

test("a batch id from the client is used only in the shape the server builds (P5-R2)", () => {
  assert.equal(isAssetImportBatchId(buildAssetImportBatchId({ fileName: "legacy assets.xlsx", createdAt })), true)
  assert.equal(isAssetImportBatchId(buildAssetImportBatchId({ fileName: "ทะเบียน.xlsx", createdAt })), true)
  for (const bad of ["", "IMPORT-1", "import-20260520083015-LEGACY-16DD", "IMPORT-20260520083015-legacy-16DD", `IMPORT-20260520083015-${"A".repeat(25)}-16DD`, "IMPORT-20260520083015-LEGACY-16DD "]) {
    assert.equal(isAssetImportBatchId(bad), false, bad)
  }
})
