import type { AssetInput } from "./validations/asset.ts"
import type { AssetBatchCreateInput, AssetBatchRowInput } from "./validations/asset-batch.ts"

type CreatedAssetSummary = {
  id: string
  assetTag: string
  name: string
}

export const defaultAssetBatchRowCount = 2

export type AssetBatchCreateItem = AssetInput & {
  assetTag: string
  currentLocationId: string
}

export type AssetBatchEditableRow = {
  clientId: string
  assetTag: string
  serialNumber: string
  custodianId: string
  departmentId: string
  remark: string
}

export type AssetBatchPreviewRow = {
  rowNo: number
  serialNumber: string
  assetTag: string
  assetTagSource: "manual" | "auto"
  custodianId: string
  remark: string
}

function nullableText(value?: string | null) {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : null
}

function normalizedKey(value?: string | null) {
  return value?.trim().toLowerCase() ?? ""
}

export function findDuplicateBatchValues(rows: AssetBatchRowInput[]) {
  const seenSerials = new Set<string>()
  const seenTags = new Set<string>()
  const duplicateSerials = new Set<string>()
  const duplicateTags = new Set<string>()

  for (const row of rows) {
    const serial = normalizedKey(row.serialNumber)
    if (serial) {
      if (seenSerials.has(serial)) duplicateSerials.add(serial)
      seenSerials.add(serial)
    }

    const assetTag = normalizedKey(row.assetTag)
    if (assetTag) {
      if (seenTags.has(assetTag)) duplicateTags.add(assetTag)
      seenTags.add(assetTag)
    }
  }

  return {
    serialNumbers: [...duplicateSerials],
    assetTags: [...duplicateTags],
  }
}

export function buildAssetBatchCreateItems({
  common,
  rows,
  generatedAssetTags,
}: {
  common: AssetBatchCreateInput["common"]
  rows: AssetBatchCreateInput["rows"]
  generatedAssetTags: string[]
}): AssetBatchCreateItem[] {
  let generatedIndex = 0

  return rows.map((row) => {
    const manualAssetTag = nullableText(row.assetTag)
    const assetTag = manualAssetTag ?? generatedAssetTags[generatedIndex++]
    if (!assetTag) throw new Error("Missing generated asset tag")

    return {
      ...common,
      assetTag,
      serialNumber: nullableText(row.serialNumber),
      custodianId: nullableText(row.custodianId) ?? common.custodianId ?? null,
      departmentId: nullableText(row.departmentId) ?? common.departmentId ?? null,
      homeLocationId: common.homeLocationId ?? null,
      currentLocationId: common.currentLocationId,
      fixedAssetCode: common.fixedAssetCode ?? null,
      remark: nullableText(row.remark) ?? common.remark ?? null,
    }
  })
}

export function normalizeAssetBatchRowCount(count: number) {
  if (!Number.isFinite(count)) return defaultAssetBatchRowCount
  return Math.min(Math.max(Math.trunc(count), 2), 100)
}

export function createAssetBatchRows(count = defaultAssetBatchRowCount, idPrefix = `row-${Date.now()}`): AssetBatchEditableRow[] {
  return Array.from({ length: normalizeAssetBatchRowCount(count) }, (_, index) => ({
    clientId: `${idPrefix}-${index + 1}`,
    serialNumber: "",
    assetTag: "",
    custodianId: "",
    departmentId: "",
    remark: "",
  }))
}

export function buildAssetBatchPreviewRows(rows: AssetBatchEditableRow[]): AssetBatchPreviewRow[] {
  return rows.map((row, index) => {
    const assetTag = row.assetTag.trim()

    return {
      rowNo: index + 1,
      serialNumber: row.serialNumber.trim(),
      assetTag,
      assetTagSource: assetTag ? "manual" : "auto",
      custodianId: row.custodianId.trim(),
      remark: row.remark.trim(),
    }
  })
}

export function summarizeAssetBatchCreateResult(assets: CreatedAssetSummary[]) {
  return {
    created: assets.length,
    assets,
    assetIds: assets.map((asset) => asset.id),
  }
}

export function buildAssetBatchDuplicateMessage({
  duplicateBatchSerials,
  duplicateBatchAssetTags,
  existingSerials,
  existingAssetTags,
}: {
  duplicateBatchSerials: string[]
  duplicateBatchAssetTags: string[]
  existingSerials: string[]
  existingAssetTags: string[]
}) {
  const parts = [
    duplicateBatchSerials.length ? `Serial Number ซ้ำในชุดนี้ ${duplicateBatchSerials.join(", ")}` : "",
    duplicateBatchAssetTags.length ? `Asset Tag ซ้ำในชุดนี้ ${duplicateBatchAssetTags.join(", ")}` : "",
    existingSerials.length ? `Serial Number ซ้ำกับข้อมูลเดิม ${existingSerials.join(", ")}` : "",
    existingAssetTags.length ? `Asset Tag ซ้ำกับข้อมูลเดิม ${existingAssetTags.join(", ")}` : "",
  ].filter(Boolean)

  return parts.length > 0 ? `พบข้อมูลซ้ำ: ${parts.join("; ")}` : ""
}

export function buildAssetBatchDuplicateCheckSummary(input: {
  duplicateBatchSerials: string[]
  duplicateBatchAssetTags: string[]
  existingSerials: string[]
  existingAssetTags: string[]
}) {
  const message = buildAssetBatchDuplicateMessage(input)

  return {
    ok: message.length === 0,
    message,
    duplicateCount: input.duplicateBatchSerials.length + input.duplicateBatchAssetTags.length + input.existingSerials.length + input.existingAssetTags.length,
  }
}
