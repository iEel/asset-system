// The import rows' rules (group 4 plan 5, P5-R4 and P5-R5). Pure: the preview loads the references and reads the
// workbook, this file only judges the values, so node --test can run it. Each problem is a code, the field, the value
// in the file and, for a clash, the asset or the earlier row that already holds the value. The page builds the words
// from messages (asset.importField + asset.importError); the server sends no sentence.
import { assetImportColumns } from "./asset-excel.ts"
import type { AssetImportCellValue } from "./asset-import-mapping.ts"
import { assetOwnershipTypes, defaultAssetOwnershipType } from "./asset-ownership.ts"

export const ASSET_IMPORT_MAX_ROWS = 1000

export const assetImportIssueCodes = [
  "required",
  "notFound",
  "notUnder",
  "duplicateExisting",
  "duplicateInFile",
  "invalidDate",
  "buddhistYear",
  "invalidNumber",
  "invalidInteger",
  "seatsOverTotal",
  "licenceOnlyForLicence",
  "invalidOwnership",
  "statusNotAllowed",
  "conditionNotAllowed",
  "tooLong",
  // An Excel error value (#N/A from a failed VLOOKUP, #REF! ...), never imported as text (plan 5 final review).
  "cellError",
] as const

export type AssetImportIssueCode = (typeof assetImportIssueCodes)[number]

export type AssetImportConflict = { assetId: string; assetTag: string; inactive: boolean } | { row: number }

export type AssetImportIssue = {
  code: AssetImportIssueCode
  field: string
  value: string | number | null
  parent?: string
  conflict?: AssetImportConflict
  max?: number
}

export type AssetImportValidatedRow = {
  rowNumber: number
  status: "ready" | "error"
  issues: AssetImportIssue[]
  values: Record<string, string | number | null>
  resolved: Record<string, string | null>
}

// Keys are trimmed and lower-cased (assetImportLookupKey); branches by assetImportScopedKey(companyId, code); models by
// assetImportModelKey(brandId, name). Statuses and conditions hold every active one by name and Thai name; the
// importable sets hold the ids an import may use.
export type AssetImportReferences = {
  assetsByTag: Map<string, { id: string; assetTag: string; active: boolean }>
  assetsBySerial: Map<string, { id: string; assetTag: string }>
  categories: Map<string, string>
  companies: Map<string, string>
  branches: Map<string, { id: string; companyId: string }>
  departments: Map<string, { id: string; companyId: string | null }>
  locations: Map<string, { id: string; branchId: string }>
  statuses: Map<string, string>
  importableStatuses: Set<string>
  conditions: Map<string, string>
  importableConditions: Set<string>
  brands: Map<string, string>
  models: Map<string, { id: string; brandId: string; categoryId: string | null }>
  employees: Map<string, { id: string; departmentId: string | null }>
  suppliers: Map<string, string>
}

// The column lengths of the assets table (prisma/schema.prisma Asset), checked before confirm writes anything.
export const assetImportMaxLengths: Readonly<Record<string, number>> = {
  name: 200,
  assetTag: 50,
  serialNumber: 100,
  fixedAssetCode: 50,
  poNumber: 50,
  invoiceNumber: 50,
}

const requiredFields = assetImportColumns.filter((column) => "required" in column && column.required).map((column) => column.key)

export function assetImportLookupKey(value: string | number | null | undefined) {
  return value == null ? "" : String(value).trim().toLowerCase()
}

export function assetImportScopedKey(scope: string | number | null | undefined, value: string | number | null | undefined) {
  return `${assetImportLookupKey(scope)}:${assetImportLookupKey(value)}`
}

export function assetImportModelKey(brandId: string, name: string | number | null | undefined) {
  return `${brandId}|${assetImportLookupKey(name)}`
}

// The error values Excel writes into a cell; ExcelJS gives them as { error } (asset-import-mapping.ts reads it as text).
const excelErrorPattern = /^#(?:N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NULL!|NUM!|SPILL!|CALC!|GETTING_DATA)$/

export function isExcelErrorValue(value: AssetImportCellValue | undefined) {
  return typeof value === "string" && excelErrorPattern.test(value.trim())
}

