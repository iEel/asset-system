import { isSyntheticRecordId, normalizeLogModule, parseLogJson } from "./system-log-presenter.ts"

export type SystemLogRowForLabels = {
  recordId: string | null
  action: string
  module: string
  oldValue: string | null
  newValue: string | null
}

export type SystemLogRecordLabelRefs = Map<string, Set<string>>

export function collectSystemLogRecordLabelRefs(logs: SystemLogRowForLabels[]): SystemLogRecordLabelRefs {
  const idsByModule = new Map<string, Set<string>>()
  for (const log of logs) {
    if (log.recordId && !isSyntheticRecordId(log.recordId)) {
      if (log.module === "audit") {
        addRecordId(idsByModule, "auditRound", log.recordId)
        addRecordId(idsByModule, "auditFinding", log.recordId)
        addRecordId(idsByModule, "auditItem", log.recordId)
      } else {
        addRecordId(idsByModule, normalizeLogModule(log.module, log), log.recordId)
      }
    }
    addReferencedValueIds(idsByModule, log)
  }
  return idsByModule
}

export function getSystemLogRecordLabelIds(idsByModule: SystemLogRecordLabelRefs, module: string) {
  return Array.from(idsByModule.get(module) ?? [])
}

function addRecordId(idsByModule: SystemLogRecordLabelRefs, module: string, id: string) {
  if (!idsByModule.has(module)) idsByModule.set(module, new Set())
  idsByModule.get(module)?.add(id)
}

function addReferencedValueIds(idsByModule: SystemLogRecordLabelRefs, log: SystemLogRowForLabels) {
  const values = [parseLogJson(log.oldValue), parseLogJson(log.newValue)].filter((value): value is Record<string, unknown> => Boolean(value))
  for (const value of values) {
    addStringReference(idsByModule, "location", value.currentLocationId)
    addStringReference(idsByModule, "location", value.locationId)
    addStringReference(idsByModule, "location", value.nextLocationId)
    addStringReference(idsByModule, "employee", value.custodianId)
    addStringReference(idsByModule, "employee", value.returnByEmployeeId)
    addStringReference(idsByModule, "employee", value.receiveByEmployeeId)
    addStringReference(idsByModule, "department", value.departmentId)
    addStringReference(idsByModule, "asset", value.assetId)
    addStringReference(idsByModule, "asset", value.parentAssetId)
    addStringReference(idsByModule, "company", value.companyId)
    addStringReference(idsByModule, "branch", value.branchId)
    addStringReference(idsByModule, "category", value.categoryId)
    addStringReference(idsByModule, "brand", value.brandId)
    addStringReference(idsByModule, "model", value.modelId)
    addStringReference(idsByModule, "supplier", value.supplierId)
    addStringReference(idsByModule, "location", value.homeLocationId)
    addStringReference(idsByModule, "status", value.statusId)
    addStringReference(idsByModule, "status", value.nextStatusId)
    addStringReference(idsByModule, "condition", value.conditionId)
    addStringReference(idsByModule, "condition", value.conditionBefore)
    addStringReference(idsByModule, "condition", value.conditionAfter)
    addStringReference(idsByModule, "role", value.roleId)
    addStringReference(idsByModule, "role", value.ldap_default_role)
  }
}

function addStringReference(idsByModule: SystemLogRecordLabelRefs, module: string, value: unknown) {
  if (typeof value === "string" && value.trim()) addRecordId(idsByModule, module, value)
}
