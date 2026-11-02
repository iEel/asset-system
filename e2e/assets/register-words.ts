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
  // เอกสารจัดซื้อ (group 4 plan 3, spec §9, P3-R1): the section, the picker's result line and footer, the chosen mark, the
  // section's badges (create and edit), a chip's × (never clicked on the edit page: it sends the unlink at the save), the
  // duplicate under the number, the three types the specs use, and the save's toast.
  purchaseDocuments: "เอกสารจัดซื้อ", purchaseDocumentLinkedNames: "ผูกกับ {count, number} เครื่อง: {names}",
  purchaseDocumentLinkedCount: "ผูกกับ {count, number} เครื่อง", purchaseDocumentChosen: "เลือกแล้ว",
  purchaseDocumentSearchFooter: "พบ {count, number} ใบ จากเอกสารกลาง {total, number} ใบ · ค้นหาได้ด้วยเลขที่เอกสาร เลข PO เลขใบกำกับ ผู้ขาย หรือชื่อรุ่นของเครื่องที่ผูกไว้",
  documentsSelected: "เลือกแล้ว {count, number} ใบ", documentsLinked: "ผูกไว้ {count, number} ใบ", purchaseDocumentRemoveNamed: "เอา {number} ออก",
  purchaseDocumentExists: "เอกสารจัดซื้อนี้มีอยู่แล้ว", typePurchaseOrder: "ใบ PO", typeInvoice: "ใบกำกับ", typeDeliveryNote: "ใบส่งของ",
  savedSuccess: "บันทึกสำเร็จ",
  // The batch form (spec §8): its mode button, its save, the review and its confirm, and the result.
  createModeBatch: "เพิ่มเป็นชุด", batchSubmit: "บันทึกทั้งชุด", batchReviewTitle: "ตรวจสอบก่อนบันทึก", batchReviewConfirm: "ยืนยันและบันทึกทั้งชุด",
  batchCreatedTitle: "สร้างทรัพย์สินเป็นชุดสำเร็จ",
} as const

// The components page (group 4 plan 4, spec §12, P4-R1..R5): the header and its install button, the install panel's
// step title, the candidate's lines (name first), the role's Thai label, the review and its save, the one table (its
// title, count line, ติดตั้งอยู่ and a photo count), each current row's ⋯ and its items, and the removal dialog's
// ตอนนี้ | หลังยืนยัน rows, its save and its toast.
export const COMPONENT_WORDS = {
  title: "จัดการส่วนควบ", noCustodian: "ไม่มีผู้ถือครอง", installAction: "ติดตั้งส่วนควบ",
  installPanelStep: "ติดตั้งส่วนควบ ขั้น {step, number} จาก {total, number}",
  notInstalled: "ยังไม่ได้ติดตั้ง", removedHere: "เคยติดตั้งกับเครื่องนี้ · ถอดออก {date}",
  roleAdapter: "อะแดปเตอร์", continueReview: "ตรวจสอบก่อนบันทึก", confirmInstall: "ยืนยันติดตั้ง", installSuccess: "ติดตั้งส่วนควบสำเร็จ",
  history: "ประวัติส่วนควบ", historyCount: "{total, number} รายการ · ติดตั้งอยู่ {installed, number} · ถอดแล้ว {removed, number}",
  stillInstalled: "ติดตั้งอยู่", photoCount: "{count, number} รูป",
  moreActionsFor: "การดำเนินการของ {code}", openAsset: "เปิดหน้าทรัพย์สิน", remove: "ถอดส่วนควบ",
  removeTitle: "ถอดส่วนควบ", removeNow: "ตอนนี้", removeAfter: "หลังยืนยัน", status: "สถานะส่วนควบ",
  installedState: "ติดตั้งกับทรัพย์สินหลัก", removedState: "ถอดแล้ว", countHere: "ส่วนควบของเครื่องนี้", countValue: "{count, number} รายการ",
  evidenceChosen: "เลือกไฟล์แล้ว ระบบจะบันทึกพร้อมรายการ", confirmRemove: "ยืนยันถอดส่วนควบ", removeSuccess: "ถอดส่วนควบสำเร็จ",
} as const

// The scan page (group 4 plan 4, spec §14, P4-R2, P4-R7): its title and field, the heading over the cards, the card's
// facts and its actions, the recent list, and the asset page's way back to the scan.
export const SCAN_WORDS = {
  title: "สแกน / ค้นหาทรัพย์สิน", queryLabel: "ค้นหาหรือสแกนรหัสทรัพย์สิน",
  foundMatch: "พบ {count, number} รายการ · ตรงกับ {field}", matchSerial: "Serial",
  condition: "สภาพ {condition}", holder: "ผู้ถือครอง", room: "ที่ตั้ง",
  components: "ส่วนควบ", componentsValue: "{count, number} รายการ · {names}",
  openAsset: "เปิดรายละเอียดทรัพย์สิน", nextActions: "ทำต่อกับทรัพย์สินนี้",
  checkin: "รับคืน", recordRepair: "บันทึกซ่อม", printLabel: "พิมพ์ป้าย",
  recent: "เปิดล่าสุด", recentClear: "ล้างรายการ", backToScan: "กลับไปสแกน",
} as const