export function validateAssetImportRows(
  rows: Array<{ rowNumber: number; values: Record<string, AssetImportCellValue> }>,
  references: AssetImportReferences
): AssetImportValidatedRow[] {
  const modelsByName = new Map<string, Array<{ id: string; brandId: string; categoryId: string | null }>>()
  for (const [modelKey, model] of references.models) {
    const name = modelKey.slice(modelKey.indexOf("|") + 1)
    modelsByName.set(name, [...(modelsByName.get(name) ?? []), model])
  }
  const firstRowByTag = new Map<string, number>()
  const firstRowBySerial = new Map<string, number>()

  return rows.map(({ rowNumber, values: fileValues }) => {
    const issues: AssetImportIssue[] = []
    const add = (code: AssetImportIssueCode, field: string, extra: Partial<AssetImportIssue> = {}) => {
      issues.push({ code, field, value: cellValue(fileValues[field]), ...extra })
    }
    // An error value is its own problem; every other check reads that cell as blank, so it is not also "required".
    const errorFields = new Set(Object.keys(fileValues).filter((field) => isExcelErrorValue(fileValues[field])))
    for (const field of errorFields) add("cellError", field)
    const values: Record<string, AssetImportCellValue> =
      errorFields.size === 0 ? fileValues : Object.fromEntries(Object.entries(fileValues).map(([field, value]) => [field, errorFields.has(field) ? null : value]))
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
      custodianDepartmentId: null,
      homeLocationId: null,
      supplierId: null,
      licenseAssignedAssetId: null,
      // The checked ownership type, lower-case; confirm writes this one (null when the file's value is not supported).
      ownershipType: null,
    }
    const lookup = (field: string) => assetImportLookupKey(values[field])

    for (const field of requiredFields) {
      if (!lookup(field) && !errorFields.has(field)) add("required", field)
    }

    resolved.categoryId = resolveCode(lookup("categoryCode"), references.categories, () => add("notFound", "categoryCode"))
    resolved.companyId = resolveCode(lookup("companyCode"), references.companies, () => add("notFound", "companyCode"))
    const branch =
      resolved.companyId && lookup("branchCode")
        ? (references.branches.get(assetImportScopedKey(resolved.companyId, values.branchCode)) ?? null)
        : null
    if (resolved.companyId && lookup("branchCode") && !branch) add("notFound", "branchCode")
    resolved.branchId = branch?.id ?? null
    const currentLocation = resolveCode(lookup("currentLocationCode"), references.locations, () => add("notFound", "currentLocationCode"))
    resolved.currentLocationId = currentLocation?.id ?? null

    resolved.statusId = resolveAllowed(lookup("status"), references.statuses, references.importableStatuses, (code) => add(code === "notAllowed" ? "statusNotAllowed" : "notFound", "status"))
    resolved.conditionId = resolveAllowed(lookup("condition"), references.conditions, references.importableConditions, (code) =>
      add(code === "notAllowed" ? "conditionNotAllowed" : "notFound", "condition")
    )

    resolved.brandId = resolveCode(lookup("brand"), references.brands, () => add("notFound", "brand"))
    const modelName = lookup("model")
    let model: { id: string; brandId: string; categoryId: string | null } | null = null
    if (modelName) {
      const sameName = modelsByName.get(modelName) ?? []
      if (resolved.brandId) {
        model = references.models.get(assetImportModelKey(resolved.brandId, modelName)) ?? null
        if (!model) add(sameName.length > 0 ? "notUnder" : "notFound", "model", sameName.length > 0 ? { parent: "brand" } : {})
      } else if (!lookup("brand")) {
        // No brand: a name held by one brand still resolves (as before); a name two brands share needs the brand.
        if (sameName.length === 1) model = sameName[0]
        else if (sameName.length === 0) add("notFound", "model")
        else add("required", "brand")
      } else if (sameName.length === 0) {
        add("notFound", "model")
      }
    }
    resolved.modelId = model?.id ?? null

    const department = resolveCode(lookup("departmentCode"), references.departments, () => add("notFound", "departmentCode"))
    resolved.departmentId = department?.id ?? null
    const custodian = resolveCode(lookup("custodianCode"), references.employees, () => add("notFound", "custodianCode"))
    resolved.custodianId = custodian?.id ?? null
    resolved.custodianDepartmentId = custodian?.departmentId ?? null
    const homeLocation = resolveCode(lookup("homeLocationCode"), references.locations, () => add("notFound", "homeLocationCode"))
    resolved.homeLocationId = homeLocation?.id ?? null
    resolved.supplierId = resolveCode(lookup("supplierCode"), references.suppliers, () => add("notFound", "supplierCode"))

    const ownershipLookup = lookup("ownershipType") || defaultAssetOwnershipType
    const ownershipValid = (assetOwnershipTypes as readonly string[]).includes(ownershipLookup)
    if (!ownershipValid) add("invalidOwnership", "ownershipType")
    const ownershipType = ownershipValid ? ownershipLookup : defaultAssetOwnershipType
    resolved.ownershipType = ownershipValid ? ownershipLookup : null

    const assignedTag = lookup("licenseAssignedAssetTag")
    if (assignedTag) {
      const assigned = references.assetsByTag.get(assignedTag)
      if (assigned?.active) resolved.licenseAssignedAssetId = assigned.id
      else add("notFound", "licenseAssignedAssetTag")
    }

    if (currentLocation && branch && currentLocation.branchId !== branch.id) add("notUnder", "currentLocationCode", { parent: "branchCode" })
    if (homeLocation && branch && homeLocation.branchId !== branch.id) add("notUnder", "homeLocationCode", { parent: "branchCode" })
    if (department && resolved.companyId && department.companyId && department.companyId !== resolved.companyId) {
      add("notUnder", "departmentCode", { parent: "companyCode" })
    }
    if (model && resolved.categoryId && model.categoryId && model.categoryId !== resolved.categoryId) {
      add("notUnder", "model", { parent: "categoryCode" })
    }

    const tag = lookup("assetTag")
    if (tag) {
      const existing = references.assetsByTag.get(tag)
      if (existing) add("duplicateExisting", "assetTag", { conflict: { assetId: existing.id, assetTag: existing.assetTag, inactive: !existing.active } })
      const firstRow = firstRowByTag.get(tag)
      if (firstRow != null) add("duplicateInFile", "assetTag", { conflict: { row: firstRow } })
      else firstRowByTag.set(tag, rowNumber)
    }
    const serial = lookup("serialNumber")
    if (serial) {
      const existing = references.assetsBySerial.get(serial)
      if (existing) add("duplicateExisting", "serialNumber", { conflict: { assetId: existing.id, assetTag: existing.assetTag, inactive: false } })
      const firstRow = firstRowBySerial.get(serial)
      if (firstRow != null) add("duplicateInFile", "serialNumber", { conflict: { row: firstRow } })
      else firstRowBySerial.set(serial, rowNumber)
    }

    for (const [field, max] of Object.entries(assetImportMaxLengths)) {
      const text = nullableText(values[field])
      if (text != null && text.length > max) add("tooLong", field, { max })
    }

    for (const field of ["purchaseDate", "warrantyStartDate", "warrantyEndDate"]) {
      const code = dateIssue(values[field])
      if (code) add(code, field)
    }
    const price = nullableText(values.purchasePrice)
    if (price != null) {
      const parsed = Number(price)
      // purchasePrice is Decimal(18,2): 16 digits before the point.
      if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1e16) add("invalidNumber", "purchasePrice")
    }
    const totalSeats = parseOptionalInteger(values.licenseTotalSeats)
    const usedSeats = parseOptionalInteger(values.licenseUsedSeats)
    for (const [field, parsed] of [["licenseTotalSeats", totalSeats], ["licenseUsedSeats", usedSeats]] as const) {
      // The seat columns are Int (32-bit).
      if (parsed != null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 2147483647)) add("invalidInteger", field)
    }
    if (totalSeats != null && usedSeats != null && usedSeats > totalSeats) add("seatsOverTotal", "licenseUsedSeats")
    if (ownershipType !== "software_license") {
      for (const field of ["licenseTotalSeats", "licenseUsedSeats", "licenseAssignedAssetTag"]) {
        if (lookup(field)) add("licenceOnlyForLicence", field)
      }
    }

    return {
      rowNumber,
      status: issues.length === 0 ? "ready" : "error",
      issues,
      values: fileValues,
      resolved,
    }
  })
}

