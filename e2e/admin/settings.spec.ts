// Page group 12 plan 5 Task 5 (board AD-Settings): the settings page (/th/admin/settings), READ-ONLY. The page needs
// setting:view, which no run role holds (e2e/support/run-plan.ts), so it opens with the seed admin's saved session
// (ADMIN_STATE_FILE), as e2e/admin/integrations.spec.ts does.
// The dev settings hold the LDAP configuration copied from Production, with its bind password: the save and the LDAP
// test and sync are hazards of the suite (e2e/support/hazards.ts, "settings-save" and "ldap"), aborted by the fixtures
// at the context. This spec is the one file of the suite that may open the page (tests/e2e-review.test.ts). It edits
// fields only in the browser and puts them back with ยกเลิกการแก้ไข: it never presses save, test, preview or apply,
// and never presses Enter in a field (Enter submits the form). Every test also watches the requests: any write to an
// /api/ path (the shell's keep-alive aside) fails it.
// Desktop (desktop-light, desktop-dark):
// - The menu's four group headings; the organization tab through the menu; the company name changed, its marker, the
//   footer count and the review row; ยกเลิกการแก้ไข behind its confirm puts it back.
// - The LDAP login tab: the bind password's box (stored or not set, whatever the dev database holds), and no password
//   or stored-secret placeholder anywhere on the page. The LDAP URL changed locks the sync tab's two buttons with
//   "บันทึกค่า LDAP ก่อน"; ยกเลิกการแก้ไข puts it back.
// Phone (phone-light, phone-dark): no sideways scroll; the jump select and the stacked menu switch tabs.
// Writes: none. axe through recordSettled on every state.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { storedSecretPlaceholder } from "../../src/lib/system-setting-secrets.ts"
import { SETTINGS_WORDS as W } from "./settings-words.ts"

const SETTINGS = "/th/admin/settings"
const DESKTOP_ONLY = "the desktop tests read the lg menu; the phone test reads the jump select and the stacked menu"
const PHONE_ONLY = "the jump select and the stacked menu are below lg; the desktop tests read the sidebar"
const GROUPS = [W.groupAssetsDocuments, W.groupOrganizationWork, W.groupSignIn, W.groupOther]

const SESSION_KEEP_ALIVE = "/api/session/keep-alive"

// Every request that could write: anything but a GET or a HEAD to an /api/ path (the settings save and the LDAP routes
// among them). The spec expects none.
function watchWrites(page: Page) {
  const writes: string[] = []
  page.on("request", (request) => {
    const method = request.method().toUpperCase()
    const path = new URL(request.url()).pathname
    // The shell's session keep-alive (POST /api/session/keep-alive) is app-wide, not a page write (E2E-1109C).
    if (path === SESSION_KEEP_ALIVE) return
    if (method !== "GET" && method !== "HEAD" && path.startsWith("/api/")) writes.push(`${method} ${path}`)
  })
  return writes
}

const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

