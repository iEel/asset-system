import type { AssetImportBatchAuditValue, AssetImportRollbackPlan } from "@/lib/asset-import-batch"

export type AssetImportHistoryLog = {
  id: string
  recordId: string | null
  newValue: string | null
  createdAt: Date
  user: { username: string; displayName: string | null } | null
}

export type AssetImportRollbackSummary = {
  reversible: boolean
  assetCount: number
  previewAssets: string[]
  hiddenAssetCount: number
}

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
  rollbackSummary: AssetImportRollbackSummary
}

export function buildAssetImportHistory(logs: AssetImportHistoryLog[]): AssetImportHistoryItem[] {
  return logs.map((log) => {
    const value = parseImportBatchAuditValue(log.newValue)
    const batchId = getString(value?.batchId) ?? log.recordId ?? "-"

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
      skipped: getNumber(value?.skipped),
      status: getString(value?.status) ?? "unknown",
      rollbackSummary: summarizeImportRollbackPlan(value?.rollbackPlan),
    }
  })
}

export function summarizeImportRollbackPlan(plan: AssetImportRollbackPlan | null | undefined, previewLimit = 5): AssetImportRollbackSummary {
  if (!plan || !Array.isArray(plan.actions)) {
    return { reversible: false, assetCount: 0, previewAssets: [], hiddenAssetCount: 0 }
  }

  const previewAssets = plan.actions
    .slice(0, Math.max(0, previewLimit))
    .map((action) => `${action.assetTag} - ${action.name}`)

  return {
    reversible: Boolean(plan.reversible) && plan.assetCount > 0,
    assetCount: Math.max(0, plan.assetCount),
    previewAssets,
    hiddenAssetCount: Math.max(0, plan.actions.length - previewAssets.length),
  }
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
