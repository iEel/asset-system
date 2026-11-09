// ของใช้สิ้นเปลือง (consumables plan 4 Task 3): the low-stock warning, waiting-work key consumablesLow, on the bell, in
// the work center's เตือนล่วงหน้า and the notifications page's section, and the list's filter /th/consumables?state=low.
// - No run role holds consumable:* (e2e/support/run-plan.ts): the story runs as the seed admin through its saved session
//   (ADMIN_STATE_FILE), as consumables.spec.ts does. IT staff (no consumable:view) are read in a context of their own
//   saved session while the run kind is low: their bell lists no such topic and GET /api/notifications has no item.
// - The dev data is shared: other kinds may be low too, so nothing asserts a count but "at least 1", and nothing
//   asserts the count falls to 0 after the run kind is restocked.
// - The story (desktop-light and phone-light): a run kind "<run> <project> หมึกทดสอบ" (the project's code keeps the two
//   projects' kinds apart) with ขั้นต่ำ 2 and 1 received, through the consumables API as the setup, so it is low. The
//   work center's เตือนล่วงหน้า row counts at least 1 and links to /th/notifications#advance, where the section lists
//   "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม" (status=all, whatever the admin's read state). The work center comes before the bell:
//   the bell's row marks the topic read when it is clicked. The bell's box lists the topic with at least 1; its link is
//   /th/consumables?state=low, where the run kind is listed ต้องซื้อเพิ่ม, the chip "เฉพาะที่ต้องซื้อเพิ่ม" shows and the
//   banner names the kind. รับเข้า 5 more from the row's ⋯ → the kind leaves the filtered list (the chip stays).
// - The run kind is deactivated at the end (API, also when a step fails) so later runs do not inherit a low kind.
// Writes: the run kind, its two receipts and its deactivation; the admin's own read state of the topic (the bell's row
// click). No other kind is touched; no DELETE; no database access outside the app. axe through recordSettled.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { bell, bellBox } from "../shell/shell-steps.ts"
import { menuItem } from "../asset-detail/detail-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { ADMIN_STATE_FILE, authStateFile, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp, toast } from "../disposal/disposal-support.ts"
import { bangkokDate, projectCode } from "../transactions/tx-plan.ts"
import { CONSUMABLES_WORDS as W } from "./consumables-words.ts"

const LIST = "/th/consumables"
const LOW_LIST = "/th/consumables?state=low"
const LIGHT_ONLY = "the story runs in desktop-light and phone-light (consumables plan 4 Task 3)"
// The kind's unit: the API's default (consumableItemSchema), as the kind dialog's.
const UNIT = "ชิ้น"
// The work center and the notifications page read every queue of the dev copy: a first arrival can be slow.
const HEAVY_MS = 90_000
const NUMBER = "[\\d,]+"
const toNumber = (text: string) => Number(text.trim().replaceAll(",", ""))

// The kind's name link: in the table from md and on its card below md (both in the DOM; one shows).
const kindLink = (page: Page, name: string) => page.getByRole("main").getByRole("link", { name, exact: true })

// The kind's row: the table's row on the desktop, its card on the phone.
function kindRow(page: Page, device: E2eDevice, name: string): Locator {
  const link = page.getByRole("link", { name, exact: true })
  return device === "desktop"
    ? page.getByRole("main").locator("table tbody tr").filter({ has: link })
    : page.locator("[data-consumables-cards] article").filter({ has: link })
}

// The row's ⋯ (named "การดำเนินการของ <name>"), then one of its items.
async function chooseFromMenu(page: Page, device: E2eDevice, name: string, item: string) {
  await kindRow(page, device, name).getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: name }), exact: true }).click()
  // The dropdown on the desktop, the bottom sheet (buttons and links) on the phone (E2E-1110A).
  const actions = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(actions).toBeVisible()
  await menuItem(actions, item).click()
}

// The bell's box, opened from the bell when it is not open yet, once its summary has loaded (its groups or its empty
// state).
async function openBellBox(page: Page): Promise<Locator> {
  const box = bellBox(page)
  if (!(await box.isVisible())) await bell(page).click()
  await expect(box).toBeVisible()
  await expect(box.getByRole("region").first().or(box.getByText(W.bellEmpty, { exact: true })).first()).toBeVisible({ timeout: HEAVY_MS })
  return box
}

