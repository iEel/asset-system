// The words the labels page's spec reads on screen (page group 4 plan 6, spec
// docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §11, Appendix A Labels), as the app writes them
// in messages/th.json (tests/e2e-register.test.ts checks every value is one of th.json's and names its key). Plain data,
// no imports, so the node test can load it.
export const LABEL_WORDS = {
  // The page (assetTools.labelsPage) and the queue's status (P6-R5).
  title: "พิมพ์ป้ายทรัพย์สิน", queueModeLabel: "สถานะคิว",
  // The filter chips (P6-R4): the group, the room chip and its search, the sort chip and its newest-first option.
  filtersLabel: "ตัวกรองคิวป้าย", filterLocation: "ที่ตั้ง", filterSort: "เรียงคิว", sortNewest: "สร้างล่าสุด",
  locationSearch: "ค้นหาที่ตั้งด้วยรหัสหรือชื่อ",
  // The queue while its first page loads (the arrival waits for it to go).
  queueLoading: "กำลังโหลดคิวป้าย",
  // The add-all box (P6-R3): the line a · b · c and the button's three wordings, and what is left past the first 100.
  addAllSummary: "ตรงตัวกรอง {matched, number} รายการ · อยู่ในรายการพิมพ์แล้ว {listed, number} · จะเพิ่มใหม่ {added, number}",
  addAll: "เพิ่มทั้งหมด {count, number} รายการ", addSome: "เพิ่ม {count, number} รายการ", addFirst100: "เพิ่ม 100 รายการแรก",
  addRemaining: "เหลืออีก {count, number} รายการ",
  // A queue row once listed, a printed row's state, and the queue with no match.
  rowListed: "อยู่ในรายการพิมพ์แล้ว: {name}", badgePrinted: "เคยพิมพ์แล้ว", queueEmpty: "ไม่มีทรัพย์สินตรงตัวกรอง",
  // The print list (P6-R1, P6-R10): its title, count, empty reason and the from-register line; the note, the preview's
  // name, the bar's line and the two print actions.
  listTitle: "รายการที่จะพิมพ์", listCount: "{count, number} ดวง", listEmpty: "ยังไม่มีป้ายที่จะพิมพ์ เพิ่มจากผลค้นหาหรือคิวป้าย",
  fromRegister: "{count, number} รายการนี้มาจากที่เลือกในทะเบียนทรัพย์สิน",
  note: "หมายเหตุ", previewName: "ตัวอย่างป้ายเทป {size} ของ {tag}", barSummary: "{count, number} ดวงที่จะพิมพ์ · เทป {size}",
  testPrint: "พิมพ์ทดสอบ 1 ดวง", print: "พิมพ์ป้าย {count, number} ดวง",
  // The print route (asset.*): its heading, its print button and the line after the print is recorded.
  printRouteTitle: "พิมพ์ป้ายหลายทรัพย์สิน", printRouteButton: "พิมพ์ป้าย", printRecorded: "บันทึกประวัติการสั่งพิมพ์ป้ายแล้ว",
} as const
