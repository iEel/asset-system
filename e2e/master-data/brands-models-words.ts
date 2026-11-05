// The words the brands and models spec reads on screen (page group 7 plan 1, spec
// docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §4), as the app writes them in messages/th.json
// (tests/e2e-master-data.test.ts checks every value is one of th.json's). Plain data, no imports, so the node test can
// load it.
export const BRAND_MODEL_WORDS = {
  // The asset form's pickers (spec §4.2, G7P1-R4): the create row, and the hint for a user without brand:create.
  createModel: "เพิ่มรุ่นใหม่: {query}", createBrand: "เพิ่มยี่ห้อใหม่: {query}", noPermission: "ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม",
  // The quick add dialog: its title, the similar names, their "use" button and the save.
  modelTitle: "เพิ่มรุ่นใหม่ใน {brand}", similarHeading: "ชื่อใกล้เคียงที่มีอยู่แล้ว", useThis: "ใช้รายการนี้", save: "บันทึกและเลือก",
  // The duplicate rule's answer under the name (G7P1-R1).
  exists: "มี {name} อยู่แล้ว", use: "ใช้ {name}",
  // The brands page (spec §4.3): เพิ่มล่าสุด (G7P1-R3) and its line, the filter button, the phone's brand select.
  recentLabel: "เพิ่มล่าสุด", days7: "7 วัน", addedBy: "เพิ่มโดย {name} · {source}",
  sourceAssetForm: "จากฟอร์มทรัพย์สิน", sourceMasterData: "จากหน้าข้อมูลหลัก", filter: "กรอง", phoneBrandSelect: "ยี่ห้อ",
  assetCount: "{count} ทรัพย์สิน", photoNone: "ยังไม่มีรูป",
  // ⋯ ปิดใช้งาน and its confirm, which a model words with its asset count only (task 4 fix 1).
  moreActionsFor: "การดำเนินการของ {code}", deactivate: "ปิดใช้งาน", deactivateTitle: "ปิดใช้งาน {name}?",
  deactivateBodyModel: "ใช้อยู่ใน {assets} ทรัพย์สิน · ข้อมูลเดิมไม่เปลี่ยน · เปิดใช้งานอีกครั้งได้จากหน้าแก้ไข", cancel: "ยกเลิก",
} as const
