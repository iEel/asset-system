import type { AssetImportPreviewResult } from "@/lib/asset-import-preview"

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

export function buildAssetImportBatchId({ fileName, createdAt }: { fileName: string; createdAt: Date }) {
  const timestamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14)
  const slug = sanitizeFileSlug(fileName)
  const checksum = simpleChecksum(`${fileName}:${timestamp}`).toString(36).toUpperCase().padStart(4, "0")
  return `IMPORT-${timestamp}-${slug}-${checksum}`
}

export function buildAssetImportBatchAuditValue({
  batch,
  imported,
  skipped,
  approvedBy,
  rollbackPlan,
}: {
  batch: AssetImportBatchSummary
  imported: number
  skipped: number
  approvedBy: string
  rollbackPlan?: AssetImportRollbackPlan
}): AssetImportBatchAuditValue {
  return {
    ...batch,
    imported,
    skipped,
    approvedBy,
    ...(rollbackPlan ? { rollbackPlan } : {}),
  }
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
