-- Asset lifecycle governance and review queue.
-- Run only after a verified SQL Server backup and approved change record.
-- This migration is idempotent and does not change existing asset rows.

IF COL_LENGTH('dbo.disposal_requests', 'previousAssetStatusId') IS NULL
BEGIN
  ALTER TABLE [dbo].[disposal_requests] ADD [previousAssetStatusId] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_disposal_requests_previousAssetStatusId')
BEGIN
  ALTER TABLE [dbo].[disposal_requests] WITH CHECK
    ADD CONSTRAINT [FK_disposal_requests_previousAssetStatusId]
    FOREIGN KEY ([previousAssetStatusId]) REFERENCES [dbo].[asset_statuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[disposal_requests]') AND name = N'IX_disposal_requests_previousAssetStatusId')
BEGIN
  CREATE INDEX [IX_disposal_requests_previousAssetStatusId]
    ON [dbo].[disposal_requests]([previousAssetStatusId]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[asset_state_reviews]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[asset_state_reviews] (
    [id] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_asset_state_reviews_id] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
    [assetId] NVARCHAR(1000) NOT NULL,
    [issueType] NVARCHAR(80) NOT NULL,
    [reviewStatus] NVARCHAR(20) NOT NULL CONSTRAINT [DF_asset_state_reviews_reviewStatus] DEFAULT N'pending',
    [severity] NVARCHAR(20) NOT NULL,
    [observedStatusId] NVARCHAR(1000) NULL,
    [observedConditionId] NVARCHAR(1000) NULL,
    [observedCustodianId] NVARCHAR(1000) NULL,
    [observedAssetUpdatedAt] DATETIME2 NOT NULL,
    [suggestedStatusId] NVARCHAR(1000) NULL,
    [suggestedConditionId] NVARCHAR(1000) NULL,
    [metadataJson] NVARCHAR(MAX) NULL,
    [detectedAt] DATETIME2 NOT NULL CONSTRAINT [DF_asset_state_reviews_detectedAt] DEFAULT SYSUTCDATETIME(),
    [lastDetectedAt] DATETIME2 NOT NULL CONSTRAINT [DF_asset_state_reviews_lastDetectedAt] DEFAULT SYSUTCDATETIME(),
    [resolvedAt] DATETIME2 NULL,
    [resolvedBy] NVARCHAR(100) NULL,
    [resolutionReason] NVARCHAR(MAX) NULL,
    [resolvedStatusId] NVARCHAR(1000) NULL,
    [resolvedConditionId] NVARCHAR(1000) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_asset_state_reviews_createdAt] DEFAULT SYSUTCDATETIME(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_asset_state_reviews_updatedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_asset_state_reviews] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_asset_state_reviews_assetId')
BEGIN
  ALTER TABLE [dbo].[asset_state_reviews] WITH CHECK
    ADD CONSTRAINT [FK_asset_state_reviews_assetId]
    FOREIGN KEY ([assetId]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[asset_state_reviews]') AND name = N'IX_asset_state_reviews_status_severity_detected')
BEGIN
  CREATE INDEX [IX_asset_state_reviews_status_severity_detected]
    ON [dbo].[asset_state_reviews]([reviewStatus], [severity], [lastDetectedAt]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[asset_state_reviews]') AND name = N'IX_asset_state_reviews_asset_issue')
BEGIN
  CREATE INDEX [IX_asset_state_reviews_asset_issue]
    ON [dbo].[asset_state_reviews]([assetId], [issueType]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[asset_state_reviews]') AND name = N'UX_asset_state_reviews_pending_asset_issue')
BEGIN
  CREATE UNIQUE INDEX [UX_asset_state_reviews_pending_asset_issue]
    ON [dbo].[asset_state_reviews]([assetId], [issueType])
    WHERE [reviewStatus] = N'pending';
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[asset_conditions] WHERE [name] = N'Not Assessed')
BEGIN
  INSERT INTO [dbo].[asset_conditions] ([id], [name], [nameTh], [description], [colorCode], [sortOrder], [isActive])
  VALUES (CONVERT(NVARCHAR(1000), NEWID()), N'Not Assessed', N'ยังไม่ประเมิน', N'ยังไม่ได้ตรวจยืนยันสภาพจริงของทรัพย์สิน', N'#64748B', 1, 1);
END
ELSE
BEGIN
  UPDATE [dbo].[asset_conditions]
    SET [nameTh] = N'ยังไม่ประเมิน', [description] = N'ยังไม่ได้ตรวจยืนยันสภาพจริงของทรัพย์สิน', [colorCode] = N'#64748B', [isActive] = 1
    WHERE [name] = N'Not Assessed';
END;

UPDATE [dbo].[asset_statuses] SET [description] = N'บันทึกข้อมูลเบื้องต้นและยังไม่พร้อมนำไปใช้งาน' WHERE [name] = N'Draft';
UPDATE [dbo].[asset_statuses] SET [description] = N'พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น' WHERE [name] = N'Ready';
UPDATE [dbo].[asset_statuses] SET [description] = N'ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน' WHERE [name] = N'In Use';
UPDATE [dbo].[asset_statuses] SET [description] = N'ถูกเบิกใช้งานชั่วคราวและมีรายการเบิกที่ยังเปิดอยู่' WHERE [name] = N'Checked Out';
UPDATE [dbo].[asset_statuses] SET [description] = N'มีงานซ่อมที่เริ่มดำเนินการแล้ว' WHERE [name] = N'Under Maintenance';
UPDATE [dbo].[asset_statuses] SET [description] = N'มีรายการซ่อมที่เปิดและกำลังรอเริ่มดำเนินการ' WHERE [name] = N'Pending Repair';
UPDATE [dbo].[asset_statuses] SET [description] = N'มีคำขอตัดจำหน่ายที่ยังไม่เสร็จสิ้น' WHERE [name] = N'Pending Disposal';

UPDATE [dbo].[asset_conditions] SET [description] = N'ทรัพย์สินใหม่หรือยังไม่ผ่านการใช้งาน' WHERE [name] = N'New';
UPDATE [dbo].[asset_conditions] SET [description] = N'ใช้งานได้ตามปกติและไม่พบความเสียหายสำคัญ' WHERE [name] = N'Good';
UPDATE [dbo].[asset_conditions] SET [description] = N'ยังใช้งานได้แต่มีการสึกหรอหรือข้อสังเกต' WHERE [name] = N'Fair';
UPDATE [dbo].[asset_conditions] SET [description] = N'พบความเสียหายและควรประเมินการซ่อม' WHERE [name] = N'Damaged';
UPDATE [dbo].[asset_conditions] SET [description] = N'ไม่สามารถใช้งานตามหน้าที่หลักได้' WHERE [name] = N'Non-functional';
UPDATE [dbo].[asset_conditions] SET [description] = N'ไม่เหมาะกับการใช้งานและรอพิจารณาตัดจำหน่าย' WHERE [name] = N'Salvage';
