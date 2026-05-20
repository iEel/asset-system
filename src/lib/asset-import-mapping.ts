import { assetImportColumns } from "./asset-excel.ts"

export type AssetImportColumnMapping = {
  key: string
  label: string
  sourceHeader: string | null
  sourceColumn: number | null
  confidence: "template" | "alias" | "missing"
}

export type AssetImportCellValue = string | number | null

type CellReader = {
  value: unknown
}

type RowReader = {
  getCell: (index: number) => CellReader
}

const headerAliases: Record<string, string[]> = {
  assetTag: ["รหัสทรัพย์สิน", "เลขที่ทรัพย์สิน", "รหัสครุภัณฑ์", "asset no", "asset number", "asset code"],
  name: ["ชื่อทรัพย์สิน", "รายละเอียด", "รายการ", "description", "item", "item name"],
  serialNumber: ["serial", "s/n", "sn", "s/n:", "serial no", "serial number", "เลข serial", "หมายเลข serial"],
  categoryCode: ["category", "หมวดหมู่", "รหัสหมวดหมู่"],
  companyCode: ["company", "บริษัท", "รหัสบริษัท"],
  branchCode: ["branch", "สาขา", "รหัสสาขา"],
  currentLocationCode: ["location", "current location", "ตำแหน่ง", "สถานที่", "พื้นที่", "รหัสตำแหน่ง"],
  status: ["สถานะ"],
  condition: ["สภาพ", "สภาพทรัพย์สิน"],
  brand: ["ยี่ห้อ"],
  model: ["รุ่น"],
  departmentCode: ["department", "แผนก", "รหัสแผนก"],
  custodianCode: ["custodian", "holder", "owner", "ผู้ถือครอง", "รหัสผู้ถือครอง", "พนักงาน", "รหัสพนักงาน"],
  homeLocationCode: ["home location", "พื้นที่ประจำ", "ตำแหน่งประจำ"],
  purchaseDate: ["วันที่ซื้อ", "purchase"],
  purchasePrice: ["ราคา", "ราคาซื้อ", "มูลค่า"],
  supplierCode: ["supplier", "vendor", "ผู้ขาย", "รหัสผู้ขาย"],
  fixedAssetCode: ["fixed asset", "fixed asset no", "รหัสบัญชีทรัพย์สิน"],
  poNumber: ["po", "po no", "เลข po", "เลขที่ po"],
  invoiceNumber: ["invoice", "invoice no", "เลข invoice", "เลขที่ invoice"],
  remark: ["หมายเหตุ", "note", "notes"],
}

export function buildAssetImportColumnMapping(headers: Array<string | number | null | undefined>): AssetImportColumnMapping[] {
  const headerIndex = new Map<string, { sourceHeader: string; sourceColumn: number }>()

  headers.forEach((header, index) => {
    const sourceValue = normalizeImportCell(header)
    if (sourceValue == null) return
    const sourceHeader = String(sourceValue).trim()
    const normalized = normalizeImportHeader(sourceHeader)
    if (!normalized || headerIndex.has(normalized)) return
    headerIndex.set(normalized, { sourceHeader, sourceColumn: index + 1 })
  })

  return assetImportColumns.map((column) => {
    const templateMatch = findHeaderMatch(headerIndex, [column.header, column.key])
    if (templateMatch) {
      return {
        key: column.key,
        label: column.header,
        sourceHeader: templateMatch.sourceHeader,
        sourceColumn: templateMatch.sourceColumn,
        confidence: "template",
      }
    }

    const aliasMatch = findHeaderMatch(headerIndex, headerAliases[column.key] ?? [])
    if (aliasMatch) {
      return {
        key: column.key,
        label: column.header,
        sourceHeader: aliasMatch.sourceHeader,
        sourceColumn: aliasMatch.sourceColumn,
        confidence: "alias",
      }
    }

    return {
      key: column.key,
      label: column.header,
      sourceHeader: null,
      sourceColumn: null,
      confidence: "missing",
    }
  })
}

export function buildTemplateAssetImportColumnMapping(): AssetImportColumnMapping[] {
  return assetImportColumns.map((column, index) => ({
    key: column.key,
    label: column.header,
    sourceHeader: null,
    sourceColumn: index + 1,
    confidence: "template",
  }))
}

export function hasRecognizedAssetImportHeaders(mapping: AssetImportColumnMapping[]) {
  return mapping.filter((column) => column.sourceColumn != null).length >= 2
}

export function readAssetImportRowByMapping(row: RowReader, mapping: AssetImportColumnMapping[]) {
  return Object.fromEntries(
    mapping.map((column) => [
      column.key,
      column.sourceColumn == null ? null : normalizeImportCell(row.getCell(column.sourceColumn).value),
    ])
  ) as Record<string, AssetImportCellValue>
}

export function normalizeImportCell(value: unknown): AssetImportCellValue {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "object") {
    if ("text" in value && value.text) return String(value.text).trim()
    if ("result" in value && value.result != null) return normalizeImportCell(value.result)
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim()
    }
    return String(value).trim()
  }
  if (typeof value === "string") return value.trim()
  if (typeof value === "number") return value
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value).trim()
}

export function normalizeImportHeader(value: string | number | null | undefined) {
  if (value == null) return ""
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_./\\:：#()[\]\-]+/g, "")
}

function findHeaderMatch(
  headerIndex: Map<string, { sourceHeader: string; sourceColumn: number }>,
  candidates: string[]
) {
  for (const candidate of candidates) {
    const match = headerIndex.get(normalizeImportHeader(candidate))
    if (match) return match
  }
  return null
}
