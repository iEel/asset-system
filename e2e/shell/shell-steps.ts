// The steps a person takes in the menu B shell (spec docs/superpowers/specs/2026-10-21-menu-b-shell-design.md): the
// top bar, the bell and its box, the desktop menu, the phone's bottom menu and its เพิ่มเติม sheet, the global search,
// and the session. The names are the app's own (messages/th.json, e2e/shell/shell-words.ts). The bell check makes its
// own waiting work through the app as IT staff (a pending disposal request each), and the session checks stand in for
// the status read only, answering as the server does.
import { request as playwrightRequest, type APIRequestContext, type Locator, type Page } from "@playwright/test"
import type { AssetChoices } from "../disposal/disposal-support.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { authStateFile, fromRoot } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { expect } from "../support/fixtures.ts"

export { shellBanner } from "../audit/scan-steps.ts"
// The spec files take the browser types from here: they import nothing from @playwright/test (tests/e2e-shell.test.ts).
export type { Locator, Page }

// The top bar (<header>, outside <main>), the bell and its box.
export const topBar = (page: Page): Locator => page.getByRole("banner")
// "การแจ้งเตือน N รายการ" while something is unread (N may hold a comma), "การแจ้งเตือน" when every listed row is read,
// "ไม่มีงานค้าง" for an empty box.
export const bell = (page: Page): Locator => page.getByRole("button", { name: /^(?:การแจ้งเตือน(?: [\d,]+ รายการ)?|ไม่มีงานค้าง)$/ })
export const bellBox = (page: Page): Locator => page.getByRole("dialog", { name: "การแจ้งเตือน" })
export const skipLink = (page: Page): Locator => page.getByRole("link", { name: "ข้ามไปเนื้อหาหลัก", exact: true })

// The desktop menu (<aside id="desktop-primary-navigation">) and the top bar's toggle that names what a press does.
export const menu = (page: Page): Locator => page.getByRole("complementary")
export const menuToggle = (page: Page): Locator => topBar(page).getByRole("button", { name: /^(?:ย่อเมนู|ขยายเมนู)$/ })
// The person at the menu's foot. Expanded, its name is its visible text (the name, then the role line), so it is
// found by a name that holds the display name; only the rail's trigger is named "เมนูผู้ใช้: <name>".
export const accountButton = (page: Page, displayName: string): Locator => menu(page).getByRole("button", { name: displayName })

// The phone's bottom menu tab and its sheet. Exact: "เพิ่มเติม" is also inside "การดำเนินการเพิ่มเติม".
export const moreTab = (page: Page): Locator => page.locator("[data-mobile-field-navigation]").getByRole("button", { name: "เพิ่มเติม", exact: true })
export const moreSheet = (page: Page): Locator => page.getByRole("dialog", { name: "เพิ่มเติม", exact: true })

// The desktop's search field in the top bar.
export const globalSearchBox = (page: Page): Locator => page.getByRole("combobox", { name: "ค้นหาทั่วระบบ", exact: true })

// The search as a person opens it: "/" on the desktop (focus is on the page, not in a field), the top bar's search icon
// on the phone, which opens the full-height sheet. Returns the field to type in.
export async function openSearch(page: Page, device: E2eDevice): Promise<Locator> {
  if (device === "desktop") {
    await page.keyboard.press("/")
    const box = globalSearchBox(page)
    await expect(box).toBeFocused()
    return box
  }
  await topBar(page).getByRole("button", { name: "ค้นหาทั่วระบบ", exact: true }).click()
  const sheet = page.getByRole("dialog", { name: "ค้นหาทั่วระบบ" })
  await expect(sheet).toBeVisible()
  return sheet.getByRole("combobox", { name: "ค้นหาทั่วระบบ", exact: true })
}

// The search panel's list (the bar's popover or the phone sheet), named like the field.
export const searchPanel = (page: Page): Locator => page.getByRole("listbox", { name: "ค้นหาทั่วระบบ", exact: true })

