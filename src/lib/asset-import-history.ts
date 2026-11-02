import type { AssetImportBatchAuditValue, AssetImportSkippedRow } from "@/lib/asset-import-batch"
import type { AssetImportIssue } from "@/lib/asset-import-validate"

export type AssetImportHistoryLog = {
  id: string
  recordId: string | null
  newValue: string | null
  createdAt: Date
  user: { username: string; displayName: string | null } | null
}

// What happened to a batch, from its counts (P5-R7): every row imported, or some rows skipped. An old log's status is the
// preview's ("ready" / "partial"), which says what was left to do, not what happened.
export type AssetImportHistoryOutcome = "complete" | "partial"

export type AssetImportHistoryItem = {
  id: string
  batchId: string
  fileName: string
  fileSize: number
  createdAt: Date
  approvedByLabel: string
  totalRows: number
  readyRows: number
  errorRows: number
  imported: number
  skipped: number
  status: string
  outcome: AssetImportHistoryOutcome
  skippedRows: AssetImportSkippedRow[]
  skippedRowsHidden: number
}

export function buildAssetImportHistory(logs: AssetImportHistoryLog[]): AssetImportHistoryItem[] {
  return logs.map((log) => {
    const value = parseImportBatchAuditValue(log.newValue)
    const batchId = getString(value?.batchId) ?? log.recordId ?? "-"
    const skipped = getNumber(value?.skipped)

    return {
      id: log.id,
      batchId,
      fileName: getString(value?.fileName) ?? "-",
      fileSize: getNumber(value?.fileSize),
      createdAt: log.createdAt,
      approvedByLabel: log.user?.displayName ?? log.user?.username ?? "-",
      totalRows: getNumber(value?.totalRows),
      readyRows: getNumber(value?.readyRows),
      errorRows: getNumber(value?.errorRows),
      imported: getNumber(value?.imported),
      skipped,
      status: getString(value?.status) ?? "unknown",
      outcome: skipped > 0 ? "partial" : "complete",
      // Old logs have no skipped rows (written since group 4 plan 5); a stored row that does not read is left out.
      skippedRows: readSkippedRows(value?.skippedRows),
      skippedRowsHidden: getNumber(value?.skippedRowsHidden),
    }
  })
}

function readSkippedRows(value: unknown): AssetImportSkippedRow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const record = entry as Record<string, unknown>
    if (typeof record.row !== "number" || !Number.isFinite(record.row)) return []
    return [{
      row: record.row,
      name: getString(record.name),
      assetTag: getString(record.assetTag),
      issues: Array.isArray(record.issues) ? record.issues.filter(isIssue) : [],
    }]
  })
}

function isIssue(value: unknown): value is AssetImportIssue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.code === "string" && typeof record.field === "string"
}

function parseImportBatchAuditValue(value: string | null): AssetImportBatchAuditValue | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as AssetImportBatchAuditValue
  } catch {
    return null
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
