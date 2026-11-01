// The words the register's checks read on screen (page group 4 plan 1, spec
// docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §6), as the app writes them in messages/th.json
// (tests/e2e-register.test.ts checks every value is one of th.json's, whatever its placeholders are named). Plain data,
// no imports, so the node test can load it.
export const REGISTER_WORDS = {
  // The register's own search field (common.search) and the range above the table (§6.1).
  search: "ค้นหา", range: "{from}–{to} จาก {total} รายการ",
  // The status tabs and the line under them (§6.2): the tabs add up to ทั้งหมด, and สถานะอื่น names its statuses.
  tabAll: "ทั้งหมด", tabOther: "สถานะอื่น", sumLine: "{terms} = {total} · สถานะอื่น {other} = {breakdown}",
  // The phone's lines (§6.7): the tab and its count above the cards, the end of the list on the last page.
  mobileSummary: "{tab} {count} รายการ", mobileEnd: "แสดงครบ {shown} จาก {total} รายการ",
  // The header's menu (§6.3).
  exportImportMenu: "ส่งออก / นำเข้า", exportFilteredCount: "ส่งออกตามตัวกรอง ({count} รายการ)", importFromExcel: "นำเข้าจาก Excel",
  // The selection bar (§6.5) and its "อื่น ๆ" item that opens the bulk correction.
  selectedOnPage: "{count} รายการที่เลือกในหน้านี้", moreActions: "อื่น ๆ", printLabelsCount: "พิมพ์ป้าย {count} รายการ",
  bulkUpdate: "อัปเดตที่ตั้ง/ผู้ถือครอง",
  // The bulk correction (§6.6, decision 11): its title, the department line, its errors, its save and its toast.
  bulkCorrectionTitle: "แก้ไขข้อมูลหลายรายการ", departmentFollows: "แผนกจะเปลี่ยนตามผู้ถือครอง: {department} ({count} รายการ)",
  bulkFieldRequired: "เลือกข้อมูลที่จะแก้อย่างน้อย 1 รายการ", required: "กรุณาระบุข้อมูลนี้",
  applyBulkUpdate: "อัปเดตรายการที่เลือก", bulkUpdateSuccess: "อัปเดตทรัพย์สินที่เลือกสำเร็จ",
  // The history's correction lines (P1-R6).
  holderCorrected: "แก้ไขข้อมูลผู้ถือครอง", departmentCorrected: "แก้ไขข้อมูลแผนก",
  // Saved views (§6.4).
  savedViews: "มุมมองที่บันทึกไว้", saveView: "บันทึกมุมมองนี้", save: "บันทึก", viewNameRequired: "กรุณากรอกชื่อมุมมอง",
} as const
