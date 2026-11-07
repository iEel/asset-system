-- Notification daily counts (page group 9 plan 1, spec §5.3 and §6.1): the notification_daily_counts table and
-- notification_user_states.readAt. One row per user, Bangkok day and notification key keeps that day's count
-- (yesterday's counts on the bell and the work center) and the count the daily digest sent (digestCount, NULL until
-- a digest includes the key). readAt records when a row was marked read; rows read before this column keep NULL
-- (no backfill).
-- Run after a verified SQL Server backup and approved change record, only through:
--   npm run migration:apply -- 2026-11-07-add-notification-daily-counts.sql --backup-confirmed --reason "..."
-- It must run before the deploy that carries NotificationDailyCount and readAt in the Prisma client.
-- This script is idempotent: every object is guarded by sys.* or COL_LENGTH checks.
--
-- Rollback (manual, after a backup; not part of this script):
--   ALTER TABLE [dbo].[notification_user_states] DROP COLUMN [readAt];
--   DROP TABLE [dbo].[notification_daily_counts];

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[notification_daily_counts] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_notification_daily_counts_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [userId] NVARCHAR(100) NOT NULL,
    [day] DATE NOT NULL,
    [key] NVARCHAR(50) NOT NULL,
    [count] INT NOT NULL,
    [digestCount] INT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_notification_daily_counts_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_notification_daily_counts_updatedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_notification_daily_counts] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF COL_LENGTH('dbo.notification_user_states', 'readAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[notification_user_states] ADD [readAt] DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]') AND name = N'UX_notification_daily_counts_user_day_key')
BEGIN
  CREATE UNIQUE INDEX [UX_notification_daily_counts_user_day_key] ON [dbo].[notification_daily_counts]([userId], [day], [key]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]') AND name = N'IX_notification_daily_counts_user_day')
BEGIN
  CREATE INDEX [IX_notification_daily_counts_user_day] ON [dbo].[notification_daily_counts]([userId], [day]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]') AND name = N'IX_notification_daily_counts_day')
BEGIN
  CREATE INDEX [IX_notification_daily_counts_day] ON [dbo].[notification_daily_counts]([day]);
END;
