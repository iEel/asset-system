// The steps on the audit round form and the rounds list (group 2 spec §6, §7, §16), shared by the field audit walk,
// the rounds list spec and the cross-cutting field errors: a scope condition added as a chip, the live count, the
// sample, a round cancelled by the IT head, a round's row or card, the status tabs, the work view's chip, and a link
// shown whole.
import type { APIRequest, Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { authStateFile, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { ROUNDS_WORDS } from "./rounds-words.ts"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Each condition's value picker (Task 4): a SearchableSelect, or a native select, with this id.
const SCOPE_PICKER_IDS = {
  "แผนก": "audit-round-scope-department",
  "ที่ตั้ง": "audit-round-scope-location",
  "สถานะทรัพย์สิน": "audit-round-scope-status",
} as const
export type ScopeCondition = keyof typeof SCOPE_PICKER_IDS

// "+ เพิ่มเงื่อนไข", the condition's menu item, then its value. The picker may open by itself; the chip then names
// the condition and the option ("แผนก: <code> - <name>").
export async function addCondition(page: Page, condition: ScopeCondition, search: string, option: string) {
  await page.getByRole("button", { name: ROUNDS_WORDS.addCondition }).click()
  await page.getByRole("menuitem", { name: condition, exact: true }).click()
  const picker = page.locator(`#${SCOPE_PICKER_IDS[condition]}`)
  // Its own live count (Task 4: 450ms after the change). The next change would abort a count still running, and the measurement fails on a cancelled request.
  const counted = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/audit-rounds/preview")
  if (await picker.evaluate((node) => node instanceof HTMLSelectElement)) {
    await picker.selectOption({ label: option })
  } else {
    if ((await picker.getAttribute("aria-expanded")) !== "true") await picker.click()
    await page.getByRole("dialog").getByRole("combobox").fill(search)
    await page.getByRole("option", { name: option, exact: true }).click()
  }
  await expect(page.getByRole("button", { name: new RegExp(escape(`${condition}: ${option}`)) })).toBeVisible()
  expect((await counted).status(), `the live count with ${condition}`).toBe(200)
}

// The first count, over the whole register (Task 4), done before any condition changes the scope: the panel and the bar
// leave "กำลังนับรายการ…". Not a bare getByRole("status"): the shell renders role=status too (shell-banner, shell-notifications).
export async function waitForFirstCount(page: Page) {
  await expect(page.getByRole("main").getByText(ROUNDS_WORDS.counting, { exact: true })).toHaveCount(0)
}

// The footer's submit "สร้างรอบ" (spec §7).
export function createButton(page: Page): Locator {
  return page.getByRole("button", { name: ROUNDS_WORDS.createRound, exact: true })
}

// The footer's "จะสร้างรอบ N รายการ": that count, or any count of at least 1.
export function willCreate(page: Page, count?: number): Locator {
  const text = count === undefined
    ? new RegExp(`^${templatePattern(ROUNDS_WORDS.willCreate, { count: "[1-9][\\d,]*" }).source}$`)
    : fillTemplate(ROUNDS_WORDS.willCreate, { count: count.toLocaleString("en-US") })
  return page.getByText(text, { exact: true }).filter({ visible: true })
}

export async function readWillCreate(page: Page): Promise<number> {
  return Number(((await willCreate(page).first().textContent()) ?? "").replace(/\D/g, ""))
}

// "ดูตัวอย่างรายการ": the eight-row sample, inline in the summary panel.
export async function showSample(page: Page) {
  await page.getByText(ROUNDS_WORDS.showSample, { exact: true }).click()
}

// The test's own round, cancelled by the IT head (audit:approve) through the round route, from the run's saved session.
export async function cancelAsItHead(api: APIRequest, baseURL: string | undefined, roundId: string, reason: string) {
  const itHead = await api.newContext({ baseURL, storageState: fromRoot(authStateFile(readRunState().runId, "itHead")) })
  try {
    const cancelled = await itHead.patch(`/api/audit-rounds/${roundId}`, { data: { action: "cancel", reason } })
    expect(cancelled.status(), await cancelled.text()).toBe(200)
  } finally {
    await itHead.dispose()
  }
}

// The round's row in the desktop table, or its card in the phone list (the other one is hidden at that width).
export function roundEntry(page: Page, device: E2eDevice, auditNo: string): Locator {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: auditNo })
}

// One status tab: its label, then its count.
export function tab(page: Page, label: string): Locator {
  return page.getByRole("main").locator('[data-slot="tab-nav"]').first().getByRole("link", { name: new RegExp(`^${escape(label)}\\s*[\\d,]*$`) })
}

// Exactly these tabs in this order, each with its count, and the current one marked.
export async function expectTabs(page: Page, current: string, counts: Record<string, number>) {
  const links = page.getByRole("main").locator('[data-slot="tab-nav"]').first().getByRole("link")
  await expect(links).toHaveText(Object.entries(counts).map(([label, count]) => new RegExp(`^${escape(label)}\\s*${count}$`)))
  await expect(tab(page, current)).toHaveAttribute("aria-current", "page")
}

// A work view's removable chip ("ล้างตัวกรองนี้: รอตรวจ").
export function workViewChip(page: Page, view: string): Locator {
  return page.getByRole("group", { name: ROUNDS_WORDS.activeFilters }).getByRole("link", { name: `${ROUNDS_WORDS.clearFilter}: ${view}`, exact: true })
}

// Not cut (spec §13 bug 1): no box inside the link is narrower than its text.
export async function expectWhole(link: Locator) {
  await expect(link).toBeVisible()
  const clipped = await link.evaluate((node) =>
    [node, ...node.querySelectorAll("*")]
      .filter((element) => getComputedStyle(element).display !== "inline" && element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.outerHTML.slice(0, 120)),
  )
  expect(clipped, "the next step shows its whole text").toEqual([])
}
