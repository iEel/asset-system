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
export type CameraDevice = { id: string; label: string }
export type QueuedAuditPhoto = { id: string; label: string; file: File; previewUrl: string | null }
export type AuditLookupAuditItem = {
  id: string
  assetId: string
  auditStatus: string
  auditResult: string | null
}
/** A recorded out-of-scope find, as the lookup answers it: the snapshot its first scan compared against (expected*)
 * and what was found (actual*). Saving the find again edits it, against that snapshot (group 2 plan 3, P3-R3). */
export type AuditLookupRecordedFind = AuditLookupAuditItem & {
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
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
export type AuditLookupAsset = {
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
  components: AuditLookupComponent[]
  installedIn: AuditLookupInstalledInParent[]
}
export type AuditLookupMatch = { assetId: string; assetTag: string; title: string; inRound: boolean }
export type AuditScanLookupResponse =
  | { status: "in_round"; asset: AuditLookupAsset; item?: { assetId: string } }
  | { status: "out_of_scope"; asset: AuditLookupAsset; item?: AuditLookupRecordedFind }
  | { status: "candidates"; candidates?: string[]; matches: AuditLookupMatch[] }
  | { status: "unknown_asset"; candidates?: string[] }
