// Page group 12 plan 3 Task 5 (spec docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §7, §8, boards
// AD-DataQuality and AD-Storage): the data-quality page (/th/admin/data-quality) and the storage page
// (/th/admin/storage). Both need setting:view, which no run role holds (e2e/support/run-plan.ts), so they open with the
// seed admin's saved session (ADMIN_STATE_FILE), as e2e/admin/logs.spec.ts does.
// The dev database is a copy of Production: no count is asserted, only what the page shows of whatever it finds.
// Desktop (desktop-light, desktop-dark):
// - Data quality: the rules tab holds the six rule cards and the distribution bar (or its empty line). One switch is
//   flipped: the save bar names the change and the card's count row follows; ยกเลิก puts the switch back and the bar
//   reads ยังไม่มีการเปลี่ยนแปลง. The review tab (tab=review) shows the review workspace.
// - Storage: the three chips set filter= in the URL; the first row's arrow opens its path in the upload folder; an orphan
//   row's archive button opens its confirm dialog, which is cancelled.
// Phone (phone-light, phone-dark): neither page scrolls sideways; the tabs and the chips can be reached.
// Writes: none. บันทึกกฎ, สแกนรายการใหม่, resolve, dismiss and the archive confirm are never pressed; every request that is
// not a GET or a HEAD to an /api/ path fails the test (and the fixtures abort the settings save and the stored-files API
// before they leave the browser). axe through recordSettled on every page.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { DATA_QUALITY_WORDS as W, STORAGE_WORDS as S } from "./data-quality-storage-words.ts"

const DATA_QUALITY = "/th/admin/data-quality"
const STORAGE = "/th/admin/storage"
const DESKTOP_ONLY = "the desktop tests read the cards, the save bar and the rows; the phone test checks the fit"
const PHONE_ONLY = "the fit is the phone's; the desktop tests read the pages"

// A link or chip named by its word and then its count ("ข้อมูลไม่ครบ 12", "ไฟล์หาย 3").
const counted = (word: string) => new RegExp(`^${escapeRegExp(word)}\\s*[\\d,]+$`)

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, title: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
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

async function reachable(link: Locator) {
  await link.scrollIntoViewIfNeeded()
  await expect(link).toBeInViewport()
}

// The file check's chips; each sets filter= (ทั้งหมด drops it) and becomes the current chip.
const chipsOf = (page: Page) => page.getByRole("navigation", { name: S.filterLabel, exact: true })

async function chooseChip(page: Page, word: string, filter: string | null) {
  const chip = chipsOf(page).getByRole("link", { name: counted(word) })
  await chip.click()
  await page.waitForURL((url) => url.pathname === STORAGE && url.searchParams.get("filter") === filter)
  await expect(chipsOf(page).getByRole("link", { name: counted(word) })).toHaveAttribute("aria-current", "page")
}

// The file check's rows (one <li> per finding, data-storage-row is missing or orphan).
const storageRows = (page: Page, kind?: "missing" | "orphan") =>
  page.getByRole("main").locator(kind ? `li[data-storage-row="${kind}"]` : "li[data-storage-row]").filter({ visible: true })

// A row's arrow opens the detail it controls; returns the path the detail shows.
async function expandRow(page: Page, row: Locator): Promise<string> {
  const arrow = row.locator("button[aria-expanded]")
  await expect(arrow).toHaveAttribute("aria-expanded", "false")
  await expect(arrow).toHaveAttribute("aria-label", new RegExp(`^${escapeRegExp(S.showDetails.replace("{file}", ""))}`))
  const detailId = await arrow.getAttribute("aria-controls")
  if (!detailId) throw new Error("the row's arrow controls no detail")
  const detail = page.locator(`[id="${detailId}"]`)
  await expect(detail).toBeHidden()
  await arrow.click()
  await expect(arrow).toHaveAttribute("aria-expanded", "true")
  await expect(detail).toBeVisible()
  await expect(detail.getByText(S.pathInUploads, { exact: true })).toBeVisible()
  await expect(detail.getByRole("button", { name: S.copyPath, exact: true })).toBeVisible()
  const path = ((await detail.locator(".tag").first().textContent()) ?? "").trim()
  expect(path, "the detail shows the file's path").not.toBe("")
  return path
}

