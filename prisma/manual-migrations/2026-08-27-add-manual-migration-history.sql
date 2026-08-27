-- Manual migration execution ledger.
-- Run only after a verified SQL Server backup and approved change record.
-- Initialize through: npm run migration:init -- --backup-confirmed --reason "..."

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[manual_migration_history]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[manual_migration_history] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_manual_migration_history_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [migrationName] NVARCHAR(255) NOT NULL,
    [checksumSha256] CHAR(64) NOT NULL,
    [databaseName] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [appliedAt] DATETIME2 NOT NULL CONSTRAINT [DF_manual_migration_history_appliedAt] DEFAULT SYSUTCDATETIME(),
    [appliedBy] NVARCHAR(255) NOT NULL,
    [reason] NVARCHAR(500) NOT NULL,
    [executionMs] INT NOT NULL,
    [errorMessage] NVARCHAR(2000) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_manual_migration_history_createdAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_manual_migration_history] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CK_manual_migration_history_status] CHECK ([status] IN (N'success', N'failed', N'baselined')),
    CONSTRAINT [CK_manual_migration_history_executionMs] CHECK ([executionMs] >= 0)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[manual_migration_history]') AND name = N'UX_manual_migration_history_accepted')
BEGIN
  CREATE UNIQUE INDEX [UX_manual_migration_history_accepted]
    ON [dbo].[manual_migration_history]([databaseName], [migrationName])
    WHERE [status] <> N'failed';
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[manual_migration_history]') AND name = N'IX_manual_migration_history_database_name_applied')
BEGIN
  CREATE INDEX [IX_manual_migration_history_database_name_applied]
    ON [dbo].[manual_migration_history]([databaseName], [migrationName], [appliedAt]);
END;
