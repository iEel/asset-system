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
  // Spec §7's roles: IT staff may use the overview and the register, the viewer the register only, and the IT head the
  // overview, the register and the three module exports (decision DX6 (ก)); no E2E role holds the role-audit export.
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("itStaff", plan.key)).map((plan) => plan.key), ["overview", "register"])
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("itHead", plan.key)).map((plan) => plan.key), ["overview", "register", "maintenance", "audit", "disposal"])
  assert.deepEqual(EXPORTS.filter((plan) => mayExport("viewer", plan.key)).map((plan) => plan.key), ["register"])
  assert.deepEqual(E2E_ROLE_PERMISSIONS.itHead.filter((permission) => permission.endsWith(":export")).sort(), ["audit:export", "disposal:export", "maintenance:export", "report:export"])
  assert.ok(!E2E_ROLE_PERMISSIONS.itStaff.some((permission) => permission.endsWith(":export") && permission !== "report:export"))
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
  assert.ok(!spec.includes(`test.fail(true, "M1: `) && !spec.includes(`test.fail(true, "M2: `))
  // DX6 (ก): the IT head's session downloads the repair, disposal and findings exports (no seed admin), and finding M1's
  // check runs as IT staff, who hold audit:view without audit:export.
  assert.ok(!spec.includes("ADMIN_STATE_FILE") && !spec.includes("playwright.request.newContext"), "no seed admin session")
  const itHead = spec.slice(spec.indexOf(`test.describe("the IT head"`))
  assert.ok(itHead.includes(`asUser("itHead")`))
  for (const route of ["/api/maintenance-tickets/export", "/api/disposal-requests/export", "/api/audit-findings/export?status=all", "/api/audit-findings/export-pdf?status=all"]) {
    assert.ok(itHead.includes(`"${route}"`), route)
  }
  assert.ok(!itHead.includes("toBe(403)"), "the IT head is refused none of them")
  const itStaff = spec.slice(spec.indexOf(`test.describe("IT staff"`), spec.indexOf(`test.describe("the viewer"`))
  assert.ok(itStaff.includes("(finding M1)") && !itHead.includes("(finding M1)"), "M1's check runs as IT staff")
})

