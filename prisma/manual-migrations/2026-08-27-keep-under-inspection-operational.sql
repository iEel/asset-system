-- Keep Under Inspection as an active controlled operational status.
-- Run only after a verified SQL Server backup and approved change record.
-- This migration is idempotent and does not change any asset row.

UPDATE [dbo].[asset_statuses]
SET
  [nameTh] = N'อยู่ระหว่างตรวจสอบ',
  [description] = N'กำลังตรวจสอบตำแหน่ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป',
  [isActive] = 1
WHERE [name] = N'Under Inspection'
  AND (
    ISNULL([nameTh], N'') <> N'อยู่ระหว่างตรวจสอบ'
    OR ISNULL([description], N'') <> N'กำลังตรวจสอบตำแหน่ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป'
    OR [isActive] <> 1
  );
