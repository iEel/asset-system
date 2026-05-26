import type { AssetInput } from "./validations/asset.ts"
import type { AssetBatchCreateInput, AssetBatchRowInput } from "./validations/asset-batch.ts"

type CreatedAssetSummary = {
  id: string
  assetTag: string
  name: string
}

export type AssetBatchCreateItem = AssetInput & {
  assetTag: string
  currentLocationId: string
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
      homeLocationId: nullableText(row.homeLocationId) ?? common.homeLocationId ?? null,
      currentLocationId: nullableText(row.currentLocationId) ?? common.currentLocationId,
      fixedAssetCode: nullableText(row.fixedAssetCode) ?? common.fixedAssetCode ?? null,
      remark: nullableText(row.remark) ?? common.remark ?? null,
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
