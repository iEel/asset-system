// Page group 12 plan 4 Task 3 (spec docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §10, board
// AD-Integrations): the Integration API admin page (/th/admin/integrations) with FAKE clients served by the browser.
// The page needs setting:view, which no run role holds (e2e/support/run-plan.ts), so it opens with the seed admin's saved
// session (ADMIN_STATE_FILE), as e2e/admin/data-quality-storage.spec.ts does.
// The client list and every request under it are a hazard of the suite (e2e/support/hazards.ts, "integrations"): the
// fixtures abort them at the context. This spec is the one named exception (tests/e2e-review.test.ts): before it
// navigates, each test adds a page route for the list's path, which runs before the context's. That route answers the
// GET with the fake clients below, so the app's list GET never runs. Any other method falls back to the fixtures'
// abort, which records a hazard and fails the test; the route also keeps its own list, which must stay empty. The
// route never lets a request through to the app and never asks the app for anything.
// Desktop (desktop-light, desktop-dark):
// - Tiles, chips and rows from three fake clients (two enabled, one disabled; one never used, one with errors, one
//   with an unknown creator). The ปิดใช้งาน chip leaves one row; the client with errors expands to its latest error.
// - สร้าง client opens the side panel; its close X closes it with nothing filled and nothing posted.
// Phone (phone-light, phone-dark): the cards do not scroll the page sideways, and a card's ⋯ opens its menu.
// Writes: none. axe through recordSettled on every state.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { INTEGRATIONS_WORDS as W } from "./integrations-words.ts"

const INTEGRATIONS = "/th/admin/integrations"
const DESKTOP_ONLY = "the desktop tests read the table and the side panel; the phone test reads the cards"
const PHONE_ONLY = "the cards are the phone's (md:hidden); the desktop tests read the table"

const now = Date.now()
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString()
const noCalls = { requestCount24h: 0, requestCount7d: 0, requestCountTotal: 0, errorCount7d: 0, topEndpoint: null, latestError: null }

// Three fake clients in the list GET's shape ({ data: IntegrationClientDto[] } over JSON). No real id, token or route.
const WITH_ERRORS = {
  id: "e2e-fake-client-1",
  clientId: "e2e-fake-finance",
  displayName: "E2E fake finance export",
  tokenPreview: "iapi...a1b2",
  scopes: ["asset:read", "reference:read"],
  enabled: true,
  createdBy: "e2e-fake-user",
  createdByName: "E2E fake creator",
  createdAt: hoursAgo(24 * 30),
  updatedBy: null,
  updatedAt: hoursAgo(24 * 30),
  lastUsedAt: hoursAgo(2),
  lastUsedIp: "10.0.0.1",
  lastRotatedAt: null,
  operations: {
    requestCount24h: 15,
    requestCount7d: 120,
    requestCountTotal: 400,
    errorCount7d: 3,
    topEndpoint: { route: "/e2e-fake/v1/assets", count: 90 },
    latestError: { route: "/e2e-fake/v1/assets/lookup", status: 500, requestId: null, at: hoursAgo(3) },
  },
}
const NEVER_USED = {
  ...WITH_ERRORS,
  id: "e2e-fake-client-2",
  clientId: "e2e-fake-unused",
  displayName: "E2E fake unused client",
  tokenPreview: "iapi...c3d4",
  scopes: ["reference:read"],
  createdBy: null,
  createdByName: null,
  lastUsedAt: null,
  lastUsedIp: null,
  operations: noCalls,
}
const DISABLED = {
  ...WITH_ERRORS,
  id: "e2e-fake-client-3",
  clientId: "e2e-fake-retired",
  displayName: "E2E fake retired client",
  tokenPreview: "iapi...e5f6",
  scopes: ["asset:read"],
  enabled: false,
  lastUsedAt: hoursAgo(24 * 5),
  operations: { ...noCalls, requestCount24h: 0, requestCount7d: 5, requestCountTotal: 50, topEndpoint: { route: "/e2e-fake/v1/assets", count: 50 } },
}
const FAKE_CLIENTS = [WITH_ERRORS, NEVER_USED, DISABLED]
type FakeClient = (typeof FAKE_CLIENTS)[number]

// The page route for the client list: the GET gets the fake clients; anything else is listed and falls back to the
// fixtures' context abort (a hazard: the test fails). Returns the list of the requests that were not a GET.
async function serveFakeClients(page: Page): Promise<string[]> {
  const attempted: string[] = []
  await page.route("**/api/admin/integration-clients", async (route) => {
    const request = route.request()
    if (request.method().toUpperCase() === "GET") return route.fulfill({ json: { data: FAKE_CLIENTS } })
    attempted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.fallback()
  })
  return attempted
}

