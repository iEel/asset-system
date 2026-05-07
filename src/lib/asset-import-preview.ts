import ExcelJS from "exceljs"
import { prisma } from "@/lib/db"
import { assetImportColumns } from "@/lib/asset-excel"

export type AssetImportPreviewRow = {
  rowNumber: number
  status: "ready" | "error"
  errors: string[]
  values: Record<string, string | number | null>
  resolved: Record<string, string | null>
}

export type AssetImportPreviewSummary = {
  totalRows: number
  readyRows: number
  errorRows: number
}

export type AssetImportPreviewResult = {
  summary: AssetImportPreviewSummary
  rows: AssetImportPreviewRow[]
}

export type AssetImportReferences = {
  assetTags: Set<string>
  serialNumbers: Set<string>
  categories: Map<string, string>
  companies: Map<string, string>
  branches: Map<string, { id: string; companyId: string }>
  departments: Map<string, { id: string; companyId: string | null }>
  locations: Map<string, { id: string; branchId: string }>
  statuses: Map<string, string>
  conditions: Map<string, string>
  brands: Map<string, string>
  models: Map<string, { id: string; brandId: string | null; categoryId: string | null }>
  employees: Map<string, string>
  suppliers: Map<string, string>
}

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
    prisma.asset.findMany({
      where: { isActive: true },
      select: { assetTag: true, serialNumber: true },
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
      select: { id: true, code: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
  ])

  return {
    assetTags: new Set(assets.map((asset) => asset.assetTag.trim().toLowerCase())),
    serialNumbers: new Set(
      assets.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber.trim().toLowerCase()] : []))
    ),
    categories: new Map(categories.map((category) => [category.code.trim().toLowerCase(), category.id])),
    companies: new Map(companies.map((company) => [company.code.trim().toLowerCase(), company.id])),
    branches: new Map(
      branches.map((branch) => [
        scopedKey(branch.companyId, branch.code),
        { id: branch.id, companyId: branch.companyId },
      ])
    ),
    departments: new Map(
      departments.map((department) => [
        department.code.trim().toLowerCase(),
        { id: department.id, companyId: department.companyId },
      ])
    ),
    locations: new Map(locations.map((location) => [location.code.trim().toLowerCase(), { id: location.id, branchId: location.branchId }])),
    statuses: new Map(
      statuses.flatMap((status) => [
        [status.name.trim().toLowerCase(), status.id] as const,
        [status.nameTh.trim().toLowerCase(), status.id] as const,
      ])
    ),
    conditions: new Map(
      conditions.flatMap((condition) => [
        [condition.name.trim().toLowerCase(), condition.id] as const,
        [condition.nameTh.trim().toLowerCase(), condition.id] as const,
      ])
    ),
    brands: new Map(brands.map((brand) => [brand.name.trim().toLowerCase(), brand.id])),
    models: new Map(
      models.map((model) => [
        model.name.trim().toLowerCase(),
        { id: model.id, brandId: model.brandId, categoryId: model.categoryId },
      ])
    ),
    employees: new Map(employees.map((employee) => [employee.code.trim().toLowerCase(), employee.id])),
    suppliers: new Map(suppliers.map((supplier) => [supplier.code.trim().toLowerCase(), supplier.id])),
  }
}

