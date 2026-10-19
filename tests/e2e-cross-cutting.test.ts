import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's cross-cutting workflows (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.5
// reports and exports, §6.6 roles and permissions, §6.7 errors under the field; tasks EM1–EM3). One test per task,
// appended in order. The workflows run with `npm run test:e2e`; these pin the data they stand on against the code, so a
// route or a page that changes its permission, its field id or its sentence fails here first. The working tree is CRLF
// on Windows: every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const thai = JSON.parse(read("messages/th.json")) as Record<string, Record<string, unknown>>

// The body of one exported handler (export async function GET/POST/PUT/PATCH) of a route file.
function handlerBody(source: string, method: string): string {
  const start = source.indexOf(`export async function ${method}(`)
  assert.ok(start >= 0, `${method} handler`)
  const next = source.indexOf("\nexport ", start + 1)
  return source.slice(start, next < 0 ? undefined : next)
}

// `requirePermission(user, "asset", "edit")` for "asset:edit".
function requireCall(permission: string): string {
  const [moduleName, action] = permission.split(":")
  return `requirePermission(user, "${moduleName}", "${action}")`
}

test("reports and exports: each export's route permission, the reports page's gates and labels, the run's assets (e2e cross-cutting task 1, EM1)", async () => {
  const { EXPORTS, mayExport, permissionBadge, ALLOWED, NOT_ALLOWED } = await import("../e2e/cross-cutting/support/export-rights.ts")
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  const reportsPage = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  const labels = thai.reportsPage as Record<string, string>
  // Each export's route requires the permission export-rights.ts names, first thing in its GET.
  const routeFiles: Record<string, string> = {
    overview: "src/app/api/reports/assets-overview/export/route.ts",
    register: "src/app/api/assets/export/route.ts",
    maintenance: "src/app/api/maintenance-tickets/export/route.ts",
    audit: "src/app/api/audit-findings/export/route.ts",
    disposal: "src/app/api/disposal-requests/export/route.ts",
    role: "src/app/api/admin/roles/export/route.ts",
  }
  const gates: Record<string, string> = { overview: "canReportExport", register: "canAssetExport", maintenance: "canMaintenanceExport", audit: "canAuditExport", disposal: "canDisposalExport", role: "canRoleExport" }
  const labelKeys: Record<string, string> = { overview: "exportAssetOverview", register: "exportAssetRegister", maintenance: "exportMaintenance", audit: "exportAuditFindings", disposal: "exportDisposal", role: "exportRoleAudit" }
  assert.deepEqual(EXPORTS.map((plan) => plan.key), ["overview", "register", "maintenance", "audit", "disposal", "role"])
  for (const plan of EXPORTS) {
    const get = handlerBody(read(routeFiles[plan.key]), "GET")
    assert.ok(get.includes(requireCall(plan.permission)), `${plan.key}: ${plan.permission}`)
    assert.ok(get.indexOf(requireCall(plan.permission)) < get.indexOf("prisma."), `${plan.key}: the permission before any read`)
    assert.equal(routeFiles[plan.key], `src/app${plan.route}/route.ts`, `${plan.key}: its route`)
    const [moduleName, action] = plan.permission.split(":")
    assert.ok(reportsPage.includes(`const ${gates[plan.key]} = hasPermission(user, "${moduleName}", "${action}")`), `${plan.key}: the reports page's gate`)
    assert.equal(plan.label, labels[labelKeys[plan.key]], `${plan.key}: its label`)
  }
  assert.deepEqual([ALLOWED, NOT_ALLOWED], [labels.allowed, labels.notAllowed])
  // Spec §7's roles: IT staff and the IT head may use the overview and the register, the viewer the register only, and
  // none of them a module export (no <module>:export in spec §7; finding M1's test shows the audit pages offer it).
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("itStaff", plan.key)).map((plan) => plan.key), ["overview", "register"])
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("itHead", plan.key)).map((plan) => plan.key), ["overview", "register"])
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("viewer", plan.key)).map((plan) => plan.key), ["register"])
  assert.ok(!E2E_ROLE_PERMISSIONS.itHead.some((permission) => permission.endsWith(":export") && permission !== "report:export"))
  assert.equal(permissionBadge("viewer", EXPORTS[0]), `${labels.exportAssetOverview}: ${labels.notAllowed}`)
  // The report views' tab names and the overview's export filenames the spec reads.
  assert.deepEqual([labels.viewAccounting, labels.viewOperations, labels.viewCatalog, labels.viewNavigation], ["บัญชี", "การปฏิบัติงาน", "คลังรายงาน", "มุมมองรายงาน"])
  assert.match(read("src/app/api/assets/export/route.ts"), /workbookResponse\(buffer, `assets-export-\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}\.xlsx`\)/)
  assert.match(read("src/app/api/reports/assets-overview/export/route.ts"), /\{ metric: "Total Assets", value: totalAssets \},\n\s+\{ metric: "Total Purchase Value", value: Number\(totalValue\._sum\.purchasePrice \?\? 0\) \},/)
  // The assets are IT staff's, through the asset API with every preprocessed optional key present (foundation N3).
  const records = read("e2e/cross-cutting/support/records.ts")
  for (const key of ["licenseTotalSeats: null", "licenseUsedSeats: null", "warrantyStartDate: null", "warrantyEndDate: null"]) assert.ok(records.includes(key), key)
  assert.ok(records.includes(`handoverMode: "permanent_assignment"`), "the handover mode the checkout schema takes")
  // The spec: every test imports the suite's fixtures; finding M1 and M2 stay expected to fail until fixed.
  const spec = read("e2e/cross-cutting/reports.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  assert.ok(spec.includes(`test.fail(true, "M1: `) && spec.includes(`test.fail(true, "M2: `))
})
