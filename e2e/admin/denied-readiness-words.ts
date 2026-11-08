// The words the denied-page and readiness spec reads on screen (page group 12 plan 1 Task 4, spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §6, §9, boards AD-Denied and AD-Readiness), as the app
// writes them in messages/th.json accessDeniedPage, adminRolesPage, nav and productionReadinessPage. Plain data, no
// imports, so a node test can load it (tests/access-denied.test.ts pins it against the messages).
export const DENIED_WORDS = {
  // The title names the blocked page by its menu name (nav.productionReadiness for the readiness page, which asks for
  // setting:view; the suite never names the settings page's path, tests/e2e-review.test.ts HZ1).
  titleNamed: "ไม่มีสิทธิ์เปิดหน้า {page}",
  readinessPage: "ความพร้อมใช้งานจริง",
  // The permission line, in Thai words: setting:view reads "ดู · ตั้งค่าระบบ"; the approvals pages ask for either approve.
  needs: "สิทธิ์ที่ต้องใช้: {permission}",
  permissionWords: "{action} · {module}",
  actionView: "ดู",
  moduleSetting: "ตั้งค่าระบบ",
  approvalWords: "อนุมัติ · ตัดจำหน่าย หรือ อนุมัติ · ตรวจนับ",
  // The roles line starts with this; the roles follow, joined " · ".
  yourRoles: "บทบาทของคุณ: {roles}",
  goBack: "กลับหน้าก่อน",
  backHome: "กลับหน้าแรก",
} as const

export const READINESS_WORDS = {
  title: "ความพร้อมใช้งานจริง",
  // The four groups, in the page's order (READINESS_GROUPS in src/lib/readiness-presenter.ts).
  groups: [
    "การเข้าระบบและผู้ดูแลระบบ",
    "สำรองข้อมูลและงานตามเวลา",
    "ป้าย QR ขั้นตอนงาน และข้อมูลหลัก",
    "ไฟล์และการติดตั้งแอป",
  ],
  // The chips' <nav> and their words; the sum line "{fail} + {warning} + {pass} = {total}"; the empty filter's text.
  filterLabel: "สถานะผลตรวจ",
  filterAll: "ทั้งหมด",
  filterFail: "ต้องแก้",
  filterWarning: "ควรตรวจ",
  filterPass: "พร้อม",
  statusFail: "ต้องแก้",
  filterEmpty: "ไม่มีรายการในสถานะนี้",
} as const
