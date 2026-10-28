// Roles and permissions (spec §6.6) as plain data the unit test pins against the code: the create, edit and approve
// pages and requests each E2E user is refused, the permission each needs (the page's requirePagePermission, the
// route's requirePermission), and the controls a read-only list must not offer. Every request carries an empty body
// (a GET carries no body) and a record id that does not exist, so even a route that failed to check the permission
// could not change a record: each checks the permission before it reads the body or a record (the unit test pins that
// order).
import { E2E_ROLE_PERMISSIONS, type E2eUserKey } from "../../support/run-plan.ts"

// The id of no record: every route checks the permission before it looks the record up.
export const NO_RECORD = "e2e-no-such-record"

export type PageRefusal = {
  // The page a person opens; ":asset" is the test's own E2E asset, any other id is NO_RECORD.
  path: string
  // The page file under src/app/[locale]/(dashboard)/.
  file: string
  // The permission requirePagePermission asks for, or "approve-inbox" for the approval inbox (a 404 without
  // disposal:approve or audit:approve, src/lib/approval-inbox-query.ts).
  permission: string
}

export const VIEWER_PAGE_REFUSALS: readonly PageRefusal[] = [
  { path: "/th/assets/new", file: "assets/new/page.tsx", permission: "asset:create" },
  { path: "/th/assets/:asset/edit", file: "assets/[id]/edit/page.tsx", permission: "asset:edit" },
  { path: "/th/asset-management/checkout", file: "asset-management/checkout/page.tsx", permission: "asset:edit" },
  { path: "/th/asset-management/checkin", file: "asset-management/checkin/page.tsx", permission: "asset:edit" },
  { path: "/th/asset-management/transfer", file: "asset-management/transfer/page.tsx", permission: "asset:edit" },
  { path: "/th/asset-management/bulk-move", file: "asset-management/bulk-move/page.tsx", permission: "asset:edit" },
  { path: "/th/audit/rounds/new", file: "audit/rounds/new/page.tsx", permission: "audit:create" },
  { path: `/th/audit/rounds/${NO_RECORD}/scan`, file: "audit/rounds/[id]/scan/page.tsx", permission: "audit:edit" },
  { path: "/th/maintenance/new", file: "maintenance/new/page.tsx", permission: "maintenance:create" },
  { path: "/th/maintenance/pm/new", file: "maintenance/pm/new/page.tsx", permission: "maintenance:create" },
  { path: `/th/maintenance/pm/${NO_RECORD}/edit`, file: "maintenance/pm/[id]/edit/page.tsx", permission: "maintenance:edit" },
  { path: "/th/disposal/new", file: "disposal/new/page.tsx", permission: "disposal:create" },
  { path: "/th/disposal/batch/new", file: "disposal/batch/new/page.tsx", permission: "disposal:create" },
  { path: "/th/admin/approvals", file: "admin/approvals/page.tsx", permission: "approve-inbox" },
]

export type ApiRefusal = {
  method: "GET" | "POST" | "PUT" | "PATCH"
  // The request's path, with NO_RECORD for a record id.
  path: string
  // The route file under src/app/api/ and its handler.
  file: string
  permission: string
  // The body, empty unless the route picks its permission from it (the disposal PATCH: "decision" is approve); a GET
  // sends none.
  body: Record<string, unknown>
}

