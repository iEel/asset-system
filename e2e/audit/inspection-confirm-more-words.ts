// The words the damaged and not-found ยืนยันผลตรวจ spec reads (inspection-confirm plan 4 task 5), each a value of
// messages/th.json copied as it stands (tests/e2e-audit-rounds.test.ts checks each against its key). Plain data, no
// imports, so the node test can load it.
export const INSPECTION_CONFIRM_MORE_WORDS = {
  // inspectionConfirmPage.*: the tabs, the dialog, the damaged row's buttons and the not-found bulk.
  title: "ยืนยันผลตรวจ",
  tabReady: "พร้อมยืนยัน",
  tabAwaitingReview: "รอพิจารณา",
  tabDamaged: "สภาพเสียหาย",
  tabNotFound: "ไม่พบ",
  tabNotScanned: "ยังไม่ได้ตรวจนับ",
  emptyTitle: "ยืนยันผลตรวจครบแล้ว",
  selectedCount: "เลือก {count, number} ชิ้น",
  dialogTitle: "ยืนยันผลตรวจ {count, number} ชิ้น",
  dialogLineReady: "ตั้งเป็น พร้อมใช้งาน",
  submit: "ยืนยัน {count, number} ชิ้น",
  damagedRepair: "ยืนยันแล้วบันทึกซ่อม",
  damagedDispose: "ยืนยันแล้วขอตัดจำหน่าย",
  damagedConfirmOnly: "ยืนยันผลอย่างเดียว",
  damagedReasonDefault: "ยืนยันตามผลตรวจนับรอบ {auditNo}",
  missingOpen: "ตั้งเป็นหาไม่พบ…",
  missingDialogTitle: "ตั้งเป็นหาไม่พบ {count, number} ชิ้น",
  missingDialogLine: "ตั้งเป็น หาไม่พบ",
  missingReasonDefault: "ตรวจนับรอบ {auditNo} ไม่พบ",
  missingSubmit: "ตั้งเป็นหาไม่พบ {count, number} ชิ้น",
  missingSuccess: "ตั้งเป็นหาไม่พบแล้ว {count, number} ชิ้น",
  // The lost block, its note while the round is open, and the after-close section.
  lostBlock: "ชิ้นที่ตั้งเป็นหาไม่พบจากรอบนี้: {count, number} ชิ้น",
  lostAfterClose: "ขอตัดจำหน่ายแบบสูญหายได้หลังปิดรอบตรวจนับ",
  lostLink: "ขอตัดจำหน่ายแบบสูญหาย…",
  afterCloseTitle: "ตัดจำหน่ายหลังปิดรอบ",
  damagedForDisposalTitle: "ชิ้นสภาพเสียหายที่ยืนยันจากรอบนี้",
  damagedDisposeLink: "ขอตัดจำหน่าย",
  // auditRound.*: the close and the closed round's card.
  closeRound: "ปิดรอบตรวจ",
  closeConfirm: "ยืนยันปิดรอบตรวจนับนี้?",
  closeSuccess: "ปิดรอบตรวจนับสำเร็จ",
  stepsClosedTitle: "รอบนี้ปิดแล้ว",
  closedDisposalLine: "ขอตัดจำหน่ายจากรอบนี้ได้ {count, number} ชิ้น",
  // disposalPage.*: the batch form's round notice and its phone note, two methods, and the picker's status blocker.
  fromRoundNotice: "เลือกทรัพย์สินที่ตั้งเป็นหาไม่พบจากรอบ {auditNo} ไว้ให้ {count, number} ชิ้น",
  batchPhoneNote: "สร้างชุดคำขอได้บนคอมพิวเตอร์",
  methodLost: "สูญหาย",
  methodSell: "ขาย",
  blockerStatus: "สถานะไม่อนุญาต",
} as const
