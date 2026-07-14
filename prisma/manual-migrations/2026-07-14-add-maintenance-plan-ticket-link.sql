-- Link generated PM work orders to their source maintenance plans.
-- Run after a verified SQL Server backup and approved change record.
-- This script is idempotent and can be executed with:
--   npx prisma db execute --file prisma/manual-migrations/2026-07-14-add-maintenance-plan-ticket-link.sql

IF COL_LENGTH('maintenance_tickets', 'maintenancePlanId') IS NULL
BEGIN
  ALTER TABLE [dbo].[maintenance_tickets] ADD [maintenancePlanId] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_maintenance_tickets_maintenancePlanId')
BEGIN
  ALTER TABLE [dbo].[maintenance_tickets] WITH CHECK
    ADD CONSTRAINT [FK_maintenance_tickets_maintenancePlanId]
    FOREIGN KEY ([maintenancePlanId]) REFERENCES [dbo].[maintenance_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[maintenance_tickets]')
    AND name = N'IX_maintenance_tickets_maintenancePlanId'
)
BEGIN
  CREATE INDEX [IX_maintenance_tickets_maintenancePlanId]
    ON [dbo].[maintenance_tickets]([maintenancePlanId]);
END;
