// The asset transaction area's browser helpers (spec §6.1). Each test builds its own E2E assets through the app as the
// signed-in IT staff (the asset API the form posts to), walks the workflow on the form, and reads the outcome back in
// the UI and with GETs. The run's second room is made once, as the seed admin, through the location API (spec §7: the
// data comes from the app's own APIs, never from SQL).
import { request, type Locator, type Page, type Response, type TestInfo } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { dropKnownAxe, KNOWN_AXE } from "./known-findings.ts"
import { bangkokDate, chooseSecondDepartment, type MasterDepartment, PHONE_KEYBOARD_OPEN, RETURN_DEPARTMENT_CODE, secondLocation, txAssetName, txAssetTag } from "./tx-plan.ts"
import { TX_WORDS } from "./tx-words.ts"

export const PHOTO_FIXTURE = fromRoot("e2e/fixtures/photo.png")
export const PDF_FIXTURE = fromRoot("e2e/fixtures/evidence.pdf")

// The master data the new asset form offers (ids by their Thai labels): read from the form itself, which IT staff may
// open, since the status and condition masters have no API of their own.
export type AssetMasters = { categoryId: string; readyStatusId: string; goodConditionId: string }

export async function readAssetMasters(page: Page): Promise<AssetMasters> {
  await page.goto("/th/assets/new")
  // The dashboard's loading.tsx streams the form, so its selects may still be empty at the load event (a phone-light
  // race in 13B loop 3): wait for the three options this helper needs before reading them.
  await expect(page.locator("#asset-category option").filter({ hasText: /คอมพิวเตอร์พกพา/ }).first()).toBeAttached()
  await expect(page.locator("#asset-status option", { hasText: /^พร้อมใช้งาน$/ })).toHaveCount(1)
  await expect(page.locator("#asset-condition option", { hasText: /^ดี$/ })).toHaveCount(1)
  const options = async (id: string) =>
    page.locator(`#${id} option`).evaluateAll((elements) => elements.map((element) => ({ value: (element as HTMLOptionElement).value, label: element.textContent?.trim() ?? "" })))
  const categories = await options("asset-category")
  const statuses = await options("asset-status")
  const conditions = await options("asset-condition")
  const category = categories.find((option) => /คอมพิวเตอร์พกพา/.test(option.label))
  const ready = statuses.find((option) => option.label === "พร้อมใช้งาน")
  const good = conditions.find((option) => option.label === "ดี")
  if (!category?.value || !ready?.value || !good?.value) throw new Error("the new asset form offers no Notebook category, Ready status or Good condition")
  return { categoryId: category.value, readyStatusId: ready.value, goodConditionId: good.value }
}

export type CreatedAsset = { id: string; assetTag: string; name: string }

// The new asset form's empty values (src/components/assets/asset-form.tsx emptyAsset).
const EMPTY_ASSET_BODY = {
  assetTag: "", name: "", categoryId: "", brandId: "", modelId: "", serialNumber: "", licenseTotalSeats: "", licenseUsedSeats: "",
  licenseAssignedAssetId: "", companyId: "", branchId: "", ownershipType: "personal", departmentId: "", custodianId: "",
  homeLocationId: "", currentLocationId: "", statusId: "", conditionId: "", purchaseDate: "", purchasePrice: "", supplierId: "",
  warrantyStartDate: "", warrantyEndDate: "", fixedAssetCode: "", poNumber: "", invoiceNumber: "", remark: "", customFieldsJson: "",
  isActive: true,
}

