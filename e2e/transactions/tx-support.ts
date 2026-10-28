// The asset transaction area's browser helpers (spec §6.1). Each test builds its own E2E assets through the app as the
// signed-in IT staff (the asset API the form posts to), walks the workflow on the form, and reads the outcome back in
// the UI and with GETs. The run's second room is made once, as the seed admin, through the location API (spec §7: the
// data comes from the app's own APIs, never from SQL).
import { request, type Locator, type Page, type TestInfo } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { dropKnownAxe, KNOWN_AXE } from "./known-findings.ts"
import { bangkokDate, PHONE_KEYBOARD_OPEN, secondLocation, txAssetName, txAssetTag } from "./tx-plan.ts"

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

// One personal E2E asset, Ready, in the run's department and first room, through the asset API as the signed-in user.
export async function createAsset(page: Page, masters: AssetMasters, tag: string, name: string): Promise<CreatedAsset> {
  const data = readRunData()
  // Every key of the form's body, as the form sends it: the schema reads a missing optional key as missing (N3).
  const response = await page.request.post("/api/assets", {
    data: {
      ...EMPTY_ASSET_BODY,
      assetTag: tag,
      name,
      categoryId: masters.categoryId,
      ownershipType: "personal",
      companyId: data.companyId,
      branchId: data.branchId,
      departmentId: data.departmentId,
      currentLocationId: data.locationId,
      homeLocationId: data.locationId,
      statusId: masters.readyStatusId,
      conditionId: masters.goodConditionId,
      isActive: true,
    },
  })
  expect(response.status(), `POST /api/assets ${tag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const asset = (await response.json()) as { id: string; assetTag: string }
  return { id: asset.id, assetTag: asset.assetTag, name }
}

// The project's asset for one workflow step: E2E-<run>-<project>-<key>.
export async function createTxAsset(page: Page, masters: AssetMasters, projectName: string, key: string, label: string) {
  const { runId } = readRunState()
  return createAsset(page, masters, txAssetTag(runId, projectName, key), txAssetName(runId, projectName, label))
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

export type AssetRead = {
  id: string
  assetTag: string
  status: { name: string; nameTh: string }
  custodianId: string | null
  currentLocationId: string
  custodian: { code: string; fullNameTh: string } | null
  currentLocation: { code: string; name: string } | null
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
// Choose a takeable row; the field (or bulk-move's chosen list) then holds it. Returns the asset's id.
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

// The field's error under it (the V track): its text, in the element the field names with aria-describedby.
export async function expectFieldError(page: Page, fieldId: string, message: string | RegExp) {
  await expect(page.locator(`#${fieldId}-error`)).toHaveText(message)
}

// One stroke on a signature pad: the mouse on the desktop, a finger on the phone (spec §6.1.2). Playwright 1.61.1 has
// no touch drag, so the finger is Chromium's own touch input (CDP Input.dispatchTouchEvent); it reaches the pad as
// pointer events of type "touch", as a real finger does. The pad's clear button turns on once it holds a stroke.
export async function signOnPad(page: Page, group: Locator, device: E2eDevice, browser: string) {
  const canvas = group.locator("canvas")
  await canvas.scrollIntoViewIfNeeded()
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
// search: they read only their master lists (getAssetOperationMasterOptions in src/lib/asset-operation-options.ts, about
// 770 employees and 1,100 locations) and, from the asset page, one row by id; their pickers ask the server. The first
// arrival check after a navigation into one of them waits this long. It was 30 s while they loaded every asset (13B
// loop 7); 15 s keeps one step above the suite's 10 s expect for the first request of a fresh build over the VPN
// (bulk-move arrived in about 3 s even with 8,796 rows, E2E-1028C; S-R8, S-R36).
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
