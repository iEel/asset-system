import ExcelJS from "exceljs"

export const assetExportColumns = [
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "name", width: 32 },
  { header: "Serial Number", key: "serialNumber", width: 22 },
  { header: "Ownership Type", key: "ownershipType", width: 20 },
  { header: "License Total Seats", key: "licenseTotalSeats", width: 18 },
  { header: "License Used Seats", key: "licenseUsedSeats", width: 18 },
  { header: "License Assigned Asset", key: "licenseAssignedAsset", width: 28 },
  { header: "Category", key: "category", width: 28 },
  { header: "Company", key: "company", width: 28 },
  { header: "Branch", key: "branch", width: 24 },
  { header: "Department", key: "department", width: 28 },
  { header: "Custodian", key: "custodian", width: 28 },
  { header: "Custodian Company", key: "custodianCompany", width: 28 },
  { header: "Custodian Branch", key: "custodianBranch", width: 28 },
  { header: "Home Location", key: "homeLocation", width: 30 },
  { header: "Home Location Branch", key: "homeLocationBranch", width: 28 },
  { header: "Current Location", key: "currentLocation", width: 30 },
  { header: "Current Location Branch", key: "currentLocationBranch", width: 28 },
  { header: "Cross Scope Flags", key: "crossScopeFlags", width: 34 },
  { header: "Status", key: "status", width: 18 },
  { header: "Condition", key: "condition", width: 18 },
  { header: "Purchase Date", key: "purchaseDate", width: 16 },
  { header: "Purchase Price", key: "purchasePrice", width: 16 },
  { header: "Supplier", key: "supplier", width: 28 },
  { header: "Fixed Asset Code", key: "fixedAssetCode", width: 22 },
  { header: "PO Number", key: "poNumber", width: 18 },
  { header: "Invoice Number", key: "invoiceNumber", width: 20 },
  { header: "Remark", key: "remark", width: 36 },
]

export const assetImportColumns = [
  { header: "Asset Tag", key: "assetTag", width: 22, note: "Optional. Leave blank to auto-generate." },
  { header: "Asset Name", key: "name", width: 32, note: "Required." },
  { header: "Category Code", key: "categoryCode", width: 18, note: "Required. Use code from Categories sheet." },
  { header: "Company Code", key: "companyCode", width: 18, note: "Required. Use code from Companies sheet." },
  { header: "Branch Code", key: "branchCode", width: 18, note: "Required. Branch Code is resolved together with Company Code." },
  { header: "Current Location Code", key: "currentLocationCode", width: 24, note: "Required. Use code from Locations sheet." },
  { header: "Status", key: "status", width: 18, note: "Required. Use Thai status name from Statuses sheet." },
  { header: "Condition", key: "condition", width: 18, note: "Required. Use Thai condition name from Conditions sheet." },
  { header: "Serial Number", key: "serialNumber", width: 22, note: "Optional. Must be unique when provided." },
  { header: "Ownership Type", key: "ownershipType", width: 20, note: "Optional. personal, shared, stock, component, or software_license. Defaults to personal." },
  { header: "License Total Seats", key: "licenseTotalSeats", width: 18, note: "Optional. Use for software_license only. Number 0 or more." },
  { header: "License Used Seats", key: "licenseUsedSeats", width: 18, note: "Optional. Use for software_license only. Must not exceed License Total Seats." },
  { header: "License Assigned Asset Tag", key: "licenseAssignedAssetTag", width: 28, note: "Optional. Existing Asset Tag for device using this license." },
  { header: "Brand", key: "brand", width: 20, note: "Optional. Use brand name from Brands sheet." },
  { header: "Model", key: "model", width: 20, note: "Optional. Use model name from Models sheet." },
  { header: "Department Code", key: "departmentCode", width: 20, note: "Optional. Use code from Departments sheet." },
  { header: "Custodian Code", key: "custodianCode", width: 20, note: "Optional. Use code from Employees sheet." },
  { header: "Home Location Code", key: "homeLocationCode", width: 22, note: "Optional. Use code from Locations sheet." },
  { header: "Purchase Date", key: "purchaseDate", width: 16, note: "Optional. YYYY-MM-DD." },
  { header: "Purchase Price", key: "purchasePrice", width: 16, note: "Optional. Number." },
  { header: "Supplier Code", key: "supplierCode", width: 18, note: "Optional. Use code from Suppliers sheet." },
  { header: "Warranty Start", key: "warrantyStartDate", width: 16, note: "Optional. YYYY-MM-DD." },
  { header: "Warranty End", key: "warrantyEndDate", width: 16, note: "Optional. YYYY-MM-DD." },
  { header: "Fixed Asset Code", key: "fixedAssetCode", width: 22, note: "Optional." },
  { header: "PO Number", key: "poNumber", width: 18, note: "Optional." },
  { header: "Invoice Number", key: "invoiceNumber", width: 20, note: "Optional." },
  { header: "Remark", key: "remark", width: 36, note: "Optional." },
]

export function createWorkbook() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Asset Management System"
  workbook.created = new Date()
  workbook.modified = new Date()
  return workbook
}

export function styleWorksheetHeader(worksheet: ExcelJS.Worksheet) {
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  }
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }
  worksheet.getRow(1).height = 22
  worksheet.views = [{ state: "frozen", ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  }
}

export function toExcelDate(date?: Date | string | null) {
  if (!date) return ""
  return new Date(date).toISOString().slice(0, 10)
}

export function workbookResponse(buffer: ExcelJS.Buffer, filename: string) {
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
