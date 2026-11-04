-- Disposal rounds (group 6 plan 4, spec §11.1): the disposal_rounds table and disposal_requests.roundId.
-- A round records one actual disposal of up to 200 approved requests: one method, one date, one document,
-- one lump sale price. Requests executed before rounds keep roundId NULL (no backfill).
-- Run after a verified SQL Server backup and approved change record, only through:
--   npm run migration:apply -- 2026-11-05-add-disposal-rounds.sql --backup-confirmed --reason "..."
-- It must run before the deploy that carries roundId in the Prisma client.
-- This script is idempotent: every object is guarded by sys.* or COL_LENGTH checks.
--
-- Rollback (manual, after a backup; not part of this script):
--   ALTER TABLE [dbo].[disposal_requests] DROP CONSTRAINT [FK_disposal_requests_roundId];
--   DROP INDEX [IX_disposal_requests_roundId] ON [dbo].[disposal_requests];
--   ALTER TABLE [dbo].[disposal_requests] DROP COLUMN [roundId];
--   DROP TABLE [dbo].[disposal_rounds];

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[disposal_rounds] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_disposal_rounds_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [roundNo] NVARCHAR(50) NOT NULL,
    [disposalType] NVARCHAR(30) NOT NULL,
    [executionDate] DATETIME2 NOT NULL,
    [executedById] NVARCHAR(1000) NOT NULL,
    [recipientName] NVARCHAR(200) NULL,
    [documentNo] NVARCHAR(100) NOT NULL,
    [saleValue] DECIMAL(18, 2) NULL,
    [remark] NVARCHAR(MAX) NULL,
    [createdBy] NVARCHAR(100) NOT NULL,
    [updatedBy] NVARCHAR(100) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_disposal_rounds_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_disposal_rounds_updatedAt] DEFAULT SYSUTCDATETIME(),
    [isActive] BIT NOT NULL CONSTRAINT [DF_disposal_rounds_isActive] DEFAULT (1),
    CONSTRAINT [PK_disposal_rounds] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF COL_LENGTH('dbo.disposal_requests', 'roundId') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [roundId] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_rounds_executedById')
BEGIN
  ALTER TABLE [dbo].[disposal_rounds] WITH CHECK
    ADD CONSTRAINT [FK_disposal_rounds_executedById]
    FOREIGN KEY ([executedById]) REFERENCES [dbo].[employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_requests_roundId')
BEGIN
  ALTER TABLE [dbo].[disposal_requests] WITH CHECK
    ADD CONSTRAINT [FK_disposal_requests_roundId]
    FOREIGN KEY ([roundId]) REFERENCES [dbo].[disposal_rounds]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]') AND name = N'UX_disposal_rounds_roundNo')
BEGIN
  CREATE UNIQUE INDEX [UX_disposal_rounds_roundNo] ON [dbo].[disposal_rounds]([roundNo]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]') AND name = N'IX_disposal_rounds_isActive_executionDate')
BEGIN
  CREATE INDEX [IX_disposal_rounds_isActive_executionDate] ON [dbo].[disposal_rounds]([isActive], [executionDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]') AND name = N'IX_disposal_rounds_executedById')
BEGIN
  CREATE INDEX [IX_disposal_rounds_executedById] ON [dbo].[disposal_rounds]([executedById]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_roundId')
BEGIN
  CREATE INDEX [IX_disposal_requests_roundId] ON [dbo].[disposal_requests]([roundId]);
END;
