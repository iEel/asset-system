import ExcelJS from "exceljs"
import { prisma } from "@/lib/db"
import { FieldRefusalError } from "@/lib/field-errors"
import { filterAssetCreateStatuses, filterSelectableConditions } from "@/lib/asset-lifecycle-policy"
import {
  buildAssetImportColumnMapping,
  buildTemplateAssetImportColumnMapping,
  hasRecognizedAssetImportHeaders,
  readAssetImportRowByMapping,
  type AssetImportCellValue,
  type AssetImportColumnMapping,
} from "@/lib/asset-import-mapping"
import {
  ASSET_IMPORT_MAX_ROWS,
  assetImportLookupKey,
  assetImportModelKey,
  assetImportScopedKey,
  validateAssetImportRows,
  type AssetImportIssue,
  type AssetImportReferences,
  type AssetImportValidatedRow,
} from "@/lib/asset-import-validate"

export type { AssetImportIssue, AssetImportReferences, AssetImportValidatedRow }
export { nullableText, parseImportDate, parseImportMoney, parseOptionalInteger } from "@/lib/asset-import-validate"

// What the preview answers per row (P5-R4): no resolved ids; confirm keeps its own copy (parseAssetImportWorkbookForConfirm).
export type AssetImportPreviewRow = Omit<AssetImportValidatedRow, "resolved">

export type AssetImportPreviewSummary = {
  totalRows: number
  readyRows: number
  errorRows: number
}

export type AssetImportPreviewResult = {
  summary: AssetImportPreviewSummary
  rows: AssetImportPreviewRow[]
  mapping: AssetImportColumnMapping[]
}

// Confirm's parse: the same rows with the resolved ids (and the holder's department) it writes.
export type AssetImportConfirmParseResult = {
  summary: AssetImportPreviewSummary
  rows: AssetImportValidatedRow[]
  mapping: AssetImportColumnMapping[]
}

// The row cap's own message (P5-R3); the field error is _form: outOfRange.
export const assetImportTooManyRowsMessage = "ไฟล์นำเข้าได้ไม่เกิน 1,000 แถวต่อครั้ง"

export async function getAssetImportReferences(): Promise<AssetImportReferences> {
  const [
    assets,
    categories,
    companies,
    branches,
    departments,
    locations,
    statuses,
    conditions,
    brands,
    models,
    employees,
    suppliers,
  ] = await Promise.all([
    // Every asset, active or not: the tag is unique over all rows (P5-R5). Oldest first, so a Serial two active assets
    // already share names the oldest (Review Focus 1).
    prisma.asset.findMany({
      select: { id: true, assetTag: true, serialNumber: true, isActive: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, companyId: true },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, companyId: true },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, branchId: true },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
    }),
    prisma.assetBrand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    prisma.assetModel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, brandId: true, categoryId: true },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, departmentId: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
  ])

  const assetsByTag: AssetImportReferences["assetsByTag"] = new Map()
  const assetsBySerial: AssetImportReferences["assetsBySerial"] = new Map()
  for (const asset of [...assets].sort(byCreatedAt)) {
    const tag = assetImportLookupKey(asset.assetTag)
    const heldTag = assetsByTag.get(tag)
    if (!heldTag || (!heldTag.active && asset.isActive)) {
      assetsByTag.set(tag, { id: asset.id, assetTag: asset.assetTag, active: asset.isActive })
    }
    const serial = assetImportLookupKey(asset.serialNumber)
    if (asset.isActive && serial && !assetsBySerial.has(serial)) {
      assetsBySerial.set(serial, { id: asset.id, assetTag: asset.assetTag })
    }
  }

  return {
    assetsByTag,
    assetsBySerial,
    categories: new Map(categories.map((category) => [assetImportLookupKey(category.code), category.id])),
    companies: new Map(companies.map((company) => [assetImportLookupKey(company.code), company.id])),
    branches: new Map(
      branches.map((branch) => [
        assetImportScopedKey(branch.companyId, branch.code),
        { id: branch.id, companyId: branch.companyId },
      ])
    ),
    departments: new Map(
      departments.map((department) => [
        assetImportLookupKey(department.code),
        { id: department.id, companyId: department.companyId },
      ])
    ),
    locations: new Map(locations.map((location) => [assetImportLookupKey(location.code), { id: location.id, branchId: location.branchId }])),
    statuses: nameMap(statuses),
    importableStatuses: new Set(filterAssetCreateStatuses(statuses).map((status) => status.id)),
    conditions: nameMap(conditions),
    importableConditions: new Set(filterSelectableConditions(conditions).map((condition) => condition.id)),
    brands: new Map(brands.map((brand) => [assetImportLookupKey(brand.name), brand.id])),
    models: new Map(
      models.map((model) => [
        assetImportModelKey(model.brandId, model.name),
        { id: model.id, brandId: model.brandId, categoryId: model.categoryId },
      ])
    ),
    employees: new Map(
      employees.map((employee) => [assetImportLookupKey(employee.code), { id: employee.id, departmentId: employee.departmentId }])
    ),
    suppliers: new Map(suppliers.map((supplier) => [assetImportLookupKey(supplier.code), supplier.id])),
  }
}