// The search panel's groups, in the order on screen: each group's name is the heading its aria-labelledby names.
export async function searchGroups(page: Page): Promise<string[]> {
  return searchPanel(page)
    .getByRole("group")
    .evaluateAll((groups) =>
      groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() ?? ""),
    )
}

// IT staff's API, from the run's saved session (no sign-in): the bell check's waiting work is theirs, so the IT head
// reads it as work to decide.
export async function itStaffApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: readRunState().baseURL, storageState: fromRoot(authStateFile(readRunState().runId, "itStaff")) })
}

async function created<T>(response: Awaited<ReturnType<APIRequestContext["post"]>>, what: string): Promise<T> {
  if (response.status() !== 201) throw new Error(`${what} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as T
}

// One asset in the test's room and a pending disposal request for it, through the app's own API as IT staff: one new
// item of the IT head's approval work. Nothing is deleted after.
export async function createPendingDisposal(api: APIRequestContext, choices: AssetChoices, roomId: string, tag: string): Promise<{ assetId: string; requestId: string }> {
  const data = readRunData()
  const asset = await created<{ id: string }>(
    await api.post("/api/assets", {
      data: {
        assetTag: tag,
        name: `${tag} เครื่องทดสอบกระดิ่ง`,
        categoryId: choices.categoryId,
        companyId: data.companyId,
        branchId: data.branchId,
        currentLocationId: roomId,
        homeLocationId: roomId,
        statusId: choices.statusId,
        conditionId: choices.conditionId,
        remark: `${tag} สร้างโดยชุดทดสอบ E2E`,
        // The schema's preprocessed optional numbers and dates need their keys present (as createAssets sends them).
        licenseTotalSeats: null,
        licenseUsedSeats: null,
        purchaseDate: null,
        purchasePrice: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
      },
    }),
    `POST /api/assets ${tag}`,
  )
  const assetId = asset.id
  const disposal = await created<{ id: string }>(
    await api.post("/api/disposal-requests", {
      data: { assetId, disposalType: "dispose", reason: `${tag} ทดสอบกระดิ่งแจ้งเตือน รอผู้อนุมัติ`, requestedById: data.employees.itStaff.id, approverId: null, saleValue: null, salvageValue: null, sourceType: null, sourceId: null },
    }),
    `POST /api/disposal-requests ${tag}`,
  )
  return { assetId, requestId: disposal.id }
}

const DAY_HALF_MS = 43_200_000

// Stands in for the session status read (GET /api/session/status) with deadlines fixed now: the idle deadline after
// idleInMs (capped by the ceiling), the ceiling after ceilingInMs (12 hours by default). It answers every status request
// until replaced or page.unroute("**/api/session/status"), as the server would: 200 with the times before the idle
// deadline, 401 { error: "Unauthorized" } after it. The keep-alive is never stood in for: it stays the app's own. A test
// that lets the deadline pass calls measure.expectRefusal for the 401 first.
export async function standInStatus(page: Page, deadlines: { idleInMs: number; ceilingInMs?: number }): Promise<void> {
  await page.unroute("**/api/session/status")
  const calledAt = Date.now()
  const ceilingMs = deadlines.ceilingInMs ?? DAY_HALF_MS
  const ceilingDeadline = calledAt + ceilingMs
  const idleDeadline = calledAt + Math.min(deadlines.idleInMs, ceilingMs)
  const iso = (ms: number) => new Date(ms).toISOString()
  const body = () => ({
    loginAt: iso(ceilingDeadline - DAY_HALF_MS),
    activeAt: iso(calledAt),
    idleDeadline: iso(idleDeadline),
    ceilingDeadline: iso(ceilingDeadline),
    serverNow: iso(Date.now()),
  })
  await page.route("**/api/session/status", (route) => route.fulfill(Date.now() < idleDeadline ? { json: body() } : { status: 401, json: { error: "Unauthorized" } }))
}
