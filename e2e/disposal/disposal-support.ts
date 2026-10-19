// The disposal workflows' helpers (spec §6.4). Each test makes its own records: a room of its own (the seed admin
// creates it, as the setup does), assets in it, then the requests the people walk. Every code, tag and reason carries
// the run id and the project, so the four projects never share a record and a person sees the marker in every list.
// The person at the device changes inside one test (IT staff request, the IT head approves, IT staff execute): actAs
// swaps the page's session for that user's saved one, so the one page, and its measurements, follow the whole workflow.
import { readFileSync } from "node:fs"
import { request as playwrightRequest, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eTheme } from "../support/matrix.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, authStateFile, fromRoot } from "../support/paths.ts"
import type { E2eUserKey } from "../support/run-plan.ts"
import { readRunData, readRunState, type RunData } from "../support/state.ts"

// The four projects' short codes, for tags and codes that have a length limit (location code 50, asset tag 50).
const PROJECT_CODES: Record<string, string> = { "desktop-light": "DL", "desktop-dark": "DD", "phone-light": "PL", "phone-dark": "PD" }

export function projectCode(testInfo: TestInfo): string {
  const code = PROJECT_CODES[testInfo.project.name]
  if (!code) throw new Error(`no project code for ${testInfo.project.name}`)
  return code
}

// The marker of one test's records: E2E-1019N-DL-DSP1 (run, project, workflow).
export function recordPrefix(testInfo: TestInfo, workflow: string): string {
  return `${readRunState().runId}-${projectCode(testInfo)}-${workflow}`
}

// The person at the device changes: the page drops the session it has and takes the user's saved one (the run's
// storage state, from the setup's single sign-in each), keeping the project's theme. No sign-in happens.
export async function actAs(page: Page, user: E2eUserKey, theme: E2eTheme) {
  const state = JSON.parse(readFileSync(fromRoot(authStateFile(readRunState().runId, user)), "utf8")) as {
    cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0]
  }
  const context = page.context()
  const baseURL = readRunState().baseURL
  await context.clearCookies()
  await context.addCookies([...state.cookies, { name: "theme", value: theme, url: baseURL }])
}

// The seed admin's API, for what only an admin may create (a room): the same storage state the setup uses.
export async function seedAdminApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: readRunState().baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
}

