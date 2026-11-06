// The disposal workflows' helpers (spec §6.4). Each test makes its own records: a room of its own (the seed admin
// creates it, as the setup does), assets in it, then the requests the people walk. Every code, tag and reason carries
// the run id and the project, so the four projects never share a record and a person sees the marker in every list.
// The person at the device changes inside one test (IT staff request, the IT head approves, IT staff record it in a
// round): actAs swaps the page's session for that user's saved one, so the one page, and its measurements, follow the
// whole workflow.
import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { request as playwrightRequest, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test"
import { recordSettled } from "../audit/settle.ts"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice, E2eTheme } from "../support/matrix.ts"
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

// The run's branch as the app names it (GET /api/branches, the seed admin's read): the register's location chip reads
// the location's path from the branch down since group 7 plan 3 Task 4 ("ที่ตั้ง: <branch> › <room>").
export async function readRunBranch(): Promise<{ id: string; name: string }> {
  const admin = await seedAdminApi()
  try {
    const response = await admin.get("/api/branches")
    if (response.status() !== 200) throw new Error(`GET /api/branches answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    const { branchId } = readRunData()
    const branch = ((await response.json()) as { id: string; name: string }[]).find((row) => row.id === branchId)
    if (!branch) throw new Error(`the run's branch ${branchId} is not an active branch`)
    return { id: branch.id, name: branch.name }
  } finally {
    await admin.dispose()
  }
}

export type AssetChoices = { categoryId: string; statusId: string; conditionId: string }

// IT staff open the asset form (a measured page) and the choices a new asset needs are read off its selects: the first
// category, the Ready status ("พร้อมใช้งาน") and the first condition. These are the ids the form itself would send.
export async function readAssetChoices(page: Page, measure: Measure): Promise<AssetChoices> {
  await measure.visit("/th/assets/new", "asset form (choices for the disposal assets)")
  // The dashboard's loading.tsx streams the form, so its selects may still be empty here (13B loop 5).
  await expect(page.locator('#asset-category option:not([value=""])').first()).toBeAttached()
  await expect(page.locator('#asset-condition option:not([value=""])').first()).toBeAttached()
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
// serialNumbers gives some of them a Serial (the batch form and page show it), keyed by tag.
export async function createAssets(
  page: Page,
  choices: AssetChoices,
  roomId: string,
  tags: readonly string[],
  serialNumbers: Readonly<Record<string, string>> = {},
): Promise<DisposalAsset[]> {
  const data: RunData = readRunData()
  const assets: DisposalAsset[] = []
  for (const assetTag of tags) {
    const name = `${assetTag} เครื่องทดสอบตัดจำหน่าย`
    const asset = await created<{ id: string; assetTag: string }>(
      await page.request.post("/api/assets", {
        data: {
          assetTag,
          name,
          ...(serialNumbers[assetTag] ? { serialNumber: serialNumbers[assetTag] } : {}),
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const EVIDENCE_PDF = "e2e/fixtures/evidence.pdf"
// The suite's image (a 96×64 PNG): a request needs one JPG, PNG or WEBP before it is sent (group 6 plan 3).
export const PHOTO_PNG = "e2e/fixtures/photo.png"

// The request form (board DP-New, group 6 plan 3): the method is a ChoiceCard radio named by its word (ขาย · บริจาค ·
// ทำลาย · สูญหาย · ตัดจำหน่าย), with no default.
export async function chooseMethod(page: Page, word: string) {
  const radio = page.getByRole("radio", { name: word, exact: true })
  await radio.check()
  await expect(radio).toBeChecked()
}

// The request form's photo input (the dropzone's file input, #disposal-request-photos): each call queues more files.
export function requestPhotoInput(page: Page): Locator {
  return page.locator("#disposal-request-photos")
}

// The request form's submit, the sticky footer's ส่งคำขอตัดจำหน่าย.
export function sendRequestButton(page: Page): Locator {
  return page.getByRole("button", { name: "ส่งคำขอตัดจำหน่าย", exact: true }).filter({ visible: true })
}

// The requester starts as the signed-in user's employee ("code - name · department"): the specs read it, never choose
// it again.
export async function expectPresetRequester(page: Page, key: string) {
  await expect(page.locator("#disposal-request-requested-by")).toContainText(employeeLabel(key))
}

// The chosen asset's card with its readiness line (the ready line names no blocker).
export async function expectReadyAssetCard(page: Page, asset: DisposalAsset) {
  const card = page.locator("[data-disposal-asset-card]")
  await expect(card).toContainText(asset.assetTag)
  await expect(card).toContainText(asset.name)
  await expect(page.locator('[data-disposal-readiness="ready"]')).toHaveText("ไม่มีงานค้าง: รับคืนแล้ว · ไม่มีงานซ่อม · ไม่อยู่ในรอบตรวจนับ · ไม่มีส่วนควบติดตั้ง")
}

// The request page's number (DP-…), read off the page header's meta line "tag · คำขอ DP-…".
export async function readDisposalNo(page: Page): Promise<string> {
  const text = await page.getByRole("main").innerText()
  const disposalNo = text.match(/DP-\d{8}-\d{4}/)?.[0] ?? ""
  expect(disposalNo).toMatch(/^DP-\d{8}-\d{4}$/)
  return disposalNo
}

// The request page's next steps for someone who cannot decide: no อนุมัติ or ปฏิเสธ anywhere, no action bar on the
// phone, and print in the header (the ⋯ on the phone).
export async function expectNoDecision(page: Page, device: E2eDevice, disposalNo: string) {
  await expect(visibleButton(page, /^อนุมัติ$/)).toHaveCount(0)
  await expect(visibleButton(page, /^ปฏิเสธ$/)).toHaveCount(0)
  await expect(page.locator('[data-slot="action-bar"]')).toHaveCount(0)
  if (device === "phone") {
    await visibleButton(page, `การดำเนินการของ ${disposalNo}`).click()
    await expect(visibleLink(page, "พิมพ์คำขอตัดจำหน่าย")).toHaveCount(1)
    await page.keyboard.press("Escape")
    await expect(visibleLink(page, "พิมพ์คำขอตัดจำหน่าย")).toHaveCount(0)
  } else {
    await expect(visibleLink(page, "พิมพ์คำขอตัดจำหน่าย")).toHaveCount(1)
  }
}

// Disposal rounds (group 6 plan 4): an approved request is disposed only through a รอบตัดจำหน่าย. Per-row and bulk
// execution are retired (P4-R1: their routes answer 410 DISPOSAL_USE_ROUND).
export const ROUND_SELECTION_KEY = "disposal-round-selection"

// The queue's approved tab, narrowed to the test's marker (the selection's scope is this search).
export function approvedTab(search: string): string {
  return `/th/disposal?status=approved&search=${encodeURIComponent(search)}`
}

// A row's round tick on the approved tab, named "เลือก {asset name} · {DP-…}" (a blocked row's adds its reason in
// brackets). From md only.
export function roundTick(page: Page, asset: DisposalAsset): Locator {
  return page.getByRole("checkbox", { name: new RegExp(`^เลือก ${escapeRegExp(asset.name)} · `) })
}

// The selection the approved tab leaves for สร้างรอบตัดจำหน่าย (P4-R2): the ids and the tab's scope (search, type,
// dates). The phone has no ticks (spec §10.2), so a phone test leaves the same selection the computer's ticks would.
export async function writeRoundSelection(page: Page, search: string, ids: readonly string[]) {
  const value = JSON.stringify({ ids, scope: JSON.stringify([search.trim(), "", "", ""]) })
  await page.evaluate(([key, stored]) => window.sessionStorage.setItem(key, stored), [ROUND_SELECTION_KEY, value] as const)
}

export type RoundRequest = { id: string; asset: DisposalAsset }

// Select these approved requests and open สร้างรอบตัดจำหน่าย. The computer ticks them on the approved tab and presses
// the bar's "สร้างรอบตัดจำหน่าย {n} รายการ"; the phone's approved tab has no ticks and says so, and the test leaves the
// selection itself. The page has listed every machine (eligible or blocked) when this returns; axe runs on it.
export async function openRoundForm(page: Page, measure: Measure, device: E2eDevice, search: string, requests: readonly RoundRequest[]) {
  await measure.visit(approvedTab(search), "IT staff: the approved tab")
  if (device === "phone") {
    await expect(page.locator("[data-disposal-round-tick]").filter({ visible: true })).toHaveCount(0)
    await expect(page.locator("[data-disposal-round-phone-note]")).toHaveText("สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")
    await writeRoundSelection(page, search, requests.map((request) => request.id))
    await page.goto("/th/disposal/rounds/new", { waitUntil: "load" })
  } else {
    await expect(page.locator("[data-disposal-round-phone-note]")).toBeHidden()
    for (const request of requests) await roundTick(page, request.asset).check()
    const bar = page.getByRole("group", { name: "รายการที่เลือกสำหรับรอบตัดจำหน่าย" })
    await expect(bar).toContainText(`${requests.length} เลือกแล้ว (จากทุกหน้า)`)
    await measure.timed("IT staff: open the new round", async () => {
      await bar.getByRole("button", { name: `สร้างรอบตัดจำหน่าย ${requests.length} รายการ` }).click()
      await page.waitForURL(/\/th\/disposal\/rounds\/new$/)
    })
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("สร้างรอบตัดจำหน่าย")
  await expect(page.locator("[data-disposal-round-machine]")).toHaveCount(requests.length)
  await recordSettled(page, measure, "IT staff: new disposal round")
}

export type RoundEntry = { method: string; documentNo: string; recipient?: string; saleValue?: string; remark?: string }
export type SavedRound = { id: string; roundNo: string; path: string }

// The round form's two primaries: "ตรวจสอบรอบ" until the check passes, then "บันทึกรอบตัดจำหน่าย {n} รายการ".
export function checkRoundButton(page: Page): Locator {
  return page.getByRole("button", { name: "ตรวจสอบรอบ", exact: true })
}

export function saveRoundButton(page: Page, count: number): Locator {
  return page.getByRole("button", { name: `บันทึกรอบตัดจำหน่าย ${count} รายการ`, exact: true })
}

// Fill the round (the method by its word, the buyer or recipient, the document, the lump price for ขาย, the detail),
// press "ตรวจสอบรอบ", then "บันทึกรอบตัดจำหน่าย {n} รายการ". The executor stays the signed-in IT staff (the preset,
// never an approver of a machine in the round). Returns on the round's page.
export async function createRound(page: Page, measure: Measure, entry: RoundEntry, count: number): Promise<SavedRound> {
  await chooseMethod(page, entry.method)
  await expect(page.locator("#disposal-round-executed-by")).toContainText(employeeLabel("itStaff"))
  if (entry.recipient !== undefined) await page.locator("#disposal-round-recipient").fill(entry.recipient)
  await page.locator("#disposal-round-document").fill(entry.documentNo)
  if (entry.saleValue !== undefined) await page.locator("#disposal-round-sale-value").fill(entry.saleValue)
  if (entry.remark !== undefined) await page.locator("#disposal-round-remark").fill(entry.remark)
  await checkRoundButton(page).click()
  const save = saveRoundButton(page, count)
  await expect(save).toBeEnabled()
  await expect(page.locator("[data-disposal-round-footer]").first()).toHaveText(`ตรวจสอบแล้ว · บันทึกได้ทั้ง ${count} รายการ`)
  await recordSettled(page, measure, "IT staff: the round, checked")
  await measure.timed("IT staff: save the round", async () => {
    await save.click()
    await page.waitForURL(/\/th\/disposal\/rounds\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, /บันทึกรอบตัดจำหน่าย DPR-\d{8}-\d{4} แล้ว/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^รอบตัดจำหน่าย · /)
  const meta = await page.locator("[data-disposal-round-meta]").first().innerText()
  const roundNo = meta.match(/DPR-\d{8}-\d{4}/)?.[0] ?? ""
  expect(roundNo).toMatch(/^DPR-\d{8}-\d{4}$/)
  const path = new URL(page.url()).pathname
  await recordSettled(page, measure, "IT staff: the disposal round")
  return { id: path.split("/").pop() as string, roundNo, path }
}

// The request-batch form (board DP-Batch-New, request batches spec §4): the machines are picked by their tag, each row
// has an optional photo slot, the lot's files are required (an image; any file for สูญหาย), and the footer sends
// "ส่งคำขอ {n} เครื่อง" with no review step. The form is for the computer: below md the page shows only a notice, so a
// phone test makes its batch through the API the form posts to (createBatchThroughApi).
export const BATCH_PHONE_NOTE = "สร้างชุดคำขอได้บนคอมพิวเตอร์"

export function batchSearch(page: Page): Locator {
  return page.getByPlaceholder("ค้นหารหัสทรัพย์สิน Serial หรือชื่อ")
}

// Type the shared part of the tags once, then choose each machine's option (the list stays open for more).
export async function pickBatchMachines(page: Page, search: string, assets: readonly DisposalAsset[]) {
  await batchSearch(page).fill(search)
  for (const asset of assets) await page.getByRole("option", { name: new RegExp(escapeRegExp(asset.assetTag)) }).click()
  for (const asset of assets) await expect(batchMachineRow(page, asset)).toBeVisible()
}

// A machine's row on the form.
export function batchMachineRow(page: Page, asset: DisposalAsset): Locator {
  return page.locator(`[data-disposal-batch-machine="${asset.assetTag}"]`)
}

// A machine's own photo slot (its dropzone's file input); a lost batch has none.
export function batchMachinePhotoInput(page: Page, asset: DisposalAsset): Locator {
  return batchMachineRow(page, asset).locator('[data-disposal-batch-machine-photo] input[type="file"]')
}

// The lot's files (#disposal-batch-lot-files, the dropzone's file input): each call queues more.
export function batchLotInput(page: Page): Locator {
  return page.locator("#disposal-batch-lot-files")
}

export function sendBatchButton(page: Page, count: number): Locator {
  return page.getByRole("button", { name: `ส่งคำขอ ${count} เครื่อง`, exact: true }).filter({ visible: true })
}

// Send the filled form and land on the new batch's page with its toast; returns the batch page's path.
export async function sendBatch(page: Page, measure: Measure, count: number): Promise<string> {
  await measure.timed("IT staff: send the batch", async () => {
    await sendBatchButton(page, count).click()
    await page.waitForURL(/\/th\/disposal\/batches\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, `สร้างชุดคำขอ ${count} รายการสำเร็จ`)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^DPB-\d{8}-\d{4}$/)
  return new URL(page.url()).pathname
}

export type BatchEntry = {
  assets: readonly DisposalAsset[]
  /** The API's method: sell · donate · destroy · lost · dispose. */
  disposalType: string
  reason: string
  /** Files per asset id, sent to that machine's own request. */
  machineFiles?: Readonly<Record<string, readonly string[]>>
  lotFiles: readonly string[]
}

const FIXTURE_TYPES: Record<string, string> = { ".png": "image/png", ".pdf": "application/pdf" }

async function uploadFixture(page: Page, url: string, file: string) {
  const name = basename(file)
  const mimeType = FIXTURE_TYPES[name.slice(name.lastIndexOf("."))] ?? "application/octet-stream"
  const response = await page.request.post(url, { multipart: { file: { name, mimeType, buffer: readFileSync(fromRoot(file)) } } })
  if (response.status() !== 201) throw new Error(`POST ${url} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
}

// The batch as the form sends it, for the phone (the form is desktop-only): the signed-in user's POST
// /api/disposal-batches with the run's IT staff as the requester, then each machine's files to its request and the lot's
// files to the batch. Returns the batch page's path.
export async function createBatchThroughApi(page: Page, entry: BatchEntry): Promise<string> {
  const response = await page.request.post("/api/disposal-batches", {
    data: {
      assetIds: entry.assets.map((asset) => asset.id),
      disposalType: entry.disposalType,
      reason: entry.reason,
      requestedById: readRunData().employees.itStaff.id,
      approverId: null,
    },
  })
  const batch = await created<{ batch: { id: string }; requests: { id: string; assetId: string }[] }>(response, "POST /api/disposal-batches")
  for (const request of batch.requests) {
    for (const file of entry.machineFiles?.[request.assetId] ?? []) await uploadFixture(page, `/api/disposal-requests/${request.id}/attachments`, file)
  }
  for (const file of entry.lotFiles) await uploadFixture(page, `/api/disposal-batches/${batch.batch.id}/attachments`, file)
  return `/th/disposal/batches/${batch.batch.id}`
}

// A machine on the batch page: its table row on the computer, its card on the phone.
export function batchPageMachine(page: Page, device: E2eDevice, asset: DisposalAsset): Locator {
  const rows = device === "phone" ? page.getByRole("main").locator("li").filter({ has: page.locator("article") }) : page.locator("tr[data-disposal-batch-row]")
  return rows.filter({ hasText: asset.assetTag }).filter({ visible: true })
}

// The request id a machine's row links (its DP-… link).
export async function batchRequestId(page: Page, device: E2eDevice, asset: DisposalAsset): Promise<string> {
  const href = await batchPageMachine(page, device, asset).getByRole("link", { name: /^DP-\d{8}-\d{4}$/ }).getAttribute("href")
  const id = new URL(href ?? "", page.url()).pathname.split("/").pop() ?? ""
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
  return id
}

// The attachment id an <img> shows through the thumbnail route (/api/attachments/{id}/thumbnail).
export async function thumbnailAttachmentId(image: Locator): Promise<string> {
  const src = (await image.getAttribute("src")) ?? ""
  const id = src.match(/\/api\/attachments\/([0-9a-f-]{36})\/thumbnail/)?.[1] ?? ""
  expect(id, src).toMatch(/^[0-9a-f-]{36}$/)
  return id
}
