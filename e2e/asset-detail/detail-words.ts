// The words the asset detail's checks read on screen, as the app writes them in messages/th.json
// (tests/e2e-asset-detail.test.ts checks every value is one of th.json's, whatever its placeholders are named). Plain
// data, no imports, so the node test can load it.
export const DETAIL_WORDS = {
  // The actions (spec §7.1, §7.8, R21): "อื่น ๆ" on the desktop, its ⋯ in the phone's bar, the personal labels, and
  // the sheet's last two items on the phone. The cancel is matched by its "ยกเลิกรายการ" prefix (R42).
  more: "อื่น ๆ", moreActions: "การดำเนินการอื่น",
  checkout: "ส่งมอบ", checkin: "รับคืน", transfer: "โอนย้าย", recordRepair: "บันทึกซ่อม", printLabel: "พิมพ์ป้าย", edit: "แก้ไข",
  cancelLatest: "ยกเลิกรายการ", scanNext: "สแกนรายการถัดไป",
  reasonStatusNotReady: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", reasonOpenCheckout: "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงโอนย้ายได้",
  rowActionsMenu: "การดำเนินการของ {assetTag}",
  // The header (spec §7.2, R10, R33): the middle crumb is asset.registerCrumbSearch or asset.registerCrumbFilters.
  back: "กลับ", backToResults: "กลับไปผลค้นหา", backToScan: "กลับไปสแกน",
  breadcrumb: "เส้นทางหน้า", register: "ทะเบียนทรัพย์สิน", searchCrumb: 'ผลค้นหา "{search}"', filtersCrumb: "ผลการกรอง",
  previous: "รายการก่อนหน้า", next: "รายการถัดไป",
  // The fact strip (spec §7.4, R19: the region asset.factStripLabel). The pending audit reads "รอตรวจในรอบ" and then
  // the round's code as a link (Task 8's words).
  factStrip: "ข้อมูลสำคัญของทรัพย์สิน",
  custodianCell: "ผู้ถือครอง", locationCell: "ที่ตั้ง", auditCell: "ตรวจนับล่าสุด", warrantyCell: "ประกัน", seatsCell: "ที่นั่ง",
  heldDays: "ถือมาแล้ว {days} วัน", auditPending: "รอตรวจในรอบ", warrantyUnknown: "ไม่ทราบ", addPurchase: "บันทึกข้อมูลการซื้อ",
  // The overview, the history and the files (spec §7.5-§7.7), and the register's chip group. A purchase document is
  // the app's "เอกสารจัดซื้อ" (R31). The disposal chip is one a fresh asset has no event for (R17).
  purchaseDocuments: "เอกสารจัดซื้อ", allHistory: "ดูประวัติทั้งหมด {count} รายการ", historyTab: "ประวัติ", chipAll: "ทั้งหมด",
  disposalChip: "ตัดจำหน่าย", exportExcel: "ส่งออก Excel", activeFilters: "ตัวกรองที่ใช้อยู่",
  // The documents' titles.
  handoverDocument: "ใบส่งมอบทรัพย์สิน", returnDocument: "ใบรับคืนทรัพย์สิน", transferDocument: "โอนย้ายทรัพย์สิน",
} as const

// The tabs' view names (src/lib/asset-detail-view.ts assetDetailViews, spec §7.3).
export const DETAIL_VIEWS = ["overview", "history", "components", "files", "maintenance"] as const

// A personal asset's transactions in the rule's order (spec §7.1's table).
export const PERSONAL_TRANSACTIONS = ["ส่งมอบ", "รับคืน", "โอนย้าย"] as const

// What a person without asset:edit, asset:create, maintenance:create or disposal:create never sees on the asset page
// as a link or a button (spec §7.1, §7.5, §7.7; anti-goal "a write control visible to a person without the permission";
// "จัดการ" on "อุปกรณ์ส่วนควบ" needs asset:edit, R35; "อัปโหลดรูป" / "ถ่ายรูป" are the รูป card's upload link, R26).
export const VIEWER_ABSENT_CONTROLS = [
  "ส่งมอบ", "รับคืน", "โอนย้าย", "บันทึกซ่อม", "แก้ไข", "เพิ่มข้อมูล", "บันทึกข้อมูลการซื้อ", "อัปโหลดรูป", "ถ่ายรูป",
  "จัดการ", "จัดการส่วนควบ", "ตั้งรอบ PM", "ขอตัดจำหน่าย", "แก้ไขสถานะ", "ยกเลิกรายการ", "คัดลอกเป็นรายการใหม่",
] as const