async function created<T>(response: Awaited<ReturnType<APIRequestContext["post"]>>, what: string): Promise<T> {
  if (response.status() !== 201) throw new Error(`${what} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as T
}

// A room of the test's own (spec §5: the suite creates its own data), so no other workflow's audit round scoped to the
// run's room reaches these assets, and this test's open round reaches nothing else.
export async function createRoom(code: string, name: string): Promise<string> {
  const admin = await seedAdminApi()
  try {
    const { branchId } = readRunData()
    const room = await created<{ id: string }>(
      await admin.post("/api/locations", { data: { code, name, locationType: "Room", branchId, isActive: true } }),
      `POST /api/locations ${code}`,
    )
    return room.id
  } finally {
    await admin.dispose()
  }
}

export type AssetChoices = { categoryId: string; statusId: string; conditionId: string }

// IT staff open the asset form (a measured page) and the choices a new asset needs are read off its selects: the first
// category, the Ready status ("พร้อมใช้งาน") and the first condition. These are the ids the form itself would send.
export async function readAssetChoices(page: Page, measure: Measure): Promise<AssetChoices> {
  await measure.visit("/th/assets/new", "asset form (choices for the disposal assets)")
  const firstValue = async (select: Locator) =>
    select.locator("option").evaluateAll((options) => (options as HTMLOptionElement[]).map((option) => option.value).find(Boolean) ?? "")
  const categoryId = await firstValue(page.locator("#asset-category"))
  const conditionId = await firstValue(page.locator("#asset-condition"))
  const statusId = await page.locator("#asset-status option", { hasText: /^พร้อมใช้งาน$/ }).getAttribute("value")
  if (!categoryId || !conditionId || !statusId) throw new Error("the asset form has no category, condition or Ready status to choose")
  return { categoryId, statusId, conditionId }
}

export type DisposalAsset = { id: string; assetTag: string; name: string }

// Assets in the test's room, Ready with no holder (a disposal can start from there), created by the user signed in on
// the page through the asset API the form posts to.
export async function createAssets(page: Page, choices: AssetChoices, roomId: string, tags: readonly string[]): Promise<DisposalAsset[]> {
  const data: RunData = readRunData()
  const assets: DisposalAsset[] = []
  for (const assetTag of tags) {
    const name = `${assetTag} เครื่องทดสอบตัดจำหน่าย`
    const asset = await created<{ id: string; assetTag: string }>(
      await page.request.post("/api/assets", {
        data: {
          assetTag,
          name,
          categoryId: choices.categoryId,
          companyId: data.companyId,
          branchId: data.branchId,
          currentLocationId: roomId,
          homeLocationId: roomId,
          statusId: choices.statusId,
          conditionId: choices.conditionId,
          remark: `${assetTag} สร้างโดยชุดทดสอบ E2E`,
          // The schema's preprocessed optional numbers and dates need their keys present (the form always sends
          // them; foundation note N3 is the same zod behaviour).
          licenseTotalSeats: null,
          licenseUsedSeats: null,
          purchaseDate: null,
          purchasePrice: null,
          warrantyStartDate: null,
          warrantyEndDate: null,
        },
      }),
      `POST /api/assets ${assetTag}`,
    )
    assets.push({ id: asset.id, assetTag: asset.assetTag, name })
  }
  return assets
}

// The run's employee a person picks (the requester, the executor): the option reads "<code> - <name>".
export function employeeLabel(key: string): string {
  const employee = readRunData().employees[key]
  if (!employee) throw new Error(`the run has no ${key} employee`)
  return `${employee.code} - ${employee.fullNameTh}`
}

// A SearchableSelect (a button that opens a searchable list): open it, type the code, choose the option.
export async function chooseSearchable(page: Page, triggerId: string, label: string) {
  await page.locator(`#${triggerId}`).click()
  await page.getByRole("combobox").last().fill(label.split(" - ")[0])
  await page.getByRole("option", { name: label }).click()
  await expect(page.locator(`#${triggerId}`)).toContainText(label)
}

// The disposal asset picker: type the tag, wait for the search, choose the asset's option.
export async function pickDisposalAsset(page: Page, search: Locator, asset: DisposalAsset) {
  await search.fill(asset.assetTag)
  await page.getByRole("option", { name: new RegExp(escapeRegExp(asset.assetTag)) }).click()
}

// A sonner toast with this text.
export function toast(page: Page, text: string | RegExp): Locator {
  return page.locator("[data-sonner-toast]").filter({ hasText: text })
}

// The toast shows, and its fade-in has ended: sonner fades a toast in, and axe reads a fading toast's colors at the
// opacity of that moment (a color-contrast failure the person never sees once it has settled).
export async function expectToast(page: Page, text: string | RegExp): Promise<Locator> {
  const item = toast(page, text)
  await expect(item).toBeVisible()
  await expect
    .poll(() => item.evaluate((element) => element.getAnimations({ subtree: true }).length === 0 && getComputedStyle(element).opacity === "1"))
    .toBe(true)
  return item
}

// The button on screen: the detail pages render the next action twice (the header on the desktop, the action bar on
// the phone), and only one of them shows.
export function visibleButton(page: Page, name: string | RegExp): Locator {
  return page.getByRole("button", { name }).filter({ visible: true })
}

export function visibleLink(page: Page, name: string | RegExp): Locator {
  return page.getByRole("link", { name }).filter({ visible: true })
}

// A bulk execution of one approved request, up to its preview, from the approved tab of the queue: select the row, fill
// the shared values (executor, final status Disposed, shared recipient) and ask for the preview. Returns the dialog once
// the preview has answered (its counts show).
export async function openBulkExecutionPreview(page: Page, asset: DisposalAsset, executor: string, recipient: string): Promise<Locator> {
  const toggle = page.getByRole("button", { name: "เลือกหลายรายการ" }).filter({ visible: true })
  if (await toggle.count()) await toggle.click()
  // The bulk execution names each row by the asset tag and name ("ทรัพย์สิน <tag> - <name>").
  await page.getByRole("checkbox", { name: new RegExp(`ทรัพย์สิน ${escapeRegExp(asset.assetTag)} - `) }).filter({ visible: true }).check()
  await page.getByRole("button", { name: "ตรวจสอบการดำเนินการ" }).click()
  const dialog = page.getByRole("dialog", { name: "ตรวจสอบการดำเนินการตัดจำหน่ายแบบกลุ่ม" })
  await dialog.locator("#disposal-bulk-execution-executor").selectOption({ label: executor })
  await dialog.locator("#disposal-bulk-execution-status").selectOption({ label: "ตัดจำหน่ายแล้ว" })
  await dialog.locator("#disposal-bulk-execution-recipient").fill(recipient)
  await dialog.getByRole("button", { name: "ยืนยันดำเนินการ 1 รายการ" }).click()
  await expect(dialog.getByText("ดำเนินการได้", { exact: true })).toBeVisible()
  return dialog
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const EVIDENCE_PDF = "e2e/fixtures/evidence.pdf"
