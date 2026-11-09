// The words the ยืนยันผลตรวจ spec reads (inspection-confirm plan 3 task 4), each a value of messages/th.json copied as it
// stands (tests/e2e-audit-rounds.test.ts checks each against its key). Plain data, no imports, so the node test can
// load it.
export const INSPECTION_CONFIRM_WORDS = {
  // inspectionConfirmPage.*
  title: "ยืนยันผลตรวจ",
  backToRound: "กลับไปรอบตรวจนับ",
  tabReady: "พร้อมยืนยัน",
  tabAwaitingReview: "รออนุมัติ",
  tabDamaged: "สภาพเสียหาย",
  tabNotFound: "ไม่พบ",
  tabNotScanned: "ยังไม่ได้ตรวจนับ",
  awaitingReviewBanner: "ชิ้นเหล่านี้รออนุมัติรายการไม่ตรงทะเบียนก่อน",
  noEditNotice: "ต้องมีสิทธิ์แก้ไขทรัพย์สินจึงจะยืนยันผลได้",
  emptyTitle: "ยืนยันผลตรวจครบแล้ว",
  emptyTabTitle: "ไม่มีรายการในกลุ่มนี้",
  selectAll: "เลือกทั้งหมดในกลุ่มนี้",
  selectedCount: "เลือก {count, number} ชิ้น",
  selectionSummary: "ใช้งานอยู่ {inUse, number} · พร้อมใช้งาน {ready, number} · ถูกยืม {checkedOut, number}",
  confirmOpen: "ยืนยันผลตรวจ…",
  dialogTitle: "ยืนยันผลตรวจ {count, number} ชิ้น",
  dialogLineInUse: "ตั้งเป็น ใช้งานอยู่",
  dialogLineReady: "ตั้งเป็น พร้อมใช้งาน",
  submit: "ยืนยัน {count, number} ชิ้น",
  successNotice: "ยืนยันผลตรวจแล้ว {count, number} ชิ้น",
  // auditRound.*: the next-step card's heading and its confirm and close columns.
  nextStepTitle: "ขั้นถัดไป: {step}",
  stepReview: "หัวหน้า IT พิจารณา",
  stepConfirmWaiting: "รอยืนยัน {count} ชิ้น",
  closeUnconfirmedCount: "ยังมี {count} ชิ้นค้างสถานะอยู่ระหว่างตรวจสอบ",
  closeRound: "ปิดรอบตรวจ",
  // The statuses' Thai names as the seed holds them (nameTh), the same words as asset.quickFilterInUse and
  // asset.quickFilterReady.
  statusInUse: "ใช้งานอยู่",
  statusReady: "พร้อมใช้งาน",
} as const
