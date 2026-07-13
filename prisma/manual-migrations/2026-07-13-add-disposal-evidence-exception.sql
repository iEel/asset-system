IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionReason] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionGrantedBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionGrantedBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.disposal_requests', 'evidenceExceptionGrantedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [evidenceExceptionGrantedAt] DATETIME2 NULL;
END;
