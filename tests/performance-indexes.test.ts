import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = () => readFileSync("prisma/schema.prisma", "utf8")
const migration = () => readFileSync("prisma/manual-migrations/2026-06-12-add-performance-indexes.sql", "utf8")

const hotPathIndexes = [
  {
    model: "Employee",
    table: "employees",
    declarations: [
      { fields: "[isActive, companyId, branchId]", name: "IX_employees_isActive_companyId_branchId" },
      { fields: "[departmentId]", name: "IX_employees_departmentId" },
      { fields: "[managerId]", name: "IX_employees_managerId" },
    ],
  },
  {
    model: "Location",
    table: "locations",
    declarations: [
      { fields: "[isActive, branchId]", name: "IX_locations_isActive_branchId" },
      { fields: "[parentId]", name: "IX_locations_parentId" },
    ],
  },
  {
    model: "Asset",
    table: "assets",
    declarations: [
      { fields: "[isActive, createdAt]", name: "IX_assets_isActive_createdAt" },
      { fields: "[isActive, companyId, branchId]", name: "IX_assets_isActive_companyId_branchId" },
      { fields: "[isActive, categoryId, modelId]", name: "IX_assets_isActive_categoryId_modelId" },
      { fields: "[isActive, brandId]", name: "IX_assets_isActive_brandId" },
      { fields: "[isActive, statusId, conditionId]", name: "IX_assets_isActive_statusId_conditionId" },
      { fields: "[isActive, ownershipType]", name: "IX_assets_isActive_ownershipType" },
      { fields: "[isActive, custodianId]", name: "IX_assets_isActive_custodianId" },
      { fields: "[isActive, currentLocationId]", name: "IX_assets_isActive_currentLocationId" },
      { fields: "[departmentId]", name: "IX_assets_departmentId" },
      { fields: "[supplierId]", name: "IX_assets_supplierId" },
      { fields: "[purchaseDate]", name: "IX_assets_purchaseDate" },
      { fields: "[warrantyEndDate]", name: "IX_assets_warrantyEndDate" },
      { fields: "[serialNumber]", name: "IX_assets_serialNumber" },
    ],
  },
  {
    model: "AssetMovement",
    table: "asset_movements",
    declarations: [
      { fields: "[assetId, performedAt]", name: "IX_asset_movements_assetId_performedAt" },
      { fields: "[referenceType, referenceId]", name: "IX_asset_movements_referenceType_referenceId" },
    ],
  },
  {
    model: "AuditRound",
    table: "audit_rounds",
    declarations: [
      { fields: "[isActive, status]", name: "IX_audit_rounds_isActive_status" },
      { fields: "[startDate, endDate]", name: "IX_audit_rounds_startDate_endDate" },
    ],
  },
  {
    model: "AuditItem",
    table: "audit_items",
    declarations: [
      { fields: "[auditRoundId, auditStatus]", name: "IX_audit_items_auditRoundId_auditStatus" },
      { fields: "[assetId]", name: "IX_audit_items_assetId" },
      { fields: "[lastScanAt]", name: "IX_audit_items_lastScanAt" },
    ],
  },
  {
    model: "AuditFinding",
    table: "audit_findings",
    declarations: [
      { fields: "[reviewStatus, actionStatus, actionDueDate]", name: "IX_audit_findings_reviewStatus_actionStatus_actionDueDate" },
      { fields: "[auditRoundId, reviewStatus]", name: "IX_audit_findings_auditRoundId_reviewStatus" },
      { fields: "[assetId]", name: "IX_audit_findings_assetId" },
      { fields: "[actionOwnerId]", name: "IX_audit_findings_actionOwnerId" },
    ],
  },
  {
    model: "AuditScanHistory",
    table: "audit_scan_history",
    declarations: [
      { fields: "[auditRoundId, scannedAt]", name: "IX_audit_scan_history_auditRoundId_scannedAt" },
      { fields: "[assetId, scannedAt]", name: "IX_audit_scan_history_assetId_scannedAt" },
      { fields: "[auditItemId]", name: "IX_audit_scan_history_auditItemId" },
    ],
  },
  {
    model: "MaintenancePlan",
    table: "maintenance_plans",
    declarations: [
      { fields: "[isActive, nextDueDate]", name: "IX_maintenance_plans_isActive_nextDueDate" },
      { fields: "[assetId]", name: "IX_maintenance_plans_assetId" },
      { fields: "[assignedToId]", name: "IX_maintenance_plans_assignedToId" },
    ],
  },
  {
    model: "MaintenanceTicket",
    table: "maintenance_tickets",
    declarations: [
      { fields: "[isActive, repairStatus, dueDate]", name: "IX_maintenance_tickets_isActive_repairStatus_dueDate" },
      { fields: "[assetId, reportedDate]", name: "IX_maintenance_tickets_assetId_reportedDate" },
      { fields: "[assignedToId]", name: "IX_maintenance_tickets_assignedToId" },
      { fields: "[reportedById]", name: "IX_maintenance_tickets_reportedById" },
    ],
  },
  {
    model: "DisposalRequest",
    table: "disposal_requests",
    declarations: [
      { fields: "[isActive, requestStatus, requestDate]", name: "IX_disposal_requests_isActive_requestStatus_requestDate" },
      { fields: "[assetId]", name: "IX_disposal_requests_assetId" },
      { fields: "[requestedById]", name: "IX_disposal_requests_requestedById" },
    ],
  },
  {
    model: "Attachment",
    table: "attachments",
    declarations: [
      { fields: "[assetId, isActive, uploadedAt]", name: "IX_attachments_assetId_isActive_uploadedAt" },
      { fields: "[module, referenceId, isActive, uploadedAt]", name: "IX_attachments_module_referenceId_isActive_uploadedAt" },
    ],
  },
  {
    model: "SystemLog",
    table: "system_logs",
    declarations: [
      { fields: "[createdAt]", name: "IX_system_logs_createdAt" },
      { fields: "[module, action, createdAt]", name: "IX_system_logs_module_action_createdAt" },
      { fields: "[recordId]", name: "IX_system_logs_recordId" },
      { fields: "[userId, createdAt]", name: "IX_system_logs_userId_createdAt" },
    ],
  },
] as const

function modelBlock(source: string, modelName: string) {
  const match = source.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `Missing model ${modelName}`)
  return match[0]
}

test("schema maps hot-path index names for deterministic production SQL", () => {
  const source = schema()

  for (const entry of hotPathIndexes) {
    const block = modelBlock(source, entry.model)
    for (const index of entry.declarations) {
      assert.ok(block.includes(`@@index(${index.fields}, map: "${index.name}")`), `Missing ${entry.model} mapped index: ${index.name}`)
    }
  }
})

test("manual performance index migration is idempotent and matches schema index names", () => {
  const source = migration()

  for (const entry of hotPathIndexes) {
    for (const index of entry.declarations) {
      assert.match(source, new RegExp(`IF NOT EXISTS[\\s\\S]*name = N'${index.name}'`, "m"), `Missing idempotent guard for ${index.name}`)
      assert.match(source, new RegExp(`CREATE INDEX \\[${index.name}\\] ON \\[dbo\\]\\.\\[${entry.table}\\]`, "m"), `Missing CREATE INDEX for ${index.name}`)
    }
  }
})