// One E2E asset, Ready, in the run's first room, through the asset API as the signed-in user. It is personal (บุคคล) and
// in the run's department unless the options say otherwise: the department tests (group 3 plan 1 task 8) start a
// ส่วนกลาง asset, or one in an existing department other than the run's, to read the department back after a handover,
// and a ส่วนควบ asset for the components of plan 2's return; a held asset (`custodianId`: group 3 spec §14 call 4; a held
// บุคคล asset takes its holder's department since group 4 plan 2, P2-R9) and a broken one (`conditionId`) for plan 3's โอนย้าย;
// an existing model with its brand and category (`categoryId`, `brandId`, `modelId`, read by the seed admin) for the
// purchase-document search by a linked asset's model (group 4 plan 3); a run-unique Serial (`serialNumber`) for the scan
// page's search by part of it (group 4 plan 4).
export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string; custodianId?: string; conditionId?: string; categoryId?: string; brandId?: string; modelId?: string; serialNumber?: string }
export async function createAsset(page: Page, masters: AssetMasters, tag: string, name: string, options: CreateAssetOptions = {}): Promise<CreatedAsset> {
  const data = readRunData()
  // Every key of the form's body, as the form sends it: the schema reads a missing optional key as missing (N3).
  const response = await page.request.post("/api/assets", {
    data: {
      ...EMPTY_ASSET_BODY,
      assetTag: tag,
      name,
      categoryId: options.categoryId ?? masters.categoryId,
      brandId: options.brandId ?? "",
      modelId: options.modelId ?? "",
      serialNumber: options.serialNumber ?? "",
      ownershipType: options.ownershipType ?? "personal",
      companyId: data.companyId,
      branchId: data.branchId,
      departmentId: options.departmentId ?? data.departmentId,
      custodianId: options.custodianId ?? "",
      currentLocationId: data.locationId,
      homeLocationId: data.locationId,
      statusId: masters.readyStatusId,
      conditionId: options.conditionId ?? masters.goodConditionId,
      isActive: true,
    },
  })
  expect(response.status(), `POST /api/assets ${tag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const asset = (await response.json()) as { id: string; assetTag: string }
  return { id: asset.id, assetTag: asset.assetTag, name }
}

// The project's asset for one workflow step: E2E-<run>-<project>-<key>.
export async function createTxAsset(page: Page, masters: AssetMasters, projectName: string, key: string, label: string, options: CreateAssetOptions = {}) {
  const { runId } = readRunState()
  return createAsset(page, masters, txAssetTag(runId, projectName, key), txAssetName(runId, projectName, label), options)
}

// One condition master's id by its Thai name, as the new asset form offers it (the masters have no API of their own, as
// readAssetMasters says): an asset registered broken, for โอนย้าย's holder rule (group 3 plan 3, P3-R1).
export async function readConditionId(page: Page, label: string): Promise<string> {
  await page.goto("/th/assets/new")
  const option = page.locator("#asset-condition option", { hasText: new RegExp(`^${label}$`) })
  await expect(option).toHaveCount(1)
  const value = await option.getAttribute("value")
  if (!value) throw new Error(`the new asset form offers no condition named ${label}`)
  return value
}

// A permanent handover through the checkout API (the form's own route, JSON body), on the date given (today by default),
// for the workflows that start from an asset already handed over (return, cancel, the asset detail's fact strip).
export async function handoverByApi(page: Page, assetId: string, custodianId: string, conditionId: string, checkoutDate: string = bangkokDate()) {
  const response = await page.request.post(`/api/assets/${assetId}/checkout`, {
    data: {
      // Every key of the form's body (N3): the schema reads a missing optional key as missing.
      handoverMode: "permanent_assignment",
      checkoutType: "user",
      custodianId,
      departmentId: "",
      locationId: "",
      parentAssetId: "",
      checkoutDate,
      expectedReturnDate: "",
      conditionBefore: conditionId,
      remark: "E2E setup handover",
      receiverSignature: "",
    },
  })
  expect(response.status(), `POST /api/assets/${assetId}/checkout: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; documentNo: string }
}

// A component installed in its parent through the component route (the component manager's own POST), with the keys
// the audit's walk sends (e2e/audit/audit-data.ts). It checks no category, so a run's Notebook can be a component.
export async function installComponentByApi(page: Page, parentId: string, componentId: string, role: string, slotNo: string): Promise<void> {
  const response = await page.request.post(`/api/assets/${parentId}/components`, {
    data: { componentAssetId: componentId, componentRole: role, slotNo, installedAt: null, reason: "E2E component for the return" },
  })
  expect(response.status(), `POST /api/assets/${parentId}/components: ${(await response.text()).slice(0, 300)}`).toBe(201)
}

