import type { AuditOfflinePhoto } from "../../lib/audit-offline-queue.ts"
import type {
  AuditInstalledInParent,
  AuditLookupComponent,
  AuditLookupInstalledInParent,
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
