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
  { method: "POST", path: `/api/assets/${NO_RECORD}/component-return`, file: "assets/[id]/component-return/route.ts", permission: "asset:edit", body: {} },
  // ถอดส่วนควบ is a POST since group 4 plan 4 (P4-R1): it marks the link removed, nothing is deleted.
  { method: "POST", path: `/api/assets/${NO_RECORD}/components/${NO_RECORD}/remove`, file: "assets/[id]/components/[componentId]/remove/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: "/api/assets/bulk-move", file: "assets/bulk-move/route.ts", permission: "asset:edit", body: {} },
  // The Excel import's check and confirm (group 4 plan 5, P5-R1: the suite may name them since 2026-11-02). Each checks
  // asset:create before it reads the form, so the empty body never reaches the parser.
  { method: "POST", path: "/api/assets/import-preview", file: "assets/import-preview/route.ts", permission: "asset:create", body: {} },
  { method: "POST", path: "/api/assets/import-confirm", file: "assets/import-confirm/route.ts", permission: "asset:create", body: {} },
  { method: "GET", path: "/api/asset-operations/search", file: "asset-operations/search/route.ts", permission: "asset:edit", body: {} },
  { method: "GET", path: "/api/asset-operations/bulk-move-list", file: "asset-operations/bulk-move-list/route.ts", permission: "asset:edit", body: {} },
  // asset:create or asset:edit (P3-R2); the viewer has neither, and the route names asset:edit.
  { method: "GET", path: "/api/purchase-documents/search", file: "purchase-documents/search/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: "/api/purchase-documents/check-duplicates", file: "purchase-documents/check-duplicates/route.ts", permission: "asset:edit", body: {} },
  { method: "POST", path: `/api/assets/${NO_RECORD}/purchase-documents`, file: "assets/[id]/purchase-documents/route.ts", permission: "asset:edit", body: {} },
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
// asset import and export page (where the import wizard lives since page group 4 plan 1 took it off the register), the
// audit rounds and findings, repair records, PM plans, disposal requests and batches.
export const READ_ONLY_LISTS: readonly string[] = [
  "/th/assets",
  "/th/assets/:asset",
  "/th/asset-management/import-export",
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
  // The import card's template link, which only a person with asset:create sees (the import page and the register's
  // import menu); a link, so writeControls catches it here and not by its name (plan 5 final review).
  /^\/api\/assets\/import-template(?:[?#]|$)/,
]
// messages/th.json: auditFinding.approve / reject / actionPlan / closeFinding, disposalPage.reviewRequest and
// executeDisposal. The import card has no button a viewer could see by name since group 4 plan 5 opened it on arrival
// ("เปิดตัวช่วยนำเข้า" went with the toggle); its template link is in WRITE_LINK_PATTERNS. The PM plan's พักแผน and
// จบแผน moved inside the row's ⋯ (group 5 plan 4), which WRITE_MENU_NAMES catches.
export const WRITE_BUTTON_NAMES: readonly string[] = ["อนุมัติ", "ปฏิเสธ", "แผนแก้ไข", "ปิดรายการไม่ตรง", "พิจารณาคำขอ", "บันทึกตัดจำหน่าย"]
// A ⋯ that holds only write actions, by its name (aria-label): the PM page's row menu "การดำเนินการของแผน <planNo>"
// (maintenancePage.pmRowActions), drawn only with maintenance:edit. The viewer's PM page shows no ⋯ at all.
export const WRITE_MENU_NAMES: readonly RegExp[] = [/^การดำเนินการของแผน /]
// A create link by its words, beside its address: the PM page's "เพิ่มแผน PM" (maintenancePage.pmCreateTitle).
export const WRITE_LINK_NAMES: readonly string[] = ["เพิ่มแผน PM"]
// The four controls of a finding's review, which all need audit:approve.
export const REVIEW_BUTTON_NAMES: readonly string[] = ["อนุมัติ", "ปฏิเสธ", "แผนแก้ไข", "ปิดรายการไม่ตรง"]

export function lacks(user: E2eUserKey, permission: string): boolean {
  if (permission === "approve-inbox") return !E2E_ROLE_PERMISSIONS[user].some((held) => held === "disposal:approve" || held === "audit:approve")
  return !E2E_ROLE_PERMISSIONS[user].includes(permission)
}

export function isWriteLink(href: string): boolean {
  return WRITE_LINK_PATTERNS.some((pattern) => pattern.test(href))
}
