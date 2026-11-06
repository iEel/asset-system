// The words the companies, branches and departments spec reads on screen (page group 8 plan 1, spec
// docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3–§5), as the app writes them in
// messages/th.json (tests/e2e-master-data.test.ts checks every value is one of th.json's). Plain data, no imports, so
// the node test can load it.
export const ORG_LIST_WORDS = {
  // The three lists' headings and the forms their ⋯ opens.
  companiesTitle: "บริษัท", branchesTitle: "สาขา", departmentsTitle: "แผนก", branchCreateTitle: "เพิ่มสาขา", locationCreateTitle: "เพิ่มที่ตั้ง",
  back: "กลับ",
  // The record-status segmented control (common.recordStatus), the status column under ทั้งหมด and its badge, the
  // footer's counts on the companies list.
  recordStatusLabel: "สถานะข้อมูล", recordActive: "ใช้งาน", recordInactive: "ไม่ใช้งาน", recordAll: "ทั้งหมด", statusColumn: "สถานะ",
  footerCounts: "ใช้งาน {active, number} · ไม่ใช้งาน {inactive, number}",
  // The phone's table: the scroll hint above a table wider than the screen.
  tableScrollHint: "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม",
  // A row's ⋯ (MasterDataRowActions): แก้ไข first, the board's links, ปิดใช้งาน only with <module>:delete.
  moreActionsFor: "การดำเนินการของ {code}", edit: "แก้ไข", deactivate: "ปิดใช้งาน",
  // Board MD-Companies: the second line, the asset-tag code's fallback, the missing tax id, ⋯ เพิ่มสาขาให้บริษัทนี้.
  noNameEn: "ยังไม่มีชื่อภาษาอังกฤษ", assetTagCodeFallback: "เว้นว่าง ใช้รหัสบริษัทแทน", taxIdMissing: "ยังไม่ระบุ",
  addBranch: "เพิ่มสาขาให้บริษัทนี้",
  // Board MD-Branches: ⋯ เพิ่มที่ตั้งในสาขานี้ and ดูพนักงานในสาขานี้ ({n}), the footer's totals over the filtered set.
  addLocation: "เพิ่มที่ตั้งในสาขานี้", viewEmployees: "ดูพนักงานในสาขานี้ ({count, number})",
  branchFooterTotals: "ที่ตั้ง {locations, number} · พนักงาน {employees, number} · ทรัพย์สิน {assets, number}",
  // Board MD-Departments: the note under a held asset count, the summary line with the default sort (by name).
  moveBeforeDeactivate: "โอนย้ายก่อนปิดใช้งาน", departmentNameSort: "ชื่อแผนก",
  departmentSummaryLine: "{departments, number} แผนก · ยังมีทรัพย์สินผูกอยู่ {withAssets, number} แผนก รวม {assets, number} รายการ · เรียงตาม{sort}",
  // The register (group 8 plan 1 Task 4): the chip group and the department chip's label.
  activeFilters: "ตัวกรองที่ใช้อยู่", departmentChip: "แผนก",
} as const