export async function parseAssetImportWorkbook(buffer: ArrayBuffer, references: AssetImportReferences) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.getWorksheet("Asset Import") ?? workbook.worksheets[0]
  if (!worksheet) {
    throw new Error("ไม่พบ worksheet สำหรับนำเข้าข้อมูล")
  }

  const seenAssetTags = new Set<string>()
  const seenSerialNumbers = new Set<string>()
  const rows: AssetImportPreviewRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const values = readImportRow(row)
    if (isEmptyRow(values)) return

    const errors: string[] = []
    const resolved: Record<string, string | null> = {
      categoryId: null,
      companyId: null,
      branchId: null,
      currentLocationId: null,
      statusId: null,
      conditionId: null,
      brandId: null,
      modelId: null,
      departmentId: null,
      custodianId: null,
      homeLocationId: null,
      supplierId: null,
    }

    requireValue(values.name, "Asset Name", errors)
    requireValue(values.categoryCode, "Category Code", errors)
    requireValue(values.companyCode, "Company Code", errors)
    requireValue(values.branchCode, "Branch Code", errors)
    requireValue(values.currentLocationCode, "Current Location Code", errors)
    requireValue(values.status, "Status", errors)
    requireValue(values.condition, "Condition", errors)

    resolveMap(values.categoryCode, references.categories, "Category Code", errors, (id) => {
      resolved.categoryId = id
    })
    resolveMap(values.companyCode, references.companies, "Company Code", errors, (id) => {
      resolved.companyId = id
    })
    const branch = resolved.companyId
      ? resolveObjectMap(scopedKey(resolved.companyId, values.branchCode), references.branches, "Branch Code + Company Code", errors)
      : null
    if (branch) resolved.branchId = branch.id
    const currentLocation = resolveObjectMap(values.currentLocationCode, references.locations, "Current Location Code", errors)
    if (currentLocation) resolved.currentLocationId = currentLocation.id
    resolveMap(values.status, references.statuses, "Status", errors, (id) => {
      resolved.statusId = id
    })
    resolveMap(values.condition, references.conditions, "Condition", errors, (id) => {
      resolved.conditionId = id
    })

    if (values.brand) {
      resolveMap(values.brand, references.brands, "Brand", errors, (id) => {
        resolved.brandId = id
      })
    }
    const model = values.model ? resolveObjectMap(values.model, references.models, "Model", errors) : null
    if (model) resolved.modelId = model.id
    const department = values.departmentCode
      ? resolveObjectMap(values.departmentCode, references.departments, "Department Code", errors)
      : null
    if (department) resolved.departmentId = department.id
    if (values.custodianCode) {
      resolveMap(values.custodianCode, references.employees, "Custodian Code", errors, (id) => {
        resolved.custodianId = id
      })
    }
    const homeLocation = values.homeLocationCode
      ? resolveObjectMap(values.homeLocationCode, references.locations, "Home Location Code", errors)
      : null
    if (homeLocation) resolved.homeLocationId = homeLocation.id
    if (values.supplierCode) {
      resolveMap(values.supplierCode, references.suppliers, "Supplier Code", errors, (id) => {
        resolved.supplierId = id
      })
    }

    if (branch && resolved.companyId && branch.companyId !== resolved.companyId) {
      errors.push("Branch Code ไม่อยู่ภายใต้ Company Code ที่ระบุ")
    }
    if (currentLocation && branch && currentLocation.branchId !== branch.id) {
      errors.push("Current Location Code ไม่อยู่ภายใต้ Branch Code ที่ระบุ")
    }
    if (homeLocation && branch && homeLocation.branchId !== branch.id) {
      errors.push("Home Location Code ไม่อยู่ภายใต้ Branch Code ที่ระบุ")
    }
    if (department && resolved.companyId && department.companyId && department.companyId !== resolved.companyId) {
      errors.push("Department Code ไม่อยู่ภายใต้ Company Code ที่ระบุ")
    }
    if (model && resolved.brandId && model.brandId && model.brandId !== resolved.brandId) {
      errors.push("Model ไม่อยู่ภายใต้ Brand ที่ระบุ")
    }
    if (model && resolved.categoryId && model.categoryId && model.categoryId !== resolved.categoryId) {
      errors.push("Model ไม่อยู่ภายใต้ Category Code ที่ระบุ")
    }

    validateDuplicate(values.assetTag, references.assetTags, seenAssetTags, "Asset Tag", errors)
    validateDuplicate(values.serialNumber, references.serialNumbers, seenSerialNumbers, "Serial Number", errors)
    validateDate(values.purchaseDate, "Purchase Date", errors)
    validateDate(values.warrantyStartDate, "Warranty Start", errors)
    validateDate(values.warrantyEndDate, "Warranty End", errors)
    validateMoney(values.purchasePrice, "Purchase Price", errors)

    rows.push({
      rowNumber,
      status: errors.length === 0 ? "ready" : "error",
      errors,
      values,
      resolved,
    })
  })

  const readyRows = rows.filter((row) => row.status === "ready").length
  return {
    summary: {
      totalRows: rows.length,
      readyRows,
      errorRows: rows.length - readyRows,
    },
    rows,
  } satisfies AssetImportPreviewResult
}

function readImportRow(row: ExcelJS.Row) {
  return Object.fromEntries(
    assetImportColumns.map((column, index) => [column.key, normalizeCell(row.getCell(index + 1).value)])
  ) as Record<string, string | number | null>
}

function normalizeCell(value: ExcelJS.CellValue) {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "object") {
    if ("text" in value && value.text) return String(value.text).trim()
    if ("result" in value && value.result != null) return normalizeCell(value.result)
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

function isEmptyRow(values: Record<string, string | number | null>) {
  return Object.values(values).every((value) => value == null || String(value).trim() === "")
}

function key(value: string | number | null | undefined) {
  return value == null ? "" : String(value).trim().toLowerCase()
}

function scopedKey(scope: string | number | null | undefined, value: string | number | null | undefined) {
  return `${key(scope)}:${key(value)}`
}

function requireValue(value: string | number | null, label: string, errors: string[]) {
  if (!key(value)) errors.push(`${label} จำเป็นต้องระบุ`)
}

function resolveMap(
  value: string | number | null,
  map: Map<string, string>,
  label: string,
  errors: string[],
  onResolve: (id: string) => void
) {
  const lookup = key(value)
  if (!lookup) return
  const id = map.get(lookup)
  if (!id) errors.push(`${label} ไม่พบในข้อมูลอ้างอิง`)
  else onResolve(id)
}

function resolveObjectMap<T>(value: string | number | null, map: Map<string, T>, label: string, errors: string[]) {
  const lookup = key(value)
  if (!lookup) return null
  const record = map.get(lookup)
  if (!record) {
    errors.push(`${label} ไม่พบในข้อมูลอ้างอิง`)
    return null
  }
  return record
}

function validateDuplicate(
  value: string | number | null,
  existingValues: Set<string>,
  seenValues: Set<string>,
  label: string,
  errors: string[]
) {
  const lookup = key(value)
  if (!lookup) return
  if (existingValues.has(lookup)) errors.push(`${label} ซ้ำกับข้อมูลที่มีอยู่แล้ว`)
  if (seenValues.has(lookup)) errors.push(`${label} ซ้ำภายในไฟล์นำเข้า`)
  seenValues.add(lookup)
}

function validateDate(value: string | number | null, label: string, errors: string[]) {
  const lookup = key(value)
  if (!lookup) return
  if (typeof value === "number") return
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) errors.push(`${label} ต้องเป็นวันที่ที่ถูกต้อง`)
}

function validateMoney(value: string | number | null, label: string, errors: string[]) {
  const lookup = key(value)
  if (!lookup) return
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 0) errors.push(`${label} ต้องเป็นตัวเลข 0 ขึ้นไป`)
}

export function nullableText(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value).trim()
  return normalized.length === 0 ? null : normalized
}

export function parseImportDate(value: string | number | null | undefined) {
  const normalized = nullableText(value)
  if (!normalized) return null
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000))
  }
  return new Date(normalized)
}

export function parseImportMoney(value: string | number | null | undefined) {
  const normalized = nullableText(value)
  return normalized == null ? null : Number(normalized)
}
