import type { AssetImportPreviewResult } from "@/lib/asset-import-preview"
import type { AssetImportIssue } from "@/lib/asset-import-validate"

export type AssetImportBatchStatus = "ready" | "partial" | "blocked" | "empty"

export type AssetImportBatchSummary = {
  batchId: string
  fileName: string
  fileSize: number
  createdAt: string
  totalRows: number
  readyRows: number
  errorRows: number
  mappedColumns: number
  missingColumns: number
  status: AssetImportBatchStatus
}

export type AssetImportBatchAuditValue = AssetImportBatchSummary & {
  imported: number
  skipped: number
  approvedBy: string
  rollbackPlan?: AssetImportRollbackPlan
  // Written since group 4 plan 5 (P5-R7); older batch logs have neither, so readers treat them as optional.
  skippedRows?: AssetImportSkippedRow[]
  skippedRowsHidden?: number
}

// A row the confirm skipped, and why (P5-R7): the same issues the preview showed.
export type AssetImportSkippedRow = {
  row: number
  name: string | null
  assetTag: string | null
  issues: AssetImportIssue[]
}

export type AssetImportSkippedRows = {
  skippedRows: AssetImportSkippedRow[]
  skippedRowsHidden: number
}

// The batch log keeps at most this many skipped rows; the rest are only counted.
export const ASSET_IMPORT_SKIPPED_ROWS_LIMIT = 50

// The server's own batch id shape (buildAssetImportBatchId); a client id in any other shape is refused (P5-R2).
const assetImportBatchIdPattern = /^IMPORT-\d{14}-[A-Z0-9-]{1,24}-[0-9A-Z]{4}$/

export function isAssetImportBatchId(value: string) {
  return assetImportBatchIdPattern.test(value)
}

export type AssetImportRollbackPlan = {
  batchId: string
  reversible: boolean
  assetCount: number
  actions: Array<{
    action: "deactivate_imported_asset"
    assetId: string
    assetTag: string
    name: string
  }>
}

export function createAssetImportBatchSummary({
  fileName,
  fileSize,
  preview,
  createdAt = new Date(),
}: {
  fileName: string
  fileSize: number
  preview: AssetImportPreviewResult
  createdAt?: Date
}): AssetImportBatchSummary {
  const createdAtIso = createdAt.toISOString()
  const mappedColumns = preview.mapping.filter((column) => column.sourceColumn != null).length
  const missingColumns = preview.mapping.length - mappedColumns

  return {
    batchId: buildAssetImportBatchId({ fileName, createdAt }),
    fileName,
    fileSize,
    createdAt: createdAtIso,
    totalRows: preview.summary.totalRows,
    readyRows: preview.summary.readyRows,
    errorRows: preview.summary.errorRows,
    mappedColumns,
    missingColumns,
    status: resolveAssetImportBatchStatus(preview.summary.totalRows, preview.summary.readyRows, preview.summary.errorRows),
  }
}

// The tone of a batch status badge (plan 2D-3): the import panel and the import history share it. History rows can
// carry a status this version does not know ("unknown" from an old audit value), which stays muted.
export function getAssetImportBatchStatusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "ready") return "success"
  if (status === "partial") return "warning"
  if (status === "blocked") return "danger"
  return "muted"
}

// The id is the double-confirm key (P5-R2): the last part mixes in a random nonce, so two people who check a file of
// the same name in the same second get different ids (plan 5 final review). An empty nonce gives the old checksum.
export function buildAssetImportBatchId({ fileName, createdAt, nonce = globalThis.crypto.randomUUID() }: { fileName: string; createdAt: Date; nonce?: string }) {
  const timestamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14)
  const slug = sanitizeFileSlug(fileName)
  const seed = nonce ? `${fileName}:${timestamp}:${nonce}` : `${fileName}:${timestamp}`
  const checksum = simpleChecksum(seed).toString(36).toUpperCase().padStart(4, "0")
  return `IMPORT-${timestamp}-${slug}-${checksum}`
}

export function buildAssetImportBatchAuditValue({
  batch,
  imported,
  skipped,
  approvedBy,
  rollbackPlan,
  skippedRows,
}: {
  batch: AssetImportBatchSummary
  imported: number
  skipped: number
  approvedBy: string
  rollbackPlan?: AssetImportRollbackPlan
  skippedRows?: AssetImportSkippedRows
}): AssetImportBatchAuditValue {
  return {
    ...batch,
    imported,
    skipped,
    approvedBy,
    ...(rollbackPlan ? { rollbackPlan } : {}),
    ...(skippedRows ? { skippedRows: skippedRows.skippedRows, skippedRowsHidden: skippedRows.skippedRowsHidden } : {}),
  }
}

// The error rows of a parse, in file order, the first `limit` kept with their name, tag and issues (P5-R7).
export function buildAssetImportSkippedRows(
  rows: ReadonlyArray<{ rowNumber: number; status: string; issues: AssetImportIssue[]; values: Record<string, string | number | null> }>,
  limit = ASSET_IMPORT_SKIPPED_ROWS_LIMIT
): AssetImportSkippedRows {
  const errorRows = rows.filter((row) => row.status !== "ready")
  return {
    skippedRows: errorRows.slice(0, limit).map((row) => ({
      row: row.rowNumber,
      name: textValue(row.values.name),
      assetTag: textValue(row.values.assetTag),
      issues: row.issues,
    })),
    skippedRowsHidden: Math.max(0, errorRows.length - limit),
  }
}

function textValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

export function buildAssetImportRollbackPlan({
  batchId,
  assets,
}: {
  batchId: string
  assets: Array<{ id: string; assetTag: string; name: string }>
}): AssetImportRollbackPlan {
  return {
    batchId,
    reversible: assets.length > 0,
    assetCount: assets.length,
    actions: assets.map((asset) => ({
      action: "deactivate_imported_asset",
      assetId: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
    })),
  }
}

function resolveAssetImportBatchStatus(totalRows: number, readyRows: number, errorRows: number): AssetImportBatchStatus {
  if (totalRows === 0) return "empty"
  if (readyRows === 0) return "blocked"
  if (errorRows > 0) return "partial"
  return "ready"
}

function sanitizeFileSlug(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "")
  const slug = baseName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .toUpperCase()
  return slug || "ASSET"
}

function simpleChecksum(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 0xffff
  }
  return hash
}
