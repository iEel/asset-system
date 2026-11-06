// The words the categories spec reads on screen (page group 8 plan 2, spec
// docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3, §6), as the app writes them in
// messages/th.json (tests/e2e-master-data.test.ts checks every value is one of th.json's). A rich message keeps its tags
// here, as th.json has it; the spec strips them (plainText) before it reads the screen. Plain data, no imports, so the
// node test can load it.
export const CATEGORY_WORDS = {
  // The list's heading (also the table's caption and its phone scroll region) and the header's เพิ่มหมวดหมู่ (only with
  // category:create; the run's IT head has view and edit).
  categoriesTitle: "หมวดหมู่ทรัพย์สิน", createTitle: "เพิ่มหมวดหมู่",
  // The record-status segmented control (common.recordStatus), the status column under ทั้งหมด, the footer's counts.
  recordStatusLabel: "สถานะข้อมูล", recordActive: "ใช้งาน", recordInactive: "ไม่ใช้งาน", recordAll: "ทั้งหมด", statusColumn: "สถานะ",
  footerCounts: "ใช้งาน {active, number} · ไม่ใช้งาน {inactive, number}",
  // Board MD-Categories: the footer's totals over the filtered set, the prefix cell of a category with no prefix, the
  // ข้อมูลเพิ่ม and รูปที่ต้องถ่าย cells.
  listTotals: "รุ่นรวม {models, number} · ทรัพย์สินรวม {assets, number}",
  prefixMissing: "ยังไม่ตั้ง", prefixFallback: "ใช้ {code} แทน", customFieldCount: "{count, number} ช่อง", none: "ยังไม่มี",
  // A row's ⋯ (MasterDataRowActions): แก้ไข, ดูรุ่น ({n}), ดูทรัพย์สิน ({n}), the prefix in the settings (setting:view only),
  // ปิดใช้งาน (category:delete only).
  moreActionsFor: "การดำเนินการของ {code}", edit: "แก้ไข", deactivate: "ปิดใช้งาน",
  viewModels: "ดูรุ่น ({count, number})", viewAssets: "ดูทรัพย์สิน ({count, number})", setPrefixInSettings: "ตั้งคำนำหน้ารหัสในการตั้งค่า",
  // The phone's table: the scroll hint above a table wider than the screen.
  tableScrollHint: "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม",
  // Board MD-Category-Edit: the header, the counts line, the prefix box's fallback.
  editTitle: "แก้ไขหมวดหมู่ · {name}",
  usageLine: "รหัส <mono>{code}</mono> · ใช้อยู่กับ <modelsLink>{models, number} รุ่น</modelsLink> และ <assetsLink>{assets, number} ทรัพย์สิน</assetsLink> · การแก้ไขมีผลกับหน้าเพิ่มและแก้ไขทรัพย์สินของหมวดหมู่นี้",
  formPrefixFallback: "ระบบใช้รหัสหมวดหมู่ <mono>{code}</mono> แทน",
  // Section 2: the add button, the two types this spec adds, the ใหม่ badge (G8P2-R2).
  addCustomField: "เพิ่มช่องข้อมูล", fieldTypeDate: "วันที่", fieldTypeBoolean: "ใช่/ไม่ใช่", newBadge: "ใหม่",
  // The side panel (G8P2-R3): its title, the usage line, the counts, the note naming the added fields.
  summaryTitle: "ผลของการแก้ไข", summaryModels: "รุ่นในหมวดหมู่", summaryFieldCount: "{count, number} ช่อง",
  summaryNewFields: "ช่อง <b>{names}</b> จะขึ้นในหน้าเพิ่มและแก้ไขทรัพย์สินหมวดหมู่นี้",
  // The sticky footer's status line and the save.
  footerEdit: "แก้ไข <b>{name}</b>", noChanges: "ยังไม่ได้แก้ไข", changeFieldsAdded: "เพิ่มช่องข้อมูล {count, number} ช่อง",
  save: "บันทึก",
} as const
