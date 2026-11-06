// Page group 7 plan 2 (spec docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §5.1, §5.2; plan
// docs/superpowers/plans/2026-11-06-group7-employees.md Task 5): a former employee still holding assets, in all four
// projects, as the IT head (the run's role holds employee:view since this task; asset:edit for รับคืน and ส่งมอบ).
// - The seed admin creates the run's employee (as the setup creates the run's employees) and, after the assets, marks it
//   ลาออก through the employee API (no LDAP sync). Its three run assets: one handed over (HO-), one held with no handover
//   (ข้อมูลเก่า) and one held with no handover and an open repair.
// - While the person is active, "ส่งมอบทรัพย์สินให้คนนี้" opens the handover form with the person chosen.
// - The list's "พ้นสภาพแต่ยังถือครอง" card opens ?former=withAssets, which lists the person with the note and the held
//   count (the phone's card); the employee page warns, lists the three, and the repair one's รับคืน is disabled with the
//   return form's own reason (Review Focus 3).
// - รับคืน of the HO- one opens the return form chosen; the save lands on the RT- document, whose กลับ comes back to the
//   employee page with two held. รับคืน of the ข้อมูลเก่า one opens the form through the legacy path (its confirm once,
//   then the backfill's HO-), and its save comes back with one held (Review Focus 2).
// Not here, and why: an AD-deactivated holder (Review Focus 1) needs isActive false, which the employee API refuses while
// the person holds assets and only LDAP sync sets otherwise, so the unit tests in tests/organization-master-query.test.ts
// cover it; more than 25 held (Review Focus 5) and a forged returnTo (Review Focus 4) are unit tested too.
// Group 7 follow-ups (plan docs/superpowers/plans/2026-11-07-group7-followups.md, Task 5), in the same test:
// - The list (Task 2): a second run employee holding nothing (FN); a search for the run's two shows ใช้งาน 2 / ไม่ใช้งาน 0 /
//   ทั้งหมด 2 with aria-current on the chosen one (G7F-R1), "2 คน · ถือครองรวม 3 รายการ", the เรียงตาม select keeping
//   the code sort, and the status column only under ทั้งหมด. Row ⋯ of the holder: ดูทรัพย์สินที่ถือครอง (3) opens the
//   register by custodian. ปิดใช้งาน needs employee:delete (G7F-R2), which the run's IT head does not hold (view only,
//   pinned in tests/e2e-master-data.test.ts), so it is checked absent here: the holder's ⋯ has the one item and the idle
//   one has no ⋯ at all. Its unavailable reason and its confirm stay with the unit tests (tests/employee-list-followups.test.ts).
// - The employee page (Task 3, G7F-R4): the held stat's foot "มีใบส่งมอบ 1 · ไม่มีใบส่งมอบ 2", ตรวจนับรอบปัจจุบัน empty
//   (the run's new assets are in no open round), the repair row's MT- link, and row ⋯: โอนย้าย unavailable with the
//   transfer form's reason while the HO- is open and พิมพ์ใบส่งมอบ to its print with returnTo; the ข้อมูลเก่า one's
//   โอนย้าย links to the transfer form with the asset and returnTo.
// Every record made here carries the run id and the project's code; no shared master data is changed.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { menuItem, readMenuEntries } from "../asset-detail/detail-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate, projectCode, txAssetName } from "../transactions/tx-plan.ts"
import {
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  handoverByApi,
  pickedAsset,
  pickSearchable,
  readAssetMasters,
  saveReturnForm,
  TRANSACTION_PAGE_ARRIVAL_MS,
  type CreatedAsset,
} from "../transactions/tx-support.ts"
import { EMPLOYEE_WORDS as W } from "./employees-words.ts"

type RunEmployee = { id: string; code: string; fullNameTh: string }

// The employee API's whole body (employeeSchema): the run's company, branch and department, the status given.
function employeeBody(employee: RunEmployee, employmentStatus: "active" | "resigned") {
  const run = readRunData()
  return {
    code: employee.code,
    fullNameTh: employee.fullNameTh,
    fullNameEn: null,
    // The schema takes a missing email only when the key is there (as e2e/setup/run-data.setup.ts).
    email: null,
    companyId: run.companyId,
    branchId: run.branchId,
    departmentId: run.departmentId,
    position: null,
    employmentStatus,
    managerId: null,
    isActive: true,
  }
}

