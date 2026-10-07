-- Repair record outcome: usable | beyond_repair. NULL = recorded before 2026-10 (unknown).
-- Run only after a verified SQL Server backup and explicit approval.

IF COL_LENGTH('dbo.maintenance_tickets', 'outcome') IS NULL
BEGIN
  ALTER TABLE [dbo].[maintenance_tickets] ADD [outcome] NVARCHAR(20) NULL;
END;
