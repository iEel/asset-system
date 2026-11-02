// Page group 4 plan 6 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §11, §17, Appendix A
// Labels; plan Task 7; rulings P6-R1..R3, P6-R5, P6-R9, P6-R10; call 19): the labels page as IT staff use it, in all four
// projects. Three assets of the test's own (LB1–LB3, Ready and never printed, in the run room) are found in the queue by
// the room chip (a searchable Popover) and the newest-first sort. The add-all line is checked by its relation
// c = min(a, 100) − b, with a read from the page and never pinned: every spec of the run adds assets to the run room,
// so a grows with the spec order (critic §5.1). The three are added by their rows; the numbered list keeps that order and
// the preview shows the first one's tag.
// - Desktop: the bar's "พิมพ์ป้าย 3 ดวง" opens the print route in a new tab. The popup is caught on the context, its URL
//   read (the ids in the query, tape and note in the hash, P6-R9) and the popup closed; the URL is then opened in the
//   measured page (the measure fixture watches only `page`), window.print is stubbed, the route's print records 3 and
//   says so, and back on the labels page the queue's เคยพิมพ์แล้ว lists the three.
// - Phone: the inline actions at the end of the list card only (no bar below md, P6-R10). The print path is the
//   desktop's; the WebKit popup is a UAT step.
// The tape is the dev settings' default and is never pinned: the suite may not save settings. ต้องพิมพ์ใหม่ is covered by
// the unit tests (Task 1); this spec changes no tag.
// The viewer (call 19) opens the page, lists one row and sees both print actions enabled; nothing is printed or recorded.
//
// Each project adds 3 assets; each desktop project also records 1 label print batch of 3 (the cleanup removes the prints
// before the assets, P6-R14). Run it again with a new run id: the tags are taken.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { projectCode } from "../transactions/tx-plan.ts"
import { centreInView, createTxAsset, readAssetMasters, record, visit, type CreatedAsset } from "../transactions/tx-support.ts"
import type { Measure } from "../support/measure.ts"
import { LABEL_WORDS } from "./labels-words.ts"

asUser("itStaff")

const LABELS_PATH = "/th/asset-management/labels"
const PRINT_ROUTE_PATH = "/th/assets/labels"
const LABEL_PRINTS_PATH = "/api/assets/label-prints"
const BAR = '[data-slot="desktop-selection-bar"]'
// A closed chip reads "<ชื่อตัวกรอง>: <ชื่อ>" (P6-R4, src/lib/filter-menu-chip.ts filterMenuChipJoin).
const CHIP = "{label}: {value}"
const NUMBER = "([\\d,]+)"
const ADD_ALL_LINE = templatePattern(LABEL_WORDS.addAllSummary, { matched: NUMBER, listed: NUMBER, added: NUMBER })
// Past 100 matches the line says b counts the first 100 only (plan 6 final review).
const ADD_ALL_LINE_FIRST_100 = templatePattern(LABEL_WORDS.addAllSummaryFirst100, { matched: NUMBER, listed: NUMBER, added: NUMBER })

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type TestInfo = Parameters<typeof record>[2]
type AddAllLine = { a: number; b: number; c: number }

// The queue's GET (not the ?ids= lookup) whose query passes the check.
function queueAnswer(page: Page, match: (url: URL) => boolean) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === "GET" && url.pathname === LABEL_PRINTS_PATH && !url.searchParams.has("ids") && match(url)
  })
}

// The page's queue and lookup GETs while they are in flight: the page is left only when none is, so no request of
// it is cancelled by the navigation (a cancelled one is a failed request for the measure fixture).
function trackQueueRequests(page: Page) {
  let pending = 0
  const counts = (request: { method(): string; url(): string }) => request.method() === "GET" && new URL(request.url()).pathname === LABEL_PRINTS_PATH
  const settled = (request: { method(): string; url(): string }) => {
    if (counts(request)) pending -= 1
  }
  page.on("request", (request) => {
    if (counts(request)) pending += 1
  })
  page.on("requestfinished", settled)
  page.on("requestfailed", settled)
  return { idle: () => expect.poll(() => pending, { message: "the labels page's queue requests have answered" }).toBe(0) }
}

