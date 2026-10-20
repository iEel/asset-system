-- Users without an employee link can coexist: SQL Server's plain UNIQUE constraint allows one NULL only,
-- so a second admin, auditor, service or LDAP account with no matching employee failed with 500 (the E2E suite's A1).
-- The constraint becomes a unique index of the same name that ignores NULL: one employee still links to one account.
-- Run only after a verified SQL Server backup and explicit approval.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = N'users_employeeId_key' AND parent_object_id = OBJECT_ID(N'[dbo].[users]')
)
BEGIN
  ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_employeeId_key];
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'users_employeeId_key'
)
BEGIN
  EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [users_employeeId_key]
    ON [dbo].[users]([employeeId])
    WHERE [employeeId] IS NOT NULL;';
END;

COMMIT TRANSACTION;
