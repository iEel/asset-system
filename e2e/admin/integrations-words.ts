// The words the Integration API spec reads on screen (page group 12 plan 4 Task 3, spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §10, board AD-Integrations), as the app writes them in
// messages/th.json integrationApiPage and common. Plain data, no imports, so a node test can load it.
export const INTEGRATIONS_WORDS = {
  title: "Integration API Clients",
  // The four tiles (a <dl>: the label is the <dt>), the usage tile's unit and its foot.
  summaryActive: "Client ที่เปิดใช้งาน", summaryDisabled: "Client ที่ปิดใช้งาน", summaryLastUsed: "Client ที่เคยถูกใช้",
  usageTile: "การใช้งาน · 7 วัน", usageUnit: "ครั้ง", usageErrors: "Error {count}",
  // The status chips: a Segmented group named กรองสถานะ, each button its word and then its count ("ปิดใช้งาน 1").
  filterLabel: "กรองสถานะ", filterAll: "ทั้งหมด", active: "เปิดใช้งาน", disabled: "ปิดใช้งาน",
  // A row: never used, the unknown creator, the 7-day error badge.
  noLastUsed: "ยังไม่เคยใช้", createdUnknown: "ไม่ทราบผู้สร้าง", errorsBadge: "Error 7 วัน {count}",
  // A row's expand button and its detail: the latest error, or the line for a client with no calls.
  showUsage: "ดูการใช้งานของ {name}", hideUsage: "ซ่อนการใช้งานของ {name}",
  latestError: "Error ล่าสุด", topEndpoint: "Endpoint ที่เรียกบ่อย", noOperationalData: "ยังไม่มีการเรียกใช้",
  // The row's ⋯ menu and the item every viewer has.
  moreActions: "การทำงานอื่นของ {name}", historyItem: "ดูประวัติ",
  // The header's สร้าง client (it also titles the side panel), the panel's first step and its close X (common.close).
  createClient: "สร้าง client", stepDetails: "รายละเอียด client", close: "ปิด",
} as const
