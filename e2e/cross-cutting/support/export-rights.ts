// Which exports each E2E user may use (spec §6.5 "a role without the export permission does not see it"), as plain
// data the unit test pins against the code: the permission each export route requires (requirePermission in its
// route) and the role sets of spec §7 (run-plan.ts; since decision DX6 (ก) the IT head also holds the audit,
// maintenance and disposal exports). The reports page shows each export only with that permission
// (its canReportExport, canAssetExport, ... in src/app/[locale]/(dashboard)/reports/page.tsx), and its catalog lists
// the same six in "สิทธิ์รายงานของคุณ" with ใช้ได้ or ไม่มีสิทธิ์.
import { E2E_ROLE_PERMISSIONS, type E2eUserKey } from "../../support/run-plan.ts"

export type ExportKey = "overview" | "register" | "maintenance" | "audit" | "disposal" | "role"

export type ExportPlan = {
  key: ExportKey
  // The permission its route requires.
  permission: string
  // Its label in the catalog's permission list and on its buttons (messages/th.json reportsPage).
  label: string
  // The route a person's click downloads from.
  route: string
}

export const EXPORTS: readonly ExportPlan[] = [
  { key: "overview", permission: "report:export", label: "ส่งออกรายงานภาพรวม", route: "/api/reports/assets-overview/export" },
  { key: "register", permission: "asset:view", label: "ส่งออกทะเบียนทรัพย์สิน", route: "/api/assets/export" },
  { key: "maintenance", permission: "maintenance:export", label: "ส่งออกใบซ่อม", route: "/api/maintenance-tickets/export" },
  { key: "audit", permission: "audit:export", label: "ส่งออกรายการไม่ตรง", route: "/api/audit-findings/export" },
  { key: "disposal", permission: "disposal:export", label: "ส่งออกตัดจำหน่าย", route: "/api/disposal-requests/export" },
  { key: "role", permission: "role:export", label: "ส่งออกผลตรวจสิทธิ์ตามบทบาท", route: "/api/admin/roles/export" },
]

// Reports gated by a view permission rather than an export one (group 6 decision 10): the round's accounting Excel,
// downloaded from a round's page (disposalPage.rounds.exportReport). It is not in the reports page's catalog.
export type ViewReportKey = "disposalRound"

export const VIEW_REPORTS: ReadonlyArray<{ key: ViewReportKey; permission: string; label: string; route: string }> = [
  { key: "disposalRound", permission: "disposal:view", label: "ส่งออกรายงานส่งบัญชี", route: "/api/disposal-rounds/[id]/report" },
]

export function mayUseViewReport(user: E2eUserKey, key: ViewReportKey): boolean {
  const plan = VIEW_REPORTS.find((candidate) => candidate.key === key)
  if (!plan) throw new Error(`no view report ${key}`)
  return E2E_ROLE_PERMISSIONS[user].includes(plan.permission)
}

// The catalog's two words (reportsPage.allowed, reportsPage.notAllowed).
export const ALLOWED = "ใช้ได้"
export const NOT_ALLOWED = "ไม่มีสิทธิ์"

export function mayExport(user: E2eUserKey, key: ExportKey): boolean {
  const plan = EXPORTS.find((candidate) => candidate.key === key)
  if (!plan) throw new Error(`no export ${key}`)
  return E2E_ROLE_PERMISSIONS[user].includes(plan.permission)
}

// The catalog's badge for one export: "ส่งออกรายงานภาพรวม: ใช้ได้".
export function permissionBadge(user: E2eUserKey, plan: ExportPlan): string {
  return `${plan.label}: ${mayExport(user, plan.key) ? ALLOWED : NOT_ALLOWED}`
}
