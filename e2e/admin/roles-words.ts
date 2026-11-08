// The words the roles spec reads on screen (page group 11 plan 3 Task 5, spec
// docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md §6, §7, boards US-Roles and US-Role-Edit), as the
// app writes them in messages/th.json adminRolesPage, adminRolesPage.form and common. Plain data, no imports, so a node
// test can load it.
export const ROLES_WORDS = {
  // The list: the heading, the search (its button's word also names the field), the tabs <nav> and the matrix tab, whose
  // word is also the matrix table's caption; a role's permission count.
  title: "สิทธิ์การใช้งาน", search: "ค้นหา", viewLabel: "มุมมอง", tabMatrix: "ตารางสิทธิ์ตามโมดูล",
  permissionsOf: "{count, number} / {total, number}",
  // The create page's heading, the edit page's ("แก้ไขสิทธิ์บทบาท · <name>"), and the footer's save.
  createTitle: "เพิ่มบทบาท", editTitle: "แก้ไขสิทธิ์บทบาท · {name}", save: "บันทึกสิทธิ์",
  // The matrix: the Thai actions (adminRolesPage.actions, the start of a cell's name), the audit module's Thai name, and
  // a cell's name once it is ticked.
  actions: { view: "ดู", create: "เพิ่ม", edit: "แก้ไข", delete: "ลบ", export: "ส่งออก", approve: "อนุมัติ" },
  moduleAudit: "ตรวจนับ",
  cellAdded: "{action} {module} (เพิ่มใหม่)",
  // The change summary, its lines, and the segregation warning's title and audit line.
  summaryTitle: "การเปลี่ยนแปลง {before, number} → {after, number}", summaryAdd: "เพิ่ม {action} · {module}",
  sodTitle: "ทำรายการและอนุมัติได้ในบทบาทเดียว",
  sodAudit: "ตรวจนับ เพิ่ม + อนุมัติ · ระบบกันไม่ให้ปิดรอบที่ตัวเองสร้าง และพิจารณารายการไม่ตรงที่ตัวเองรายงานเสมอ",
  // The note (footer from sm, and the add dialog's).
  noteOptional: "หมายเหตุ (ไม่บังคับ)",
  // People in the role and the add dialog.
  peopleEmpty: "ยังไม่มีผู้ใช้ในบทบาทนี้", peopleAll: "ดูทั้งหมดในหน้าจัดการผู้ใช้", addUsers: "เพิ่มผู้ใช้เข้าบทบาทนี้",
  addUsersSearch: "ค้นหาชื่อหรือชื่อผู้ใช้", addUsersPicked: "เลือก {count, number} คน (สูงสุด 50)",
  addUsersConfirm: "เพิ่ม {count, number} คน", addUsersDone: "เพิ่มแล้ว {count, number} คน",
  // The user list's heading, where ดูทั้งหมด leads.
  usersTitle: "จัดการผู้ใช้",
} as const
