// Page group 8 plan 1 (spec docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3–§5; plan
// docs/superpowers/plans/2026-11-07-group8-org-lists.md Task 5): the companies, branches and departments lists rebuilt
// to boards MD-Companies, MD-Branches and MD-Departments, in all four projects, as the IT head. The run's role holds
// company:view, branch:view, branch:create and department:view since this task (e2e/support/run-plan.ts): the three
// lists, and the branch form ⋯ เพิ่มสาขาให้บริษัทนี้ opens. No company:, branch: or department:delete, so ⋯ ปิดใช้งาน is
// checked absent on the companies and branches lists (as the group 7 follow-ups did for employees); its unavailable
// reason and its confirm stay with the unit tests (tests/companies-list-board.test.ts, tests/branches-list-board.test.ts,
// tests/departments-list-board.test.ts). No company:, branch: or department:edit (final review): no แก้ไข in ⋯ and the
// rows are plain rows (no tabindex, they open nothing); the departments row has no ⋯ at all (nothing to offer). Only
// branch:create, so เพิ่มสาขา is in the branches header and neither เพิ่มบริษัท nor เพิ่มแผนก is.
// - The run's own organisation under the run's company (readRunData().companyId: the real company the run setup picks,
//   the first one with an asset-tag code), created by the seed admin through the same APIs the setup uses: a branch of
//   the company, a department of it, a room in the branch and an employee of the three. The IT head adds one asset
//   there through the asset API (the room, the department). Every code starts with <run>-<project>-OG and every name
//   with the run and the project; no shared company, branch, department, location or employee is changed.
//   No company per run (run E2E-1107E): the spec used to add one company per project per run and leave it active, and
//   the dashboard shows its company tabs only up to DASHBOARD_COMPANY_TAB_LIMIT (4) companies (src/lib/dashboard-page.ts),
//   so dev outgrew the tabs. The spec POSTs no /api/companies.
// - Companies: a search for the run company's code (its code and name read from GET /api/companies/<id>, never written
//   here): ใช้งาน chosen (aria-current), ไม่ใช้งาน and ทั้งหมด with a count each (a number: a real company's search may
//   match others), the row's name and code, the branch and asset counts (at least 1: the run's branch and asset are
//   among them) linked to their lists by the company, no status column under ใช้งาน and one under ทั้งหมด, the footer's
//   ใช้งาน/ไม่ใช้งาน counts; ⋯ holds เพิ่มสาขาให้บริษัทนี้ only (no แก้ไข, no ปิดใช้งาน), which opens the branch form with the
//   company chosen (never saved: no branch on the real company beyond the run's OGB) and กลับ back to the companies list
//   with its search. The words of a company with no English name, asset-tag code or tax id stay with the unit test
//   tests/companies-list-board.test.ts.
// - Branches: the run branch's ที่ตั้ง / พนักงาน / ทรัพย์สิน counts link to the lists by the branch (each opened), the
//   footer's totals over the filtered set; ⋯ holds เพิ่มที่ตั้งในสาขานี้ and ดูพนักงานในสาขานี้ (1) (no แก้ไข, no ปิดใช้งาน);
//   เพิ่มที่ตั้งในสาขานี้ opens the location form with the branch chosen and กลับ back to the branches list.
// - Departments: the run department with its employee and asset: the company by name, the พนักงาน count to the employee
//   list by ?departmentId=, the ทรัพย์สิน count with "โอนย้ายก่อนปิดใช้งาน" to the register by ?departmentId= with the
//   department chip, the summary line; no ⋯ (no แก้ไข without department:edit, no ปิดใช้งาน without department:delete).
//   The deactivation guard (G8P1-R3) is checked through the API
//   the edit form uses: the seed admin's PUT with isActive false answers 409 with the reason, and the department stays
//   active. The suite sends no DELETE; the IT head's role cannot edit departments, so the seed admin sends the PUT, as
//   the locations spec sets a location inactive (the run department is this test's own, and a refused PUT changes nothing).
// - The phone: each list is the table in its scroll region with the scroll hint, the page itself does not scroll
//   sideways, and ⋯ opens the bottom sheet. axe through recordSettled on every list, ⋯, form and register step.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { menuItem, readMenuEntries } from "../asset-detail/detail-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { projectCode, txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { readAssetMasters, type AssetMasters } from "../transactions/tx-support.ts"
import { ORG_LIST_WORDS as W } from "./org-lists-words.ts"