// Every request that could write: anything but a GET or a HEAD to an /api/ path. The spec expects none.
function watchWrites(page: Page) {
  const writes: string[] = []
  page.on("request", (request) => {
    const method = request.method().toUpperCase()
    const path = new URL(request.url()).pathname
    if (method !== "GET" && method !== "HEAD" && path.startsWith("/api/")) writes.push(`${method} ${path}`)
  })
  return writes
}

const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// The status chips: one Segmented group, each button its word and then its count ("ปิดใช้งาน 1").
const chips = (page: Page) => page.getByRole("group", { name: W.filterLabel, exact: true })
const chip = (page: Page, word: string, count: number) =>
  chips(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(word)}\\s*${count}$`) })

// A tile of the strip, found by its label (the <dt>).
const tile = (page: Page, label: string) => page.locator('[data-slot="stat"]').filter({ has: page.getByText(label, { exact: true }) })

// A client's desktop row (the table's row, not its hidden expand row).
const rowOf = (page: Page, client: FakeClient) => page.getByRole("main").locator("tbody tr").filter({ hasText: client.clientId }).filter({ visible: true })

const expandButton = (page: Page, client: FakeClient) =>
  page.getByRole("button", { name: fillTemplate(W.showUsage, { name: client.displayName }), exact: true }).filter({ visible: true })

// Opens a client's usage detail; returns the detail.
async function expandUsage(page: Page, client: FakeClient): Promise<Locator> {
  const button = expandButton(page, client)
  await expect(button).toHaveAttribute("aria-expanded", "false")
  const detailId = await button.getAttribute("aria-controls")
  if (!detailId) throw new Error("the expand button controls no detail")
  const detail = page.locator(`[id="${detailId}"]`)
  await expect(detail).toBeHidden()
  await button.click()
  const opened = page.getByRole("button", { name: fillTemplate(W.hideUsage, { name: client.displayName }), exact: true }).filter({ visible: true })
  await expect(opened).toHaveAttribute("aria-expanded", "true")
  await expect(detail).toBeVisible()
  return detail
}

// The page as a person opens it, its fake clients loaded: navigate, wait for the heading and the chips (they replace
// the loading spinner), and run axe once it has settled.
async function open(page: Page, measure: Measure, label: string) {
  await page.goto(INTEGRATIONS, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
  await expect(chip(page, W.filterAll, FAKE_CLIENTS.length)).toBeVisible()
  await recordSettled(page, measure, label)
}

test.describe("the Integration API page with fake clients, as the seed admin (group 12 plan 4)", () => {
  // The seed admin's saved session (written by the global setup): no run role holds setting:view.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("tiles, chips and rows from fake data", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const attempted = await serveFakeClients(page)
    const writes = watchWrites(page)
    await open(page, measure, "integrations, fake clients")

    // The tiles: two enabled, one disabled, two ever used, 125 calls in 7 days with 3 errors.
    await expect(tile(page, W.summaryActive).locator(".text-metric")).toHaveText("2")
    await expect(tile(page, W.summaryDisabled).locator(".text-metric")).toHaveText("1")
    await expect(tile(page, W.summaryLastUsed).locator(".text-metric")).toHaveText("2")
    const usage = tile(page, W.usageTile)
    await expect(usage.locator(".text-metric")).toHaveText("125")
    await expect(usage).toContainText(W.usageUnit)
    await expect(usage).toContainText(fillTemplate(W.usageErrors, { count: 3 }))

    // The chips and their counts; ทั้งหมด is on.
    await expect(chip(page, W.filterAll, 3)).toHaveAttribute("aria-pressed", "true")
    await expect(chip(page, W.active, 2)).toHaveAttribute("aria-pressed", "false")
    await expect(chip(page, W.disabled, 1)).toHaveAttribute("aria-pressed", "false")

    // The rows: the error badge, the never-used line, the unknown creator.
    for (const client of FAKE_CLIENTS) await expect(rowOf(page, client)).toHaveCount(1)
    await expect(rowOf(page, WITH_ERRORS)).toContainText(fillTemplate(W.errorsBadge, { count: 3 }))
    await expect(rowOf(page, NEVER_USED)).toContainText(W.noLastUsed)
    await expect(rowOf(page, NEVER_USED)).toContainText(W.createdUnknown)
    await expect(rowOf(page, WITH_ERRORS)).not.toContainText(W.createdUnknown)
    await expect(rowOf(page, WITH_ERRORS)).toContainText(WITH_ERRORS.createdByName)
    await expect(rowOf(page, DISABLED)).toContainText(W.disabled)

    // The ปิดใช้งาน chip leaves the one disabled client; ทั้งหมด brings the three back.
    await chip(page, W.disabled, 1).click()
    await expect(chip(page, W.disabled, 1)).toHaveAttribute("aria-pressed", "true")
    await expect(rowOf(page, DISABLED)).toHaveCount(1)
    await expect(rowOf(page, WITH_ERRORS)).toHaveCount(0)
    await expect(rowOf(page, NEVER_USED)).toHaveCount(0)
    await expect(page.getByRole("button", { name: new RegExp(`^${escapeRegExp(fillTemplate(W.showUsage, { name: "" }))}`) }).filter({ visible: true })).toHaveCount(1)
    await recordSettled(page, measure, "integrations, disabled chip")
    await chip(page, W.filterAll, 3).click()
    for (const client of FAKE_CLIENTS) await expect(rowOf(page, client)).toHaveCount(1)

    // The client with errors expands to its latest error (the status and the route) and its top endpoint.
    const detail = await expandUsage(page, WITH_ERRORS)
    await expect(detail.getByText(W.latestError, { exact: true })).toBeVisible()
    await expect(detail.getByText(String(WITH_ERRORS.operations.latestError?.status), { exact: true })).toBeVisible()
    await expect(detail.getByText(WITH_ERRORS.operations.latestError?.route ?? "", { exact: true })).toBeVisible()
    await expect(detail.getByText(W.topEndpoint, { exact: true })).toBeVisible()
    await recordSettled(page, measure, "integrations, a client's usage opened")

    // The client never used expands to the no-calls line.
    const quiet = await expandUsage(page, NEVER_USED)
    await expect(quiet.getByText(W.noOperationalData, { exact: true })).toBeVisible()

    expect(attempted, "no request but the GET reached the client list").toEqual([])
    expect(writes, "the page writes nothing").toEqual([])
  })

  test("the side panel opens and closes without creating", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const attempted = await serveFakeClients(page)
    const writes = watchWrites(page)
    await open(page, measure, "integrations, before the side panel")

    // สร้าง client opens the side panel at step 1, the form.
    await page.getByRole("main").getByRole("button", { name: W.createClient, exact: true }).click()
    const panel = page.getByRole("dialog", { name: W.createClient, exact: true })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole("heading", { name: W.stepDetails, exact: true })).toBeVisible()
    await recordSettled(page, measure, "integrations, side panel open")

    // Nothing filled; the panel's close X closes it, and the list is as it was.
    await panel.getByRole("button", { name: W.close, exact: true }).click()
    await expect(panel).toBeHidden()
    for (const client of FAKE_CLIENTS) await expect(rowOf(page, client)).toHaveCount(1)

    expect(attempted, "no request but the GET reached the client list").toEqual([])
    expect(writes, "the panel posts nothing").toEqual([])
  })

  test("cards fit the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const attempted = await serveFakeClients(page)
    const writes = watchWrites(page)
    await open(page, measure, "integrations, fake clients (phone)")

    // One card per client, and the page does not scroll sideways.
    const main = page.getByRole("main")
    for (const client of FAKE_CLIENTS) await expect(main.locator("li").filter({ hasText: client.clientId }).filter({ visible: true })).toHaveCount(1)
    expect(await fits(page), "the page does not scroll sideways").toBe(true)

    // A card's ⋯ opens its menu (a bottom sheet on the phone) with ดูประวัติ; Escape closes it. Nothing in it is pressed.
    const more = page.getByRole("button", { name: fillTemplate(W.moreActions, { name: WITH_ERRORS.displayName }), exact: true }).filter({ visible: true })
    await more.scrollIntoViewIfNeeded()
    await more.click()
    const menu = page.getByRole("dialog").filter({ visible: true }).last()
    await expect(menu).toBeVisible()
    await expect(menu.getByText(W.historyItem, { exact: true })).toBeVisible()
    await recordSettled(page, measure, "integrations, a card's menu (phone)")
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
    expect(await fits(page), "the page still does not scroll sideways").toBe(true)

    expect(attempted, "no request but the GET reached the client list").toEqual([])
    expect(writes, "the page writes nothing").toEqual([])
  })
})
