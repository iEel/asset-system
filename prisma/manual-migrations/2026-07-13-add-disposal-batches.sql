-- Disposal batch packet storage.
-- Run after a verified SQL Server backup and approved change record.
-- This script is idempotent and can be executed with:
--   npx prisma db execute --file prisma/manual-migrations/2026-07-13-add-disposal-batches.sql

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[disposal_batches]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[disposal_batches] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_disposal_batches_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [batchNo] NVARCHAR(50) NOT NULL,
    [disposalType] NVARCHAR(30) NOT NULL,
    [reason] NVARCHAR(MAX) NOT NULL,
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestDate] DATETIME2 NOT NULL CONSTRAINT [DF_disposal_batches_requestDate] DEFAULT SYSUTCDATETIME(),
    [approverId] NVARCHAR(1000) NULL,
    [saleValue] DECIMAL(18, 2) NULL,
    [salvageValue] DECIMAL(18, 2) NULL,
    [batchStatus] NVARCHAR(30) NOT NULL CONSTRAINT [DF_disposal_batches_batchStatus] DEFAULT N'pending',
    [createdBy] NVARCHAR(100) NOT NULL,
    [updatedBy] NVARCHAR(100) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_disposal_batches_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_disposal_batches_updatedAt] DEFAULT SYSUTCDATETIME(),
    [isActive] BIT NOT NULL CONSTRAINT [DF_disposal_batches_isActive] DEFAULT (1),
    CONSTRAINT [PK_disposal_batches] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF COL_LENGTH('dbo.disposal_batches', 'saleValue') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_batches] ADD [saleValue] DECIMAL(18, 2) NULL;
END;

IF COL_LENGTH('dbo.disposal_batches', 'salvageValue') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_batches] ADD [salvageValue] DECIMAL(18, 2) NULL;
END;

IF COL_LENGTH('dbo.disposal_requests', 'batchId') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [batchId] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_batches_requestedById')
BEGIN
  ALTER TABLE [dbo].[disposal_batches] WITH CHECK
    ADD CONSTRAINT [FK_disposal_batches_requestedById]
    FOREIGN KEY ([requestedById]) REFERENCES [dbo].[employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_batches_approverId')
BEGIN
  ALTER TABLE [dbo].[disposal_batches] WITH CHECK
    ADD CONSTRAINT [FK_disposal_batches_approverId]
    FOREIGN KEY ([approverId]) REFERENCES [dbo].[employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_requests_batchId')
BEGIN
  ALTER TABLE [dbo].[disposal_requests] WITH CHECK
    ADD CONSTRAINT [FK_disposal_requests_batchId]
    FOREIGN KEY ([batchId]) REFERENCES [dbo].[disposal_batches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_batches]') AND name = N'UX_disposal_batches_batchNo')
BEGIN
  CREATE UNIQUE INDEX [UX_disposal_batches_batchNo] ON [dbo].[disposal_batches]([batchNo]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_batches]') AND name = N'IX_disposal_batches_isActive_batchStatus_requestDate')
BEGIN
  CREATE INDEX [IX_disposal_batches_isActive_batchStatus_requestDate] ON [dbo].[disposal_batches]([isActive], [batchStatus], [requestDate]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_batches]') AND name = N'IX_disposal_batches_requestedById')
BEGIN
  CREATE INDEX [IX_disposal_batches_requestedById] ON [dbo].[disposal_batches]([requestedById]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_batches]') AND name = N'IX_disposal_batches_approverId')
BEGIN
  CREATE INDEX [IX_disposal_batches_approverId] ON [dbo].[disposal_batches]([approverId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_batchId')
BEGIN
  CREATE INDEX [IX_disposal_requests_batchId] ON [dbo].[disposal_requests]([batchId]);
END;