// The seed admin's request context (seedAdminApi): the type comes from the helper, as specs import nothing from
// @playwright/test but the suite's fixtures.
type APIRequestContext = Awaited<ReturnType<typeof seedAdminApi>>

type RunCompany = { id: string; code: string; nameTh: string }
type RunBranch = { id: string; code: string; name: string }
type RunDepartment = { id: string; code: string; name: string; companyId: string }
type RunRecord = { id: string; code: string; name: string }
type RunOrg = { company: RunCompany; branch: RunBranch; department: RunDepartment; room: RunRecord; employee: RunRecord }

// The reason the department guard gives for one employee and one asset (getDepartmentDeleteBlockReason; a server
// string, not a message key, so it is here and tests/e2e-master-data.test.ts pins it to the function).
const DEPARTMENT_BLOCKED = "ปิดใช้งานแผนกนี้ไม่ได้ เพราะยังมีพนักงาน 1 คน และทรัพย์สิน 1 รายการใช้งานอยู่"

async function created(response: Awaited<ReturnType<APIRequestContext["post"]>>, what: string): Promise<string> {
  expect(response.status(), `POST ${what}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return ((await response.json()) as { id: string }).id
}

// The run's organisation of this project (the seed admin, the setup's APIs, every key of each schema) under the run's
// company: codes <run>-<project>-OGB / OGD / OGR / OGE, names "<run> <project> …". The company is the run's (no company
// per run: the dashboard's company tabs stop at four companies); its code and name are read, never written.
async function createRunOrg(projectName: string): Promise<RunOrg> {
  const { runId } = readRunState()
  const prefix = `${runId}-${projectCode(projectName)}-OG`
  const name = (label: string) => txAssetName(runId, projectName, label)
  const admin = await seedAdminApi()
  try {
    const companyId = readRunData().companyId
    const companyResponse = await admin.get(`/api/companies/${companyId}`)
    expect(companyResponse.status(), `GET /api/companies/${companyId}: ${(await companyResponse.text()).slice(0, 300)}`).toBe(200)
    const { code: companyCode, nameTh: companyName } = (await companyResponse.json()) as { code: string; nameTh: string }
    const company: RunCompany = { id: companyId, code: companyCode, nameTh: companyName }
    const branch = { id: "", code: `${prefix}B`, name: name("สาขาทดสอบรายการ") }
    branch.id = await created(await admin.post("/api/branches", {
      data: { code: branch.code, name: branch.name, companyId: company.id, address: null, contactPerson: null, isActive: true },
    }), `/api/branches ${branch.code}`)
    const department = { id: "", code: `${prefix}D`, name: name("แผนกทดสอบรายการ"), companyId: company.id }
    department.id = await created(await admin.post("/api/departments", {
      data: { code: department.code, name: department.name, companyId: company.id, isActive: true },
    }), `/api/departments ${department.code}`)
    const room = { id: "", code: `${prefix}R`, name: name("ห้องทดสอบรายการ") }
    room.id = await created(await admin.post("/api/locations", {
      data: { code: room.code, name: room.name, branchId: branch.id, parentId: null, locationType: "Room", description: null, isActive: true },
    }), `/api/locations ${room.code}`)
    const employee = { id: "", code: `${prefix}E`, name: name("พนักงานทดสอบรายการ") }
    employee.id = await created(await admin.post("/api/employees", {
      data: {
        code: employee.code, fullNameTh: employee.name, fullNameEn: null, email: null, companyId: company.id, branchId: branch.id,
        departmentId: department.id, position: null, employmentStatus: "active", managerId: null, isActive: true,
      },
    }), `/api/employees ${employee.code}`)
    return { company, branch, department, room, employee }
  } finally {
    await admin.dispose()
  }
}

// The run asset of the organisation (the asset API as the IT head, every key of the form's body): Ready, Good, in the
// room, the department's, no holder.
async function createOrgAsset(page: Page, masters: AssetMasters, projectName: string, org: RunOrg) {
  const { runId } = readRunState()
  const assetTag = txAssetTag(runId, projectName, "OGA")
  const response = await page.request.post("/api/assets", {
    data: {
      assetTag, name: txAssetName(runId, projectName, "เครื่องทดสอบรายการองค์กร"), categoryId: masters.categoryId, brandId: "", modelId: "", serialNumber: "",
      licenseTotalSeats: "", licenseUsedSeats: "", licenseAssignedAssetId: "", companyId: org.company.id, branchId: org.branch.id,
      ownershipType: "personal", departmentId: org.department.id, custodianId: "", homeLocationId: org.room.id, currentLocationId: org.room.id,
      statusId: masters.readyStatusId, conditionId: masters.goodConditionId, purchaseDate: "", purchasePrice: "", supplierId: "",
      warrantyStartDate: "", warrantyEndDate: "", fixedAssetCode: "", poNumber: "", invoiceNumber: "", remark: "", customFieldsJson: "",
      isActive: true,
    },
  })
  expect(response.status(), `POST /api/assets ${assetTag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { id: ((await response.json()) as { id: string }).id, assetTag }
}

// The list's one row of a record (the table on both devices: these lists have no phone cards).
const listRow = (page: Page, code: string): Locator => page.locator("table tbody tr").filter({ hasText: code })
// A count cell's link by its href (the page writes them whole: /th/…?<key>=<id>&page=1).
const countLink = (row: Locator, href: string): Locator => row.locator(`a[href="${href}"]`)
// Final review: without <module>:edit the row is a plain row (no tabindex: it opens nothing).
const expectPlainRow = (row: Locator) => expect(row).not.toHaveAttribute("tabindex")
// The page header's เพิ่ม… link, shown only with <module>:create.
const headerCreateLink = (page: Page, title: string): Locator => page.getByRole("main").getByRole("link", { name: title, exact: true })

// The record-status segmented control: each option a link named by its word and its count.
function statusLink(page: Page, label: string, count: number): Locator {
  return page.getByRole("navigation", { name: W.recordStatusLabel, exact: true }).getByRole("link", { name: new RegExp(`^${label}\\s*${count}$`) })
}
async function expectStatusCounts(page: Page, chosen: "active" | "all", counts: { active: number; inactive: number; all: number }) {
  const links = { active: statusLink(page, W.recordActive, counts.active), inactive: statusLink(page, W.recordInactive, counts.inactive), all: statusLink(page, W.recordAll, counts.all) }
  for (const [key, link] of Object.entries(links)) {
    if (key === chosen) await expect(link).toHaveAttribute("aria-current", "page")
    else await expect(link).not.toHaveAttribute("aria-current")
  }
}

// The segmented control on a list whose counts are not the test's own (the run's real company): each option named by
// its word and some count, only the chosen one aria-current.
const anyCount = "[\\d,]+"
function statusLinkAnyCount(page: Page, label: string): Locator {
  return page.getByRole("navigation", { name: W.recordStatusLabel, exact: true }).getByRole("link", { name: new RegExp(`^${label}\\s*${anyCount}$`) })
}
async function expectStatusChosen(page: Page, chosen: "active" | "all") {
  const links = { active: statusLinkAnyCount(page, W.recordActive), inactive: statusLinkAnyCount(page, W.recordInactive), all: statusLinkAnyCount(page, W.recordAll) }
  for (const [key, link] of Object.entries(links)) {
    if (key === chosen) await expect(link).toHaveAttribute("aria-current", "page")
    else await expect(link).not.toHaveAttribute("aria-current")
  }
}

// A count cell's link that holds a number of at least 1 (a real company's counts change from run to run).
async function expectCountAtLeastOne(link: Locator) {
  await expect(link).toHaveText(/^[\d,]+$/)
  expect(Number(((await link.textContent()) ?? "").replace(/,/g, "")), "the count is at least 1").toBeGreaterThanOrEqual(1)
}

// A row's ⋯: the menu on the computer, the bottom sheet on the phone. Escape closes either.
async function openRowMenu(page: Page, row: Locator, code: string, phone: boolean): Promise<Locator> {
  await row.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code }), exact: true }).click()
  const menu = phone ? page.getByRole("dialog").filter({ visible: true }).last() : page.getByRole("menu").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}