export type AssetRead = {
  id: string
  assetTag: string
  status: { name: string; nameTh: string }
  custodianId: string | null
  currentLocationId: string
  custodian: { code: string; fullNameTh: string } | null
  currentLocation: { code: string; name: string } | null
  departmentId: string | null
  department: { code: string; name: string } | null
  branchId: string
}

export async function readAsset(page: Page, assetId: string): Promise<AssetRead> {
  const response = await page.request.get(`/api/assets/${assetId}`)
  expect(response.status(), `GET /api/assets/${assetId}`).toBe(200)
  return (await response.json()) as AssetRead
}

// The run's second room, created once per run as the seed admin (found again by its code on every later call).
export async function ensureSecondLocation(): Promise<{ id: string; code: string; name: string }> {
  const { runId, baseURL } = readRunState()
  const planned = secondLocation(runId)
  const admin = await request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
  try {
    const found = (await (await admin.get(`/api/locations?search=${encodeURIComponent(planned.code)}`)).json()) as { id: string; code: string; name: string }[]
    const existing = found.find((location) => location.code === planned.code)
    if (existing) return existing
    const response = await admin.post("/api/locations", { data: { ...planned, branchId: readRunData().branchId, isActive: true } })
    if (response.status() !== 201) throw new Error(`POST /api/locations ${planned.code} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    return (await response.json()) as { id: string; code: string; name: string }
  } finally {
    await admin.dispose()
  }
}

// The department the department tests' assets start in (group 3 plan 1 task 8): an existing one of the master data,
// chosen by chooseSecondDepartment (tx-plan.ts). IT staff have no department:view, so the seed admin reads the list with
// a GET, as the global setup reads departments. The E2E makes no department.
export async function readSecondDepartment(): Promise<{ id: string; code: string; name: string }> {
  const { baseURL } = readRunState()
  const admin = await request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
  try {
    const response = await admin.get("/api/departments")
    if (response.status() !== 200) throw new Error(`GET /api/departments answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    const chosen = chooseSecondDepartment((await response.json()) as MasterDepartment[], readRunData())
    if (!chosen) throw new Error("the dev data has no active department, other than the run's, that the asset form offers for the run's company (code IT first): the department tests need one")
    return { id: chosen.id, code: chosen.code, name: chosen.name }
  } finally {
    await admin.dispose()
  }
}

// The return department (group 3 spec §12): the department whose code is RETURN_DEPARTMENT_CODE, the setting's default,
// read as the seed admin with a GET. E2E never saves the setting and cannot read it, so a dev setting changed by hand
// makes the department checks name this department and fail.
export async function readReturnDepartment(): Promise<{ id: string; code: string; name: string }> {
  const { baseURL } = readRunState()
  const admin = await request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
  try {
    const response = await admin.get("/api/departments")
    if (response.status() !== 200) throw new Error(`GET /api/departments answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    const found = ((await response.json()) as MasterDepartment[]).find((department) => department.code === RETURN_DEPARTMENT_CODE)
    if (!found) throw new Error(`the dev data has no active department ${RETURN_DEPARTMENT_CODE}, the return department (group 3 spec §12): every return refuses without it`)
    return { id: found.id, code: found.code, name: found.name }
  } finally {
    await admin.dispose()
  }
}

// A SearchableSelect (a button that opens a searchable list), by its id or its locator: open it, type, pick the option.
export async function pickSearchable(page: Page, trigger: string | Locator, search: string, option: string | RegExp) {
  const button = typeof trigger === "string" ? page.locator(`#${trigger}`) : trigger
  // A page that streams fast can still hold React's hidden copy of its segment (div#S:0[hidden]) beside the revealed one
  // for a moment after the h1 shows, so wait for the one trigger before the click (TX-A8 on WebKit, server search).
  await expect(button).toHaveCount(1)
  await button.click()
  const input = page.getByRole("dialog").last().getByRole("combobox")
  await input.fill(search)
  await page.getByRole("option", { name: option }).first().click()
  await expect(button).toContainText(typeof option === "string" ? option : search)
}

// The transaction pickers' search (Task 3) and the shared asset picker (src/components/ui/asset-operation-picker.tsx,
// spec 6.1): type into #<fieldId>-search, wait for the answer to exactly that text (it must differ from the field's current
// text: a fill that changes nothing sends no request), and read the rows in #<fieldId>-listbox.
export const ASSET_SEARCH_PATH = "/api/asset-operations/search"
export async function searchAssets(page: Page, fieldId: string, text: string): Promise<Locator> {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === ASSET_SEARCH_PATH && url.searchParams.get("q") === text
  })
  await page.locator(`#${fieldId}-search`).fill(text)
  expect((await answered).status(), `${ASSET_SEARCH_PATH} q=${text}`).toBe(200)
  const listbox = page.locator(`#${fieldId}-listbox`)
  await expect(listbox).toBeVisible()
  return listbox
}
// The answer's one row of the asset whose tag shows whole.
export async function findAssetRow(page: Page, fieldId: string, text: string, assetTag: string): Promise<Locator> {
  const row = (await searchAssets(page, fieldId, text)).locator("[data-asset-option]").filter({ has: page.getByText(assetTag, { exact: true }) })
  await expect(row).toHaveCount(1)
  return row
}
// Choose a takeable row; the field then holds it. Returns the asset's id.
export async function pickAsset(page: Page, fieldId: string, text: string, assetTag: string): Promise<string> {
  const row = await findAssetRow(page, fieldId, text, assetTag)
  await expect(row).not.toHaveAttribute("aria-disabled", "true")
  const assetId = (await row.getAttribute("data-asset-option")) ?? ""
  await row.click()
  await expect(pickedAsset(page, assetId)).toContainText(assetTag)
  return assetId
}
// A row the transaction cannot take: marked, its reason under it, and a click (forced: Playwright waits for an
// aria-disabled row to be enabled) chooses nothing.
export async function expectAssetBlocked(page: Page, row: Locator, reason: string) {
  await expect(row).toHaveAttribute("aria-disabled", "true")
  await expect(row.locator("[data-asset-option-reason]")).toHaveText(reason)
  await row.click({ force: true })
  await expect(page.locator("[data-asset-picked]")).toHaveCount(0)
}
export function pickedAsset(page: Page, assetId: string): Locator {
  return page.locator(`[data-asset-picked="${assetId}"]`)
}
// A search with no rows (group 3 plan 1 task 8): the answer to exactly that text is waited for, as searchAssets does;
// the picker then shows no listbox and says so (its live region repeats the words, hence first()).
export async function expectNoAssetFound(page: Page, fieldId: string, text: string) {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === ASSET_SEARCH_PATH && url.searchParams.get("q") === text
  })
  await page.locator(`#${fieldId}-search`).fill(text)
  expect((await answered).status(), `${ASSET_SEARCH_PATH} q=${text}`).toBe(200)
  await expect(page.locator(`#${fieldId}-listbox`)).toHaveCount(0)
  await expect(page.getByText(TX_WORDS.searchNotFound, { exact: true }).first()).toBeVisible()
}

