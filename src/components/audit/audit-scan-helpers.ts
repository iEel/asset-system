import type { AuditOfflinePhoto } from "../../lib/audit-offline-queue.ts"
import type { AuditScanItemRow } from "../../lib/audit-scan-session.ts"
import type {
  AuditInstalledInParent,
  AuditLookupAsset,
  AuditLookupComponent,
  AuditLookupInstalledInParent,
  AuditLookupRecordedFind,
  AuditScanComponent,
  QueuedAuditPhoto,
} from "./audit-scan-types.ts"

export function normalizeAuditLookupComponents(components: AuditLookupComponent[]): AuditScanComponent[] {
  return components.map((component) => ({
    assetId: component.assetId,
    assetTag: component.assetTag,
    name: component.name,
    componentRole: component.componentRole,
    slotNo: component.slotNo,
    auditItemId: component.auditItem?.id ?? null,
    auditStatus: component.auditItem?.auditStatus ?? "out_of_round",
    auditResult: component.auditItem?.auditResult ?? null,
  }))
}

export function normalizeAuditLookupInstalledIn(installedIn: AuditLookupInstalledInParent[]): AuditInstalledInParent[] {
  return installedIn.map((parent) => ({
    parentAssetId: parent.parentAssetId,
    assetTag: parent.assetTag,
    name: parent.name,
    componentRole: parent.componentRole,
    slotNo: parent.slotNo,
  }))
}

/** A recorded out-of-scope find as a walk row, from the lookup's answer alone: the out-of-scope form needs its snapshot
 * (expected*) and what was recorded (actual*), which the lookup carries, so a find not yet pulled into the walk's state
 * (another phone's save, a sync still running) opens without one (final review minor 2). */
export function auditScanRowFromRecordedFind(item: AuditLookupRecordedFind, asset: AuditLookupAsset): AuditScanItemRow {
  return {
    itemId: item.id,
    assetId: asset.id,
    assetTag: asset.assetTag,
    name: asset.subtitle,
    serialNumber: asset.serialNumber,
    fixedAssetCode: null,
    categoryId: "",
    ownershipType: asset.ownershipType ?? null,
    expectedLocationId: item.expectedLocationId,
    expectedCustodianId: item.expectedCustodianId,
    expectedDepartmentId: item.expectedDepartmentId,
    expectedConditionId: item.expectedConditionId,
    actualLocationId: item.actualLocationId,
    actualCustodianId: item.actualCustodianId,
    actualDepartmentId: item.actualDepartmentId,
    actualConditionId: item.actualConditionId,
    auditStatus: item.auditStatus,
    auditResult: item.auditResult,
    lastScanAt: null,
    scannedByName: null,
    currentLocationId: asset.currentLocationId,
    currentCustodianId: asset.custodianId,
    currentDepartmentId: asset.departmentId,
    componentCount: asset.components.length,
  }
}

export function isAuditComponentChecked(component: AuditScanComponent) {
  return Boolean(
    component.auditItemId &&
      component.auditStatus !== "pending" &&
      component.auditStatus !== "out_of_round"
  )
}

/** Still to check in this round and checkable from the parent: what "พบครบทุกชิ้น" and the save check count (D3, D4). */
export function isAuditComponentPending(component: AuditScanComponent) {
  return Boolean(component.auditItemId && component.auditStatus === "pending")
}

export function toAuditOfflinePhoto(photo: QueuedAuditPhoto): AuditOfflinePhoto {
  return {
    id: photo.id,
    label: photo.label,
    fileName: photo.file.name,
    fileType: photo.file.type || "application/octet-stream",
    fileSize: photo.file.size,
    blob: photo.file,
  }
}

/** The phone keyboard opens after a field takes focus and shrinks the screen, but a nested scroller keeps its scroll
 * position, so the focused field can end up under the check sheet's pinned bar. Scroll it back into the scrolling
 * body only as far as it must; a control outside the body (the bar's own buttons) is left alone. */
export function revealFocusInScrollArea(area: Element | null, focused: Element | null) {
  if (!area || !focused || focused === area || !area.contains(focused)) return
  focused.scrollIntoView({ block: "nearest" })
}