const menu = (page: Page) => page.locator('[data-slot="settings-menu"]')
// A tab's link in the visible copy of the menu (its name starts with the tab's label; the summary and badge follow).
const menuLink = (page: Page, label: string) =>
  menu(page).getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}`) }).filter({ visible: true })
const panelHeading = (page: Page, title: string) => page.locator("#settings-workspace").getByRole("heading", { level: 2, name: title, exact: true })
const footerStatus = (page: Page) => page.locator("#settings-save-status")
// The field's changed frame (FormChangedField) around the input with this id.
const changedFrame = (page: Page, inputId: string) => page.locator('[data-slot="asset-changed-field"]').filter({ has: page.locator(`[id="${inputId}"]`) })
const footerDiscard = (page: Page) => page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.discardChanges, exact: true })
// The fields by their ids (system-settings-form.tsx SETTING_FIELD_IDS) and the jump select's.
const field = (page: Page, id: string) => page.locator(`[id="${id}"]`)

// ยกเลิกการแก้ไข, then the confirm's own ยกเลิกการแก้ไข. Nothing is sent: the edits only leave the browser's state.
async function discardAll(page: Page, count: number) {
  await footerDiscard(page).click()
  const confirm = page.getByRole("alertdialog", { name: fillTemplate(W.discardConfirmTitle, { count }), exact: true })
  await expect(confirm).toBeVisible()
  await confirm.getByRole("button", { name: W.discardChanges, exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(footerStatus(page)).toHaveText(W.footerNoChanges)
}

// No password value anywhere: the visible text and every input's value hold neither the stored-secret placeholder nor
// any typed password, and every password input is empty.
async function expectNoSecretInPage(page: Page) {
  const found = await page.evaluate((placeholder) => {
    const inputs = [...document.querySelectorAll("input, textarea")] as (HTMLInputElement | HTMLTextAreaElement)[]
    return {
      inText: document.body.innerText.includes(placeholder),
      inValues: inputs.filter((input) => input.value.includes(placeholder)).map((input) => input.id || input.name),
      passwords: inputs.filter((input) => input instanceof HTMLInputElement && input.type === "password" && input.value !== "").map((input) => input.id || input.name),
    }
  }, storedSecretPlaceholder)
  expect(found.inText, "the stored-secret placeholder is not on the page").toBe(false)
  expect(found.inValues, "no input holds the stored-secret placeholder").toEqual([])
  expect(found.passwords, "no password input holds a value").toEqual([])
}

// The page as a person opens it: navigate, wait for its heading and the footer's status, and run axe once it has settled.
async function open(page: Page, measure: Measure, url: string, label: string) {
  await page.goto(url, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
  await expect(footerStatus(page)).toHaveText(W.footerNoChanges)
  await recordSettled(page, measure, label)
}

async function openTabByMenu(page: Page, label: string, heading: string): Promise<Locator> {
  const link = menuLink(page, label)
  await link.click()
  await expect(link).toHaveAttribute("aria-current", "page")
  await expect(panelHeading(page, heading)).toBeVisible()
  return link
}

test.describe("the settings page, read-only, as the seed admin (group 12 plan 5)", () => {
  // The seed admin's saved session (written by the global setup): no run role holds setting:view.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("the menu, a changed field and reset", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const writes = watchWrites(page)
    await open(page, measure, SETTINGS, "settings, first tab")

    // The four group headings of the menu.
    for (const group of GROUPS) await expect(menu(page).getByRole("heading", { level: 2, name: group, exact: true }).filter({ visible: true })).toHaveCount(1)

    // The organization tab through the menu.
    await openTabByMenu(page, W.tabOrganization, W.organizationDefaults)
    const companyName = field(page, "company-name")
    await expect(companyName).toBeVisible()
    const saved = await companyName.inputValue()
    const edited = `${saved.trim() || "E2E"} (แก้ในเบราว์เซอร์)`

    // Changed: the marker with the saved value, the footer's count, and the review row with the Thai name.
    await companyName.fill(edited)
    const frame = changedFrame(page, "company-name")
    await expect(frame).toHaveAttribute("data-changed", "")
    await expect(frame).toContainText(W.fieldChanged)
    await expect(frame).toContainText(fillTemplate(W.fieldWas, { value: saved.trim() || W.noValue }))
    await expect(footerStatus(page)).toHaveText(fillTemplate(W.footerUnsaved, { count: 1 }))
    const review = page.getByRole("table", { name: W.changeReview })
    await expect(review.getByRole("columnheader", { name: W.reviewSetting, exact: true })).toBeVisible()
    await expect(review).toBeVisible()
    const row = review.locator("tbody tr").filter({ hasText: "company_name" })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(W.companyName)
    await expect(row).toContainText(edited)
    await recordSettled(page, measure, "settings, company name changed")

    // ยกเลิกการแก้ไข behind its confirm: the field is back, the footer says no change, the review is gone.
    await discardAll(page, 1)
    await expect(companyName).toHaveValue(saved)
    await expect(frame).not.toHaveAttribute("data-changed")
    await expect(review).toHaveCount(0)

    expect(writes, "the page writes nothing").toEqual([])
  })

  test("the bind password is shown as saved and the sync lock appears", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const writes = watchWrites(page)
    await open(page, measure, `${SETTINGS}?tab=ldap-login`, "settings, LDAP login")
    await expect(panelHeading(page, W.ldapSettings)).toBeVisible()

    // The bind password's box: stored or not set, as the dev database holds it; never a value.
    await expect(page.locator('[id="ldap-bind-password-state"]')).toHaveText(new RegExp(`^(?:${escapeRegExp(W.bindStored)}|${escapeRegExp(W.bindNotSet)})$`))
    await expectNoSecretInPage(page)

    // The LDAP URL changed in the browser only.
    const ldapUrl = field(page, "ldap-url")
    const saved = await ldapUrl.inputValue()
    await ldapUrl.fill("ldap://e2e-browser-only.invalid:389")
    await expect(changedFrame(page, "ldap-url")).toHaveAttribute("data-changed", "")
    await expect(footerStatus(page)).toHaveText(fillTemplate(W.footerUnsaved, { count: 1 }))
    await expect(page.getByRole("table", { name: W.changeReview }).locator("tbody tr").filter({ hasText: "ldap_url" })).toContainText(W.ldapUrl)

    // The sync tab (through the menu, so the edit stays): both buttons wait with the lock note. They are read, not pressed.
    await openTabByMenu(page, W.tabLdapSync, W.ldapSyncStrategy)
    await expect(page.getByText(W.syncLocked, { exact: true })).toBeVisible()
    for (const name of [W.syncPreviewButton, W.syncApplyButton]) {
      const button = page.getByRole("button", { name, exact: true })
      await expect(button).toHaveAttribute("aria-disabled", "true")
      // The note it points to is the lock note.
      const noteId = await button.getAttribute("aria-describedby")
      expect(noteId, "the button names the note that says why").toBeTruthy()
      await expect(page.locator(`[id="${noteId}"]`)).toHaveText(W.syncLocked)
    }
    await recordSettled(page, measure, "settings, LDAP sync locked")
    await expectNoSecretInPage(page)

    // ยกเลิกการแก้ไข: the lock goes, and the URL is back on the login tab.
    await discardAll(page, 1)
    await expect(page.getByText(W.syncLocked, { exact: true })).toHaveCount(0)
    await openTabByMenu(page, W.tabLdapLogin, W.ldapSettings)
    await expect(field(page, "ldap-url")).toHaveValue(saved)
    await expectNoSecretInPage(page)

    expect(writes, "the page writes nothing").toEqual([])
  })

  test("the settings page fits the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const writes = watchWrites(page)
    await open(page, measure, SETTINGS, "settings (phone)")
    expect(await fits(page), "the page does not scroll sideways").toBe(true)

    // The jump select switches to the organization tab.
    const jump = page.getByRole("combobox", { name: W.menuJump, exact: true })
    await expect(jump).toHaveAttribute("id", "settings-menu-jump")
    await jump.selectOption("organization")
    await expect(panelHeading(page, W.organizationDefaults)).toBeVisible()
    expect(await fits(page), "the organization tab does not scroll sideways").toBe(true)

    // The stacked menu in its disclosure: the four headings, and a tab's link switches in place.
    const disclosure = menu(page).locator("details")
    await disclosure.locator("summary", { hasText: W.menuShowAll }).click()
    await expect(disclosure).toHaveAttribute("open", "")
    for (const group of GROUPS) await expect(disclosure.getByRole("heading", { level: 2, name: group, exact: true })).toBeVisible()
    await recordSettled(page, measure, "settings, stacked menu (phone)")
    await openTabByMenu(page, W.tabLdapLogin, W.ldapSettings)
    await expect(jump).toHaveValue("ldap-login")
    await expectNoSecretInPage(page)
    expect(await fits(page), "the LDAP tab does not scroll sideways").toBe(true)
    await expect(footerStatus(page)).toHaveText(W.footerNoChanges)

    expect(writes, "the page writes nothing").toEqual([])
  })
})
