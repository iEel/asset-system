// The words the system history and approval history spec reads on screen (page group 12 plan 2 Task 5, spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §4, §5, boards AD-Logs and AD-ApprovalHistory), as the
// app writes them in messages/th.json systemLogPage, approvalHistoryPage and common (tests/admin-logs-board.test.ts
// checks every value). Plain data, no imports, so the node test can load it.
export const LOGS_WORDS = {
  // The heading (also the table's caption) and the one GET form: its name, the tag box and the submit button.
  title: "ประวัติระบบ", filterForm: "ตัวกรองประวัติระบบ", tagSearch: "ค้นหารหัสทรัพย์สิน", submit: "กรอง",
  // A tag that finds no asset; one that finds exactly one ("{name} · {tag}" and the asset page's history link).
  tagNotFound: "ไม่พบทรัพย์สินรหัสนี้", tagSingleMatch: "{name} · {tag}", assetHistoryLink: "ดูประวัติทุกเรื่องของทรัพย์สินนี้",
  // The header line above the list, and its range when no date is chosen or a whole range is.
  headerLine: "{range} · {count, number} รายการ · ใหม่สุดก่อน", rangeAll: "ทั้งหมด", rangeBetween: "{from} – {to}",
  // A row: the create action's word; the arrow button's name, closed and open ({event} = "<action> <tag>").
  actionCreate: "สร้าง", expandRow: "ดูรายละเอียด {event}", collapseRow: "ซ่อนรายละเอียด {event}",
  // The expanded row's before/after table (its caption names it) and its column headers.
  changesCaption: "ค่าที่เปลี่ยน", before: "ก่อน", after: "หลัง",
  // The ผู้ใช้ chip ("ผู้ใช้: ทุกคน", a searchable popover named ผู้ใช้) and the filtered list's empty text.
  user: "ผู้ใช้", userAll: "ทุกคน", userSearch: "ค้นหาชื่อหรือชื่อผู้ใช้", emptyFiltered: "ไม่พบบันทึกที่ตรงกับตัวกรอง",
  // The date chip (its popover is named ช่วงวันที่; applied, the chip reads "ช่วงวันที่: <range>") and its วันนี้ preset.
  dateRange: "ช่วงวันที่", dateRangeApplied: "ช่วงวันที่: {range}", presetToday: "วันนี้",
} as const

export const APPROVAL_HISTORY_WORDS = {
  title: "ประวัติการตัดสินใจอนุมัติ",
  // The breadcrumb <nav> (common.breadcrumb): the inbox link, then this page as the current crumb.
  breadcrumb: "เส้นทางหน้า", breadcrumbInbox: "งานรออนุมัติ", breadcrumbHistory: "ประวัติการตัดสินใจ",
  // The ผู้ตัดสินใจ chip ("ผู้ตัดสินใจ: ทุกคน").
  actor: "ผู้ตัดสินใจ", actorAll: "ทุกคน",
  // A day heading starts "วันนี้ · <date>"; the empty list's title.
  today: "วันนี้", emptyTitle: "ยังไม่มีประวัติในเงื่อนไขนี้",
} as const