// The bell's row of the topic: a link whose first line is its title.
const bellRow = (box: Locator): Locator => box.getByRole("link").filter({ hasText: W.lowTopic })

test.describe("the low-stock warning as the seed admin: the work center, the bell and the filtered list", () => {
  // The seed admin's saved session (written by the global setup): no run role holds consumable:*.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("a low run kind on the work center, the notifications page and the bell, the filtered list, IT staff without it, then restocked", async ({ page, measure, e2eDevice, e2eTheme, browser }, testInfo) => {
    test.skip(e2eTheme === "dark", LIGHT_ONLY)
    test.setTimeout(300_000)
    const { runId, baseURL } = readRunState()
    const kindName = `${runId} ${projectCode(testInfo.project.name)} หมึกทดสอบ`

    // Setup: the run kind with ขั้นต่ำ 2 and 1 received, through the API: คงเหลือ 1, ต้องซื้อเพิ่ม.
    const created = await page.request.post("/api/consumables", { data: { name: kindName, unit: UNIT, minQuantity: 2 } })
    expect(created.status(), `POST /api/consumables: ${(await created.text()).slice(0, 300)}`).toBe(201)
    const kindId = ((await created.json()) as { id: string }).id
    expect(kindId, "the new kind's id").toBeTruthy()
    try {
      const received = await page.request.post("/api/consumables/receive", { data: { itemId: kindId, quantity: 1, receivedDate: bangkokDate() } })
      expect(received.status(), `POST /api/consumables/receive: ${(await received.text()).slice(0, 300)}`).toBe(200)

      // The work center: ติดตามแยก's เตือนล่วงหน้า row (the panel renders twice, one shows) counts at least 1 and links
      // to the notifications page's section.
      await page.goto("/th/work-center", { waitUntil: "load", timeout: HEAVY_MS })
      await expect(page.getByRole("heading", { level: 1, name: W.workCenterTitle, exact: true })).toBeVisible({ timeout: HEAVY_MS })
      const advancePattern = new RegExp(`^${escapeRegExp(W.trackingAdvance)}\\s*(${NUMBER})$`)
      const advanceRow = page.getByRole("link", { name: advancePattern }).filter({ visible: true })
      await expect(advanceRow).toHaveCount(1)
      await expect(advanceRow).toHaveAttribute("href", "/th/notifications#advance")
      const advanceName = ((await advanceRow.textContent()) ?? "").trim()
      expect(toNumber(advancePattern.exec(advanceName)?.[1] ?? "0"), `the work center's advance row: ${advanceName}`).toBeGreaterThanOrEqual(1)
      await recordSettled(page, measure, "work center: advance warnings with a low kind")

      // The notifications page's เตือนล่วงหน้า (ทั้งหมด, whatever the admin's read state): the topic's row, at least 1.
      await page.goto("/th/notifications?status=all#advance", { waitUntil: "load", timeout: HEAVY_MS })
      await expect(page.getByRole("heading", { level: 1, name: W.notificationsTitle, exact: true })).toBeVisible({ timeout: HEAVY_MS })
      const advance = page.locator("section#advance")
      await expect(advance.getByRole("heading", { level: 2, name: W.advanceSection, exact: true })).toBeVisible()
      const topicRow = advance.locator("li").filter({ has: page.getByRole("button", { name: fillTemplate(W.topicMenu, { title: W.lowTopic }), exact: true }) })
      await expect(topicRow).toHaveCount(1)
      await expect(topicRow).toContainText(W.lowTopic)
      expect(toNumber(await topicRow.locator(".num").first().innerText()), "the notifications page's count").toBeGreaterThanOrEqual(1)
      await recordSettled(page, measure, "notifications: advance with a low kind")

      // The bell's box: the topic with at least 1, linking to the filtered list.
      await page.goto(LIST, { waitUntil: "load" })
      await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
      const box = await openBellBox(page)
      const row = bellRow(box)
      await expect(row).toHaveCount(1, { timeout: HEAVY_MS })
      await expect(row).toHaveAttribute("href", LOW_LIST)
      expect(toNumber(await row.locator(".num").innerText()), "the bell's count").toBeGreaterThanOrEqual(1)
      await recordSettled(page, measure, "bell: the low-stock topic")

      // Its link: the filtered list, the chip, the run kind ต้องซื้อเพิ่ม at 1, and the banner names it.
      await row.click()
      await page.waitForURL((url) => url.pathname === LIST && url.searchParams.get("state") === "low")
      await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
      const chips = page.getByRole("group", { name: W.activeFilters, exact: true })
      const chip = chips.getByRole("link", { name: `${W.clearDrilldownFilter}: ${W.filterLow}`, exact: true })
      await expect(chip).toBeVisible()
      await expect(chip).toHaveAttribute("href", LIST)
      const kind = kindRow(page, e2eDevice, kindName)
      await expect(kind).toHaveCount(1)
      await expect(kind.locator('[data-slot="status-badge"]')).toHaveText(W.state_low)
      const lowBanner = page.getByRole("main").getByRole("status").filter({ hasText: fillTemplate(W.lowItem, { name: kindName, onHand: 1 }) })
      await expect(lowBanner).toBeVisible()
      await recordSettled(page, measure, "consumables list, filtered to low")

      // Without permission: IT staff (no consumable:view), in a context of their own saved session while the kind is
      // low, see no such topic on the bell, and their summary has no such item.
      const staff = await browser.newContext({ baseURL, viewport: page.viewportSize(), storageState: fromRoot(authStateFile(runId, "itStaff")) })
      try {
        const staffPage = await staff.newPage()
        const summary = await staffPage.request.get("/api/notifications")
        expect(summary.status(), "GET /api/notifications as IT staff").toBe(200)
        const keys = ((await summary.json()) as { items: { key: string }[] }).items.map((item) => item.key)
        expect(keys, "IT staff's summary has no consumablesLow").not.toContain("consumablesLow")
        await staffPage.goto("/th/dashboard", { waitUntil: "load", timeout: HEAVY_MS })
        const staffBox = await openBellBox(staffPage)
        await expect(bellRow(staffBox)).toHaveCount(0)
      } finally {
        await staff.close()
      }

      // Clearing: รับเข้า 5 more from the row's ⋯ → คงเหลือ 6, so the kind leaves the filtered list; the chip stays.
      await chooseFromMenu(page, e2eDevice, kindName, W.menu_receive)
      const receiveDialog = page.getByRole("dialog", { name: W.receiveTitle, exact: true })
      await expect(receiveDialog).toBeVisible()
      await expect(page.locator("#consumable-receive-item")).toContainText(kindName)
      await page.locator("#consumable-receive-quantity").fill("5")
      await recordSettled(page, measure, "consumables: receive on the low list")
      const answered = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/consumables/receive")
      await receiveDialog.getByRole("button", { name: W.receiveSubmit, exact: true }).click()
      const response = await answered
      expect(response.status(), `POST /api/consumables/receive: ${(await response.text()).slice(0, 300)}`).toBeLessThan(300)
      // The toast and the refresh together: on a slow server the toast can end before the refreshed page arrives.
      await Promise.all([
        expect(toast(page, fillTemplate(W.receiveToast, { name: kindName })).last()).toBeVisible(),
        expect(kindLink(page, kindName)).toHaveCount(0),
      ])
      await expect(receiveDialog).toBeHidden()
      await expect(page).toHaveURL((url) => url.pathname === LIST && url.searchParams.get("state") === "low")
      await expect(chip).toBeVisible()
      await expect(page.getByRole("main").getByRole("status").filter({ hasText: kindName })).toHaveCount(0)
      await recordSettled(page, measure, "consumables list, filtered, after restock")
    } finally {
      // The run kind leaves the cabinet's list, so later runs do not inherit a low kind (its history stays).
      const deactivated = await page.request.patch(`/api/consumables/${kindId}`, { data: { isActive: false } })
      expect.soft(deactivated.status(), `PATCH /api/consumables/${kindId}: ${(await deactivated.text()).slice(0, 300)}`).toBe(200)
    }
  })
})
