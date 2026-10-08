-- Thai status wording (round 3 part B3, 2026-10-08): "Checked Out" is a temporary loan, so it reads ถูกยืม.
-- Data change only: no schema change. Each UPDATE replaces only the old default text, so names an admin edited stay.
-- Run only after a verified SQL Server backup and explicit approval.

UPDATE [dbo].[asset_statuses]
SET [nameTh] = N'ถูกยืม', [description] = N'ถูกยืมใช้ชั่วคราวและมีรายการยืมที่ยังเปิดอยู่'
WHERE [name] = N'Checked Out' AND [nameTh] = N'ถูกเบิก';

UPDATE [dbo].[asset_statuses]
SET [description] = N'พร้อมสำหรับส่งมอบ ยืมใช้ หรือเริ่มขั้นตอนอื่น'
WHERE [name] = N'Ready' AND [description] = N'พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น';

UPDATE [dbo].[asset_statuses]
SET [description] = N'ทรัพย์สินระยะยาวที่มีผู้ถือครองและกำลังใช้งาน'
WHERE [name] = N'In Use' AND [description] = N'ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน';

UPDATE [dbo].[asset_statuses]
SET [description] = N'กำลังตรวจสอบที่ตั้ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป'
WHERE [name] = N'Under Inspection' AND [description] = N'กำลังตรวจสอบตำแหน่ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป';