// One ตอนนี้ cell of โอนย้าย's table (group 3 spec §9.2, P3-R17): the row's current room, holder or department as
// "code - name", or ไม่มี. It fills from the chosen asset's detail, so a spec waits on it before a save leaves the page.
export function transferNowCell(page: Page, row: "location" | "holder" | "department"): Locator {
  return page.locator(`[data-transfer-row="${row}"] [data-transfer-now]`)
}
// โอนย้าย's ผู้ถือครองปลายทาง (group 3 spec §9.1, S-R40): choose the employee, then wait for the page's re-ask of the chosen
// asset under the holder's rule (assignCustodian=1). A search still in flight when a later save leaves the page would be
// a cancelled request the allow-list does not cover.
export async function pickTransferHolder(page: Page, assetId: string, employee: { code: string; fullNameTh: string }): Promise<void> {
  const asked = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === ASSET_SEARCH_PATH && url.searchParams.get("id") === assetId && url.searchParams.get("assignCustodian") === "1"
  })
  await pickSearchable(page, "transfer-to-custodian", employee.code, `${employee.code} - ${employee.fullNameTh}`)
  expect((await asked).status(), `${ASSET_SEARCH_PATH} id=${assetId} assignCustodian=1`).toBe(200)
}
// The condition chips of ส่งมอบ (group 3 spec §7.2) and รับคืน (§8.3): one radio per master condition, by its Thai name,
// in the group given (#checkout-condition by default, #checkin-condition-after on รับคืน).
export function conditionChip(page: Page, label: string, groupId = "checkout-condition"): Locator {
  return page.locator(`#${groupId}`).getByRole("radio", { name: label, exact: true })
}
// One row of รับคืน's components checklist (group 3 spec §8.2, P2-R11): the group #checkin-components, one checkbox per
// travelling component, named with its tag.
export function returnChecklistBox(page: Page, assetTag: string): Locator {
  return page.locator("#checkin-components").getByRole("checkbox", { name: assetTag })
}