function cellValue(value: AssetImportCellValue | undefined): string | number | null {
  if (value == null) return null
  if (typeof value === "string" && value.trim() === "") return null
  return value
}

function resolveCode<T>(lookup: string, map: Map<string, T>, onMissing: () => void): T | null {
  if (!lookup) return null
  const found = map.get(lookup)
  if (found === undefined) {
    onMissing()
    return null
  }
  return found
}

function resolveAllowed(
  lookup: string,
  map: Map<string, string>,
  allowed: Set<string>,
  onIssue: (code: "notFound" | "notAllowed") => void
): string | null {
  if (!lookup) return null
  const id = map.get(lookup)
  if (!id) {
    onIssue("notFound")
    return null
  }
  if (!allowed.has(id)) {
    onIssue("notAllowed")
    return null
  }
  return id
}

// A year from 2400 to 2700 is a Buddhist year typed by mistake; any other year outside 1950 to 2100 is not a date the
// register means (P5-R5).
function dateIssue(value: AssetImportCellValue | undefined): "invalidDate" | "buddhistYear" | null {
  if (nullableText(value) == null) return null
  const parsed = parseImportDate(value)
  if (!parsed || Number.isNaN(parsed.getTime())) return "invalidDate"
  const year = parsed.getUTCFullYear()
  if (year >= 2400 && year <= 2700) return "buddhistYear"
  if (year < 1950 || year > 2100) return "invalidDate"
  return null
}

export function parseOptionalInteger(value: string | number | null | undefined) {
  const normalized = nullableText(value)
  if (normalized == null) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function nullableText(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value).trim()
  return normalized.length === 0 ? null : normalized
}

// An Excel serial number, or text in one of two shapes only: yyyy-m-d (as a date cell reads, asset-import-mapping.ts)
// and d/m/yyyy, day first as Thai users write it. The day must exist in its month (2024-02-30 is refused), and any
// other text is not a date (plan 5 final review: the loose Date parser read 05/01/2024 as 1 May and "N/A 5" as 2001).
export function parseImportDate(value: string | number | null | undefined) {
  const normalized = nullableText(value)
  if (!normalized) return null
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000))
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized)
  const thai = iso ? null : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized)
  const parts = iso ? { year: iso[1], month: iso[2], day: iso[3] } : thai ? { year: thai[3], month: thai[2], day: thai[1] } : null
  if (!parts) return null
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date
}

export function parseImportMoney(value: string | number | null | undefined) {
  const normalized = nullableText(value)
  return normalized == null ? null : Number(normalized)
}
