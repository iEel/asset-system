SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('maintenance_plans', 'planState') IS NULL
BEGIN
  ALTER TABLE [dbo].[maintenance_plans]
    ADD [planState] NVARCHAR(20) NOT NULL
      CONSTRAINT [DF_maintenance_plans_planState] DEFAULT N'active';

  EXEC sp_executesql N'UPDATE [dbo].[maintenance_plans]
    SET [planState] = CASE WHEN [isActive] = 1 THEN N''active'' ELSE N''paused'' END;';
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_maintenance_plans_planState')
BEGIN
  EXEC sp_executesql N'ALTER TABLE [dbo].[maintenance_plans]
    ADD CONSTRAINT [CK_maintenance_plans_planState]
    CHECK ([planState] IN (N''active'', N''paused'', N''ended''));';
END;

COMMIT TRANSACTION;