// ย้ายที่ตั้งหลายรายการ's list (group 3 plan 4, P4-R12): the server renders the first page, and every later filter or
// page is one client fetch of BULK_MOVE_LIST_PATH. The specs wait for each answer before the next step, so no list
// request is in flight when a test leaves the page. A param the query names must match exactly ("" when absent); an
// empty query matches any list answer.
export const BULK_MOVE_LIST_PATH = "/api/asset-operations/bulk-move-list"
export type BulkMoveListQuery = { q?: string; locationId?: string; categoryId?: string; page?: string }
export function bulkMoveListAnswer(page: Page, query: BulkMoveListQuery = {}): Promise<Response> {
  return page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === BULK_MOVE_LIST_PATH && Object.entries(query).every(([key, value]) => (url.searchParams.get(key) ?? "") === value)
  })
}
// One fill of the search field, one fetch 300 ms after it (P4-R11, P4-R12): the wait is set before the fill.
export async function searchBulkMoveList(page: Page, text: string): Promise<void> {
  const answered = bulkMoveListAnswer(page, { q: text })
  await page.locator("#bulk-move-search").fill(text)
  expect((await answered).status(), `${BULK_MOVE_LIST_PATH} q=${text}`).toBe(200)
}
// A row's box, named "เลือก <tag>" (P4-R22), and its row. The row is found by its box, not by the tag's text: a
// component's "ส่วนควบของ <tag>" holds the parent's tag in its own element.
export function bulkMoveRowBox(page: Page, assetTag: string): Locator {
  return page.getByRole("checkbox", { name: TX_WORDS.bulkSelectRow.replace("{tag}", assetTag), exact: true })
}
export function bulkMoveRow(page: Page, assetTag: string): Locator {
  return page.getByRole("row").filter({ has: bulkMoveRowBox(page, assetTag) })
}

// The field's error under it (the V track): its text, in the element the field names with aria-describedby.
export async function expectFieldError(page: Page, fieldId: string, message: string | RegExp) {
  await expect(page.locator(`#${fieldId}-error`)).toHaveText(message)
}

// The asset form folds its optional sections (group 4 plan 2 Task 6a, spec §8): fill and click wait for a visible field,
// so a spec opens the section by its summary row, named by the section's title, before it types there. An open section
// stays open.
export async function openAssetFormSection(page: Page, name: string) {
  const summary = page.locator("summary").filter({ has: page.getByRole("heading", { name, exact: true }) })
  const section = page.locator("details").filter({ has: summary })
  if (!(await section.evaluate((element) => (element as HTMLDetailsElement).open))) await summary.click()
  await expect(section).toHaveAttribute("open", "")
}

// The asset form's ownership type (group 4 plan 2 Task 6b, P2-R11): buttons in the group "ประเภทการถือครอง" from 768 px,
// the native #asset-ownership-type on the phone. The desktop shows the buttons once the page hydrates (useMediaQuery),
// so the click waits for them; value is the select's option, label the button's name.
export async function chooseOwnershipType(page: Page, device: E2eDevice, value: string, label: string) {
  if (device === "phone") {
    await page.locator("#asset-ownership-type").selectOption(value)
    return
  }
  const option = page.getByRole("group", { name: "ประเภทการถือครอง", exact: true }).getByRole("button", { name: label, exact: true })
  await option.click()
  await expect(option).toHaveAttribute("aria-pressed", "true")
}

