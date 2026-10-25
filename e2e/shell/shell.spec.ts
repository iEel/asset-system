// The menu B shell (spec docs/superpowers/specs/2026-10-21-menu-b-shell-design.md): the bell and its box with the work
// center's dot, the desktop menu and its rail, the global search, the phone's เพิ่มเติม sheet, and the skip link with the
// top bar. The IT head reads the bell (they hold dashboard:view, user decision 2026-10-25, so the work center shows
// its dot); IT staff walk the rest. No test signs in: the run's saved sessions do.
import type { Locator, Page } from "./shell-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createRoom, escapeRegExp, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { SEARCH_GROUP_ORDER, SHELL_WORDS, fillTemplate, templatePattern } from "./shell-words.ts"
import {
  accountButton,
  bell,
  bellBox,
  createPendingDisposal,
  globalSearchBox,
  itStaffApi,
  menu,
  menuToggle,
  moreSheet,
  moreTab,
  openSearch,
  searchGroups,
  searchPanel,
  skipLink,
  topBar,
} from "./shell-steps.ts"

const COUNT = "[1-9][\\d,]*"
const BELL_WITH_COUNT = new RegExp(`^${templatePattern(SHELL_WORDS.bellLabel, { count: COUNT }).source}$`)
const WAITING = templatePattern(SHELL_WORDS.workCenterWaiting, { count: COUNT })
const WORK_CENTER_LINK = new RegExp(`^${escapeRegExp(SHELL_WORDS.workCenter)}`)
const APPROVAL_ROW = new RegExp(`^${escapeRegExp(SHELL_WORDS.approvalInbox)}`)

function displayNameOf(key: "itHead" | "itStaff"): string {
  const user = readRunData().users[key]
  if (!user) throw new Error(`the run has no ${key} user: the setup project did not finish`)
  return user.displayName
}

async function cookieValue(page: Page, name: string): Promise<string | undefined> {
  return (await page.context().cookies()).find((cookie) => cookie.name === name)?.value
}

async function menuWidth(page: Page): Promise<number | undefined> {
  return (await menu(page).boundingBox())?.width
}

// The bell box, opened from the bell when it is not open yet.
async function openBellBox(page: Page): Promise<Locator> {
  const box = bellBox(page)
  if (!(await box.isVisible())) await bell(page).click()
  await expect(box).toBeVisible()
  return box
}

// The work center's row: in the desktop menu, or in the phone's เพิ่มเติม sheet. On the phone the bell box closes first
// and the sheet closes after with its X; the check runs inside.
async function checkWorkCenter(page: Page, device: E2eDevice, check: (link: Locator) => Promise<void>) {
  if (device === "desktop") {
    await check(menu(page).getByRole("link", { name: WORK_CENTER_LINK }))
    return
  }
  if (await bellBox(page).isVisible()) {
    await page.keyboard.press("Escape")
    await expect(bellBox(page)).toBeHidden()
  }
  await moreTab(page).click()
  const sheet = moreSheet(page)
  await expect(sheet).toBeVisible()
  await check(sheet.getByRole("link", { name: WORK_CENTER_LINK }))
  await sheet.getByRole("button", { name: SHELL_WORDS.close, exact: true }).click()
  await expect(sheet).toBeHidden()
}

