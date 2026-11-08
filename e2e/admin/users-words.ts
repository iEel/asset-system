// The words the user list spec reads on screen (page group 11 plan 1 Task 4, spec
// docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md §4, boards US-Users and US-Users-Phone), as the
// app writes them in messages/th.json (tests/admin-users-board.test.ts checks every value is one of th.json's). Plain
// data, no imports, so the node test can load it.
export const USERS_WORDS = {
  // The page's heading and the search button, whose word also names the search field (MasterDataSearch).
  title: "จัดการผู้ใช้", search: "ค้นหา",
  // The status chips (a <nav> of links, each with its count) and the role chip ("บทบาท: ทุกบทบาท", a searchable popover).
  statusNavigation: "กรองตามสถานะ", statusAll: "ทั้งหมด", statusActive: "ใช้งาน", statusInactive: "ไม่ใช้งาน",
  statusNever: "ไม่เคยเข้าสู่ระบบ", statusReview: "ควรตรวจ",
  roleFilter: "บทบาท", roleFilterAll: "ทุกบทบาท", roleFilterSearch: "ค้นหาบทบาท",
  // A row's left-employee badge, the warning's title and link, and the name of a row and of a phone card's name link.
  employeeLeft: "พนักงานลาออกแล้ว", reviewTitle: "ควรตรวจ {count, number} บัญชี", reviewLink: "ดู {count, number} บัญชีนี้",
  editUserLabel: "แก้ไขผู้ใช้ {name} ({username})",
} as const

// The words the user form spec reads (page group 11 plan 2 Task 5, spec §5, board US-User-Edit), from
// messages/th.json adminUsersPage(.form) and common (tests/admin-user-form-board.test.ts checks each one).
export const USER_FORM_WORDS = {
  // The headings: create, and edit as "แก้ไขผู้ใช้ · <name>".
  createTitle: "เพิ่มผู้ใช้", editTitle: "แก้ไขผู้ใช้",
  // The AD choice (a radio named by its label), the employee picker's search, and the hint under a suggested username.
  authAd: "เข้าระบบด้วย AD (แนะนำ)", employeeSearch: "ค้นหาชื่อหรือรหัสพนักงาน",
  usernameSuggested: "เดาจากอีเมลพนักงาน ตรวจให้ตรงกับชื่อเข้าระบบ AD เช่น veerapon.l",
  // The role search, the access preview's table (its caption), the footer's note and save.
  roleSearch: "ค้นหาบทบาท", previewTitle: "หลังบันทึก ผู้ใช้นี้จะทำอะไรได้", note: "หมายเหตุ", save: "บันทึก",
  // อื่น ๆ, its close and reopen items (also the dialogs' confirm buttons), and the dialogs' titles.
  more: "อื่น ๆ", closeAccount: "ปิดใช้งานบัญชี", reopenAccount: "เปิดใช้งานบัญชี",
  closeTitle: "ปิดใช้งานบัญชี {name}", reopenTitle: "เปิดใช้งานบัญชี {name}",
  // The status badge in the edit header (common.active / common.inactive).
  active: "ใช้งาน", inactive: "ไม่ใช้งาน",
} as const
