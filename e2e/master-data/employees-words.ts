// The words the employees spec reads on screen (page group 7 plan 2, spec
// docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §5.1, §5.2), as the app writes them in
// messages/th.json (tests/e2e-master-data.test.ts checks every value is one of th.json's). Plain data, no imports, so
// the node test can load it.
export const EMPLOYEE_WORDS = {
  // The list (§5.1, G7P2-R1): the card, its chip, a former holder's note and the phone card's held count.
  formerCard: "พ้นสภาพแต่ยังถือครอง", formerChip: "พ้นสภาพแต่ยังถือครอง (รวมระเบียนที่ไม่ใช้งาน)",
  formerHolderNote: "ยังถือครองอยู่ ควรรับคืน", listHeldCount: "ถือครอง {count} รายการ", resigned: "ลาออก", filter: "กรอง",
  search: "ค้นหา", filtersTitle: "ค้นหาและตัวกรอง",
  // The employee page (§5.2): the header's action, the warning, the held panel, a row's handover or ข้อมูลเก่า, รับคืน.
  handOverToPerson: "ส่งมอบทรัพย์สินให้คนนี้", formerHoldingTitle: "พ้นสภาพแล้ว ยังถือครอง {count} รายการ",
  heldTitle: "ทรัพย์สินที่ถือครองตอนนี้", heldCount: "{count} รายการ", handoverRegular: "ใช้ประจำ",
  legacy: "ข้อมูลเก่า ไม่มีใบส่งมอบ", createBackfill: "สร้างใบส่งมอบย้อนหลัง", returnLabel: "รับคืน", returnAsset: "รับคืน {asset}",
  // The return form's reason for a machine with an open repair (asset.transactionReasonActiveMaintenance, G7P2-R3).
  reasonOpenRepair: "มีงานซ่อมที่ยังไม่ปิด กรุณาปิดหรือยกเลิกงานซ่อมก่อน",
  // The forms the page opens, the legacy path's confirm and the RT- document with its back link.
  checkinTitle: "รับคืนทรัพย์สิน", checkoutTitle: "ส่งมอบทรัพย์สิน",
  legacyConfirmTitle: "สร้างใบส่งมอบย้อนหลังแล้วรับคืน", legacyConfirm: "สร้างและรับคืน",
  returnDocumentTitle: "ใบรับคืนทรัพย์สิน", back: "กลับ",
  // Group 7 follow-ups (plan docs/superpowers/plans/2026-11-07-group7-followups.md, Task 5). The list (Task 2): the
  // record-status segmented control (G7F-R1, common.recordStatus) and the status column under ทั้งหมด, the totals line,
  // the sort select, and row ⋯ with ดูทรัพย์สินที่ถือครอง and ปิดใช้งาน (G7F-R2: hidden without employee:delete).
  recordStatusLabel: "สถานะข้อมูล", recordActive: "ใช้งาน", recordInactive: "ไม่ใช้งาน", recordAll: "ทั้งหมด", statusColumn: "สถานะ",
  listTotals: "{people, number} คน · ถือครองรวม {assets, number} รายการ", sortLabel: "เรียงตาม", moreActionsFor: "การดำเนินการของ {code}",
  viewHeldAssets: "ดูทรัพย์สินที่ถือครอง ({n})", deactivate: "ปิดใช้งาน",
  // The employee page (Task 3, G7F-R4): the held stat's foot, ตรวจนับรอบปัจจุบัน, a held row's open repair and its ⋯ with
  // โอนย้าย (unavailable with the transfer form's reason while a handover is open) and พิมพ์ใบส่งมอบ.
  heldStatFootSplit: "มีใบส่งมอบ {withHandover} · ไม่มีใบส่งมอบ {withoutHandover}", currentAuditTitle: "ตรวจนับรอบปัจจุบัน",
  currentAuditEmpty: "ไม่มีทรัพย์สินที่ถือครองอยู่ในรอบตรวจนับที่เปิดอยู่", openRepair: "งานซ่อม {repairNo}", transfer: "โอนย้าย",
  printHandover: "พิมพ์ใบส่งมอบ", reasonOpenCheckout: "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงโอนย้ายได้",
} as const
