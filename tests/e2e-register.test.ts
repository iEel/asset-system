import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The register's E2E specs of page group 4 plan 1 (plan docs/superpowers/plans/2026-11-01-group4-register.md, Task 8;
// spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §17): what they stand on — the app's own
// words, the suite's fixtures and user, the stable hooks the plan keeps, assets of their own and no master data — and
// the locators the register's change moved (the dashboard's สถานะอื่น tab, the import wizard's page in the viewer's
// lists). The specs run with `npm run test:e2e`; these pins need no app. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the register's specs read the app's own words (group 4 plan 1 task 8)", async () => {
  const { REGISTER_WORDS } = await import("../e2e/assets/register-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(REGISTER_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(REGISTER_WORDS.tabOther, th.asset.quickFilterOther)
  assert.equal(REGISTER_WORDS.sumLine, th.asset.statusSumLine)
  assert.equal(REGISTER_WORDS.mobileEnd, th.asset.registerMobileEnd)
  assert.equal(REGISTER_WORDS.bulkCorrectionTitle, th.asset.bulkCorrectionTitle)
  assert.equal(REGISTER_WORDS.departmentFollows, th.asset.bulkDepartmentFollows)
  assert.equal(REGISTER_WORDS.holderCorrected, th.asset.movementTypes.register_custodian_correction)
  assert.equal(REGISTER_WORDS.departmentCorrected, th.asset.movementTypes.register_department_correction)
  assert.equal(REGISTER_WORDS.saveView, th.asset.saveView)
  assert.equal(REGISTER_WORDS.viewNameRequired, th.asset.viewNameRequired)
})

test("the register finds a person's assets, lists the สถานะอื่น tab and keeps a saved view; the bulk correction follows the department rule (group 4 plan 1 task 8)", () => {
  const find = read("e2e/assets/register-find.spec.ts")
  const correction = read("e2e/assets/register-bulk-correction.spec.ts")
  for (const [file, spec] of [["register-find", find], ["register-bulk-correction", correction]] as const) {
    assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), `${file}: the suite's fixtures`)
    assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("itStaff")`), `${file}: IT staff`)
    // Assets of their own through the asset API, never master data (spec §7), never a sign-in or a DELETE.
    assert.ok(spec.includes("await createTxAsset(page, masters, testInfo.project.name, "), `${file}: its own assets`)
    assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin)|createRoom\(|signInOnce\(/, `${file}: no master data`)
  }
  // Find: the holder is the IT head's employee (no other spec gives them an asset); the register's own search typed
  // and sent with Enter; the desktop row and the phone card each read as the spec says.
  assert.ok(find.includes("const holder = readRunData().employees.itHead"))
  assert.ok(find.includes("await field.press(\"Enter\")"))
  assert.ok(find.includes('page.locator("[data-asset-desktop-table] tbody tr").filter({ has: page.getByRole("checkbox", { name: assetTag, exact: true }) })'))
  assert.ok(find.includes("await expect(row.getByText(`${holder.fullNameTh} · ${run.location.name}`, { exact: true })).toBeVisible()"))
  // สถานะอื่น: a disposal request (IT staff's own, its route's body) leaves the asset in Pending Disposal.
  assert.ok(find.includes('page.request.post("/api/disposal-requests", {'))
  assert.ok(find.includes('expect(status.name, "a status with no tab of its own").toBe("Pending Disposal")'))
  assert.ok(find.includes('url.searchParams.get("statusGroup") === "other"'))
  assert.ok(find.includes('page.locator("[data-asset-status-sum]")'))
  // Saved views: desktop only, the error first, then kept and opened again from the row.
  assert.ok(find.includes("test.skip(e2eDevice === \"phone\", DESKTOP_ONLY)"))
  assert.ok(find.includes('await expectFieldError(page, "asset-saved-view-name", REGISTER_WORDS.viewNameRequired)'))
  assert.ok(find.includes("const name = `E2E ${runId}`"))
  // The correction: desktop only, a บุคคล and a ส่วนกลาง asset in another department, through the bar's อื่น ๆ, the
  // errors first, then read back with the department rule and the history's correction lines.
  assert.ok(correction.includes("test.skip(e2eDevice === \"phone\", DESKTOP_ONLY)"))
  assert.ok(correction.includes("const other = await readSecondDepartment()"))
  assert.ok(correction.includes('{ ownershipType: "shared", departmentId: other.id }'))
  assert.ok(correction.includes('const BAR = "[data-asset-selection-bar]"'))
  for (const id of ["#asset-bulk-custodian", "#asset-bulk-reason", "#asset-bulk-location"]) assert.ok(correction.includes(id), id)
  assert.ok(correction.includes("expect([personalAfter.custodianId, personalAfter.departmentId, personalAfter.status.name]).toEqual([holder.id, data.departmentId, \"In Use\"])"))
  assert.ok(correction.includes("expect([sharedAfter.custodianId, sharedAfter.departmentId, sharedAfter.status.name]).toEqual([holder.id, other.id, \"Ready\"])"))
  assert.ok(correction.includes("await expect(main).not.toContainText(REGISTER_WORDS.departmentCorrected)"))
})

test("the specs the register's change moved: the dashboard's status list reads สถานะอื่น, and the viewer's lists hold the import wizard's page (group 4 plan 1 task 8)", async () => {
  const dashboard = read("e2e/dashboard/dashboard.spec.ts")
  assert.ok(dashboard.includes("const currentStatusTab = page.locator('[data-asset-status-tabs] a[aria-current=\"page\"]')"))
  assert.ok(dashboard.includes("if ((await statusTab.count()) === 0) await expect(currentStatusTab).toHaveText(new RegExp(`^${escapeRegExp(DASHBOARD_WORDS.otherStatusTab)}`))"))
  const { DASHBOARD_WORDS } = await import("../e2e/dashboard/dashboard-words.ts")
  assert.equal(DASHBOARD_WORDS.otherStatusTab, JSON.parse(read("messages/th.json")).asset.quickFilterOther)
  const refusals = await import("../e2e/cross-cutting/support/refusals.ts")
  // The import wizard left the register (Task 4); the viewer reads its page, where เปิดตัวช่วยนำเข้า must not show.
  assert.ok(refusals.READ_ONLY_LISTS.includes("/th/asset-management/import-export"))
  assert.ok(refusals.WRITE_BUTTON_NAMES.includes("เปิดตัวช่วยนำเข้า"))
  assert.doesNotMatch(read("src/app/[locale]/(dashboard)/assets/page.tsx"), /AssetImportPreviewPanel/)
})
