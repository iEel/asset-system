import { normalizeAssetOwnershipType, requiresCustodian } from "../../lib/asset-ownership.ts"
import type { AuditOfflinePhoto } from "../../lib/audit-offline-queue.ts"
import type {
  AuditInstalledInParent,
  AuditLookupComponent,
  AuditLookupInstalledInParent,
  AuditLookupAsset,
  AuditScanComponent,
  AuditScanItem,
  Option,
  OptionLabelMaps,
  OutOfScopeAsset,
  PendingQueueContextRow,
  QueuedAuditPhoto,
} from "./audit-scan-types.ts"

export type AuditActualValues = {
  actualLocationId: string
  actualCustodianId: string
  actualDepartmentId: string
  actualConditionId: string
}
export type SystemDataLabels = {
  expectedLocation: string
  expectedCustodian: string
  expectedDepartment: string
  expectedCondition: string
  none: string
}
export type PendingQueueLabels = {
  location: string
  custodian: string
  department: string
  none: string
}

export function normalizeOutOfScopeAuditAsset(asset: AuditLookupAsset): OutOfScopeAsset {
  return {
    ...asset,
    components: normalizeAuditLookupComponents(asset.components),
    installedIn: normalizeAuditLookupInstalledIn(asset.installedIn),
  }
}

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

export function createInitialAuditScanValues(initialSelectedItem: AuditScanItem | undefined, initialMode: "scan" | "edit") {
  if (!initialSelectedItem) {
    return {
      assetId: "",
      actualLocationId: "",
      actualCustodianId: "",
      actualDepartmentId: "",
      actualConditionId: "",
      remark: "",
    }
  }

  const actualValues = initialMode === "edit" ? getEditableAuditValues(initialSelectedItem) : getExpectedAuditValues(initialSelectedItem)
  return {
    assetId: initialSelectedItem.assetId,
    ...actualValues,
    remark: "",
  }
}

export function getExpectedAuditValues(item: AuditScanItem) {
  return {
    actualLocationId: item.expectedLocationId ?? "",
    actualCustodianId: item.expectedCustodianId ?? "",
    actualDepartmentId: item.expectedDepartmentId ?? "",
    actualConditionId: item.expectedConditionId ?? "",
  }
}

export function getEditableAuditValues(item: AuditScanItem) {
  if (item.auditStatus === "pending" && !item.auditResult) return getExpectedAuditValues(item)
  return {
    actualLocationId: item.actualLocationId ?? item.expectedLocationId ?? "",
    actualCustodianId: item.actualCustodianId ?? "",
    actualDepartmentId: item.actualDepartmentId ?? "",
    actualConditionId: item.actualConditionId ?? "",
  }
}

export function getActualValues(
  values: AuditActualValues,
  selectedItem: AuditScanItem
) {
  return {
    actualLocationId: values.actualLocationId || selectedItem.expectedLocationId,
    actualCustodianId: values.actualCustodianId,
    actualDepartmentId: values.actualDepartmentId,
    actualConditionId: values.actualConditionId,
  }
}

export function getOutOfScopeActualValues(
  values: AuditActualValues,
  asset: OutOfScopeAsset
) {
  return {
    actualLocationId: values.actualLocationId || asset.currentLocationId || "",
    actualCustodianId: values.actualCustodianId,
    actualDepartmentId: values.actualDepartmentId,
    actualConditionId: values.actualConditionId,
  }
}

export function hasOutOfScopeActualMismatch(
  asset: OutOfScopeAsset,
  actualValues: ReturnType<typeof getOutOfScopeActualValues>
) {
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)
  const locationMismatch =
    ownershipType !== "software_license" && actualValues.actualLocationId !== asset.currentLocationId
  const custodianMismatch =
    requiresCustodian(asset.ownershipType) && (actualValues.actualCustodianId || null) !== asset.custodianId
  const departmentMismatch = (actualValues.actualDepartmentId || null) !== asset.departmentId
  const conditionMismatch = (actualValues.actualConditionId || null) !== asset.conditionId

  return locationMismatch || custodianMismatch || departmentMismatch || conditionMismatch
}

