import type { AuditScanItemRow } from "./audit-scan-session.ts"

export type AuditScanItemRecord = {
  id: string
  assetId: string
  auditStatus: string
  auditResult: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  lastScanAt: Date | null
  scannedBy: string | null
  asset: {
    assetTag: string
    name: string
    serialNumber: string | null
    fixedAssetCode: string | null
    categoryId: string
    ownershipType: string | null
    currentLocationId: string
    custodianId: string | null
    departmentId: string | null
  }
}

export function toAuditScanItemRow(
  record: AuditScanItemRecord,
  lookups: { userNames: ReadonlyMap<string, string>; componentCounts: ReadonlyMap<string, number> },
): AuditScanItemRow {
  return {
    itemId: record.id,
    assetId: record.assetId,
    assetTag: record.asset.assetTag,
    name: record.asset.name,
    serialNumber: record.asset.serialNumber,
    fixedAssetCode: record.asset.fixedAssetCode,
    categoryId: record.asset.categoryId,
    ownershipType: record.asset.ownershipType,
    expectedLocationId: record.expectedLocationId,
    expectedCustodianId: record.expectedCustodianId,
    expectedDepartmentId: record.expectedDepartmentId,
    expectedConditionId: record.expectedConditionId,
    actualLocationId: record.actualLocationId,
    actualCustodianId: record.actualCustodianId,
    actualDepartmentId: record.actualDepartmentId,
    actualConditionId: record.actualConditionId,
    auditStatus: record.auditStatus,
    auditResult: record.auditResult,
    lastScanAt: record.lastScanAt ? record.lastScanAt.toISOString() : null,
    scannedByName: record.scannedBy ? lookups.userNames.get(record.scannedBy) ?? null : null,
    currentLocationId: record.asset.currentLocationId,
    currentCustodianId: record.asset.custodianId,
    currentDepartmentId: record.asset.departmentId,
    componentCount: lookups.componentCounts.get(record.assetId) ?? 0,
  }
}
