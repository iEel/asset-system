-- Consumables (ของใช้สิ้นเปลือง, consumables plan 1, spec §2): the consumable_items and consumable_movements tables,
-- and the consumable permission (view, create, edit, delete, export, approve) granted to system_admin only.
-- One item row per kind holds onHand; every change to onHand is one append-only movement (receive, issue, adjust).
-- The item name is unique among active items through a filtered unique index this migration owns
-- (Prisma keeps a plain @@index of the same name). The admin grants the permission to other roles on the roles page.
-- Run after a verified SQL Server backup and approved change record, only through:
--   npm run migration:apply -- 2026-11-10-add-consumables.sql --backup-confirmed --reason "..."
-- It must run before the deploy that carries the consumable models in the Prisma client.
-- This script is idempotent: every object is guarded by sys.* checks, and rows are inserted where missing.
--
-- Rollback (manual, after a backup; not part of this script):
--   DELETE rp FROM [dbo].[role_permissions] rp
--     INNER JOIN [dbo].[permissions] p ON p.[id] = rp.[permissionId] WHERE p.[module] = N'consumable';
--   DELETE FROM [dbo].[permissions] WHERE [module] = N'consumable';
--   DROP TABLE [dbo].[consumable_movements];
--   DROP TABLE [dbo].[consumable_items];

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[consumable_items]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[consumable_items] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_consumable_items_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [name] NVARCHAR(100) NOT NULL,
    [unit] NVARCHAR(20) NOT NULL CONSTRAINT [DF_consumable_items_unit] DEFAULT N'ชิ้น',
    [minQuantity] INT NOT NULL CONSTRAINT [DF_consumable_items_minQuantity] DEFAULT (0),
    [onHand] INT NOT NULL CONSTRAINT [DF_consumable_items_onHand] DEFAULT (0),
    [isActive] BIT NOT NULL CONSTRAINT [DF_consumable_items_isActive] DEFAULT (1),
    [createdBy] NVARCHAR(100) NOT NULL,
    [updatedBy] NVARCHAR(100) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_consumable_items_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_consumable_items_updatedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_consumable_items] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[consumable_movements]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[consumable_movements] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_consumable_movements_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [itemId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [quantityChange] INT NOT NULL,
    [onHandAfter] INT NOT NULL,
    [assetId] NVARCHAR(1000) NULL,
    [receivedDate] DATE NULL,
    [reason] NVARCHAR(500) NULL,
    [note] NVARCHAR(500) NULL,
    [performedBy] NVARCHAR(100) NOT NULL,
    [performedAt] DATETIME2 NOT NULL CONSTRAINT [DF_consumable_movements_performedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_consumable_movements] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_consumable_movements_itemId')
BEGIN
  ALTER TABLE [dbo].[consumable_movements] WITH CHECK
    ADD CONSTRAINT [FK_consumable_movements_itemId]
    FOREIGN KEY ([itemId]) REFERENCES [dbo].[consumable_items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_consumable_movements_assetId')
BEGIN
  ALTER TABLE [dbo].[consumable_movements] WITH CHECK
    ADD CONSTRAINT [FK_consumable_movements_assetId]
    FOREIGN KEY ([assetId]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[consumable_items]') AND name = N'UX_consumable_items_name_active')
BEGIN
  EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UX_consumable_items_name_active]
    ON [dbo].[consumable_items]([name])
    WHERE [isActive] = 1;';
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[consumable_movements]') AND name = N'IX_consumable_movements_item_performedAt')
BEGIN
  CREATE INDEX [IX_consumable_movements_item_performedAt] ON [dbo].[consumable_movements]([itemId], [performedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[consumable_movements]') AND name = N'IX_consumable_movements_asset_performedAt')
BEGIN
  CREATE INDEX [IX_consumable_movements_asset_performedAt] ON [dbo].[consumable_movements]([assetId], [performedAt]);
END;

-- The seed's six actions for module consumable, where missing.
INSERT INTO [dbo].[permissions] ([id], [module], [action], [description])
SELECT CONVERT(NVARCHAR(1000), NEWID()), N'consumable', a.[action], a.[action] + N' consumable'
FROM (VALUES (N'view'), (N'create'), (N'edit'), (N'delete'), (N'export'), (N'approve')) AS a([action])
WHERE NOT EXISTS (
  SELECT 1 FROM [dbo].[permissions] p WHERE p.[module] = N'consumable' AND p.[action] = a.[action]
);

-- Granted to system_admin only, where missing (user, 2026-11-09, option ก).
INSERT INTO [dbo].[role_permissions] ([id], [roleId], [permissionId])
SELECT CONVERT(NVARCHAR(1000), NEWID()), r.[id], p.[id]
FROM [dbo].[roles] r
CROSS JOIN [dbo].[permissions] p
WHERE r.[name] = N'system_admin'
  AND p.[module] = N'consumable'
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[role_permissions] rp WHERE rp.[roleId] = r.[id] AND rp.[permissionId] = p.[id]
  );
