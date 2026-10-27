// The words the round page and pending list steps read (group 2 spec §8, §9, §16), each a value of messages/th.json
// (tests/e2e-audit-rounds.test.ts checks them). Plain data, no imports, so the node test can load it.
export const ROUND_PAGE_WORDS = {
  // The next-step card.
  nextStep: "ขั้นถัดไป",
  continueScan: "เดินตรวจต่อ ({count})",
  // Step 2 counts findings (P2-R26).
  reviewWaiting: "รอ {count}",
  reviewItems: "พิจารณา {count} รายการ",
  closeRound: "ปิดรอบตรวจ",
  openerCannotClose: "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด",
  // The header's menus.
  exportMenu: "ส่งออก",
  exportExcel: "Excel ผลตรวจ",
  exportVariance: "รายงานผลต่าง",
  exportScope: "ตามตัวกรองที่เลือก",
  more: "อื่น ๆ",
  cancelRound: "ยกเลิกรอบตรวจ",
  // The result chips, in their order.
  resultAll: "ทั้งหมด",
  resultPending: "รอตรวจ",
  resultFound: "พบตรง",
  resultMismatch: "ไม่ตรง",
  resultNotFound: "ไม่พบ",
  resultOutOfScope: "นอกขอบเขต",
  resultPendingReview: "รอพิจารณา",
  // "ไม่ตรงเรื่องอะไร": the bars' words are the findings' (auditFinding.type_*), as Task 4 draws them.
  mismatchCard: "ไม่ตรงเรื่องอะไร",
  fieldLocation: "ที่ตั้งไม่ตรง",
  fieldDepartment: "แผนกไม่ตรง",
  fieldCustodian: "ผู้ถือครองไม่ตรง",
  fieldCondition: "สภาพไม่ตรง",
  multipleFields: "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง",
  componentsMissingLine: "เครื่องที่ส่วนควบไม่ครบ {count}",
  componentsMissingChip: "ส่วนควบไม่ครบ {count}",
  // A parent row's "ไม่พบ: <name> (<code>)": the prefix is the message, the name and the linked code follow it.
  missingComponentPrefix: "ไม่พบ:",
  activeFilters: "ตัวกรองที่ใช้อยู่",
  clearFilter: "ล้างตัวกรองนี้",
  // The pending list.
  pendingTitle: "รายการรอตรวจ {count} รายการ",
  allRooms: "ทุกห้อง",
  scanThis: "สแกนรายการนี้",
  viewAsset: "ดูทรัพย์สิน",
  markNotFound: "บันทึกไม่พบ",
  noCustodian: "ไม่มีผู้ถือครอง",
  notFoundResult: "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน",
} as const
