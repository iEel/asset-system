-- Production performance indexes for high-volume asset, audit, maintenance, evidence, and log workflows.
-- Run after a verified SQL Server backup and approved change record.
-- This script is idempotent and can be executed with:
--   npx prisma db execute --file prisma/manual-migrations/2026-06-12-add-performance-indexes.sql

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[employees]') AND name = N'IX_employees_isActive_companyId_branchId')
BEGIN
  CREATE INDEX [IX_employees_isActive_companyId_branchId] ON [dbo].[employees]([isActive], [companyId], [branchId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[employees]') AND name = N'IX_employees_departmentId')
BEGIN
  CREATE INDEX [IX_employees_departmentId] ON [dbo].[employees]([departmentId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[employees]') AND name = N'IX_employees_managerId')
BEGIN
  CREATE INDEX [IX_employees_managerId] ON [dbo].[employees]([managerId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND name = N'IX_locations_isActive_branchId')
BEGIN
  CREATE INDEX [IX_locations_isActive_branchId] ON [dbo].[locations]([isActive], [branchId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND name = N'IX_locations_parentId')
BEGIN
  CREATE INDEX [IX_locations_parentId] ON [dbo].[locations]([parentId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_createdAt')
BEGIN
  CREATE INDEX [IX_assets_isActive_createdAt] ON [dbo].[assets]([isActive], [createdAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_companyId_branchId')
BEGIN
  CREATE INDEX [IX_assets_isActive_companyId_branchId] ON [dbo].[assets]([isActive], [companyId], [branchId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_categoryId_modelId')
BEGIN
  CREATE INDEX [IX_assets_isActive_categoryId_modelId] ON [dbo].[assets]([isActive], [categoryId], [modelId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_brandId')
BEGIN
  CREATE INDEX [IX_assets_isActive_brandId] ON [dbo].[assets]([isActive], [brandId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_statusId_conditionId')
BEGIN
  CREATE INDEX [IX_assets_isActive_statusId_conditionId] ON [dbo].[assets]([isActive], [statusId], [conditionId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_ownershipType')
BEGIN
  CREATE INDEX [IX_assets_isActive_ownershipType] ON [dbo].[assets]([isActive], [ownershipType]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_custodianId')
BEGIN
  CREATE INDEX [IX_assets_isActive_custodianId] ON [dbo].[assets]([isActive], [custodianId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_isActive_currentLocationId')
BEGIN
  CREATE INDEX [IX_assets_isActive_currentLocationId] ON [dbo].[assets]([isActive], [currentLocationId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_departmentId')
BEGIN
  CREATE INDEX [IX_assets_departmentId] ON [dbo].[assets]([departmentId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_supplierId')
BEGIN
  CREATE INDEX [IX_assets_supplierId] ON [dbo].[assets]([supplierId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_purchaseDate')
BEGIN
  CREATE INDEX [IX_assets_purchaseDate] ON [dbo].[assets]([purchaseDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_warrantyEndDate')
BEGIN
  CREATE INDEX [IX_assets_warrantyEndDate] ON [dbo].[assets]([warrantyEndDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND name = N'IX_assets_serialNumber')
BEGIN
  CREATE INDEX [IX_assets_serialNumber] ON [dbo].[assets]([serialNumber]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[asset_movements]') AND name = N'IX_asset_movements_assetId_performedAt')
BEGIN
  CREATE INDEX [IX_asset_movements_assetId_performedAt] ON [dbo].[asset_movements]([assetId], [performedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[asset_movements]') AND name = N'IX_asset_movements_referenceType_referenceId')
BEGIN
  CREATE INDEX [IX_asset_movements_referenceType_referenceId] ON [dbo].[asset_movements]([referenceType], [referenceId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_rounds]') AND name = N'IX_audit_rounds_isActive_status')
BEGIN
  CREATE INDEX [IX_audit_rounds_isActive_status] ON [dbo].[audit_rounds]([isActive], [status]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_rounds]') AND name = N'IX_audit_rounds_startDate_endDate')
BEGIN
  CREATE INDEX [IX_audit_rounds_startDate_endDate] ON [dbo].[audit_rounds]([startDate], [endDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_items]') AND name = N'IX_audit_items_auditRoundId_auditStatus')
BEGIN
  CREATE INDEX [IX_audit_items_auditRoundId_auditStatus] ON [dbo].[audit_items]([auditRoundId], [auditStatus]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_items]') AND name = N'IX_audit_items_assetId')
BEGIN
  CREATE INDEX [IX_audit_items_assetId] ON [dbo].[audit_items]([assetId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_items]') AND name = N'IX_audit_items_lastScanAt')
BEGIN
  CREATE INDEX [IX_audit_items_lastScanAt] ON [dbo].[audit_items]([lastScanAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_findings]') AND name = N'IX_audit_findings_reviewStatus_actionStatus_actionDueDate')
BEGIN
  CREATE INDEX [IX_audit_findings_reviewStatus_actionStatus_actionDueDate] ON [dbo].[audit_findings]([reviewStatus], [actionStatus], [actionDueDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_findings]') AND name = N'IX_audit_findings_auditRoundId_reviewStatus')
BEGIN
  CREATE INDEX [IX_audit_findings_auditRoundId_reviewStatus] ON [dbo].[audit_findings]([auditRoundId], [reviewStatus]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_findings]') AND name = N'IX_audit_findings_assetId')
BEGIN
  CREATE INDEX [IX_audit_findings_assetId] ON [dbo].[audit_findings]([assetId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_findings]') AND name = N'IX_audit_findings_actionOwnerId')
BEGIN
  CREATE INDEX [IX_audit_findings_actionOwnerId] ON [dbo].[audit_findings]([actionOwnerId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_scan_history]') AND name = N'IX_audit_scan_history_auditRoundId_scannedAt')
BEGIN
  CREATE INDEX [IX_audit_scan_history_auditRoundId_scannedAt] ON [dbo].[audit_scan_history]([auditRoundId], [scannedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_scan_history]') AND name = N'IX_audit_scan_history_assetId_scannedAt')
BEGIN
  CREATE INDEX [IX_audit_scan_history_assetId_scannedAt] ON [dbo].[audit_scan_history]([assetId], [scannedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[audit_scan_history]') AND name = N'IX_audit_scan_history_auditItemId')
BEGIN
  CREATE INDEX [IX_audit_scan_history_auditItemId] ON [dbo].[audit_scan_history]([auditItemId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_plans]') AND name = N'IX_maintenance_plans_isActive_nextDueDate')
BEGIN
  CREATE INDEX [IX_maintenance_plans_isActive_nextDueDate] ON [dbo].[maintenance_plans]([isActive], [nextDueDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_plans]') AND name = N'IX_maintenance_plans_assetId')
BEGIN
  CREATE INDEX [IX_maintenance_plans_assetId] ON [dbo].[maintenance_plans]([assetId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_plans]') AND name = N'IX_maintenance_plans_assignedToId')
BEGIN
  CREATE INDEX [IX_maintenance_plans_assignedToId] ON [dbo].[maintenance_plans]([assignedToId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_tickets]') AND name = N'IX_maintenance_tickets_isActive_repairStatus_dueDate')
BEGIN
  CREATE INDEX [IX_maintenance_tickets_isActive_repairStatus_dueDate] ON [dbo].[maintenance_tickets]([isActive], [repairStatus], [dueDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_tickets]') AND name = N'IX_maintenance_tickets_assetId_reportedDate')
BEGIN
  CREATE INDEX [IX_maintenance_tickets_assetId_reportedDate] ON [dbo].[maintenance_tickets]([assetId], [reportedDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_tickets]') AND name = N'IX_maintenance_tickets_assignedToId')
BEGIN
  CREATE INDEX [IX_maintenance_tickets_assignedToId] ON [dbo].[maintenance_tickets]([assignedToId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_tickets]') AND name = N'IX_maintenance_tickets_reportedById')
BEGIN
  CREATE INDEX [IX_maintenance_tickets_reportedById] ON [dbo].[maintenance_tickets]([reportedById]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_isActive_requestStatus_requestDate')
BEGIN
  CREATE INDEX [IX_disposal_requests_isActive_requestStatus_requestDate] ON [dbo].[disposal_requests]([isActive], [requestStatus], [requestDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_assetId')
BEGIN
  CREATE INDEX [IX_disposal_requests_assetId] ON [dbo].[disposal_requests]([assetId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_requestedById')
BEGIN
  CREATE INDEX [IX_disposal_requests_requestedById] ON [dbo].[disposal_requests]([requestedById]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[attachments]') AND name = N'IX_attachments_assetId_isActive_uploadedAt')
BEGIN
  CREATE INDEX [IX_attachments_assetId_isActive_uploadedAt] ON [dbo].[attachments]([assetId], [isActive], [uploadedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[attachments]') AND name = N'IX_attachments_module_referenceId_isActive_uploadedAt')
BEGIN
  CREATE INDEX [IX_attachments_module_referenceId_isActive_uploadedAt] ON [dbo].[attachments]([module], [referenceId], [isActive], [uploadedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[system_logs]') AND name = N'IX_system_logs_createdAt')
BEGIN
  CREATE INDEX [IX_system_logs_createdAt] ON [dbo].[system_logs]([createdAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[system_logs]') AND name = N'IX_system_logs_module_action_createdAt')
BEGIN
  CREATE INDEX [IX_system_logs_module_action_createdAt] ON [dbo].[system_logs]([module], [action], [createdAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[system_logs]') AND name = N'IX_system_logs_recordId')
BEGIN
  CREATE INDEX [IX_system_logs_recordId] ON [dbo].[system_logs]([recordId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[system_logs]') AND name = N'IX_system_logs_userId_createdAt')
BEGIN
  CREATE INDEX [IX_system_logs_userId_createdAt] ON [dbo].[system_logs]([userId], [createdAt]);
END;