test.describe("the bell", () => {
  asUser("itHead")

  test("the bell names its count, groups the work, reads all without hiding it, and a rise brings the row back", async ({ page, measure, e2eDevice }, testInfo) => {
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "BELL")
    const roomId = await createRoom(`${prefix}-ROOM`, `${prefix} ห้องทดสอบกระดิ่ง`)
    const staff = await itStaffApi()
    try {
      // IT staff ask for a disposal: one item of the IT head's approval work.
      await createPendingDisposal(staff, choices, roomId, `${prefix}-1`)

      await measure.visit("/th/dashboard", "IT head: dashboard with waiting work")
      await expect(bell(page)).toHaveAccessibleName(BELL_WITH_COUNT)
      await checkWorkCenter(page, e2eDevice, async (link) => expect(link).toContainText(WAITING))

      const box = await openBellBox(page)
      const decide = box.getByRole("region", { name: SHELL_WORDS.groupDecide, exact: true })
      await expect(decide.getByRole("link", { name: APPROVAL_ROW })).toBeVisible()
      const headings = await box.getByRole("heading", { level: 3 }).allTextContents()
      expect(headings[0]).toBe(SHELL_WORDS.groupDecide)
      if (headings.includes(SHELL_WORDS.groupFollow)) expect(headings.indexOf(SHELL_WORDS.groupFollow)).toBeGreaterThan(0)
      await measure.recordPage("IT head: the bell box")

      // Read all: every row stays listed with its read pill, the bell drops its count and the menu's dot goes.
      await box.getByRole("button", { name: SHELL_WORDS.markAllRead, exact: true }).click()
      await expect(box.getByText(SHELL_WORDS.allRead, { exact: true })).toBeVisible()
      const approvalRow = box.getByRole("link", { name: APPROVAL_ROW })
      await expect(approvalRow).toBeVisible()
      await expect(approvalRow).toContainText(SHELL_WORDS.read)
      await expect(bell(page)).toHaveAccessibleName(SHELL_WORDS.title)
      await checkWorkCenter(page, e2eDevice, async (link) => expect(link).not.toContainText(WAITING))

      // A reload keeps the read state, and the first load announces nothing.
      await page.reload()
      await expect(bell(page)).toHaveAccessibleName(SHELL_WORDS.title)
      await expect((await openBellBox(page)).getByText(SHELL_WORDS.allRead, { exact: true })).toBeVisible()
      await expect(page.getByRole("status").filter({ hasText: /เพิ่ม [\d,]+ รายการ/ })).toHaveCount(0)
      await page.keyboard.press("Escape")
      await expect(bellBox(page)).toBeHidden()

      // New work arrives: the count, the unread row and the dot return, and the rise is announced once.
      await createPendingDisposal(staff, choices, roomId, `${prefix}-2`)
      await page.evaluate(() => window.dispatchEvent(new Event("asset-system:notification-summary-changed")))
      await expect(bell(page)).toHaveAccessibleName(BELL_WITH_COUNT)
      const rise = templatePattern(SHELL_WORDS.increase, { title: escapeRegExp(SHELL_WORDS.approvalInbox), count: "[1-9]\\d*" })
      await expect(page.getByRole("status").filter({ hasText: new RegExp(`^${rise.source}$`) })).toHaveCount(1)
      const reopened = await openBellBox(page)
      await expect(reopened.getByRole("link", { name: APPROVAL_ROW })).not.toContainText(SHELL_WORDS.read)
      // The IT head holds dashboard:view, so the box offers the work center.
      await expect(reopened.getByRole("link", { name: SHELL_WORDS.openWorkCenter, exact: true })).toBeVisible()
      await checkWorkCenter(page, e2eDevice, async (link) => expect(link).toContainText(WAITING))

      // On the phone a focus page keeps its own task header: no bell.
      if (e2eDevice === "phone") {
        await measure.visit("/th/assets/new", "IT head: a focus page on the phone")
        await expect(bell(page)).toHaveCount(0)
      }
    } finally {
      await staff.dispose()
    }
  })
})