// The preview's parse: the rows without their resolved ids (P5-R4).
export async function parseAssetImportWorkbook(buffer: ArrayBuffer, references: AssetImportReferences): Promise<AssetImportPreviewResult> {
  const parsed = await parseAssetImportWorkbookForConfirm(buffer, references)
  return {
    ...parsed,
    rows: parsed.rows.map((row) => ({ rowNumber: row.rowNumber, status: row.status, issues: row.issues, values: row.values })),
  }
}

// Confirm's parse (group 4 plan 5 Task 2 reads it): each row keeps the resolved ids beside its values. A file with more
// than ASSET_IMPORT_MAX_ROWS data rows is refused as a whole, as a _form error (P5-R3).
export async function parseAssetImportWorkbookForConfirm(
  buffer: ArrayBuffer,
  references: AssetImportReferences
): Promise<AssetImportConfirmParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.getWorksheet("Asset Import") ?? workbook.worksheets[0]
  if (!worksheet) {
    throw new Error("ไม่พบ worksheet สำหรับนำเข้าข้อมูล")
  }

  const headerRow = worksheet.getRow(1)
  const headerColumnCount = Math.max(worksheet.columnCount, headerRow.cellCount)
  const detectedMapping = buildAssetImportColumnMapping(
    Array.from({ length: headerColumnCount }, (_, index) => headerRow.getCell(index + 1).value as string | number | null)
  )
  const hasHeaderRow = hasRecognizedAssetImportHeaders(detectedMapping)
  const mapping = hasHeaderRow ? detectedMapping : buildTemplateAssetImportColumnMapping()

  const dataRows: Array<{ rowNumber: number; values: Record<string, AssetImportCellValue> }> = []
  let tooMany = false
  worksheet.eachRow((row, rowNumber) => {
    if (tooMany || (hasHeaderRow && rowNumber === 1)) return
    const values = readAssetImportRowByMapping(row, mapping)
    if (isEmptyRow(values)) return
    if (dataRows.length >= ASSET_IMPORT_MAX_ROWS) {
      tooMany = true
      return
    }
    dataRows.push({ rowNumber, values })
  })
  if (tooMany) {
    throw new FieldRefusalError(assetImportTooManyRowsMessage, { _form: "outOfRange" })
  }

  const rows = validateAssetImportRows(dataRows, references)
  const readyRows = rows.filter((row) => row.status === "ready").length
  return {
    summary: {
      totalRows: rows.length,
      readyRows,
      errorRows: rows.length - readyRows,
    },
    rows,
    mapping,
  }
}

function isEmptyRow(values: Record<string, string | number | null>) {
  return Object.values(values).every((value) => value == null || String(value).trim() === "")
}

function byCreatedAt(left: { createdAt: Date; id: string }, right: { createdAt: Date; id: string }) {
  const difference = left.createdAt.getTime() - right.createdAt.getTime()
  return difference !== 0 ? difference : left.id.localeCompare(right.id)
}

function nameMap(records: Array<{ id: string; name: string; nameTh: string }>) {
  return new Map(
    records.flatMap((record) => [
      [assetImportLookupKey(record.name), record.id] as const,
      [assetImportLookupKey(record.nameTh), record.id] as const,
    ])
  )
}