test.describe("data quality and storage as the seed admin (group 12 plan 3)", () => {
  // The seed admin's saved session (written by the global setup): no run role holds setting:view.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("data quality tabs and rule cards", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const writes = watchWrites(page)
    await open(page, measure, DATA_QUALITY, W.title, "data quality")
    const main = page.getByRole("main")
    const tabs = page.getByRole("navigation", { name: W.tabsLabel, exact: true })
    await expect(tabs.getByRole("link", { name: counted(W.tabRules) })).toHaveAttribute("aria-current", "page")

    // The rules tab: the distribution panel (the bar and its legend, or the empty line) and the six rule cards.
    await expect(main.getByRole("heading", { level: 2, name: W.distributionTitle, exact: true })).toBeVisible()
    const bar = main.locator('[data-slot="distribution-bar"]')
    if ((await bar.count()) > 0) await expect(bar).toBeVisible()
    else await expect(main.getByText(W.noIssues, { exact: true })).toBeVisible()
    for (const rule of W.rules) await expect(main.getByRole("article", { name: rule, exact: true })).toBeVisible()

    // The save bar starts with nothing to save; its ยกเลิก is disabled and บันทึกกฎ is there (never pressed).
    const saveBar = main.locator('[data-slot="sticky-form-footer"]')
    const summary = saveBar.locator('p[aria-live="polite"]')
    const cancel = saveBar.getByRole("button", { name: W.cancel, exact: true })
    await expect(summary).toHaveText(W.noChanges)
    await expect(cancel).toBeDisabled()
    await expect(saveBar.getByRole("button", { name: W.saveRules, exact: true })).toBeVisible()

    // The enabled rules before the change, then the first rule's switch flipped.
    const switches = W.rules.map((rule) => main.getByRole("switch", { name: rule, exact: true }))
    let enabledBefore = 0
    for (const control of switches) if (await control.isChecked()) enabledBefore += 1
    const [rule] = W.rules
    const control = switches[0]
    const card = main.getByRole("article", { name: rule, exact: true })
    const wasOn = await control.isChecked()
    await expect(control).toBeEnabled()
    await control.click()
    await expect(control).toBeChecked({ checked: !wasOn })

    // The bar names the change ("เปิด → ปิด <rule> · กฎที่เปิด 4 → 3"); the card's count row follows the draft.
    const enabledAfter = enabledBefore + (wasOn ? -1 : 1)
    const expected = [
      fillTemplate(wasOn ? W.changeTurnedOff : W.changeTurnedOn, { rules: rule }),
      fillTemplate(W.changeEnabled, { before: String(enabledBefore), after: String(enabledAfter) }),
    ].join(" · ")
    await expect(summary).toHaveText(expected)
    await expect(card.getByText(wasOn ? W.inactive : W.countAfterSave, { exact: true })).toBeVisible()
    await expect(cancel).toBeEnabled()
    await recordSettled(page, measure, "data quality, one rule changed")

    // ยกเลิก puts the switch back and the bar has nothing to save again.
    await cancel.click()
    await expect(control).toBeChecked({ checked: wasOn })
    await expect(summary).toHaveText(W.noChanges)
    await expect(cancel).toBeDisabled()

    // The review tab: tab=review in the URL, the review workspace (its scan button is never pressed).
    await tabs.getByRole("link", { name: counted(W.tabReview) }).click()
    await page.waitForURL((url) => url.pathname === DATA_QUALITY && url.searchParams.get("tab") === "review")
    await expect(tabs.getByRole("link", { name: counted(W.tabReview) })).toHaveAttribute("aria-current", "page")
    await expect(main.getByRole("heading", { level: 2, name: W.reviewTitle, exact: true })).toBeVisible()
    await expect(main.getByRole("article", { name: W.rules[0], exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "data quality, review tab")

    expect(writes, "the page writes nothing").toEqual([])
  })

  test("storage chips, expand and archive confirm cancelled", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const writes = watchWrites(page)
    await open(page, measure, STORAGE, S.title, "storage")
    const main = page.getByRole("main")
    await expect(chipsOf(page).getByRole("link", { name: counted(S.filterAll) })).toHaveAttribute("aria-current", "page")

    // The chips set filter= in the URL; ทั้งหมด drops it.
    await chooseChip(page, S.filterMissing, "missing")
    await expect(storageRows(page, "orphan")).toHaveCount(0)
    await recordSettled(page, measure, "storage, missing files")
    await chooseChip(page, S.filterOrphan, "orphan")
    await expect(storageRows(page, "missing")).toHaveCount(0)
    await recordSettled(page, measure, "storage, orphan files")
    await chooseChip(page, S.filterAll, null)

    // The first row's arrow opens its path in the upload folder (or the check found nothing).
    const rows = storageRows(page)
    if ((await rows.count()) === 0) {
      await expect(main.getByText(S.emptyDryRunActions, { exact: true })).toBeVisible()
    } else {
      await expandRow(page, rows.first())
      await recordSettled(page, measure, "storage, a row opened")
    }

    // An orphan row's archive button opens the confirm dialog named by its path; ยกเลิก closes it and the row stays.
    await chooseChip(page, S.filterOrphan, "orphan")
    const orphans = storageRows(page, "orphan")
    if ((await orphans.count()) === 0) {
      await expect(main.getByText(S.emptyFiltered, { exact: true })).toBeVisible()
    } else {
      const orphan = orphans.first()
      const path = await expandRow(page, orphan)
      await orphan.getByRole("button", { name: S.archiveOrphanFile, exact: true }).click()
      const confirm = page.getByRole("alertdialog", { name: fillTemplate(S.archiveConfirm, { file: path }), exact: true })
      await expect(confirm).toBeVisible()
      await recordSettled(page, measure, "storage, archive confirm")
      // Never the confirm button: only ยกเลิก.
      await confirm.getByRole("button", { name: S.cancel, exact: true }).click()
      await expect(confirm).toBeHidden()
      await expect(orphan).toBeVisible()
    }

    expect(writes, "the page writes nothing").toEqual([])
  })

  test("both pages fit the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const writes = watchWrites(page)

    await open(page, measure, DATA_QUALITY, W.title, "data quality (phone)")
    expect(await fits(page), "the data quality page does not scroll sideways").toBe(true)
    const tabs = page.getByRole("navigation", { name: W.tabsLabel, exact: true })
    await reachable(tabs.getByRole("link", { name: counted(W.tabRules) }))
    await reachable(tabs.getByRole("link", { name: counted(W.tabReview) }))

    await open(page, measure, STORAGE, S.title, "storage (phone)")
    expect(await fits(page), "the storage page does not scroll sideways").toBe(true)
    for (const word of [S.filterAll, S.filterMissing, S.filterOrphan]) await reachable(chipsOf(page).getByRole("link", { name: counted(word) }))

    expect(writes, "the pages write nothing").toEqual([])
  })
})