test.describe("the menu and the top bar", () => {
  asUser("itStaff")

  test("the desktop menu folds to a rail that names its rows, remembers it, and keeps the person at its foot", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "desktop", "the desktop menu: the phone has the bottom menu and its sheet")
    const displayName = displayNameOf("itStaff")
    await measure.visit("/th/dashboard", "IT staff: dashboard (desktop menu)")
    await expect(topBar(page).getByRole("button", { name: /^เปลี่ยนภาษา/ })).toHaveCount(1)
    await expect(topBar(page).getByRole("button", { name: /^เมนูผู้ใช้:/ })).toHaveCount(0)

    // Fold the menu: the toggle names what a press does, the rail is 64px, and the cookie remembers it.
    await expect(menuToggle(page)).toHaveAccessibleName(SHELL_WORDS.collapseMenu)
    await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "true")
    await menuToggle(page).click()
    await expect(menuToggle(page)).toHaveAccessibleName(SHELL_WORDS.expandMenu)
    await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false")
    await expect.poll(() => menuWidth(page)).toBe(64)
    expect(await cookieValue(page, "sidebar")).toBe("collapsed")
    expect(await (await page.request.get("/th/dashboard")).text()).toContain(SHELL_WORDS.expandMenu)
    await page.reload()
    await expect.poll(() => menuWidth(page)).toBe(64)

    // A rail row names itself: on hover after the delay, and at once on focus.
    const register = menu(page).getByRole("link", { name: SHELL_WORDS.assetRegister, exact: true })
    const tooltip = page.getByRole("tooltip", { name: SHELL_WORDS.assetRegister })
    await register.hover()
    await expect(tooltip).toBeVisible()
    await page.mouse.move(900, 500)
    await expect(tooltip).toBeHidden()
    await register.focus()
    await expect(tooltip).toBeVisible()
    await measure.recordPage("IT staff: the rail with a row's name")

    // A rail group opens the menu at that group.
    await menu(page).getByRole("button", { name: SHELL_WORDS.assetManagement, exact: true }).click()
    await expect(menuToggle(page)).toHaveAccessibleName(SHELL_WORDS.collapseMenu)
    await expect(menu(page).getByRole("button", { name: SHELL_WORDS.assetManagement, exact: true })).toHaveAttribute("aria-expanded", "true")
    await expect.poll(() => cookieValue(page, "sidebar")).toBe("expanded")

    // The person at the menu's foot: their name, then sign-out, which lands on the login without the expired reason.
    await accountButton(page, displayName).click()
    const accountMenu = page.getByRole("menu")
    await expect(accountMenu).toContainText(displayName)
    await measure.recordPage("IT staff: the account menu")
    await accountMenu.getByRole("menuitem", { name: SHELL_WORDS.logout }).click()
    await page.waitForURL((url) => url.pathname === "/th/login")
    await page.goto("/th/dashboard")
    await page.waitForURL((url) => url.pathname === "/th/login")
    expect(new URL(page.url()).searchParams.get("reason")).toBeNull()
    await expect(page.getByText(SHELL_WORDS.sessionExpired)).toHaveCount(0)
  })

  test("the global search finds the run's records by group, counts the register, remembers what was opened, and offers a way on when nothing is found", async ({ page, measure, e2eDevice }) => {
    const { runId } = readRunState()
    await measure.visit("/th/dashboard", "IT staff: dashboard (search)")
    let box = await openSearch(page, e2eDevice)
    await box.fill("E")
    await expect(page.getByText(SHELL_WORDS.searchMinChars, { exact: true })).toBeVisible()

    // The run's own records, grouped in the app's order, with the words found marked.
    await box.fill(runId)
    const registerAll = searchPanel(page).getByRole("option", { name: /^ดูทั้งหมดในทะเบียน \(([\d,]+)\)$/ })
    await expect(registerAll).toBeVisible()
    const present = await searchGroups(page)
    expect(present).toEqual(SEARCH_GROUP_ORDER.filter((label) => present.includes(label)))
    expect(present).toContain("ทรัพย์สิน")
    expect(present).toContain("รอบตรวจนับ")
    await expect(searchPanel(page).getByRole("option").first().locator("mark").first()).toHaveText(new RegExp(escapeRegExp(runId), "i"))
    await measure.recordPage("IT staff: search results")

    // "ดูทั้งหมดในทะเบียน (N)" opens the register on the same search, which counts the same N.
    const total = /\(([\d,]+)\)$/.exec((await registerAll.textContent())?.trim() ?? "")?.[1]
    expect(total, "the register total").toBeTruthy()
    await registerAll.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("search") === runId && url.searchParams.get("exact") === "1")
    await expect(page.getByRole("main")).toContainText(`จาก ${total} รายการ`)

    // A result opened is remembered on this device; "ล้าง" forgets it.
    await measure.visit("/th/dashboard", "IT staff: dashboard (open a result)")
    box = await openSearch(page, e2eDevice)
    await box.fill(runId)
    const first = searchPanel(page).getByRole("option").first()
    await expect(first.locator("mark").first()).toBeVisible()
    const title = (await first.locator(".font-medium").first().innerText()).trim()
    expect(title).not.toBe("")
    await first.click()
    await page.waitForURL((url) => url.pathname !== "/th/dashboard")
    await measure.visit("/th/dashboard", "IT staff: dashboard (recent)")
    await openSearch(page, e2eDevice)
    const recent = searchPanel(page).getByRole("group", { name: SHELL_WORDS.recentTitle, exact: true })
    await expect(recent.getByRole("option").filter({ hasText: title }).first()).toBeVisible()
    await recent.getByRole("option", { name: SHELL_WORDS.recentClearLabel, exact: true }).click()
    await expect(recent).toHaveCount(0)
    expect(await page.evaluate(() => window.localStorage.getItem("asset-system:recent-search:v1:th"))).toBeNull()

    // Nothing found: the words searched, and the ways on.
    box = e2eDevice === "desktop" ? globalSearchBox(page) : page.getByRole("dialog", { name: SHELL_WORDS.searchLabel }).getByRole("combobox", { name: SHELL_WORDS.searchLabel, exact: true })
    const missing = `${runId}-ไม่มีจริง`
    await box.fill(missing)
    await expect(page.getByText(fillTemplate(SHELL_WORDS.notFound, { query: missing }), { exact: true })).toBeVisible()
    for (const action of [SHELL_WORDS.actionScan, SHELL_WORDS.actionRegister, SHELL_WORDS.actionCreateAsset]) {
      await expect(searchPanel(page).getByRole("option", { name: action, exact: true })).toBeVisible()
    }

    // "/" typed in a page's own field stays there.
    if (e2eDevice === "desktop") {
      await measure.visit("/th/assets", "IT staff: the register's own search")
      // The register's own field (SearchField, type="text").
      const registerSearch = page.getByRole("main").locator('[data-slot="search-field"] input').first()
      await registerSearch.click()
      await page.keyboard.press("/")
      await expect(registerSearch).toBeFocused()
      await expect(registerSearch).toHaveValue(/\//)
      await expect(globalSearchBox(page)).not.toBeFocused()
    }
  })

  test("the phone's เพิ่มเติม sheet holds the person, the menu, the language and the theme, and gives focus back", async ({ page, measure, e2eDevice, e2eTheme }) => {
    test.skip(e2eDevice !== "phone", "the phone's sheet: the desktop has the menu and the top bar")
    const displayName = displayNameOf("itStaff")
    await measure.visit("/th/dashboard", "IT staff: dashboard (phone)")
    const bar = topBar(page)
    await expect(bar.getByRole("button", { name: /^เปลี่ยนภาษา/ })).toHaveCount(0)
    await expect(bar.getByRole("button", { name: SHELL_WORDS.switchToDark })).toHaveCount(0)
    await expect(bar.getByRole("button", { name: SHELL_WORDS.switchToLight })).toHaveCount(0)
    await expect(bar.getByRole("button", { name: /^เมนูผู้ใช้:/ })).toHaveCount(0)
    await expect(bell(page)).toBeVisible()
    await expect(bar.getByRole("button", { name: SHELL_WORDS.searchLabel, exact: true })).toBeVisible()

    await moreTab(page).click()
    const sheet = moreSheet(page)
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText(displayName)
    await expect(sheet.getByRole("link", { name: SHELL_WORDS.assetRegister, exact: true })).toBeVisible()
    await expect(sheet.getByRole("button", { name: SHELL_WORDS.assetManagement, exact: true })).toBeVisible()
    await measure.recordPage("IT staff: the phone's เพิ่มเติม sheet")

    // The theme: the other theme's button switches the page and the cookie.
    const other = e2eTheme === "light" ? "dark" : "light"
    await sheet
      .getByRole("group", { name: SHELL_WORDS.moreTheme, exact: true })
      .getByRole("button", { name: other === "dark" ? SHELL_WORDS.themeDark : SHELL_WORDS.themeLight, exact: true })
      .click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", other)
    await expect.poll(() => cookieValue(page, "theme")).toBe(other)

    // The X closes it, and focus goes back to the tab that opened it.
    await sheet.getByRole("button", { name: SHELL_WORDS.close, exact: true }).click()
    await expect(sheet).toBeHidden()
    await expect(moreTab(page)).toBeFocused()

    // The language: English, then back to Thai from the same sheet.
    await moreTab(page).click()
    await expect(sheet).toBeVisible()
    await sheet.getByRole("group", { name: SHELL_WORDS.moreLanguage, exact: true }).getByRole("button", { name: "English", exact: true }).click()
    await page.waitForURL((url) => url.pathname === "/en/dashboard")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    const sheetAnyLanguage = page.locator("#mobile-more-sheet")
    await page.locator('[data-mobile-field-navigation] [aria-controls="mobile-more-sheet"]').click()
    await expect(sheetAnyLanguage).toBeVisible()
    await sheetAnyLanguage.getByRole("button", { name: "ภาษาไทย", exact: true }).click()
    await page.waitForURL((url) => url.pathname === "/th/dashboard")

    // A focus page: its menu button opens the same sheet, which signs out.
    await measure.visit("/th/assets/new", "IT staff: a focus page (phone)")
    await page.getByRole("button", { name: SHELL_WORDS.openMenu, exact: true }).click()
    await expect(moreSheet(page)).toBeVisible()
    await moreSheet(page).getByRole("button", { name: SHELL_WORDS.logout, exact: true }).click()
    await page.waitForURL((url) => url.pathname === "/th/login")
  })

  test("the skip link is the first stop and lands on the page's content, under a 56px top bar", async ({ page, measure }) => {
    await measure.visit("/th/dashboard", "IT staff: dashboard (skip link)")
    await page.keyboard.press("Tab")
    await expect(skipLink(page)).toBeFocused()
    await expect(skipLink(page)).toBeInViewport()
    await page.keyboard.press("Enter")
    await expect(page.locator("main#main")).toBeFocused()
    expect(new URL(page.url()).hash).toBe("")
    expect((await topBar(page).boundingBox())?.height).toBe(56)
  })
})