// One stroke on a signature pad: the mouse on the desktop, a finger on the phone (spec §6.1.2). Playwright 1.61.1 has
// no touch drag, so the finger is Chromium's own touch input (CDP Input.dispatchTouchEvent); it reaches the pad as
// pointer events of type "touch", as a real finger does. The pad's clear button turns on once it holds a stroke.
export async function signOnPad(page: Page, group: Locator, device: E2eDevice, browser: string) {
  const canvas = group.locator("canvas")
  // Centred, not just in view: on the phone the sticky footer covers the bottom of the screen, and a pad scrolled only
  // to its edge takes the finger on the footer instead (group 3 plan 2 E2E-1031K). A picker closed just before hands
  // focus back to its trigger a moment later, which scrolls the page again (E2E-1031M). So the pad is centred once and
  // then watched without scrolling: it is settled when two consecutive reads, at least one interval apart, give the same
  // top and the pad is the element under its own middle. A read that moved, or a failed hit, centres it again and the
  // watch starts over, so a late scroll resets the wait instead of being hidden by it (final review tests-3).
  const centre = () => canvas.evaluate((element) => element.scrollIntoView({ block: "center" }))
  await centre()
  let lastTop: number | null = null
  await expect.poll(async () => {
    const { top, hit } = await canvas.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { top: rect.top, hit: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element }
    })
    if (hit && lastTop === top) return true
    if (!hit || (lastTop !== null && lastTop !== top)) {
      await centre()
      lastTop = null
    } else {
      lastTop = top
    }
    return false
  }, { message: "the signature pad stays centred and nothing covers it", intervals: [100, 150, 250] }).toBe(true)
  await canvas.evaluate((element) => {
    const seen: string[] = []
    ;(element as HTMLCanvasElement & { __e2ePointerTypes?: string[] }).__e2ePointerTypes = seen
    element.addEventListener("pointerdown", (event) => seen.push((event as PointerEvent).pointerType), { capture: true })
  })
  const box = await canvas.boundingBox()
  if (!box) throw new Error("the signature pad has no box on screen")
  const points = [0.15, 0.3, 0.45, 0.6, 0.75].map((share, index) => ({ x: box.x + box.width * share, y: box.y + box.height * (index % 2 === 0 ? 0.35 : 0.65) }))
  if (device === "desktop") {
    await page.mouse.move(points[0].x, points[0].y)
    await page.mouse.down()
    for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 })
    await page.mouse.up()
  } else {
    if (browser !== "chromium") throw new Error("a finger stroke needs Chromium's touch input (Playwright has no touch drag on WebKit)")
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] })
    for (const point of points.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] })
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await cdp.detach()
    // Emulation, not the app (ruling TX-R4): after a touch drag sent through this second CDP session, Chromium drops
    // the click of Playwright's next tap (a plain page with no app code does the same). One tap on the pad's title takes
    // that lost click, so the person's next tap counts.
    await group.locator("div[id]").first().tap()
  }
  const pointerTypes = await canvas.evaluate((element) => (element as HTMLCanvasElement & { __e2ePointerTypes?: string[] }).__e2ePointerTypes ?? [])
  expect(pointerTypes, "the stroke reached the pad as the device's own pointer").toEqual([device === "desktop" ? "mouse" : "touch"])
  await expect(group.getByRole("button", { name: "ล้างลายเซ็น" })).toBeEnabled()
}

// The phone with the keyboard open: the visible height left above it (spec §8), and back.
export async function openPhoneKeyboard(page: Page) {
  await page.setViewportSize(PHONE_KEYBOARD_OPEN)
}
export async function closePhoneKeyboard(page: Page) {
  await page.setViewportSize({ width: 390, height: 664 })
}

// A control a person can reach: scrolled into the visible area, and the topmost element at its centre (no bar, sheet
// or keyboard-sized gap covers it).
export async function expectReachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  await expect(locator).toBeInViewport()
  const onTop = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return Boolean(hit && (hit === element || element.contains(hit)))
  })
  expect(onTop, "nothing covers the control").toBe(true)
}