export function emptyToNull<T extends Record<string, string>>(values: T): { [K in keyof T]: string | null } {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value])
  ) as { [K in keyof T]: string | null }
}

export function buildAssetLookup(items: AuditScanItem[]) {
  const lookup = new Map<string, AuditScanItem>()
  for (const item of items) {
    lookup.set(item.assetId.toLowerCase(), item)
    lookup.set(item.assetTag.toLowerCase(), item)
    lookup.set(item.label.toLowerCase(), item)
  }
  return lookup
}

export function buildManualScanSuggestions(query: string, items: AuditScanItem[], maps: OptionLabelMaps) {
  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH")
  if (normalizedQuery.length < 2) return []

  return items
    .filter((item) => buildAssetPickerSearchText(item, maps).toLocaleLowerCase("th-TH").includes(normalizedQuery))
    .sort((a, b) => {
      const pendingScore = Number(a.auditStatus !== "pending") - Number(b.auditStatus !== "pending")
      if (pendingScore !== 0) return pendingScore
      return a.assetTag.localeCompare(b.assetTag, "th-TH")
    })
    .slice(0, 5)
}

export function buildOptionLabelMap(options: Option[]) {
  return new Map(options.map((option) => [option.id, option.label]))
}

export function buildSystemDataRows(
  item: AuditScanItem,
  maps: OptionLabelMaps,
  labels: SystemDataLabels
) {
  const rows: Array<{ label: string; value: string }> = []
  const ownershipType = normalizeAssetOwnershipType(item.ownershipType)

  if (ownershipType !== "software_license") {
    rows.push({
      label: labels.expectedLocation,
      value: getOptionLabel(maps.locations, item.expectedLocationId, labels.none),
    })
  }
  if (requiresCustodian(ownershipType)) {
    rows.push({
      label: labels.expectedCustodian,
      value: getOptionLabel(maps.employees, item.expectedCustodianId, labels.none),
    })
  }
  rows.push(
    {
      label: labels.expectedDepartment,
      value: getOptionLabel(maps.departments, item.expectedDepartmentId, labels.none),
    },
    {
      label: labels.expectedCondition,
      value: getOptionLabel(maps.conditions, item.expectedConditionId, labels.none),
    }
  )

  return rows
}

export function buildPendingQueueContext(
  item: AuditScanItem,
  maps: OptionLabelMaps,
  labels: PendingQueueLabels
) {
  const rows: PendingQueueContextRow[] = [
    {
      label: labels.location,
      value: getOptionLabel(maps.locations, item.expectedLocationId, labels.none),
    },
    {
      label: labels.department,
      value: getOptionLabel(maps.departments, item.expectedDepartmentId, labels.none),
    },
  ]

  if (requiresCustodian(item.ownershipType)) {
    rows.splice(1, 0, {
      label: labels.custodian,
      value: getOptionLabel(maps.employees, item.expectedCustodianId, labels.none),
    })
  }

  return rows
}

export function buildAssetPickerSearchText(item: AuditScanItem, maps: OptionLabelMaps) {
  return [
    item.assetTag,
    item.label,
    item.auditStatus,
    getOptionLabel(maps.locations, item.expectedLocationId, ""),
    getOptionLabel(maps.employees, item.expectedCustodianId, ""),
    getOptionLabel(maps.departments, item.expectedDepartmentId, ""),
  ].join(" ")
}

export function getOptionLabel(options: Map<string, string>, id: string | null, emptyLabel: string) {
  if (!id) return emptyLabel
  return options.get(id) ?? id
}

export function getReadableAuditScanValue(item: AuditScanItem) {
  const assetTag = item.assetTag.trim()
  return assetTag || item.label
}
