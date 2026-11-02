// The words the register's and the edit page's checks read on screen (page group 4 plans 1 and 2, spec
// docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §6), as the app writes them in messages/th.json
// (tests/e2e-register.test.ts checks every value is one of th.json's, whatever its placeholders are named). Plain data,
// no imports, so the node test can load it.
export const REGISTER_WORDS = {
  // The register's own search field (common.search) and the range above the table (§6.1).
  search: "ค้นหา", range: "{from}–{to} จาก {total} รายการ",
  // The status tabs and the line under them (§6.2): the tabs add up to ทั้งหมด, and สถานะอื่น names its statuses.
  tabAll: "ทั้งหมด", tabOther: "สถานะอื่น", sumLine: "{terms} = {total} · สถานะอื่น {other} = {breakdown}",
  // The phone's end line (§6.7): the end of the list on the last page; the range line above says the count (final review C1).
  mobileEnd: "แสดงครบ {total, number} รายการ",
  // The header's menu (§6.3).
  exportImportMenu: "ส่งออก / นำเข้า", exportFilteredCount: "ส่งออกตามตัวกรอง ({count, number} รายการ)", importFromExcel: "นำเข้าจาก Excel",
  // The selection bar (§6.5) and its "อื่น ๆ" item that opens the bulk correction.
  selectedOnPage: "{count, number} รายการที่เลือกในหน้านี้", moreActions: "อื่น ๆ", printLabelsCount: "พิมพ์ป้าย {count, number} รายการ",
  bulkUpdate: "แก้ไขข้อมูลหลายรายการ",
  // The bulk correction (§6.6, decision 11): its title, the department line, its errors, its save and its toast.
  bulkCorrectionTitle: "แก้ไขข้อมูลหลายรายการ", departmentFollows: "แผนกจะเปลี่ยนตามผู้ถือครอง: {department} ({count, number} รายการ)",
  bulkFieldRequired: "เลือกข้อมูลที่จะแก้อย่างน้อย 1 รายการ", required: "กรุณาระบุข้อมูลนี้",
  applyBulkUpdate: "บันทึกการแก้ไข", bulkUpdateSuccess: "อัปเดตทรัพย์สินที่เลือกสำเร็จ",
  // The history's correction lines (P1-R6).
  holderCorrected: "แก้ไขข้อมูลผู้ถือครอง", departmentCorrected: "แก้ไขข้อมูลแผนก",
  // Saved views (§6.4).
  savedViews: "มุมมองที่บันทึกไว้", saveView: "บันทึกมุมมองนี้", save: "บันทึก", viewNameRequired: "กรุณากรอกชื่อมุมมอง",
  // The edit page (group 4 plan 2, spec §7): its header, the แผนก locked to the holder, the reason (P2-R4), the footer's
  // change list (เดิม → ใหม่) and its save.
  editTitleNamed: "แก้ไข {name}", viewAssetPage: "ดูหน้าทรัพย์สิน", departmentFollowsHolder: "ตามผู้ถือครอง: {department}",
  correctionReasonRequired: "ระบุเหตุผลที่แก้", changeCount: "แก้ไข {count, number} ช่อง", changeListReason: "เหตุผลที่แก้: {reason}",
  holderLabel: "ผู้ถือครอง", departmentLabel: "แผนก", saveCorrection: "บันทึกการแก้ไข", fieldChanged: "แก้แล้ว", fieldWas: "เดิม: {value}",
  // A real move's history line, which a correction never writes.
  holderChanged: "เปลี่ยนผู้ถือครอง",
  // เปลี่ยนรหัส (P2-R6): the dialog, its warning and confirm, and the history line.
  assetTagLabel: "รหัสทรัพย์สิน", changeTag: "เปลี่ยนรหัส", changeTagTitle: "เปลี่ยนรหัสทรัพย์สิน", changeTagConfirm: "ใช้รหัสนี้",
  changeTagWarning: "ป้ายที่พิมพ์ไว้จะยังแสดงรหัสเดิม และค้นด้วยรหัสเดิมจะไม่พบ ป้าย QR ยังเปิดทรัพย์สินนี้ได้", tagChanged: "เปลี่ยนรหัสทรัพย์สิน",
  // An open handover locks the holder, the room and แผนก (P2-R3): the notice and its link to the document.
  openHandoverLock: "ใบส่งมอบ {documentNo} ยังเปิดอยู่ ถ้าผู้ถือครองหรือที่ตั้งผิด ให้ยกเลิกใบส่งมอบแล้วส่งมอบใหม่ หรือรับคืน", openHandoverLink: "เปิดใบส่งมอบ",
} as const