// A control scrolled to the middle of the screen before a click: on the phone the sticky footer covers the bottom, and a
// control scrolled only to the edge takes the finger on the footer (group 3 plan 2 E2E-1031K, plan 3 P3-R23).
export async function centreInView(locator: Locator): Promise<void> {
  await locator.evaluate((element) => element.scrollIntoView({ block: "center" }))
}

// The print page's print button calls window.print(); the stub counts the calls (headless has no print dialog).
export async function expectPrints(page: Page, buttonName: string) {
  await page.evaluate(() => {
    const target = window as Window & { __e2ePrints?: number }
    target.__e2ePrints = 0
    window.print = () => {
      target.__e2ePrints = (target.__e2ePrints ?? 0) + 1
    }
  })
  await page.getByRole("button", { name: buttonName }).click()
  expect(await page.evaluate(() => (window as Window & { __e2ePrints?: number }).__e2ePrints)).toBe(1)
}

// Save a filled ส่งมอบ form the device's way (group 3 spec §7.3, §7.4; P1-R4), with no photo and no signature (both
// optional; handover.spec.ts and desk-delivery.spec.ts cover them): on the desktop the footer's ตรวจสอบและบันทึก and the
// review dialog's ยืนยันส่งมอบ, on the phone the three steps with no dialog. The HO- page then opens.
export async function saveHandoverForm(page: Page, device: E2eDevice, assetId: string): Promise<{ id: string; documentNo: string }> {
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assetId}/checkout`) && response.request().method() === "POST")
  if (device === "desktop") {
    await page.getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true }).click()
    await page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" }).getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
  } else {
    await page.getByRole("button", { name: "ถัดไป: ให้ผู้รับตรวจ", exact: true }).click()
    await page.getByRole("button", { name: "ถูกต้อง ลงชื่อรับ", exact: true }).click()
    await page.getByRole("button", { name: "บันทึกการส่งมอบ", exact: true }).click()
  }
  const response = await saved
  expect(response.status(), `POST /api/assets/${assetId}/checkout: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const checkout = (await response.json()) as { id: string; documentNo: string }
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkouts/${checkout.id}`)
  return { id: checkout.id, documentNo: checkout.documentNo }
}

// Save รับคืน (group 3 spec §5, §8.6): the footer's ตรวจสอบและบันทึก, the review "ตรวจสอบก่อนรับคืน" (read by atReview),
// then ยืนยันรับคืน. The RT- page then opens. The same on both devices, since รับคืน has no phone steps (§8.8).
// saveLateReturn is the late return's panel, posting to the component's own route.
export type SavedReturn = { id: string; documentNo: string; missingComponents: { assetTag: string; name: string }[]; repair: { id: string; repairNo: string; joined: boolean } | null }
export async function saveReturnForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedReturn> {
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assetId}/checkin`) && response.request().method() === "POST")
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toBeVisible()
  await atReview?.(review)
  await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
  const response = await saved
  expect(response.status(), `POST /api/assets/${assetId}/checkin: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const checkin = (await response.json()) as SavedReturn
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${checkin.id}`)
  return checkin
}
export type SavedLateReturn = { checkinId: string; documentNo: string | null; outcome: "reattached" | "standalone" }
export async function saveLateReturn(page: Page, componentId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedLateReturn> {
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${componentId}/component-return`) && response.request().method() === "POST")
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toBeVisible()
  await atReview?.(review)
  await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
  const response = await saved
  expect(response.status(), `POST /api/assets/${componentId}/component-return: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const late = (await response.json()) as SavedLateReturn
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${late.checkinId}`)
  return late
}

// Save โอนย้าย (group 3 spec §5, §9.3): the footer's ตรวจสอบและบันทึก (the page reads the asset again first), the review
// "ตรวจสอบก่อนโอนย้าย" (read by atReview), then ยืนยันโอนย้าย. The TR- document then opens. The same on both devices,
// since โอนย้าย has no phone steps (§9.4).
export type SavedTransfer = { id: string; documentNo: string }
export async function saveTransferForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedTransfer> {
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assetId}/transfer`) && response.request().method() === "POST")
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนโอนย้าย" })
  await expect(review).toBeVisible()
  await atReview?.(review)
  await review.getByRole("button", { name: "ยืนยันโอนย้าย" }).click()
  const response = await saved
  expect(response.status(), `POST /api/assets/${assetId}/transfer: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const transfer = (await response.json()) as SavedTransfer
  await page.waitForURL((url) => url.pathname === `/th/asset-management/transfers/${transfer.id}`)
  return transfer
}

// Save ย้ายที่ตั้งหลายรายการ (group 3 spec §10.2; plan 4 P4-R17, P4-R18): the bar's ตรวจสอบและย้าย N รายการ, the review
// "ตรวจสอบก่อนย้ายที่ตั้ง" (read by atReview), then ยืนยันย้ายที่ตั้ง. The page stays: the ticks clear and the list is
// fetched again, so both the save and that fetch are waited for from before the click. The save is P4-R16's measure.
export type SavedBulkMove = { updated: number; unchanged: number; componentSync: { updated: number; skipped: number; movements: number } }
export async function saveBulkMove(page: Page, measure: Measure, count: number, atReview?: (review: Locator) => Promise<void>): Promise<SavedBulkMove> {
  await page.getByRole("button", { name: TX_WORDS.bulkReviewAndMove.replace("{count}", String(count)), exact: true }).click()
  const review = page.getByRole("dialog", { name: TX_WORDS.bulkReviewTitle })
  await expect(review).toBeVisible()
  await atReview?.(review)
  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets/bulk-move" && response.request().method() === "POST")
  const refreshed = bulkMoveListAnswer(page)
  const response = await measure.timed("bulk move save", async () => {
    await review.getByRole("button", { name: TX_WORDS.bulkReviewConfirm, exact: true }).click()
    return saved
  })
  expect(response.status(), `POST /api/assets/bulk-move: ${(await response.text()).slice(0, 300)}`).toBe(200)
  expect((await refreshed).status(), `${BULK_MOVE_LIST_PATH} after the save`).toBe(200)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  return (await response.json()) as SavedBulkMove
}

// The area's measured pages (spec §8). The page settles first: axe reads a toast or dialog still fading in as low
// contrast, so it waits until no finite animation runs (a spinner's endless one does not count). Then axe, less the known
// findings of known-findings.ts on their own elements; any other violation still fails the test.
export async function settle(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity),
  )
}
export async function record(measure: Measure, label: string, testInfo: TestInfo) {
  await settle(measure.page)
  return dropKnownAxe(await measure.recordPage(label), KNOWN_AXE, testInfo)
}
// The four transaction pages (checkout, checkin, transfer, bulk-move) load no asset register since the server asset
// search. Three read only their master lists (getAssetOperationMasterOptions in src/lib/asset-operation-options.ts, about
// 770 employees and 1,100 locations) and, from the asset page, one row by id; their pickers ask the server.
// ย้ายที่ตั้งหลายรายการ reads its active rooms, its categories and its first 25 rows (group 3 plan 4). The first arrival
// check after a navigation into one of them waits this long. It was 30 s while they loaded every asset (13B loop 7);
// 15 s keeps one step above the suite's 10 s expect for the first request of a fresh build over the VPN (bulk-move
// arrived in about 3 s even with 8,796 rows, E2E-1028C; S-R8, S-R36).
export const TRANSACTION_PAGE_ARRIVAL_MS = 15_000
const TRANSACTION_PAGE_PATH = /^\/th\/asset-management\/(?:checkout|checkin|transfer|bulk-move)(?:[?#]|$)/

// Measure.visit's steps (the page loaded, then recorded), with the settle and the known findings. A transaction page
// is recorded once its h1 is there (the dashboard's loading skeleton has none).
export async function visit(measure: Measure, path: string, label: string, testInfo: TestInfo) {
  await measure.page.goto(path, { waitUntil: "load" })
  if (TRANSACTION_PAGE_PATH.test(path)) await expect(measure.page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  return record(measure, label, testInfo)
}
export async function visitAssetPage(measure: Measure, assetId: string, label: string, testInfo: TestInfo, view?: "history" | "components" | "files" | "maintenance") {
  return visit(measure, `/th/assets/${assetId}${view ? `?view=${view}` : ""}`, label, testInfo)
}