// The run's employee of this project, created by the seed admin: E2E-1106A-DL-FH (the code holds 20 characters).
async function createRunEmployee(projectName: string): Promise<RunEmployee> {
  const { runId } = readRunState()
  const employee = { id: "", code: `${runId}-${projectCode(projectName)}-FH`, fullNameTh: txAssetName(runId, projectName, "พนักงานพ้นสภาพ") }
  const admin = await seedAdminApi()
  try {
    const response = await admin.post("/api/employees", { data: employeeBody(employee, "active") })
    expect(response.status(), `POST /api/employees ${employee.code}: ${(await response.text()).slice(0, 300)}`).toBe(201)
    return { ...employee, id: ((await response.json()) as { id: string }).id }
  } finally {
    await admin.dispose()
  }
}

// A second run employee of this project holding nothing (group 7 follow-ups Task 5), for the list's counts and its code
// sort: the same body and the same seed admin, E2E-1106A-DL-FN.
async function createIdleEmployee(projectName: string): Promise<RunEmployee> {
  const { runId } = readRunState()
  const employee = { id: "", code: `${runId}-${projectCode(projectName)}-FN`, fullNameTh: txAssetName(runId, projectName, "พนักงานไม่ถือครอง") }
  const admin = await seedAdminApi()
  try {
    const response = await admin.post("/api/employees", { data: employeeBody(employee, "active") })
    expect(response.status(), `POST /api/employees ${employee.code}: ${(await response.text()).slice(0, 300)}`).toBe(201)
    return { ...employee, id: ((await response.json()) as { id: string }).id }
  } finally {
    await admin.dispose()
  }
}

// ลาออก through the employee API, as the seed admin; the record stays active (isActive is LDAP sync's while it holds).
async function markResigned(employee: RunEmployee): Promise<void> {
  const admin = await seedAdminApi()
  try {
    const response = await admin.put(`/api/employees/${employee.id}`, { data: employeeBody(employee, "resigned") })
    expect(response.status(), `PUT /api/employees/${employee.id}: ${(await response.text()).slice(0, 300)}`).toBe(200)
  } finally {
    await admin.dispose()
  }
}

// An unfinished repair through the repair form's own route (every key of its body), as return.spec.ts opens one.
async function openRepair(page: Page, asset: CreatedAsset): Promise<{ id: string; repairNo: string }> {
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId: asset.id,
      maintenancePlanId: null,
      problem: `${asset.assetTag} เปิดไม่ติด ส่งซ่อมระหว่างถือครอง`,
      reportedDate: bangkokDate(),
      done: false,
      outcome: "usable",
      reportedById: readRunData().employees.itHead.id,
      vendorId: null,
      repairCost: null,
      invoiceNo: null,
      remark: "E2E repair of a held asset (the employee page)",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; repairNo: string }
}

// A held asset on the employee page: the table row on the desktop, the card on the phone.
const heldEntry = (page: Page, asset: CreatedAsset): Locator =>
  page.locator("[data-employee-held-row], [data-employee-held-card]").filter({ visible: true, hasText: asset.assetTag })
const returnLink = (page: Page, asset: CreatedAsset): Locator =>
  heldEntry(page, asset).getByRole("link", { name: fillTemplate(W.returnAsset, { asset: `${asset.assetTag} ${asset.name}` }), exact: true })
// A held row's ⋯ (G7F-R4): the menu on the computer, the bottom sheet on the phone. Escape closes either.
async function openHeldMenu(page: Page, asset: CreatedAsset): Promise<Locator> {
  await heldEntry(page, asset).getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: asset.assetTag }), exact: true }).click()
  return openedMenu(page)
}
async function openedMenu(page: Page): Promise<Locator> {
  const menu = page.getByRole("menu").or(page.getByRole("dialog")).filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}
