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
  // A row's left-employee badge, the warning's title and link, and a phone card's name.
  employeeLeft: "พนักงานลาออกแล้ว", reviewTitle: "ควรตรวจ {count, number} บัญชี", reviewLink: "ดู {count, number} บัญชีนี้",
  editUserLabel: "แก้ไขผู้ใช้ {name}",
} as const
