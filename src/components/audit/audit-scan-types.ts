import type { AuditScanContext } from "../../lib/audit-scan-context.ts"

export const MAX_RECENT_AUDIT_SCANS = 8

export type Option = { id: string; label: string }
export type AuditScanComponent = {
  assetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
  auditItemId: string | null
  auditStatus: string
  auditResult: string | null
}
export type AuditInstalledInParent = {
  parentAssetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
}
export type AuditScanItem = {
  id: string
  assetId: string
  assetTag: string
  label: string
  auditStatus: string
  auditResult: string | null
  expectedDepartmentId: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedConditionId: string | null
  actualDepartmentId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualConditionId: string | null
  ownershipType?: string | null
  photoChecklist: string[]
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}
export type AuditScanOptions = {
  locations: Option[]
  departments: Option[]
  employees: Option[]
  conditions: Option[]
}
export type OptionLabelMaps = {
  locations: Map<string, string>
  employees: Map<string, string>
  departments: Map<string, string>
  conditions: Map<string, string>
}
export type PendingQueueContextRow = { label: string; value: string }
export type CameraDevice = { id: string; label: string }
export type CameraReadiness = "checking" | "ready" | "unavailable"
export type AuditMismatchPreview = { type: string; label: string; canApply: boolean }
export type ScanFeedback = {
  status: "found" | "mismatch" | "out_of_scope" | "unknown_asset" | "saved" | "found_later" | "offline_queued"
  title: string
  description: string
  assetId?: string
  assetTag?: string
}
export type LastAuditResult = { status: ScanFeedback["status"]; label: string }
export type AuditRecentScan = ScanFeedback & { id: string; source: "manual" | "qr"; at: number }
export type QueuedAuditPhoto = { id: string; label: string; file: File; previewUrl: string | null }
export type AuditLookupAuditItem = {
  id: string
  assetId: string
  auditStatus: string
  auditResult: string | null
}
export type AuditLookupComponent = {
  assetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
  auditItem: AuditLookupAuditItem | null
}
export type AuditLookupInstalledInParent = AuditInstalledInParent & { auditItem: AuditLookupAuditItem | null }
export type OutOfScopeAsset = {
  id: string
  assetTag: string
  title: string
  subtitle: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
  ownershipType?: string | null
  meta: { location: string; custodian: string | null }
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}
export type AuditLookupAsset = Omit<OutOfScopeAsset, "components" | "installedIn"> & {
  components: AuditLookupComponent[]
  installedIn: AuditLookupInstalledInParent[]
}
export type AuditScanLookupResponse =
  | { status: "in_round"; asset: AuditLookupAsset; item?: { assetId: string } }
  | { status: "out_of_scope"; asset: AuditLookupAsset }
  | { status: "unknown_asset"; candidates?: string[] }

export type StoredAuditContextSnapshot = { raw: string | null; value: AuditScanContext }
