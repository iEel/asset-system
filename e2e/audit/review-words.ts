// The words the findings steps read (group 2 spec §10, §16), each a value of messages/th.json (tests/e2e-audit.test.ts
// checks them). Plain data, no imports, so the node test can load it. The placeholders are the steps' own names; the
// test compares the texts with every placeholder alike.
export const REVIEW_WORDS = {
  // The page.
  title: "รายการไม่ตรงจากการตรวจนับ",
  emptyTitle: "ไม่พบรายการไม่ตรงตามตัวกรอง",
  // The six tabs, in order, and their nav's name (P4-R1, P4-R3).
  tabsLabel: "ตัวกรองงาน",
  tabPending: "รอพิจารณา",
  tabApproved: "อนุมัติแล้ว",
  tabRejected: "ปฏิเสธแล้ว",
  tabFollowUp: "ต้องติดตาม",
  tabClosed: "ปิดแล้ว",
  tabAll: "ทั้งหมด",
  // The เรื่อง chip's short words (P4-R2).
  subjectLocation: "ที่ตั้ง",
  subjectCustodian: "ผู้ถือครอง",
  subjectDepartment: "แผนก",
  subjectCondition: "สภาพ",
  subjectNotFound: "ไม่พบ",
  subjectOutOfScope: "นอกขอบเขต",
  // A component's machine, in the row and in the panel (spec §10, decision 6).
  componentOf: "ส่วนควบของ {parentTag} {parentName}",
  // The panel (spec §10); ไม่พบ's sentence stops before the transfer (P4-R24).
  openAsset: "เปิดหน้าทรัพย์สิน",
  approveChanges: "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}",
  approveNoChangeOutOfScope: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย",
  approveNoChangeNotFound: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน",
  reasonLabel: "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)",
  rejectReasonRequired: "กรุณาระบุเหตุผลการปฏิเสธ",
  approve: "อนุมัติ",
  reject: "ปฏิเสธ",
  position: "{position} จาก {total}",
  approveAllFields: "อนุมัติทุกช่องของทรัพย์สินนี้",
  ownFinding: "ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้",
  // The follow-up controls, which need audit:approve (finding M4).
  actionPlan: "แผนแก้ไข",
  closeFinding: "ปิดรายการไม่ตรง",
  // The ticks, the selection bar and its one dialog (spec §10, bugs 17-18, P4-R25).
  selectAll: "เลือกทุกรายการที่พิจารณาได้ในหน้านี้",
  selectedCount: "{count} รายการที่เลือก",
  clearSelection: "ล้าง",
  rejectSelected: "ปฏิเสธที่เลือก",
  approveSelected: "อนุมัติที่เลือก {count} รายการ",
  batchApproveTitle: "อนุมัติ {count} รายการที่เลือก",
  batchApproveConfirm: "อนุมัติ {count} รายการ",
  batchResult: "สำเร็จ {succeeded} · ไม่สำเร็จ {failed}",
  batchFailedAlreadyDecided: "มีการพิจารณารายการนี้แล้ว",
  batchResultDismiss: "ปิดผลการพิจารณา",
  // "ส่งออก ▾" (spec §10) and its two items.
  exportMenu: "ส่งออก",
  exportExcel: "ส่งออกรายการไม่ตรง",
  exportPdf: "ส่งออก PDF",
} as const
