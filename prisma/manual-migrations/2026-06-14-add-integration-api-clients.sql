-- Integration API client token registry.
-- Run after a verified SQL Server backup and approved change record.
-- This script is idempotent and can be executed with:
--   npx prisma db execute --file prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[integration_api_clients]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[integration_api_clients] (
    [id] NVARCHAR(100) NOT NULL CONSTRAINT [DF_integration_api_clients_id] DEFAULT CONVERT(NVARCHAR(100), NEWID()),
    [clientId] NVARCHAR(100) NOT NULL,
    [displayName] NVARCHAR(200) NOT NULL,
    [tokenHash] NVARCHAR(64) NOT NULL,
    [tokenPreview] NVARCHAR(30) NOT NULL,
    [scopesJson] NVARCHAR(MAX) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [DF_integration_api_clients_enabled] DEFAULT (1),
    [createdBy] NVARCHAR(100) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_integration_api_clients_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedBy] NVARCHAR(100) NULL,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_integration_api_clients_updatedAt] DEFAULT SYSUTCDATETIME(),
    [lastUsedAt] DATETIME2 NULL,
    [lastUsedIp] NVARCHAR(50) NULL,
    [lastRotatedAt] DATETIME2 NULL,
    CONSTRAINT [PK_integration_api_clients] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[integration_api_clients]') AND name = N'UX_integration_api_clients_clientId')
BEGIN
  CREATE UNIQUE INDEX [UX_integration_api_clients_clientId] ON [dbo].[integration_api_clients]([clientId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[integration_api_clients]') AND name = N'UX_integration_api_clients_tokenHash')
BEGIN
  CREATE UNIQUE INDEX [UX_integration_api_clients_tokenHash] ON [dbo].[integration_api_clients]([tokenHash]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[integration_api_clients]') AND name = N'IX_integration_api_clients_enabled_clientId')
BEGIN
  CREATE INDEX [IX_integration_api_clients_enabled_clientId] ON [dbo].[integration_api_clients]([enabled], [clientId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[integration_api_clients]') AND name = N'IX_integration_api_clients_lastUsedAt')
BEGIN
  CREATE INDEX [IX_integration_api_clients_lastUsedAt] ON [dbo].[integration_api_clients]([lastUsedAt]);
END;