async function closeMenu(page: Page, menu: Locator): Promise<void> {
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
}
// A link's href read as a URL (the page's links are relative), with its returnTo read the same way.
function linkTarget(href: string | null): { url: URL; returnTo: URL | null } {
  const url = new URL(href ?? "", "http://e2e.invalid")
  const returnTo = url.searchParams.get("returnTo")
  return { url, returnTo: returnTo ? new URL(returnTo, "http://e2e.invalid") : null }
}
const warning = (page: Page, count: number): Locator => page.getByText(fillTemplate(W.formerHoldingTitle, { count }), { exact: true })

// The return form's entries the save needs (condition, status after, room), then its save: the RT- document opens; its
// กลับ comes back to the employee page, which the form carried through returnTo.
async function returnToEmployeePage(page: Page, asset: CreatedAsset, employee: RunEmployee, room: { code: string; name: string }) {
  await conditionChip(page, "ดี", "checkin-condition-after").check()
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
  const checkin = await saveReturnForm(page, asset.id, async (review) => {
    await expect(review).toContainText(employee.fullNameTh)
  })
  expect(checkin.documentNo).toMatch(/^RT-/)
  await expect(page.getByRole("heading", { level: 1, name: W.returnDocumentTitle })).toBeVisible()
  return checkin
}

