// The words the dashboard checks read on screen, as the app writes them in messages/th.json (tests/e2e-dashboard.test.ts
// checks every value is one of th.json's). Plain data, no imports, so the node test can load it.
export const DASHBOARD_WORDS = {
  waitingTitle: "งานที่รอคุณ", totalAssets: "ทรัพย์สินทั้งหมด", custodianAssigned: "มีผู้ถือครอง",
  noteCustodian: "มีผู้ถือครอง ไม่รวมตัดจำหน่ายแล้วและปลดระวาง", openWorkCenter: "เปิดศูนย์งานค้าง",
  scopeNavigation: "ขอบเขตข้อมูล", activeFilters: "ตัวกรองที่ใช้อยู่",
  auditRoundKpi: "รอบตรวจนับ {code}", auditFoot: "ตรวจแล้ว {processed} / {expected} · ควรถึง {pace}",
  branchBarLabel: "{branch} ตรวจแล้ว {percent} ควรถึงวันนี้ {pace}", branchBehind: "ช้ากว่าที่ควร",
  // The approvals page's total cell (approvalInboxPage.total) and the repair form's "not finished" choice (doneNo).
  approvalsTotal: "ทั้งหมด", repairNotDone: "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)",
} as const

// The kinds of งานที่รอคุณ in the shared order (src/lib/waiting-work-rules.ts WAITING_WORK_KEYS), each with the title
// the dashboard row and the bell row both read (messages/th.json notifications.<key>).
export const WAITING_TITLES = {
  approvalInbox: "งานรออนุมัติ",
  openRepairs: "ซ่อมยังไม่เสร็จ",
  stuckRepairs: "รอซ่อมแต่ยังไม่มีบันทึกซ่อม",
  duePm: "PM ถึงกำหนด",
  pendingAuditFindings: "รายการไม่ตรงรอพิจารณา",
  openAuditActions: "แผนแก้ไขยังเปิด",
  auditActionsDueSoon: "แผนแก้ไขใกล้ครบกำหนด",
  pendingDisposals: "ตัดจำหน่ายรอพิจารณา",
  approvedDisposals: "อนุมัติแล้ว รอตัดจำหน่าย",
  returnsDueSoon: "ใกล้/เลยกำหนดคืน",
  warrantyExpiringSoon: "ประกันใกล้หมดอายุ",
  licenseExpiringSoon: "License ใกล้หมดอายุ",
} as const
export type WaitingKey = keyof typeof WAITING_TITLES
export const WAITING_ORDER = Object.keys(WAITING_TITLES) as WaitingKey[]

// The sections of each profile (src/lib/dashboard-overview-rules.ts DASHBOARD_SECTION_ORDER).
export const SECTION_ORDER = {
  work: ["waiting", "branches", "status", "recent"],
  overview: ["status", "branches", "waiting", "recent"],
} as const
