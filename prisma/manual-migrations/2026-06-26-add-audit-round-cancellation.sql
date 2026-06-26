IF COL_LENGTH('dbo.audit_rounds', 'cancelledAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelledAt] DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.audit_rounds', 'cancelledBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelledBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.audit_rounds', 'cancelReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelReason] NVARCHAR(MAX) NULL;
END;