test("roles and permissions: each refused page and request needs a permission the user lacks, checked before any read (e2e cross-cutting task 2, EM2)", async () => {
  const refusals = await import("../e2e/cross-cutting/support/refusals.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const { classify } = await import("../e2e/support/measure-core.ts")
  // Each page: its file asks requirePagePermission for the permission listed, before it reads a record; the approval
  // inbox is not found without disposal:approve or audit:approve.
  for (const refusal of refusals.VIEWER_PAGE_REFUSALS) {
    const page = read(`src/app/[locale]/(dashboard)/${refusal.file}`)
    assert.ok(refusals.lacks("viewer", refusal.permission), `the viewer lacks ${refusal.permission}`)
    if (refusal.permission === "approve-inbox") {
      assert.ok(page.includes("if (!snapshot.access.canAnyApproval) notFound()"), refusal.file)
      continue
    }
    const [moduleName, action] = refusal.permission.split(":")
    const call = `requirePagePermission(locale, "${moduleName}", "${action}")`
    assert.ok(page.includes(call), `${refusal.file}: ${call}`)
    assert.ok(page.indexOf("prisma.") < 0 || page.indexOf(call) < page.indexOf("prisma."), `${refusal.file}: the permission before any read`)
    const route = `/th/${refusal.file.replace(/\/page\.tsx$/, "").replace("[id]", refusal.path.includes(":asset") ? ":asset" : refusals.NO_RECORD)}`
    assert.equal(refusal.path, route, `${refusal.file}: its path`)
  }
  // Each request: its route's handler asks requirePermission for the permission listed before it reads a record, and
  // every record id is one that does not exist.
  for (const [user, list] of [["viewer", [...refusals.VIEWER_API_REFUSALS, ...refusals.APPROVE_API_REFUSALS]], ["itStaff", refusals.APPROVE_API_REFUSALS]] as const) {
    for (const refusal of list) assert.ok(refusals.lacks(user, refusal.permission), `${user} lacks ${refusal.permission}`)
  }
  for (const refusal of [...refusals.VIEWER_API_REFUSALS, ...refusals.APPROVE_API_REFUSALS]) {
    const handler = handlerBody(read(`src/app/api/${refusal.file}`), refusal.method)
    const call = requireCall(refusal.permission)
    assert.ok(handler.includes(call), `${refusal.file} ${refusal.method}: ${call}`)
    assert.ok(handler.indexOf("prisma.") < 0 || handler.indexOf(call) < handler.indexOf("prisma."), `${refusal.file} ${refusal.method}: the permission before any read`)
    assert.equal(refusal.path, `/api/${refusal.file.replace(/\/route\.ts$/, "").replace("[id]", refusals.NO_RECORD)}`, `${refusal.file}: its path`)
  }
  // The disposal decision picks its permission from the body: "decision" (any action but execute) is approve.
  assert.match(handlerBody(read("src/app/api/disposal-requests/[id]/route.ts"), "PATCH"), /if \(action === "execute"\) \{\n\s+requirePermission\(user, "disposal", "edit"\)\n\s+\} else \{\n\s+requirePermission\(user, "disposal", "approve"\)/)
  // The write controls are the app's own words.
  const messages = thai as Record<string, Record<string, Record<string, string> | string>>
  const words = [
    messages.asset.openImportWizard,
    messages.auditFinding.approve,
    messages.auditFinding.reject,
    messages.auditFinding.actionPlan,
    messages.auditFinding.closeFinding,
    messages.disposalPage.reviewRequest,
    (messages.maintenancePage.pmActions as Record<string, string>).pause,
    (messages.maintenancePage.pmActions as Record<string, string>).end,
    messages.disposalPage.executeDisposal,
  ]
  assert.deepEqual([...refusals.WRITE_BUTTON_NAMES], words)
  assert.deepEqual([...refusals.REVIEW_BUTTON_NAMES], words.slice(1, 5))
  assert.ok(refusals.isWriteLink("/th/assets/abc/edit?returnTo=%2Fth%2Fassets") && refusals.isWriteLink("/th/audit/rounds/abc/scan"))
  assert.ok(!refusals.isWriteLink("/th/assets/abc") && !refusals.isWriteLink("/th/audit/rounds/new-look") && !refusals.isWriteLink("/th/asset-management/scan"))
  // The screens a refusal ends on (their titles are plain text: findings, note N13).
  assert.equal((thai.accessDeniedPage as Record<string, string>).title, "ไม่มีสิทธิ์เข้าหน้านี้")
  assert.equal((thai.common as Record<string, string>).pageNotFoundTitle, "ไม่พบหน้าที่ต้องการ")
  // The reviewed allow-list entry for the top bar's fetch that a client redirect cancels: a cancelled fetch passes,
  // the same fetch answered 500 still fails, and any other cancelled request still fails.
  const page = "http://localhost:3100/th/assets/new"
  const notifications = "http://localhost:3100/api/notifications?locale=th"
  const classified = classify(
    {
      console: [],
      responses: [{ method: "GET", url: notifications, status: 500, resourceType: "fetch", pageUrl: page }],
      failures: [
        { method: "GET", url: notifications, errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page },
        { method: "GET", url: "http://localhost:3100/api/notifications/summary", errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page },
      ],
    },
    ALLOW_LIST,
    [],
  )
  assert.deepEqual(classified.allowed, [{ id: "topbar-notifications-cancelled-by-redirect", kind: "requestfailed", url: notifications }])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.status), [500])
  assert.deepEqual(classified.unexpectedFailures.map((failure) => failure.url), ["http://localhost:3100/api/notifications/summary"])
  assert.match(read("src/components/layout/topbar.tsx"), /fetch\(`\/api\/notifications\?locale=\$\{locale\}`\)/)
  // The spec: the suite's fixtures; findings M5 and M6 are fixed and M4 is decided (DX3 (ก)), none expected to fail.
  const spec = read("e2e/cross-cutting/roles.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  for (const finding of ["M4", "M5", "M6"]) assert.ok(!spec.includes(`test.fail(true, "${finding}: `), `${finding} is fixed`)
})

test("errors under the field in the real flow: each form's wrong entry, its field id, its sentence and where its save lands (e2e cross-cutting task 3, EM3)", () => {
  const spec = read("e2e/cross-cutting/field-errors.spec.ts")
  const common = thai.common as Record<string, Record<string, string> | string>
  const validation = common.validation as Record<string, string>
  const section = (name: string) => thai[name] as Record<string, string>
  // The sentences the spec reads are the app's own.
  for (const [constant, value] of [
    ["REQUIRED", validation.required],
    ["END_BEFORE_START", validation.endBeforeStart],
    ["HANDOVER_MODE_REQUIRED", section("checkout").handoverModeRequired],
    ["DUPLICATE_TAG", section("asset").duplicateAssetTag],
  ] as const) {
    assert.ok(spec.includes(`const ${constant} = "${value}"`), constant)
  }
  for (const [dialog, confirm] of [
    [section("checkout").reviewTitle, section("checkout").reviewConfirm],
    [section("checkin").reviewTitle, section("checkin").reviewConfirm],
    [section("transfer").reviewTitle, section("transfer").reviewConfirm],
  ]) {
    assert.ok(spec.includes(`page.getByRole("dialog", { name: "${dialog}" })`), dialog)
    assert.ok(spec.includes(`{ name: "${confirm}" }`), confirm)
  }
  assert.equal(common.save, "บันทึก")
  assert.match(read("e2e/cross-cutting/support/forms.ts"), /page\.getByRole\("button", \{ name: "บันทึก", exact: true \}\)\.click\(\)/)
  // Each form checks the field the test leaves wrong, with the code that sentence reads (the V track's validate()).
  const forms: [string, string, string][] = [
    ["src/components/assets/asset-form.tsx", `check("warrantyEndDate", warrantyChanged ? notBefore(values.warrantyEndDate, values.warrantyStartDate) : null)`, "asset-warranty-end"],
    ["src/components/assets/asset-form.tsx", `check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))`, "asset-tag"],
    ["src/components/asset-operations/checkout-form.tsx", `if (values.checkoutType === "user") check("handoverMode", required(values.handoverMode) && "handoverModeRequired")`, "checkout-handover-mode"],
    ["src/components/asset-operations/checkin-form.tsx", `check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100))`, "checkin-return-by"],
    ["src/components/asset-operations/transfer-form.tsx", `check("reason", required(values.reason) ?? maxLength(values.reason, 500))`, "transfer-reason"],
    ["src/components/maintenance/repair-record-form.tsx", `check("problem", required(values.problem) ?? maxLength(values.problem, 4000))`, "repair-record-problem"],
    ["src/components/maintenance/maintenance-plan-form.tsx", `check("title", required(values.title) ?? maxLength(values.title, 200))`, "maintenance-plan-title"],
    ["src/components/disposal/disposal-request-form.tsx", `check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))`, "disposal-request-reason"],
    ["src/components/audit/audit-round-form.tsx", `check("endDate", required(values.endDate) ?? notBefore(values.endDate, values.startDate))`, "audit-round-end-date"],
  ]
  for (const [file, rule, id] of forms) {
    const source = read(file)
    assert.ok(source.includes(rule), `${file}: ${rule}`)
    assert.ok(source.includes(`"${id}"`), `${file}: ${id}`)
    assert.ok(spec.includes(`expectFieldError(page, "${id}", `), `the spec checks ${id}`)
  }
  // Every other id the spec fills is a control of its form.
  const controls: Record<string, string[]> = {
    "src/components/assets/asset-form.tsx": ["asset-name", "asset-category", "asset-ownership-type", "asset-company", "asset-branch", "asset-department", "asset-current-location", "asset-status", "asset-condition", "asset-warranty-start"],
    "src/components/asset-operations/checkout-form.tsx": ["checkout-asset", "checkout-destination", "checkout-condition"],
    "src/components/asset-operations/checkin-form.tsx": ["checkin-checkout", "checkin-receive-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"],
    "src/components/asset-operations/transfer-form.tsx": ["transfer-asset"],
    "src/components/maintenance/repair-record-form.tsx": ["repair-record-asset"],
    "src/components/maintenance/maintenance-plan-form.tsx": ["maintenance-plan-asset"],
    "src/components/disposal/disposal-request-form.tsx": ["disposal-request-requested-by"],
    "src/components/audit/audit-round-form.tsx": ["audit-round-name", "audit-round-start-date"],
  }
  for (const [file, ids] of Object.entries(controls)) for (const id of ids) assert.ok(read(file).includes(`"${id}"`), `${file}: ${id}`)
  // Where each save lands, as the spec expects it.
  for (const [file, push] of [
    ["src/components/maintenance/repair-record-form.tsx", "router.push(appendOperationalReturnTo(`/${locale}/maintenance/${payload.id}`, returnTo))"],
    ["src/components/disposal/disposal-request-form.tsx", "router.push(`/${locale}/disposal/${payload.id}${uploadQuery}`)"],
    ["src/components/audit/audit-round-form.tsx", "router.push(`/${locale}/audit/rounds/${payload.id}`)"],
    ["src/components/asset-operations/transfer-form.tsx", "router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)"],
    ["src/components/assets/asset-form.tsx", "router.push(backHref)"],
  ]) {
    assert.ok(read(file).includes(push), `${file}: ${push}`)
  }
  // The asset form returns to the register with its search kept (the spec opens it filtered to its own tag).
  assert.match(read("src/lib/asset-return-navigation.ts"), /return `\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`/)
  // The audit round's scope is the run's room and the Draft status: the scope where reads both.
  const scope = read("src/lib/audit-round-scope.ts")
  assert.ok(scope.includes("...(input.scopeLocationId ? { currentLocationId: input.scopeLocationId } : {}),") && scope.includes("...(input.scopeStatusId ? { statusId: input.scopeStatusId } : {}),"))
  // The spec: the suite's fixtures, and findings M3, M8 and M9 expected to fail until fixed (M9 on the phone only).
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  assert.ok(!spec.includes(`test.fail(true, "M3: `) && !spec.includes(`test.fail(true, "M8: `) && !spec.includes(`"M9: `))
})
