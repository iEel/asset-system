// The words the locations spec reads on screen (page group 7 plan 3, spec
// docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §6, §7), as the app writes them in
// messages/th.json (tests/e2e-master-data.test.ts checks every value is one of th.json's). Plain data, no imports, so
// the node test can load it.
export const LOCATION_WORDS = {
  // The page (§6.1): its heading, the two views, the tree's disclosure and counts (G7P3-R2, R3).
  title: "ที่ตั้ง", viewLabel: "มุมมอง", viewTree: "โครงสร้าง", viewList: "รายการพร้อมเส้นทาง",
  expand: "ขยาย {name}", collapse: "ยุบ {name}", subtree: "รวมที่ตั้งย่อย {n}", assetsAt: "ทรัพย์สินปัจจุบันที่{name}: {n} รายการ",
  // One level shows 100 locations at a time; this button shows the next ones (final review 5).
  showMore: "แสดงอีก {n} รายการ",
  // ⋯ of a location: เพิ่มที่ตั้งในนี้ and ปิดใช้งาน, whose confirm names each blocker and offers only ปิด (Review Focus 4).
  moreActionsFor: "การดำเนินการของ {code}", addChild: "เพิ่มที่ตั้งในนี้", deactivate: "ปิดใช้งาน", deactivateTitle: "ปิดใช้งาน {name}?",
  blockedCurrentAssets: "มีทรัพย์สินอยู่ที่นี่ {n}", blockedHomeAssets: "เป็นที่ตั้งประจำของทรัพย์สิน {n}",
  blockedActiveChildren: "มีที่ตั้งย่อยที่ใช้งาน {n}", blockedFooter: "ปิดใช้งานไม่ได้จนกว่าจะย้ายหรือปิดรายการข้างบน", close: "ปิด",
  // An inactive location: its badge and เปิดใช้งาน with its confirm and toast.
  inactive: "ไม่ใช้งาน", reactivate: "เปิดใช้งาน", reactivateTitle: "เปิดใช้งาน {name}?", reactivated: "เปิดใช้งานแล้ว",
  // The form (§6.2): its titles, the empty parent search of the branch, the save and its toast.
  createTitle: "เพิ่มที่ตั้ง", editTitle: "แก้ไขที่ตั้ง", parentEmpty: "ไม่พบที่ตั้งในสาขานี้", save: "บันทึก", saved: "บันทึกสำเร็จ",
  // The register (§7): the chip group and the location chip's label.
  activeFilters: "ตัวกรองที่ใช้อยู่", locationChip: "ที่ตั้ง",
  // The parent picker's rows (group 7 follow-ups Task 4, MD-Location-New): the type chip and the active children.
  parentChildCount: "ย่อย {count, number}", typeBuilding: "อาคาร", typeFloor: "ชั้น", typeRoom: "ห้อง",
} as const
