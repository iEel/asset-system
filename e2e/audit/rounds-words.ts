// The words the rounds list and the round form steps read (group 2 spec §6, §7, §14), each a value of
// messages/th.json (tests/e2e-audit-rounds.test.ts checks them). Plain data, no imports, so the node test can load it.
export const ROUNDS_WORDS = {
  listTitle: "รอบตรวจนับ",
  createTitle: "สร้างรอบตรวจนับ",
  tabOpen: "กำลังดำเนินการ",
  tabClosed: "ปิดแล้ว",
  tabCancelled: "ยกเลิก",
  tabAll: "ทั้งหมด",
  roundCount: "{count} รอบ",
  statusOpen: "เปิดตรวจ",
  statusClosed: "ปิดรอบแล้ว",
  statusCancelled: "ยกเลิก",
  notStarted: "ยังไม่เริ่ม",
  daysLeft: "เหลือ {days} วัน",
  // The strip cell, then the row's next step.
  continueScan: "เดินตรวจต่อ",
  continueScanRow: "เดินตรวจต่อ ({count})",
  viewPending: "รอตรวจ",
  activeFilters: "ตัวกรองที่ใช้อยู่",
  clearFilter: "ล้างตัวกรองนี้",
  clearSearch: "ล้างคำค้น",
  // The form.
  counting: "กำลังนับรายการ…",
  addCondition: "เพิ่มเงื่อนไข",
  createRound: "สร้างรอบ",
  willCreate: "จะสร้างรอบ {count} รายการ",
  showSample: "ดูตัวอย่างรายการ",
  scopeDepartment: "แผนก",
  scopeLocation: "ที่ตั้ง",
  scopeStatus: "สถานะทรัพย์สิน",
} as const
