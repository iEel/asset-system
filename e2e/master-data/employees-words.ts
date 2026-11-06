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
} as const
