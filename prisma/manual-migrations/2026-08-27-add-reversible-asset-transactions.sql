-- Reversible Checkout, Check-in, and Transfer transaction documents.
-- Run only after a verified SQL Server backup and explicit approval.
-- Existing Checkout and Check-in rows remain active but have no inferred snapshots.

IF COL_LENGTH('dbo.asset_checkouts', 'transactionStatus') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts]
    ADD [transactionStatus] NVARCHAR(20) NOT NULL
      CONSTRAINT [DF_asset_checkouts_transactionStatus] DEFAULT N'active';
END;

IF COL_LENGTH('dbo.asset_checkouts', 'beforeSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [beforeSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'afterSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [afterSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'componentSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [componentSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'voidedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [voidedAt] DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'voidedBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [voidedBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'voidReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts] ADD [voidReason] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkouts', 'updatedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkouts]
    ADD [updatedAt] DATETIME2 NOT NULL
      CONSTRAINT [DF_asset_checkouts_updatedAt] DEFAULT SYSUTCDATETIME();
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[asset_checkouts]')
    AND name = N'IX_asset_checkouts_assetId_transactionStatus_createdAt'
)
BEGIN
  CREATE INDEX [IX_asset_checkouts_assetId_transactionStatus_createdAt]
    ON [dbo].[asset_checkouts]([assetId], [transactionStatus], [createdAt]);
END;

IF COL_LENGTH('dbo.asset_checkins', 'transactionStatus') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins]
    ADD [transactionStatus] NVARCHAR(20) NOT NULL
      CONSTRAINT [DF_asset_checkins_transactionStatus] DEFAULT N'active';
END;

IF COL_LENGTH('dbo.asset_checkins', 'beforeSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [beforeSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'afterSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [afterSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'componentSnapshotJson') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [componentSnapshotJson] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'voidedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [voidedAt] DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'voidedBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [voidedBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'voidReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins] ADD [voidReason] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.asset_checkins', 'updatedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[asset_checkins]
    ADD [updatedAt] DATETIME2 NOT NULL
      CONSTRAINT [DF_asset_checkins_updatedAt] DEFAULT SYSUTCDATETIME();
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[asset_checkins]')
    AND name = N'IX_asset_checkins_assetId_transactionStatus_createdAt'
)
BEGIN
  CREATE INDEX [IX_asset_checkins_assetId_transactionStatus_createdAt]
    ON [dbo].[asset_checkins]([assetId], [transactionStatus], [createdAt]);
END;

IF OBJECT_ID(N'[dbo].[asset_transfers]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[asset_transfers] (
    [id] NVARCHAR(1000) NOT NULL
      CONSTRAINT [DF_asset_transfers_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [documentNo] NVARCHAR(50) NOT NULL,
    [assetId] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(500) NOT NULL,
    [remark] NVARCHAR(MAX) NULL,
    [beforeSnapshotJson] NVARCHAR(MAX) NOT NULL,
    [afterSnapshotJson] NVARCHAR(MAX) NOT NULL,
    [componentSnapshotJson] NVARCHAR(MAX) NOT NULL,
    [transactionStatus] NVARCHAR(20) NOT NULL
      CONSTRAINT [DF_asset_transfers_transactionStatus] DEFAULT N'active',
    [voidedAt] DATETIME2 NULL,
    [voidedBy] NVARCHAR(100) NULL,
    [voidReason] NVARCHAR(MAX) NULL,
    [createdBy] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL
      CONSTRAINT [DF_asset_transfers_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL
      CONSTRAINT [DF_asset_transfers_updatedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_asset_transfers] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_asset_transfers_assetId')
BEGIN
  ALTER TABLE [dbo].[asset_transfers] WITH CHECK
    ADD CONSTRAINT [FK_asset_transfers_assetId]
    FOREIGN KEY ([assetId]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[asset_transfers]')
    AND name = N'UX_asset_transfers_documentNo'
)
BEGIN
  CREATE UNIQUE INDEX [UX_asset_transfers_documentNo]
    ON [dbo].[asset_transfers]([documentNo]);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[asset_transfers]')
    AND name = N'IX_asset_transfers_assetId_transactionStatus_createdAt'
)
BEGIN
  CREATE INDEX [IX_asset_transfers_assetId_transactionStatus_createdAt]
    ON [dbo].[asset_transfers]([assetId], [transactionStatus], [createdAt]);
END;