export const VIEWER_API_REFUSALS: readonly ApiRefusal[] = [
  { method: "POST", path: "/api/assets", file: "assets/route.ts", permission: "asset:create", body: {} },
  { method: "PUT", path: `/api/assets/${NO_RECORD}`, file: "assets/[id]/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: `/api/assets/${NO_RECORD}/checkout`, file: "assets/[id]/checkout/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: `/api/assets/${NO_RECORD}/checkin`, file: "assets/[id]/checkin/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: `/api/assets/${NO_RECORD}/transfer`, file: "assets/[id]/transfer/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: "/api/assets/bulk-move", file: "assets/bulk-move/route.ts", permission: "asset:edit", body: {} },
  { method: "GET", path: "/api/asset-operations/search", file: "asset-operations/search/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: "/api/audit-rounds", file: "audit-rounds/route.ts", permission: "audit:create", body: {} },
  { method: "POST", path: `/api/audit-rounds/${NO_RECORD}/scan`, file: "audit-rounds/[id]/scan/route.ts", permission: "audit:edit", body: {} },
  { method: "POST", path: "/api/maintenance-tickets", file: "maintenance-tickets/route.ts", permission: "maintenance:create", body: {} },
  { method: "PATCH", path: `/api/maintenance-tickets/${NO_RECORD}`, file: "maintenance-tickets/[id]/route.ts", permission: "maintenance:edit", body: {} },
  { method: "POST", path: "/api/maintenance-plans", file: "maintenance-plans/route.ts", permission: "maintenance:create", body: {} },
  { method: "PATCH", path: `/api/maintenance-plans/${NO_RECORD}`, file: "maintenance-plans/[id]/route.ts", permission: "maintenance:edit", body: {} },
  { method: "POST", path: "/api/disposal-requests", file: "disposal-requests/route.ts", permission: "disposal:create", body: {} },
  { method: "POST", path: "/api/disposal-batches", file: "disposal-batches/route.ts", permission: "disposal:create", body: {} },
  { method: "POST", path: "/api/disposal-requests/bulk-execution", file: "disposal-requests/bulk-execution/route.ts", permission: "disposal:edit", body: {} },
]

// Spec §6.6 "IT staff are refused the approve and review actions": the review of a finding (approve, reject, plan and
// close all go through it), the round's close, a disposal decision and the bulk approval. The viewer is refused
// them too.
export const APPROVE_API_REFUSALS: readonly ApiRefusal[] = [
  { method: "POST", path: `/api/audit-findings/${NO_RECORD}/review`, file: "audit-findings/[id]/review/route.ts", permission: "audit:approve", body: {} },
  { method: "PATCH", path: `/api/audit-rounds/${NO_RECORD}`, file: "audit-rounds/[id]/route.ts", permission: "audit:approve", body: {} },
  { method: "PATCH", path: `/api/disposal-requests/${NO_RECORD}`, file: "disposal-requests/[id]/route.ts", permission: "disposal:approve", body: { action: "decision" } },
  { method: "POST", path: "/api/disposal-requests/bulk-decision", file: "disposal-requests/bulk-decision/route.ts", permission: "disposal:approve", body: {} },
]

// The pages a view-only person reads (spec §6.6 "sees read-only lists"): the asset register, the run's asset, the
// audit rounds and findings, repair records, PM plans, disposal requests and batches.
export const READ_ONLY_LISTS: readonly string[] = [
  "/th/assets",
  "/th/assets/:asset",
  "/th/audit/rounds",
  "/th/audit/findings",
  "/th/maintenance",
  "/th/maintenance/pm",
  "/th/disposal",
  "/th/disposal/batches",
]

// A link to one of these pages, or a control with one of these names, is an action the viewer cannot take.
export const WRITE_LINK_PATTERNS: readonly RegExp[] = [
  /^\/th\/assets\/new(?:[?#]|$)/,
  /^\/th\/assets\/[^/?#]+\/edit(?:[?#]|$)/,
  /^\/th\/asset-management\/(?:checkout|checkin|transfer|bulk-move)(?:[?#]|$)/,
  /^\/th\/audit\/rounds\/new(?:[?#]|$)/,
  /^\/th\/audit\/rounds\/[^/?#]+\/scan(?:[?#]|$)/,
  /^\/th\/maintenance\/new(?:[?#]|$)/,
  /^\/th\/maintenance\/pm\/new(?:[?#]|$)/,
  /^\/th\/maintenance\/pm\/[^/?#]+\/edit(?:[?#]|$)/,
  /^\/th\/disposal\/(?:new|batch\/new)(?:[?#]|$)/,
  /^\/th\/admin\/approvals(?:[?#]|$)/,
]
// messages/th.json: asset.openImportWizard, auditFinding.approve / reject / actionPlan / closeFinding,
// disposalPage.reviewRequest, and the PM plan's state buttons (maintenancePage).
export const WRITE_BUTTON_NAMES: readonly string[] = ["เปิดตัวช่วยนำเข้า", "อนุมัติ", "ปฏิเสธ", "แผนแก้ไข", "ปิดรายการไม่ตรง", "พิจารณาคำขอ", "พักแผน", "จบแผน", "บันทึกตัดจำหน่ายจริง"]
// The four controls of a finding's review, which all need audit:approve.
export const REVIEW_BUTTON_NAMES: readonly string[] = ["อนุมัติ", "ปฏิเสธ", "แผนแก้ไข", "ปิดรายการไม่ตรง"]

export function lacks(user: E2eUserKey, permission: string): boolean {
  if (permission === "approve-inbox") return !E2E_ROLE_PERMISSIONS[user].some((held) => held === "disposal:approve" || held === "audit:approve")
  return !E2E_ROLE_PERMISSIONS[user].includes(permission)
}

export function isWriteLink(href: string): boolean {
  return WRITE_LINK_PATTERNS.some((pattern) => pattern.test(href))
}
