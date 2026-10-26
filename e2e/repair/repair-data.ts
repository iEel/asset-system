// The repair and PM area's data and shared steps (spec §6.3). Each test creates its own E2E assets through the app as
// IT staff (POST /api/assets with the asset form's own choices), hands one over for good when it needs an asset in use,
// and reads an asset back with a GET. Every asset tag carries the run id and the project, so the four projects never
// share an asset and a person sees the marker in every list. The arranging requests go through page.request, so they
// are not the steps under test; the walk itself is on the page.
import type { APIRequestContext, Locator, Page, TestInfo } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
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
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
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
// own notebook is when it goes for repair.
export async function handOverPermanently(request: APIRequestContext, masters: AssetMasters, assetId: string, employeeId: string) {
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

// The repair form's save: waits for the POST, checks it, and lands on the new record's page.
export async function saveRepairForm(page: Page, measure: Measure, label: string) {
  const created = page.waitForResponse((response) => response.url().endsWith("/api/maintenance-tickets") && response.request().method() === "POST")
  await measure.timed(label, async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await created
  })
  const response = await created
  expect(response.status(), label).toBe(201)
  const record = (await response.json()) as { id: string; repairNo: string; repairStatus: string }
  await page.waitForURL(new RegExp(`/th/maintenance/${record.id}(?:\\?|$)`))
  return record
}

// "ซ่อมเสร็จ" on the record page: today's date, the outcome, save, and the dialog closes.
export async function completeRecord(page: Page, measure: Measure, recordId: string, outcome: "ใช้งานได้" | "ซ่อมไม่ได้ เสนอจำหน่าย", label: string) {
  await page.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกว่าซ่อมเสร็จ" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("radio", { name: outcome }).check()
  const completed = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${recordId}`) && response.request().method() === "PATCH")
  await measure.timed(label, async () => {
    await dialog.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
    expect((await completed).status(), label).toBe(200)
  })
  await expect(dialog).toBeHidden()
}

// One state change on a PM list row: its button, the confirm dialog and its button, the PATCH, the toast, the dialog
// closes.
export async function planAction(page: Page, row: Locator, action: string, dialogTitle: string, toast: string) {
  await row.getByRole("button", { name: action, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: dialogTitle })
  await expect(dialog).toBeVisible()
  const changed = page.waitForResponse((response) => /\/api\/maintenance-plans\/[^/]+$/.test(response.url()) && response.request().method() === "PATCH")
  await dialog.getByRole("button", { name: action, exact: true }).click()
  expect((await changed).status(), action).toBe(200)
  await expect(page.getByText(toast)).toBeVisible()
  await expect(dialog).toBeHidden()
}

// The PM list holds every plan of the database: active plans first, then paused, then ended, each by next due date,
// across every page (src/app/[locale]/(dashboard)/maintenance/pm/page.tsx). A page of 100 keeps the run's active plan
// near the top, but the dev database gains plans run by run.
export const PM_LIST = "/th/maintenance/pm?pageSize=100"

// A plan's row on the PM list, on whichever page holds it: the dev database held 103 active plans on 2026-10-26
// (E2E-1026E), so a paused or ended plan sits on page 2 or later. Visits page 1, then 2, 3 and so on (each measured)
// until a row names the plan, and stops with an error on the last page (no "next" link).
export async function visitPlanRow(page: Page, measure: Measure, title: string, label: string): Promise<Locator> {
  const row = page.getByRole("main").locator("li").filter({ hasText: title })
  for (let listPage = 1; ; listPage += 1) {
    await measure.visit(listPage === 1 ? PM_LIST : `${PM_LIST}&page=${listPage}`, listPage === 1 ? label : `${label}, page ${listPage}`)
    if (await row.first().isVisible()) return row
    if ((await page.getByRole("main").locator('a[rel="next"]').count()) === 0) throw new Error(`no page of the PM list holds the plan ${title} (last page ${listPage})`)
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