// The phone: the table is a named scroll region with the hint above it, and the page itself does not scroll sideways.
async function expectPhoneTable(page: Page, caption: string) {
  await expect(page.getByRole("region", { name: caption, exact: true })).toBeVisible()
  await expect(page.getByText(W.tableScrollHint, { exact: true }).filter({ visible: true })).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "the page does not scroll sideways").toBe(true)
}

// A form opened from a list's ⋯: its กลับ link goes back to that list with the list's search.
async function expectBackTo(page: Page, listPath: string, search: string) {
  const back = page.locator('[data-slot="page-back-link"]').filter({ visible: true })
  await expect(back).toHaveAccessibleName(W.back)
  const href = new URL((await back.getAttribute("href")) ?? "", "http://e2e.invalid")
  expect(href.pathname).toBe(listPath)
  expect(href.searchParams.get("search")).toBe(search)
  await back.click()
  await page.waitForURL((url) => url.pathname === listPath && url.searchParams.get("search") === search)
}

test.describe("the IT head reads the companies, branches and departments lists", () => {
  asUser("itHead")

  test("each list shows the run record's board facts and counts linked to their lists, ⋯ เพิ่มสาขาให้บริษัทนี้ and เพิ่มที่ตั้งในสาขานี้ preset their forms and come back, ⋯ has no ปิดใช้งาน without delete, a department in use refuses the PUT that deactivates it (group 8 spec §3–§5; G8P1-R3)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(360_000)
    const project = testInfo.project.name
    const phone = e2eDevice === "phone"
    const org = await createRunOrg(project)
    const { company, branch, department, room, employee } = org
    const masters = await readAssetMasters(page)
    const asset = await createOrgAsset(page, masters, project, org)

    // ── Companies (board MD-Companies) ──
    const companiesPath = "/th/master-data/companies"
    await page.goto(`${companiesPath}?search=${encodeURIComponent(company.code)}`, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.companiesTitle, exact: true })).toBeVisible()
    await expectStatusChosen(page, "active")
    // The run company's row (its code and its name: a real company's code may be part of another's).
    const companyRowOf = () => listRow(page, company.code).filter({ hasText: company.nameTh })
    const companyRow = companyRowOf()
    await expect(companyRow).toHaveCount(1)
    // No company:create, no company:edit: no เพิ่มบริษัท, and the row opens nothing.
    await expect(headerCreateLink(page, W.companyCreateTitle)).toHaveCount(0)
    await expectPlainRow(companyRow)
    // Name first, the code under it.
    await expect(companyRow).toContainText(company.nameTh)
    await expect(companyRow).toContainText(company.code)
    // สาขา and ทรัพย์สิน link to their lists by the company, each at least 1 (the run's OGB and OGA among them).
    await expectCountAtLeastOne(countLink(companyRow, `/th/master-data/branches?companyId=${company.id}&page=1`))
    await expectCountAtLeastOne(countLink(companyRow, `/th/assets?companyId=${company.id}&page=1`))
    // The status column only under ทั้งหมด; the footer's counts (numbers).
    const statusColumn = page.getByRole("columnheader", { name: W.statusColumn, exact: true })
    await expect(statusColumn).toHaveCount(0)
    await expect(page.locator('[data-slot="data-table-foot"]')).toContainText(templatePattern(W.footerCounts, { active: anyCount, inactive: anyCount }))
    if (phone) await expectPhoneTable(page, W.companiesTitle)
    await recordSettled(page, measure, "companies list, the run company")

    // ⋯: เพิ่มสาขาให้บริษัทนี้ only; no แก้ไข without company:edit, no ปิดใช้งาน without company:delete.
    const companyMenu = await openRowMenu(page, companyRow, company.code, phone)
    expect(await readMenuEntries(companyMenu)).toEqual([{ label: W.addBranch, reason: null, available: true }])
    await expect(menuItem(companyMenu, W.edit)).toHaveCount(0)
    await expect(menuItem(companyMenu, W.deactivate)).toHaveCount(0)
    await recordSettled(page, measure, "companies list, a company's ⋯")
    await menuItem(companyMenu, W.addBranch).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/branches/new" && url.searchParams.get("companyId") === company.id)
    expect(new URL(new URL(page.url()).searchParams.get("returnTo") ?? "", "http://e2e.invalid").pathname).toBe(companiesPath)
    await expect(page.getByRole("heading", { level: 1, name: W.branchCreateTitle, exact: true })).toBeVisible()
    await expect(page.locator("#branch-company")).toHaveValue(company.id)
    await recordSettled(page, measure, "branch form, เพิ่มสาขาให้บริษัทนี้")
    // Nothing is saved (no branch on the real company beyond the run's): กลับ goes back to the companies list with its
    // search.
    await expectBackTo(page, companiesPath, company.code)
    await expect(companyRowOf()).toHaveCount(1)

    // ทั้งหมด: chosen, and the status column shows the row ใช้งาน.
    await statusLinkAnyCount(page, W.recordAll).click()
    await page.waitForURL((url) => url.pathname === companiesPath && url.searchParams.get("status") === "all")
    await expectStatusChosen(page, "all")
    await expect(statusColumn).toHaveCount(1)
    await expect(companyRowOf().getByText(W.recordActive, { exact: true })).toHaveCount(1)
    await recordSettled(page, measure, "companies list, ทั้งหมด with the status column")

    // ── Branches (board MD-Branches) ──
    const branchesPath = "/th/master-data/branches"
    const branchesHref = `${branchesPath}?search=${encodeURIComponent(branch.code)}`
    await page.goto(branchesHref, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.branchesTitle, exact: true })).toBeVisible()
    await expectStatusCounts(page, "active", { active: 1, inactive: 0, all: 1 })
    const branchRow = listRow(page, branch.code)
    await expect(branchRow).toHaveCount(1)
    // branch:create: เพิ่มสาขา in the header; no branch:edit: the row opens nothing.
    await expect(headerCreateLink(page, W.branchCreateTitle)).toHaveCount(1)
    await expectPlainRow(branchRow)
    await expect(branchRow).toContainText(branch.name)
    await expect(branchRow).toContainText(`${branch.code} · ${company.nameTh}`)
    const branchLinks = {
      locations: countLink(branchRow, `/th/master-data/locations?branchId=${branch.id}&page=1`),
      employees: countLink(branchRow, `/th/master-data/employees?branchId=${branch.id}&page=1`),
      assets: countLink(branchRow, `/th/assets?branchId=${branch.id}&page=1`),
    }
    for (const link of Object.values(branchLinks)) await expect(link).toHaveText("1")
    // The footer's totals over the filtered set: this one branch.
    await expect(page.locator('[data-slot="data-table-foot"]')).toContainText(fillTemplate(W.branchFooterTotals, { locations: 1, employees: 1, assets: 1 }))
    await expect(page.getByRole("columnheader", { name: W.statusColumn, exact: true })).toHaveCount(0)
    if (phone) await expectPhoneTable(page, W.branchesTitle)
    await recordSettled(page, measure, "branches list, the run branch")

    // Each count opens its list by the branch: the room, the employee, the asset.
    await branchLinks.locations.click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/locations" && url.searchParams.get("branchId") === branch.id)
    await expect(page.getByRole("link", { name: room.name, exact: true }).filter({ visible: true }).first()).toBeVisible()
    await page.goto(branchesHref, { waitUntil: "load" })
    await countLink(listRow(page, branch.code), `/th/master-data/employees?branchId=${branch.id}&page=1`).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/employees" && url.searchParams.get("branchId") === branch.id)
    const employeeEntries = () => page.locator("[data-employee-desktop-table] tbody tr, [data-employee-mobile-list] article").filter({ visible: true })
    await expect(employeeEntries().filter({ hasText: employee.code })).toHaveCount(1)
    await page.goto(branchesHref, { waitUntil: "load" })
    await countLink(listRow(page, branch.code), `/th/assets?branchId=${branch.id}&page=1`).click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("branchId") === branch.id)
    await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()

    // ⋯: เพิ่มที่ตั้งในสาขานี้, ดูพนักงานในสาขานี้ (1); no แก้ไข without branch:edit, no ปิดใช้งาน without branch:delete.
    await page.goto(branchesHref, { waitUntil: "load" })
    const branchMenu = await openRowMenu(page, listRow(page, branch.code), branch.code, phone)
    expect(await readMenuEntries(branchMenu)).toEqual([
      { label: W.addLocation, reason: null, available: true },
      { label: fillTemplate(W.viewEmployees, { count: 1 }), reason: null, available: true },
    ])
    await expect(menuItem(branchMenu, W.edit)).toHaveCount(0)
    await expect(menuItem(branchMenu, W.deactivate)).toHaveCount(0)
    await recordSettled(page, measure, "branches list, a branch's ⋯")
    await menuItem(branchMenu, W.addLocation).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/locations/new" && url.searchParams.get("branchId") === branch.id)
    expect(new URL(new URL(page.url()).searchParams.get("returnTo") ?? "", "http://e2e.invalid").pathname).toBe(branchesPath)
    await expect(page.getByRole("heading", { level: 1, name: W.locationCreateTitle, exact: true })).toBeVisible()
    await expect(page.locator("#location-branch")).toHaveValue(branch.id)
    await recordSettled(page, measure, "location form, เพิ่มที่ตั้งในสาขานี้")
    await expectBackTo(page, branchesPath, branch.code)
    await expect(listRow(page, branch.code)).toHaveCount(1)

    // ── Departments (board MD-Departments) ──
    const departmentsPath = "/th/master-data/departments"
    const departmentsHref = `${departmentsPath}?search=${encodeURIComponent(department.code)}`
    await page.goto(departmentsHref, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.departmentsTitle, exact: true })).toBeVisible()
    await expectStatusCounts(page, "active", { active: 1, inactive: 0, all: 1 })
    const departmentRow = listRow(page, department.code)
    await expect(departmentRow).toHaveCount(1)
    // No department:create, no department:edit: no เพิ่มแผนก, and the row opens nothing.
    await expect(headerCreateLink(page, W.departmentCreateTitle)).toHaveCount(0)
    await expectPlainRow(departmentRow)
    await expect(departmentRow).toContainText(department.name)
    await expect(departmentRow).toContainText(company.nameTh)
    const employeesByDepartment = `/th/master-data/employees?departmentId=${department.id}&page=1`
    const assetsByDepartment = `/th/assets?departmentId=${department.id}&page=1`
    await expect(countLink(departmentRow, employeesByDepartment)).toHaveText("1")
    await expect(countLink(departmentRow, assetsByDepartment)).toHaveText("1")
    // A department that still holds assets says they move first (the guard refuses until then).
    await expect(departmentRow).toContainText(W.moveBeforeDeactivate)
    await expect(page.getByText(fillTemplate(W.departmentSummaryLine, { departments: 1, withAssets: 1, assets: 1, sort: W.departmentNameSort }), { exact: true })).toBeVisible()
    if (phone) await expectPhoneTable(page, W.departmentsTitle)
    await recordSettled(page, measure, "departments list, the run department")

    // No ⋯ at all: no แก้ไข without department:edit and no ปิดใช้งาน without department:delete leave nothing to offer.
    await expect(departmentRow.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: department.code }), exact: true })).toHaveCount(0)

    // พนักงาน 1 opens the employee list by the department.
    await countLink(departmentRow, employeesByDepartment).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/employees" && url.searchParams.get("departmentId") === department.id)
    await expect(employeeEntries().filter({ hasText: employee.code })).toHaveCount(1)
    // ทรัพย์สิน 1 opens the register by the department (Task 4's filter), whose chip names it.
    await page.goto(departmentsHref, { waitUntil: "load" })
    await countLink(listRow(page, department.code), assetsByDepartment).click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("departmentId") === department.id)
    await expect(page.getByRole("group", { name: W.activeFilters }).filter({ visible: true })).toContainText(`${W.departmentChip}: ${department.code} - ${department.name}`)
    await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await recordSettled(page, measure, "register by the department, from the departments list")

    // The guard (G8P1-R3) through the edit form's API: a PUT with isActive false is refused with the reason (the
    // employee and the asset), and the department is still active. No DELETE.
    const admin = await seedAdminApi()
    try {
      const refused = await admin.put(`/api/departments/${department.id}`, {
        data: { code: department.code, name: department.name, companyId: department.companyId, isActive: false },
      })
      expect(refused.status(), `PUT /api/departments/${department.id}: ${(await refused.text()).slice(0, 300)}`).toBe(409)
      expect(((await refused.json()) as { error?: string }).error).toBe(DEPARTMENT_BLOCKED)
      // GET answers only an active department.
      expect((await admin.get(`/api/departments/${department.id}`)).status()).toBe(200)
    } finally {
      await admin.dispose()
    }
    await page.goto(`${departmentsHref}&status=all`, { waitUntil: "load" })
    await expectStatusCounts(page, "all", { active: 1, inactive: 0, all: 1 })
    await expect(listRow(page, department.code).getByText(W.recordActive, { exact: true })).toHaveCount(1)
    await recordSettled(page, measure, "departments list, ทั้งหมด after the refused PUT")
  })
})