test.describe("the IT head takes a former employee's assets back from the employee page", () => {
  asUser("itHead")

  test("the former card lists the person, the employee page lists the held assets, รับคืน returns the HO- one and the ข้อมูลเก่า one back to the page, an open repair's is disabled with its reason (group 7 spec §5.1, §5.2; Review Focus 2, 3)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const project = testInfo.project.name
    const masters = await readAssetMasters(page)
    const room = await ensureSecondLocation()
    const employee = await createRunEmployee(project)
    const idle = await createIdleEmployee(project)

    // The three run assets the person holds: a handover, a ข้อมูลเก่า (held with no handover), and a ข้อมูลเก่า with an open repair.
    const handedOver = await createTxAsset(page, masters, project, "EMH", "โน้ตบุ๊กมีใบส่งมอบ")
    const handover = await handoverByApi(page, handedOver.id, employee.id, masters.goodConditionId)
    const legacy = await createTxAsset(page, masters, project, "EML", "โน้ตบุ๊กข้อมูลเก่า", { custodianId: employee.id })
    const inRepair = await createTxAsset(page, masters, project, "EMR", "โน้ตบุ๊กมีงานซ่อม", { custodianId: employee.id })
    const repair = await openRepair(page, inRepair)

    // Active: no warning, and ส่งมอบทรัพย์สินให้คนนี้ opens the handover form with the person chosen.
    const employeePath = `/th/master-data/employees/${employee.id}`
    await page.goto(employeePath, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: employee.fullNameTh })).toBeVisible()
    await expect(page.getByText(fillTemplate(W.formerHoldingTitle, { count: 3 }), { exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "employee page, an active holder")
    await page.getByRole("link", { name: W.handOverToPerson, exact: true }).filter({ visible: true }).click()
    await page.waitForURL((url) => url.pathname === "/th/asset-management/checkout" && url.searchParams.get("custodianId") === employee.id)
    await expect(page.getByRole("heading", { level: 1, name: W.checkoutTitle })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(page.locator("#checkout-destination")).toContainText(`${employee.code} - ${employee.fullNameTh}`)
    await recordSettled(page, measure, "handover form, the person from the employee page")

    // ลาออก (the employee API, no LDAP sync): the person is a former holder.
    await markResigned(employee)

    // Group 7 follow-ups (Task 2): a search for this project's two run employees (FH holds three, FN nothing). The
    // record-status control: ใช้งาน 2 chosen, ไม่ใช้งาน 0, ทั้งหมด 2 (G7F-R1); no status column under ใช้งาน.
    const runCodes = `${readRunState().runId}-${projectCode(project)}-F`
    await page.goto(`/th/master-data/employees?search=${encodeURIComponent(runCodes)}`, { waitUntil: "load" })
    const statusNav = page.getByRole("navigation", { name: W.recordStatusLabel, exact: true })
    const statusLink = (label: string, count: number) => statusNav.getByRole("link", { name: new RegExp(`^${label}\\s*${count}$`) })
    await expect(statusLink(W.recordActive, 2)).toHaveAttribute("aria-current", "page")
    await expect(statusLink(W.recordInactive, 0)).not.toHaveAttribute("aria-current")
    await expect(statusLink(W.recordAll, 2)).not.toHaveAttribute("aria-current")
    const listEntries = e2eDevice === "desktop"
      ? page.locator("[data-employee-desktop-table] tbody tr")
      : page.locator("[data-employee-mobile-list] article")
    const listEntryOf = (person: RunEmployee) => listEntries.filter({ hasText: person.code })
    await expect(listEntries).toHaveCount(2)
    const statusColumn = page.getByRole("columnheader", { name: W.statusColumn, exact: true })
    await expect(statusColumn).toHaveCount(0)
    await expect(listEntryOf(employee).getByText(W.recordActive, { exact: true })).toHaveCount(0)
    // The totals of the filtered set (board MD-Employees).
    await expect(page.getByText(fillTemplate(W.listTotals, { people: 2, assets: 3 }), { exact: true })).toBeVisible()
    await recordSettled(page, measure, "employee list, ใช้งาน with its counts")

    // เรียงตาม keeps the code sort the merged columns no longer offer: the run's two in code order, the direction the
    // form carried.
    const listSearch = page.getByRole("search").filter({ visible: true })
    await listSearch.getByLabel(W.sortLabel, { exact: true }).selectOption("code")
    await listSearch.getByRole("button", { name: W.filter, exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get("sort") === "code" && url.searchParams.get("search") === runCodes)
    await expect(page.getByRole("search").filter({ visible: true }).getByLabel(W.sortLabel, { exact: true })).toHaveValue("code")
    const [firstByCode, secondByCode] = new URL(page.url()).searchParams.get("direction") === "asc" ? [employee, idle] : [idle, employee]
    await expect(listEntries).toHaveCount(2)
    await expect(listEntries.nth(0)).toContainText(firstByCode.code)
    await expect(listEntries.nth(1)).toContainText(secondByCode.code)

    // ทั้งหมด: chosen, and the record-status column (the table) or badge (the cards) shows.
    await statusLink(W.recordAll, 2).click()
    await page.waitForURL((url) => url.searchParams.get("status") === "all" && url.searchParams.get("search") === runCodes)
    await expect(statusLink(W.recordAll, 2)).toHaveAttribute("aria-current", "page")
    await expect(statusLink(W.recordActive, 2)).not.toHaveAttribute("aria-current")
    if (e2eDevice === "desktop") await expect(statusColumn).toHaveCount(1)
    await expect(listEntryOf(employee).getByText(W.recordActive, { exact: true }).filter({ visible: true })).toHaveCount(1)
    await expect(listEntryOf(idle).getByText(W.recordActive, { exact: true }).filter({ visible: true })).toHaveCount(1)
    await recordSettled(page, measure, "employee list, ทั้งหมด with the status column")

    // Row ⋯ of the holder: ดูทรัพย์สินที่ถือครอง (3) only, no ปิดใช้งาน without employee:delete (G7F-R2); the idle one
    // has nothing for ⋯, so no ⋯.
    await expect(listEntryOf(idle).getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: idle.code }), exact: true })).toHaveCount(0)
    await listEntryOf(employee).getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: employee.code }), exact: true }).click()
    const rowMenu = await openedMenu(page)
    const heldItem = fillTemplate(W.viewHeldAssets, { n: 3 })
    expect(await readMenuEntries(rowMenu)).toEqual([{ label: heldItem, reason: null, available: true }])
    await expect(menuItem(rowMenu, W.deactivate)).toHaveCount(0)
    await recordSettled(page, measure, "employee list, a holder's ⋯")
    await menuItem(rowMenu, heldItem).click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("custodianId") === employee.id)
    for (const asset of [handedOver, legacy, inRepair]) {
      await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    }

    // The list: the card opens ?former=withAssets (its chip says inactive records count), and a search there finds the person.
    await page.goto("/th/master-data/employees", { waitUntil: "load" })
    await page.getByRole("link", { name: new RegExp(`^${W.formerCard}`) }).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/employees" && url.searchParams.get("former") === "withAssets")
    await expect(page.getByText(W.formerChip).filter({ visible: true }).first()).toBeVisible()
    // The phone folds the filters into a disclosure, closed while only ?former=withAssets is on (no field filter): open it.
    if (e2eDevice === "phone") {
      const disclosure = page.locator("details").filter({ has: page.locator("summary", { hasText: W.filtersTitle }) })
      if (!(await disclosure.evaluate((element) => (element as HTMLDetailsElement).open))) await disclosure.locator("summary").click()
    }
    const search = page.getByRole("search").filter({ visible: true })
    await search.locator('input[name="search"]').fill(employee.code)
    await search.getByRole("button", { name: W.filter, exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get("former") === "withAssets" && url.searchParams.get("search") === employee.code)
    const entry = e2eDevice === "desktop"
      ? page.locator("[data-employee-desktop-table] tbody tr").filter({ hasText: employee.code })
      : page.locator("[data-employee-mobile-list] article").filter({ hasText: employee.code })
    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText(W.resigned)
    await expect(entry).toContainText(W.formerHolderNote)
    if (e2eDevice === "phone") await expect(entry).toContainText(fillTemplate(W.listHeldCount, { count: 3 }))
    else await expect(entry.locator("td").filter({ hasText: /^3$/ })).toHaveCount(1)
    await recordSettled(page, measure, "employee list, พ้นสภาพแต่ยังถือครอง")

    // The employee page from the list: the warning, the three held, no ส่งมอบ for a former employee.
    if (e2eDevice === "desktop") await entry.getByText(employee.fullNameTh, { exact: true }).click()
    else await entry.getByRole("link", { name: employee.fullNameTh, exact: true }).click()
    await page.waitForURL((url) => url.pathname === employeePath)
    await expect(warning(page, 3)).toBeVisible()
    await expect(page.getByRole("link", { name: W.handOverToPerson, exact: true })).toHaveCount(0)
    await expect(heldEntry(page, handedOver)).toContainText(handover.documentNo)
    await expect(heldEntry(page, handedOver)).toContainText(W.handoverRegular)
    await expect(heldEntry(page, legacy)).toContainText(W.legacy)
    await expect(heldEntry(page, legacy).getByRole("link", { name: W.createBackfill, exact: true })).toBeVisible()
    // The open repair: รับคืน is no link, and the return form's own reason stands under it (G7P2-R3, Review Focus 3).
    const repairEntry = heldEntry(page, inRepair)
    await expect(repairEntry).toContainText(W.reasonOpenRepair)
    await expect(repairEntry.getByRole("link", { name: new RegExp(`^${W.returnLabel}`) })).toHaveCount(0)
    await expect(repairEntry.locator('[aria-disabled="true"]')).toHaveText(W.returnLabel)
    // Group 7 follow-ups (Task 3, G7F-R4): the repair's MT- beside the status, linked; the other two have none.
    await expect(repairEntry.getByRole("link", { name: fillTemplate(W.openRepair, { repairNo: repair.repairNo }), exact: true })).toHaveAttribute("href", `/th/maintenance/${repair.id}`)
    for (const asset of [handedOver, legacy]) {
      await expect(heldEntry(page, asset).getByRole("link", { name: new RegExp(`^${fillTemplate(W.openRepair, { repairNo: "" })}`) })).toHaveCount(0)
    }
    // The held stat's foot over every held asset: one with an open HO-, two without.
    await expect(page.getByText(fillTemplate(W.heldStatFootSplit, { withHandover: 1, withoutHandover: 2 }), { exact: true }).filter({ visible: true })).toHaveCount(1)
    // ตรวจนับรอบปัจจุบัน: the run's new assets are in no open audit round, so the panel reads its empty line.
    await expect(page.getByRole("heading", { level: 2, name: W.currentAuditTitle, exact: true })).toBeVisible()
    await expect(page.getByText(W.currentAuditEmpty, { exact: true })).toBeVisible()
    await expect(page.locator("[data-employee-current-audit]")).toHaveCount(0)
    await recordSettled(page, measure, "employee page, a former holder")

    // Row ⋯ of the HO- one: โอนย้าย unavailable with the transfer form's reason (the open handover is returned first),
    // พิมพ์ใบส่งมอบ to the HO-'s print, back to this page.
    const handedOverMenu = await openHeldMenu(page, handedOver)
    expect(await readMenuEntries(handedOverMenu)).toEqual([
      { label: W.transfer, reason: W.reasonOpenCheckout, available: false },
      { label: W.printHandover, reason: null, available: true },
    ])
    const print = linkTarget(await menuItem(handedOverMenu, W.printHandover).getAttribute("href"))
    expect(print.url.pathname).toBe(`/th/asset-management/checkouts/${handover.id}`)
    expect(print.returnTo?.pathname).toBe(employeePath)
    await recordSettled(page, measure, "employee page, the HO- row's ⋯")
    await closeMenu(page, handedOverMenu)
    // Row ⋯ of the ข้อมูลเก่า one: no handover, so no print; โอนย้าย opens the transfer form with the asset, back here.
    const legacyMenu = await openHeldMenu(page, legacy)
    expect(await readMenuEntries(legacyMenu)).toEqual([{ label: W.transfer, reason: null, available: true }])
    const transfer = linkTarget(await menuItem(legacyMenu, W.transfer).getAttribute("href"))
    expect(transfer.url.pathname).toBe("/th/asset-management/transfer")
    expect(transfer.url.searchParams.get("assetId")).toBe(legacy.id)
    expect(transfer.returnTo?.pathname).toBe(employeePath)
    await closeMenu(page, legacyMenu)

    // รับคืน of the HO- one: the return form with its handover chosen; the save, then the RT-'s กลับ to the employee page.
    await returnLink(page, handedOver).click()
    await page.waitForURL((url) => url.pathname === "/th/asset-management/checkin" && url.searchParams.get("checkoutId") === handover.id)
    await expect(page.getByRole("heading", { level: 1, name: W.checkinTitle })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(pickedAsset(page, handedOver.id)).toContainText(handedOver.assetTag)
    await recordSettled(page, measure, "return form, from the employee page")
    await returnToEmployeePage(page, handedOver, employee, room)
    await recordSettled(page, measure, "RT- document, from the employee page")
    await page.getByRole("link", { name: W.back, exact: true }).filter({ visible: true }).first().click()
    await page.waitForURL((url) => url.pathname === employeePath)
    await expect(warning(page, 2)).toBeVisible()
    await expect(heldEntry(page, handedOver)).toHaveCount(0)

    // รับคืน of the ข้อมูลเก่า one: the legacy path, its confirm on arrival, then the backfill's HO- chosen (Review Focus 2).
    await returnLink(page, legacy).click()
    await page.waitForURL((url) => url.pathname === "/th/asset-management/checkin" && url.searchParams.get("assetId") === legacy.id)
    const confirm = page.getByRole("alertdialog", { name: W.legacyConfirmTitle })
    await expect(confirm).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(confirm).toContainText(legacy.assetTag)
    await recordSettled(page, measure, "return form, the legacy confirm from the employee page")
    await confirm.getByRole("button", { name: W.legacyConfirm, exact: true }).click()
    await page.waitForURL((url) => url.pathname === "/th/asset-management/checkin" && Boolean(url.searchParams.get("checkoutId")) && Boolean(url.searchParams.get("returnTo")))
    await expect(confirm).toHaveCount(0)
    await expect(pickedAsset(page, legacy.id)).toContainText(legacy.assetTag)
    await returnToEmployeePage(page, legacy, employee, room)
    await page.getByRole("link", { name: W.back, exact: true }).filter({ visible: true }).first().click()
    await page.waitForURL((url) => url.pathname === employeePath)
    await expect(warning(page, 1)).toBeVisible()
    await expect(heldEntry(page, legacy)).toHaveCount(0)
    await expect(heldEntry(page, inRepair)).toContainText(W.reasonOpenRepair)
    await recordSettled(page, measure, "employee page, after two returns")
  })
})
