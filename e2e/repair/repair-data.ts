// The repair and PM area's data and shared steps (spec §6.3). Each test creates its own E2E assets through the app as
// IT staff (POST /api/assets with the asset form's own choices), hands one over for good when it needs an asset in use,
// and reads an asset back with a GET. Every asset tag carries the run id and the project, so the four projects never
// share an asset and a person sees the marker in every list. The arranging requests go through page.request, so they
// are not the steps under test; the walk itself is on the page.
import type { APIRequestContext, Locator, Page, TestInfo } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import type { Measure } from "../support/measure.ts"
import { readRunData, readRunState } from "../support/state.ts"

export type AssetMasters = { categoryId: string; readyStatusId: string; goodConditionId: string }
export type AssetRow = { id: string; assetTag: string; name: string; status: { name: string; nameTh: string }; custodian: { code: string; fullNameTh: string } | null }

// Today in Bangkok as the date inputs hold it (yyyy-mm-dd), the day the server counts records by.
export function bangkokToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

// The day before a yyyy-mm-dd date.
export function dayBefore(date: string): string {
  return dayAfter(date, -1)
}

// The day a number of days after a yyyy-mm-dd date.
export function dayAfter(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

// The days from one yyyy-mm-dd date to another, as the PM badges count Bangkok days ("เกินกำหนด N วัน").
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

// E2E-1019N-desktop-light-R1: the run, the project and the asset's role in the test (at most 50 characters).
export function areaTag(testInfo: TestInfo, suffix: string): string {
  const tag = `${readRunState().runId}-${testInfo.project.name}-${suffix}`
  if (tag.length > 50) throw new Error(`asset tag ${tag} is longer than 50 characters`)
  return tag
}

// The asset form's choices: the IT staff role has no category or status API, so they are read from the selects of
// /th/assets/new, on a page of their own (not the test's measured page): Notebook, Ready (พร้อมใช้งาน), Good (ดี).
export async function readAssetMasters(page: Page): Promise<AssetMasters> {
  const formPage = await page.context().newPage()
  try {
    await formPage.goto("/th/assets/new")
    const valueOf = async (select: string, label: RegExp) => {
      const value = await formPage.locator(`${select} option`).filter({ hasText: label }).first().getAttribute("value")
      if (!value) throw new Error(`the asset form has no ${label} in ${select}`)
      return value
    }
    return {
      categoryId: await valueOf("#asset-category", /^Notebook - /),
      readyStatusId: await valueOf("#asset-status", /^พร้อมใช้งาน$/),
      goodConditionId: await valueOf("#asset-condition", /^ดี$/),
    }
  } finally {
    await formPage.close()
  }
}

// One E2E asset in the run's department and room, Ready and Good.
export async function createAsset(
  request: APIRequestContext,
  masters: AssetMasters,
  asset: { tag: string; name: string; ownershipType: "personal" | "shared" | "stock" }
): Promise<AssetRow> {
  const run = readRunData()
  const response = await request.post("/api/assets", {
    data: {
      assetTag: asset.tag,
      name: asset.name,
      categoryId: masters.categoryId,
      companyId: run.companyId,
      branchId: run.branchId,
      ownershipType: asset.ownershipType,
      departmentId: run.departmentId,
      homeLocationId: run.locationId,
      currentLocationId: run.locationId,
      statusId: masters.readyStatusId,
      conditionId: masters.goodConditionId,
      // The schema takes a missing date, price or seat count only when its key is there (the asset form sends them).
      purchaseDate: null,
      purchasePrice: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      remark: `${readRunState().runId} ซ่อมบำรุง E2E`,
      isActive: true,
    },
  })
  if (response.status() !== 201) throw new Error(`POST /api/assets ${asset.tag} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as AssetRow
}

// A permanent handover to an employee (no due date): the asset is In Use with an active handover, as a staff member's
// own notebook is when it goes for repair. Returns the handover (its id and its HO- number).
export async function handOverPermanently(request: APIRequestContext, masters: AssetMasters, assetId: string, employeeId: string): Promise<{ id: string; documentNo: string }> {
  const response = await request.post(`/api/assets/${assetId}/checkout`, {
    data: {
      handoverMode: "permanent_assignment",
      checkoutType: "user",
      custodianId: employeeId,
      checkoutDate: bangkokToday(),
      expectedReturnDate: null,
      conditionBefore: masters.goodConditionId,
      remark: `${readRunState().runId} ส่งมอบก่อนส่งซ่อม`,
    },
  })
  if (response.status() !== 201) throw new Error(`the handover of ${assetId} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as { id: string; documentNo: string }
}

// A run-marked monthly PM plan of an asset, due on nextDueDate (yyyy-mm-dd), as the PM form saves one. Its test ends it
// with endPlan, so the run leaves no active plan behind.
export async function createPlan(request: APIRequestContext, plan: { assetId: string; title: string; nextDueDate: string }): Promise<{ id: string; planNo: string }> {
  const response = await request.post("/api/maintenance-plans", {
    data: { assetId: plan.assetId, title: plan.title, frequency: "monthly", intervalDays: null, nextDueDate: plan.nextDueDate, vendorId: null, notes: `${readRunState().runId} แผน PM E2E` },
  })
  if (response.status() !== 201) throw new Error(`POST /api/maintenance-plans ${plan.title} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as { id: string; planNo: string }
}

// Ends a PM plan (its list's "จบแผน").
export async function endPlan(request: APIRequestContext, planId: string) {
  const response = await request.patch(`/api/maintenance-plans/${planId}`, { data: { action: "end" } })
  if (response.status() !== 200) throw new Error(`ending the PM plan ${planId} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
}

export async function readAsset(request: APIRequestContext, assetId: string): Promise<AssetRow> {
  const response = await request.get(`/api/assets/${assetId}`)
  if (!response.ok()) throw new Error(`GET /api/assets/${assetId} answered ${response.status()}`)
  return (await response.json()) as AssetRow
}

// The searchable select of the repair and PM forms: open it, type the asset tag, pick the asset.
export async function chooseAsset(page: Page, triggerId: string, tag: string) {
  await page.locator(`#${triggerId}`).click()
  await page.getByPlaceholder("พิมพ์เพื่อค้นหา...").fill(tag)
  await page.getByRole("option", { name: new RegExp(`^${escapeRegExp(tag)} - `) }).click()
  await expect(page.locator(`#${triggerId}-value`)).toContainText(tag)
}

// The value beside a label of a key-value list (dl > dt + dd), for example สถานะปัจจุบัน on the repair record page.
export function valueBeside(scope: Page | Locator, label: string): Locator {
  return scope.locator("dt", { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first().locator("xpath=following-sibling::dd[1]")
}

// The record's state badge in the page header (ยังซ่อมไม่เสร็จ, ซ่อมเสร็จแล้ว, ยกเลิก).
export function headerBadge(page: Page): Locator {
  return page.locator('[data-slot="page-header-meta"] [data-slot="status-badge"]')
}

// The repair form's answers, checked by their names (a ChoiceCard is named by its label only): ซ่อมเสร็จแล้ว or
// ยังซ่อมไม่เสร็จ, then the result and สภาพหลังซ่อม when asked. Nothing is pre-checked except ซ่อมเสร็จแล้ว on ?planId=.
export async function answerRepair(page: Page, answer: { done: boolean; outcome?: "ใช้งานได้" | "ซ่อมไม่ได้ เสนอจำหน่าย"; condition?: "ดี" | "พอใช้" }) {
  await page.locator("#repair-record-done").getByRole("radio", { name: answer.done ? "ซ่อมเสร็จแล้ว" : "ยังซ่อมไม่เสร็จ", exact: true }).check()
  if (answer.outcome) await page.locator("#repair-record-outcome").getByRole("radio", { name: answer.outcome, exact: true }).check()
  if (answer.condition) await page.locator("#repair-create-condition").getByRole("radio", { name: answer.condition, exact: true }).check()
}

// The repair form's submit: the sticky footer's บันทึกซ่อม (G5P2-R10; the page title reads the same words).
export function repairSaveButton(page: Page): Locator {
  return page.locator("[data-slot=sticky-form-footer]").getByRole("button", { name: "บันทึกซ่อม", exact: true })
}

// The repair form's save: waits for the POST, checks it, and lands on the new record's page.
export async function saveRepairForm(page: Page, measure: Measure, label: string) {
  const created = page.waitForResponse((response) => response.url().endsWith("/api/maintenance-tickets") && response.request().method() === "POST")
  await measure.timed(label, async () => {
    await repairSaveButton(page).click()
    await created
  })
  const response = await created
  expect(response.status(), label).toBe(201)
  const record = (await response.json()) as { id: string; repairNo: string; repairStatus: string }
  await page.waitForURL(new RegExp(`/th/maintenance/${record.id}(?:\\?|$)`))
  return record
}

// The record page's next-step card (group 5 plan 3, spec §8.2): its state on data-repair-next-step.
export type RepairNextStepKind = "open" | "closedUsable" | "closedBeyond" | "closedNoOutcome" | "cancelled"
export function nextStepCard(page: Page, kind: RepairNextStepKind): Locator {
  return page.locator(`[data-repair-next-step="${kind}"]`)
}

// One result's row on the open card: what ซ่อมเสร็จ will do with ใช้งานได้ or ซ่อมไม่ได้ (the next status and the holder
// note, or the refusal on a held asset).
export function outcomeRow(page: Page, outcome: "usable" | "beyond_repair"): Locator {
  return page.locator(`[data-repair-next-step="open"] [data-repair-outcome-row="${outcome}"]`)
}

// The record's "ซ่อมเสร็จ": the header's from md (the card holds a second one, so the page has two), the phone bar's below.
export function recordCompleteButton(page: Page, device: E2eDevice): Locator {
  return device === "desktop"
    ? page.locator('[data-slot="page-header-actions"]').getByRole("button", { name: "ซ่อมเสร็จ", exact: true })
    : page.locator('[data-slot="action-bar"]').getByRole("button", { name: "ซ่อมเสร็จ", exact: true })
}

// The record's menu, opened: "อื่น ๆ" in the header on the desktop (a dropdown), "เพิ่มเติม" in the phone bar (a bottom
// sheet named by the record's MT-). Both hold แก้ไขรายละเอียด and, while the record is open, ยกเลิกบันทึก (G5P3-R8).
export async function openRecordMenu(page: Page, device: E2eDevice): Promise<Locator> {
  if (device === "desktop") {
    await page.locator('[data-slot="page-header-actions"]').getByRole("button", { name: "อื่น ๆ", exact: true }).click()
    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    return menu
  }
  await page.locator('[data-slot="action-bar"]').getByRole("button", { name: "เพิ่มเติม", exact: true }).click()
  const sheet = page.getByRole("dialog").filter({ visible: true }).last()
  await expect(sheet).toBeVisible()
  return sheet
}

// An item of the record's open menu by its words: a menu item on the desktop, a button or a link in the phone sheet.
export function recordMenuItem(menu: Locator, name: string): Locator {
  return menu.getByRole("menuitem", { name, exact: true }).or(menu.getByRole("button", { name, exact: true })).or(menu.getByRole("link", { name, exact: true }))
}

// "ซ่อมเสร็จ" on the record page: no result is pre-checked (G5P3-R9), then today's date, the outcome, save, and the
// dialog closes.
export async function completeRecord(page: Page, measure: Measure, device: E2eDevice, recordId: string, outcome: "ใช้งานได้" | "ซ่อมไม่ได้ เสนอจำหน่าย", label: string) {
  await recordCompleteButton(page, device).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกว่าซ่อมเสร็จ" })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator("#repair-complete-outcome").getByRole("radio", { checked: true })).toHaveCount(0)
  await dialog.getByRole("radio", { name: outcome, exact: true }).check()
  const completed = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${recordId}`) && response.request().method() === "PATCH")
  await measure.timed(label, async () => {
    await dialog.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
    expect((await completed).status(), label).toBe(200)
  })
  await expect(dialog).toBeHidden()
}

// One state change of a PM plan from its row's ⋯ (spec §9): the item, the confirm dialog and its button, the PATCH, the
// toast, the dialog closes. The list refreshes in place, and the plan leaves the tab it was on.
export async function planAction(page: Page, device: E2eDevice, row: Locator, action: string, dialogTitle: string, toast: string) {
  await planMenuItem(await openPlanMenu(page, device, row), action).click()
  const dialog = page.getByRole("dialog", { name: dialogTitle })
  await expect(dialog).toBeVisible()
  const changed = page.waitForResponse((response) => /\/api\/maintenance-plans\/[^/]+$/.test(response.url()) && response.request().method() === "PATCH")
  await dialog.getByRole("button", { name: action, exact: true }).click()
  expect((await changed).status(), action).toBe(200)
  await expect(page.getByText(toast)).toBeVisible()
  await expect(dialog).toBeHidden()
}

// The PM page (src/app/[locale]/(dashboard)/maintenance/pm/page.tsx, group 5 plan 4): one state per tab (?state=), a
// search over the plan and its asset (?q=) and, on the active tab, the due cells (?due=). The dev database keeps the
// old plans (decision 10.6), so a spec finds its own plan by search, never by position (spec §16).
export const PM_LIST = "/th/maintenance/pm"
export type PmTab = "active" | "paused" | "ended"
export type PmDueBucket = "overdue" | "soon" | "later"

// The page's address for a search, a tab and a cell, in the page's own words (src/lib/pm-plan-list.ts).
export function pmListUrl(search: { q: string; tab?: PmTab; due?: PmDueBucket }): string {
  const params = new URLSearchParams()
  if (search.tab && search.tab !== "active") params.set("state", search.tab)
  params.set("q", search.q)
  if (search.due) params.set("due", search.due)
  return `${PM_LIST}?${params.toString()}`
}

// The plans on screen: the table's rows from md (data-pm-plan-row), the phone cards (<article>) below.
export function planRows(page: Page): Locator {
  return page.getByRole("main").locator("tr[data-pm-plan-row], article").filter({ visible: true })
}

// One plan's row (or card) by its PM- number.
export function planRow(page: Page, planNo: string): Locator {
  return planRows(page).filter({ hasText: planNo })
}

// A plan's row on one tab: the search by its planNo gives that one row.
export async function visitPlanRow(page: Page, measure: Measure, planNo: string, tab: PmTab, label: string): Promise<Locator> {
  await measure.visit(pmListUrl({ q: planNo, tab }), label)
  await expect(planRows(page)).toHaveCount(1)
  const row = planRow(page, planNo)
  await expect(row).toBeVisible()
  return row
}

// A tab of the page by its words; its text is the words, then the count ("ใช้งาน2").
export function pmTab(page: Page, label: string): Locator {
  return page.getByRole("main").locator('[data-slot="tab-nav"]').getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}`) })
}

// A due cell of the active tab (StatStrip): its first dd is the count, its link the filter.
export function dueCell(page: Page, bucket: PmDueBucket): Locator {
  return page.locator(`[data-pm-due-cell="${bucket}"]`)
}

// The row's ⋯, named "การดำเนินการของแผน <planNo>" (maintenancePage.pmRowActions).
export const PLAN_MENU_NAME = /^การดำเนินการของแผน /

// The row's ⋯ opened: the dropdown on the desktop, the bottom sheet (named by the planNo) on the phone.
export async function openPlanMenu(page: Page, device: E2eDevice, row: Locator): Promise<Locator> {
  await row.getByRole("button", { name: PLAN_MENU_NAME }).click()
  const menu = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}

// An item of the open ⋯ by the start of its name (จบแผน reads its hint "ถาวร · มีให้ยืนยัน" after it): a menu item on
// the desktop, a button or a link in the phone sheet.
export function planMenuItem(menu: Locator, name: string): Locator {
  const options = { name: new RegExp(`^${escapeRegExp(name)}`) }
  return menu.getByRole("menuitem", options).or(menu.getByRole("button", options)).or(menu.getByRole("link", options)).first()
}

// The PM form's asset card (MT-PM-Form section 1): the pick or ?assetId= brings it in place of the picker (G5P4-R9).
export function planAssetCard(page: Page): Locator {
  return page.locator("[data-pm-asset-card]")
}

// The PM form's asset picker: open it, type the tag, pick the asset, and its card replaces the picker.
export async function choosePlanAsset(page: Page, tag: string) {
  await page.locator("#maintenance-plan-asset").click()
  await page.getByPlaceholder("พิมพ์เพื่อค้นหา...").fill(tag)
  await page.getByRole("option", { name: new RegExp(`^${escapeRegExp(tag)} - `) }).click()
  await expect(planAssetCard(page)).toContainText(tag)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