// The labels page, recorded on arrival once the queue's first page has answered and shows. Axe waits for that: the
// add-all button waits while the queue loads and fades to ready (transition-colors) when it answers, and axe read it
// half way (E2E-1103A, color-contrast on the button; axe skips it while it is aria-disabled). record settles the fade.
async function openLabels(page: Page, measure: Measure, label: string, testInfo: TestInfo) {
  const firstPage = queueAnswer(page, () => true)
  await page.goto(LABELS_PATH, { waitUntil: "load" })
  expect((await firstPage).status(), "the queue's first page").toBe(200)
  await expect(page.getByRole("heading", { level: 1, name: LABEL_WORDS.title })).toBeVisible()
  await expect(page.getByText(LABEL_WORDS.queueLoading, { exact: true })).toHaveCount(0)
  await record(measure, label, testInfo)
}

// One filter chip by its filter's name: a button in the chips' group named "<ชื่อตัวกรอง>: <ชื่อ>" (by role: in
// E2E-1103A Radix's trigger had replaced the part's data-slot).
function chip(page: Page, label: string): Locator {
  return page
    .getByRole("group", { name: LABEL_WORDS.filtersLabel, exact: true })
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}: `) })
}

// The run room through the room chip's search (its code finds it; the option reads "… / code - name"), then the queue
// sorted newest first, so the test's own assets are in the first rows.
async function chooseRunRoom(page: Page) {
  const { runId } = readRunState()
  const { location: runRoom } = runRecords(runId)
  const roomChip = chip(page, LABEL_WORDS.filterLocation)
  await roomChip.click()
  const popover = page.getByRole("dialog", { name: LABEL_WORDS.filterLocation, exact: true })
  await popover.getByRole("combobox", { name: LABEL_WORDS.locationSearch, exact: true }).fill(runRoom.code)
  const answered = queueAnswer(page, (url) => url.searchParams.get("locationId") === readRunData().locationId)
  await popover.getByRole("option", { name: `${runRoom.code} - ${runRoom.name}` }).click()
  expect((await answered).status(), "the queue in the run room").toBe(200)
  await expect(roomChip).toHaveText(fillTemplate(CHIP, { label: LABEL_WORDS.filterLocation, value: runRoom.name }))
  const sortChip = chip(page, LABEL_WORDS.filterSort)
  await sortChip.click()
  await page.getByRole("menuitemradio", { name: LABEL_WORDS.sortNewest, exact: true }).click()
  await expect(sortChip).toHaveText(fillTemplate(CHIP, { label: LABEL_WORDS.filterSort, value: LABEL_WORDS.sortNewest }))
}

// The add-all line (P6-R3) read from the page: a (ตรงตัวกรอง) is whatever the run room holds now; b and c follow from it
// and the list. The button names c, in the wording P6-R3 gives it.
async function readAddAll(page: Page): Promise<AddAllLine> {
  const text = page.getByText(ADD_ALL_LINE).or(page.getByText(ADD_ALL_LINE_FIRST_100))
  await expect(text).toHaveCount(1)
  const content = (await text.textContent()) ?? ""
  const match = ADD_ALL_LINE.exec(content) ?? ADD_ALL_LINE_FIRST_100.exec(content)
  if (!match) throw new Error("the add-all line reads ตรงตัวกรอง a · อยู่ในรายการพิมพ์แล้ว b · จะเพิ่มใหม่ c")
  const [a, b, c] = match.slice(1, 4).map((value) => Number(value.replaceAll(",", "")))
  const line = { a, b, c }
  expect(ADD_ALL_LINE_FIRST_100.test(content), "the line names the first 100 exactly when more than 100 match").toBe(line.a > 100)
  expect(line.c, "c = min(a, 100) − b").toBe(Math.min(line.a, 100) - line.b)
  const button = line.a > 100 && line.b === 0 ? LABEL_WORDS.addFirst100 : fillTemplate(line.b === 0 ? LABEL_WORDS.addAll : LABEL_WORDS.addSome, { count: line.c })
  await expect(page.getByRole("button", { name: button, exact: true })).toBeVisible()
  if (line.a > 100) await expect(page.getByText(fillTemplate(LABEL_WORDS.addRemaining, { count: line.a - 100 }), { exact: true })).toBeVisible()
  return line
}

const queueRow = (page: Page, asset: CreatedAsset): Locator => page.locator(`[data-label-queue-row="${asset.id}"]`)

// The two print actions where the device shows them: the bar from md, the end of the list card below md.
function printActions(page: Page, count: number): Locator[] {
  return [
    page.getByRole("button", { name: LABEL_WORDS.testPrint, exact: true }).filter({ visible: true }),
    page.getByRole("button", { name: fillTemplate(LABEL_WORDS.print, { count }), exact: true }).filter({ visible: true }),
  ]
}
async function expectPrintActionsEnabled(page: Page, count: number) {
  for (const action of printActions(page, count)) {
    await expect(action).toHaveCount(1)
    await expect(action).not.toHaveAttribute("aria-disabled", "true")
  }
}

test("three run assets found in the run room's queue, the add-all line by its relation, added by their rows into a numbered list with the preview; the desktop prints them through the print route and finds them under เคยพิมพ์แล้ว, the phone checks its inline actions (group 4 plan 6, P6-R3, P6-R9, P6-R10)", async ({ page, measure, e2eDevice }, testInfo) => {
  const { runId } = readRunState()
  const masters = await readAssetMasters(page)
  const lb1 = await createTxAsset(page, masters, testInfo.project.name, "LB1", "ป้ายทดสอบหนึ่ง")
  const lb2 = await createTxAsset(page, masters, testInfo.project.name, "LB2", "ป้ายทดสอบสอง")
  const lb3 = await createTxAsset(page, masters, testInfo.project.name, "LB3", "ป้ายทดสอบสาม")
  const assets = [lb1, lb2, lb3]
  const queueRequests = trackQueueRequests(page)

  await openLabels(page, measure, "labels, on arrival", testInfo)
  await chooseRunRoom(page)
  for (const asset of assets) await expect(queueRow(page, asset)).toBeVisible()
  const before = await readAddAll(page)
  expect(before.b).toBe(0)

  // The three by their rows, in this order: each row then reads as listed and waits.
  for (const asset of assets) {
    const row = page.locator(`[data-label-queue-row="${asset.id}"]`)
    await centreInView(row)
    await row.click()
    await expect(row).toBeDisabled()
    await expect(row).toHaveAccessibleName(fillTemplate(LABEL_WORDS.rowListed, { name: asset.name }))
  }
  const after = await readAddAll(page)
  expect(after.b).toBe(3)

  // The numbered list in the order they were added, its count, and the preview of the first.
  const list = page.getByRole("list", { name: LABEL_WORDS.listTitle, exact: true })
  const items = list.locator("[data-label-selected-row]")
  await expect(items).toHaveCount(3)
  for (const [index, asset] of assets.entries()) {
    await expect(items.nth(index)).toHaveAttribute("data-label-selected-row", asset.id)
    await expect(items.nth(index)).toHaveText(`${index + 1}${asset.name}${asset.assetTag}`)
  }
  await expect(page.getByText(fillTemplate(LABEL_WORDS.listCount, { count: 3 }), { exact: true })).toBeVisible()
  const preview = page.getByRole("group", { name: templatePattern(LABEL_WORDS.previewName, { size: "[^]+?", tag: escapeRegExp(lb1.assetTag) }) })
  await expect(preview).toContainText(lb1.assetTag)
  const note = `${runId} ${projectCode(testInfo.project.name)} พิมพ์ป้ายทดสอบ E2E`
  await page.getByLabel(LABEL_WORDS.note, { exact: true }).fill(note)
  // The line over the actions: "3 ดวงที่จะพิมพ์ · เทป <the settings' tape>".
  const summary = templatePattern(LABEL_WORDS.barSummary, { count: "3", size: "\\S.*" })
  await expectPrintActionsEnabled(page, 3)
  await record(measure, "labels, three listed with the preview", testInfo)

  if (e2eDevice === "desktop") {
    // The bar (P6-R10): its line and the print, which opens the print route in a new tab.
    const bar = page.locator(BAR)
    await expect(bar).toContainText(summary)
    const popupOpened = page.context().waitForEvent("page")
    await bar.getByRole("button", { name: fillTemplate(LABEL_WORDS.print, { count: 3 }), exact: true }).click()
    const popup = await popupOpened
    await popup.waitForURL((url) => url.pathname === PRINT_ROUTE_PATH)
    const printUrl = new URL(popup.url())
    await popup.close()
    // P6-R9: the ids in the query in list order; tape and note in the hash only.
    expect(printUrl.searchParams.getAll("id")).toEqual(assets.map((asset) => asset.id))
    expect([...printUrl.searchParams.keys()].every((key) => key === "id"), "the query holds the ids only").toBe(true)
    const hash = new URLSearchParams(printUrl.hash.slice(1))
    const tape = hash.get("tape") ?? ""
    expect(tape, "the settings' tape (never pinned)").toMatch(/^(?:12|18|24|custom)$/)
    expect(hash.get("note")).toBe(note)

    // The print route in the measured page: tape and note filled from the hash, nothing recorded until its print.
    await queueRequests.idle()
    await visit(measure, `${printUrl.pathname}${printUrl.search}${printUrl.hash}`, "the print route, on arrival", testInfo)
    await expect(page.getByRole("heading", { level: 1, name: LABEL_WORDS.printRouteTitle })).toBeVisible()
    await expect(page.locator("#asset-label-print-reason")).toHaveValue(note)
    await expect(page.locator("form select")).toHaveValue(tape)
    // window.print stubbed with a counter, as expectPrints does (headless has no print dialog); the route prints after
    // its record answers, so the count is polled.
    await page.evaluate(() => {
      const target = window as Window & { __e2ePrints?: number }
      target.__e2ePrints = 0
      window.print = () => {
        target.__e2ePrints = (target.__e2ePrints ?? 0) + 1
      }
    })
    const recorded = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === LABEL_PRINTS_PATH)
    await page.getByRole("button", { name: LABEL_WORDS.printRouteButton, exact: true }).click()
    expect((await recorded).status(), "the print record").toBe(200)
    expect((await recorded).request().postDataJSON()).toEqual({ assetIds: assets.map((asset) => asset.id), tapeSize: tape, reason: note })
    expect(await (await recorded).json()).toMatchObject({ assetCount: 3 })
    await expect.poll(() => page.evaluate(() => (window as Window & { __e2ePrints?: number }).__e2ePrints)).toBe(1)
    await expect(page.getByRole("status").filter({ hasText: LABEL_WORDS.printRecorded })).toBeVisible()
    await record(measure, "the print route, recorded", testInfo)

    // Back on the labels page: the three left ยังไม่เคยพิมพ์ and are listed under เคยพิมพ์แล้ว.
    await openLabels(page, measure, "labels, after the print", testInfo)
    await chooseRunRoom(page)
    await readAddAll(page)
    for (const asset of assets) await expect(queueRow(page, asset)).toHaveCount(0)
    const printed = page.locator('button:has([data-label-mode="printed"])').filter({ visible: true })
    const printedAnswer = queueAnswer(page, (url) => url.searchParams.get("mode") === "printed" && url.searchParams.get("locationId") === readRunData().locationId)
    await printed.click()
    expect((await printedAnswer).status(), "the queue's เคยพิมพ์แล้ว").toBe(200)
    await expect(printed).toHaveAttribute("aria-pressed", "true")
    for (const asset of assets) {
      await expect(queueRow(page, asset)).toBeVisible()
      await expect(queueRow(page, asset)).toContainText(LABEL_WORDS.badgePrinted)
    }
    await record(measure, "labels, the three under เคยพิมพ์แล้ว", testInfo)
  } else {
    // Below md there is no bar: the line and the two actions sit at the end of the list card.
    await expect(page.locator(BAR)).toBeHidden()
    // The visible pair (expectPrintActionsEnabled above) is this one; nothing is printed on the phone.
    await expect(page.getByText(summary).filter({ visible: true })).toHaveCount(1)
  }
})

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer lists a queue row and sees both print actions enabled; nothing is printed or recorded (group 4 plan 6, call 19)", async ({ page, measure }, testInfo) => {
    let posted = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === LABEL_PRINTS_PATH) posted += 1
    })
    await openLabels(page, measure, "labels (viewer)", testInfo)
    // An empty list says why nothing prints.
    await expect(page.locator("#asset-label-print-reason")).toHaveText(LABEL_WORDS.listEmpty)
    const rows = page.locator("[data-label-queue-row]")
    await expect(rows.or(page.getByText(LABEL_WORDS.queueEmpty, { exact: true })).first()).toBeVisible()
    if ((await rows.count()) > 0) {
      const first = rows.first()
      await centreInView(first)
      await first.click()
      await expect(first).toBeDisabled()
      await expect(page.locator("[data-label-selected-row]")).toHaveCount(1)
      await expectPrintActionsEnabled(page, 1)
      await record(measure, "labels (viewer), one listed", testInfo)
    }
    expect(posted, "the viewer records no print").toBe(0)
  })
})
