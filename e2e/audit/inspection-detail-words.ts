// The words the detail-page ยืนยันผลตรวจ spec reads (inspection-confirm plan 5 task 4), each a value of messages/th.json
// copied as it stands (tests/e2e-audit-rounds.test.ts checks each against its key). Plain data, no imports, so the node
// test can load it.
export const INSPECTION_DETAIL_WORDS = {
  // assetInspectionNotice.*: the notice, its round link, its button and the one-step dialog.
  noticeTitle: "ครุภัณฑ์นี้ค้างสถานะอยู่ระหว่างตรวจสอบ",
  roundLink: "ยืนยันผลตรวจในรอบ {auditNo}",
  button: "ยืนยันผลตรวจ",
  dialogTitle: "ยืนยันผลตรวจ {assetTag}",
  inUseNeedsHolder: "ใช้งานอยู่ต้องมีผู้ถือครอง",
  submit: "ยืนยันผลตรวจ",
  success: "ยืนยันผลตรวจแล้ว",
  // inspectionConfirmPage.*: the confirm page's five tabs.
  tabReady: "พร้อมยืนยัน",
  tabAwaitingReview: "รอพิจารณา",
  tabDamaged: "สภาพเสียหาย",
  tabNotFound: "ไม่พบ",
  tabNotScanned: "ยังไม่ได้ตรวจนับ",
  // inspectionConfirmPage.*: the confirm page's back link when it was opened from an asset page or the findings list.
  backToAsset: "กลับไปหน้ารายละเอียดทรัพย์สิน",
  backToFindings: "กลับไปรายการไม่ตรงทะเบียน",
  // auditFinding.*: the findings page's hand-off to ยืนยันผลตรวจ.
  handoffConfirm: "พิจารณารายการของรอบ {auditNo} ครบแล้ว · ขั้นต่อไป: ยืนยันผลตรวจ {count, number} ชิ้น",
  handoffConfirmLink: "ไปยืนยันผลตรวจ",
  // asset.*: the old Ready-only correction (not offered for an asset under inspection), the history's movement types,
  // and the status's Thai name (the seed's nameTh).
  statusCorrection: "แก้ไขสถานะ",
  movementStatusCorrection: "แก้ไขสถานะ",
  movementCustodianChange: "เปลี่ยนผู้ถือครอง",
  movementLocationChange: "เปลี่ยนที่ตั้ง",
  statusInUse: "ใช้งานอยู่",
} as const
