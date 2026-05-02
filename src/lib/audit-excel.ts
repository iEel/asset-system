import type ExcelJS from "exceljs"
import { createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"

export const auditResultColumns = [
  { header: "Audit No.", key: "auditNo", width: 18 },
  { header: "Audit Name", key: "auditName", width: 32 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Expected Location", key: "expectedLocation", width: 30 },
  { header: "Expected Custodian", key: "expectedCustodian", width: 30 },
  { header: "Expected Department", key: "expectedDepartment", width: 30 },
  { header: "Expected Condition", key: "expectedCondition", width: 22 },
  { header: "Actual Location", key: "actualLocation", width: 30 },
  { header: "Actual Custodian", key: "actualCustodian", width: 30 },
  { header: "Actual Department", key: "actualDepartment", width: 30 },
  { header: "Actual Condition", key: "actualCondition", width: 22 },
  { header: "Audit Status", key: "auditStatus", width: 18 },
  { header: "Audit Result", key: "auditResult", width: 22 },
  { header: "Reconcile Status", key: "reconcileStatus", width: 22 },
  { header: "Scan Count", key: "scanCount", width: 14 },
  { header: "Scanned At", key: "scannedAt", width: 20 },
  { header: "Last Scan At", key: "lastScanAt", width: 20 },
  { header: "Remark", key: "remark", width: 40 },
]

export const auditFindingColumns = [
  { header: "Reported At", key: "reportedAt", width: 20 },
  { header: "Audit No.", key: "auditNo", width: 18 },
  { header: "Audit Name", key: "auditName", width: 32 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Finding Type", key: "findingType", width: 24 },
  { header: "Expected Value", key: "expectedValue", width: 36 },
  { header: "Actual Value", key: "actualValue", width: 36 },
  { header: "Review Status", key: "reviewStatus", width: 18 },
  { header: "Reviewed At", key: "reviewedAt", width: 20 },
  { header: "Action Taken", key: "actionTaken", width: 26 },
  { header: "Remark", key: "remark", width: 40 },
  { header: "Review Remark", key: "reviewRemark", width: 40 },
]

export function createAuditWorkbook() {
  return createWorkbook()
}

export function finalizeAuditWorksheet(worksheet: ExcelJS.Worksheet) {
  styleWorksheetHeader(worksheet)
  for (const key of ["scannedAt", "lastScanAt", "reportedAt", "reviewedAt"]) {
    const column = worksheet.getColumn(key)
    if (column) column.numFmt = "yyyy-mm-dd hh:mm"
  }
}

export { toExcelDate, workbookResponse }
