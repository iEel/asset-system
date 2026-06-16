import type { AssetInput } from "./validations/asset.ts"
import type { AssetBatchCreateInput, AssetBatchRowInput } from "./validations/asset-batch.ts"

type CreatedAssetSummary = {
  id: string
  assetTag: string
  name: string
}

export const defaultAssetBatchRowCount = 2
export const assetBatchCreateAuditRecordId = "asset_batch_create"

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
  currentLocationId: string
  homeLocationId: string
  remark: string
}

export type AssetBatchPreviewRow = {
  rowNo: number
  serialNumber: string
  assetTag: string
  assetTagSource: "manual" | "auto"
  custodianId: string
  departmentId: string
  currentLocationId: string
  homeLocationId: string
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
      homeLocationId: nullableText(row.homeLocationId) ?? common.homeLocationId ?? null,
      currentLocationId: nullableText(row.currentLocationId) ?? common.currentLocationId,
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
    currentLocationId: "",
    homeLocationId: "",
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
      departmentId: row.departmentId.trim(),
      currentLocationId: row.currentLocationId.trim(),
      homeLocationId: row.homeLocationId.trim(),
      remark: row.remark.trim(),
    }
  })
}

export function parseBatchSerialPaste(text: string, maxRows = 100) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t")[0]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, maxRows)
}

export function summarizeAssetBatchCreateResult(assets: CreatedAssetSummary[]) {
  return {
    created: assets.length,
    assets,
    assetIds: assets.map((asset) => asset.id),
  }
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function buildAssetBatchReceiptCsv(assets: CreatedAssetSummary[]) {
  const rows = [
    ["Asset Tag", "Asset Name", "Asset ID"],
    ...assets.map((asset) => [asset.assetTag, asset.name, asset.id]),
  ]

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
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
