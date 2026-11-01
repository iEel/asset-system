// Page group 4 plan 1 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §6, §17): the asset
// register as IT staff use it.
// - a person's assets found by typing their name in the register's own search, in all four projects: on the desktop each
//   row shows the full name with the tag under it and the holder with their department; on the phone the card leads
//   with the name and its third line reads "<holder> · <room>"; one of them opens;
// - the สถานะอื่น tab (§6.2), in all four projects: an asset waiting for disposal (รอตัดจำหน่าย, a status with no tab of
//   its own) is listed under it, and the line under the tabs adds the tabs up and names the status;
// - saved views (§6.4), desktop only (saving is desktop only, call 4): "บันทึกมุมมองนี้" with its error first, then the
//   view kept in this browser and opened again from the row.
// Every asset is the test's own, made through the asset API as the run's other specs make theirs. The holder is the IT
// head's employee, whom no other spec gives an asset, so the name search finds only this spec's rows (two a project).
// No master data is changed; the disposal request is IT staff's own, through its route, as the shell's bell test does.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, expectFieldError, readAsset, readAssetMasters, record, visit } from "../transactions/tx-support.ts"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { REGISTER_WORDS } from "./register-words.ts"

asUser("itStaff")

const DESKTOP_ONLY = "saved views are kept and saved on the desktop (group 4 spec §6.4, call 4)"

// A row of the register for one asset: the desktop table's row (found by its box, named by the tag) or the phone's card.
function registerRow(page: Page, device: "desktop" | "phone", assetTag: string): Locator {
  return device === "desktop"
    ? page.locator("[data-asset-desktop-table] tbody tr").filter({ has: page.getByRole("checkbox", { name: assetTag, exact: true }) })
    : page.locator("[data-asset-mobile-row]").filter({ has: page.getByText(assetTag, { exact: true }) })
}

// The register's own search field (not the top bar's): typed, then sent with Enter, as a person does.
async function searchRegister(page: Page, text: string) {
  const field = page.getByRole("main").getByRole("search").getByRole("textbox", { name: REGISTER_WORDS.search, exact: true }).filter({ visible: true }).first()
  await field.fill(text)
  await field.press("Enter")
  await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("search") === text)
}

const statusTab = (page: Page, label: string): Locator =>
  page.locator("[data-asset-status-tabs]").getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}`) })

test("a person's assets: their name typed in the register's search finds both, each row with the full name, the tag and the holder with the department, and one opens (group 4 spec §6.1, §6.7)", async ({ page, measure, e2eDevice }, testInfo) => {
  const { runId } = readRunState()
  const run = runRecords(runId)
  const holder = readRunData().employees.itHead
  const masters = await readAssetMasters(page)
  const assets = [
    await createTxAsset(page, masters, testInfo.project.name, "RF1", "โน้ตบุ๊กทะเบียนค้นหาผู้ถือครอง", { custodianId: holder.id }),
    await createTxAsset(page, masters, testInfo.project.name, "RF2", "จอภาพทะเบียนค้นหาผู้ถือครอง", { custodianId: holder.id }),
  ]

  await visit(measure, "/th/assets", "register, before the search", testInfo)
  await searchRegister(page, holder.fullNameTh)
  await record(measure, "register, a person's name searched", testInfo)

  for (const asset of assets) {
    const row = registerRow(page, e2eDevice, asset.assetTag)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(asset.name)
    if (e2eDevice === "desktop") {
      // One ทรัพย์สิน column: the full name, the tag under it; the holder with the department under the name; the room
      // (group 4 spec §6.1).
      await expect(row.locator(".tag")).toHaveText(asset.assetTag)
      await expect(row).toContainText(holder.fullNameTh)
      await expect(row).toContainText(run.department.name)
      await expect(row).toContainText(run.location.name)
    } else {
      // The card (§6.7): the name is the link, the tag on line 2, then "<holder> · <room>".
      await expect(row.getByRole("link", { name: asset.name, exact: true })).toBeVisible()
      await expect(row.locator(".tag")).toHaveText(asset.assetTag)
      await expect(row.getByText(`${holder.fullNameTh} · ${run.location.name}`, { exact: true })).toBeVisible()
    }
  }
  // The range line above the cards and the table says the count on both devices (§6.7, final review C1); every row the
  // name finds is the IT head's (this spec's two a project, in up to four projects).
  await expect(page.locator("[data-asset-register-summary]")).toContainText(templatePattern(REGISTER_WORDS.range, { from: "1", to: "\\d+", total: "\\d+" }))

  // One opens: the row on the desktop, the name's link on the phone.
  const [first] = assets
  const row = registerRow(page, e2eDevice, first.assetTag)
  if (e2eDevice === "desktop") await row.getByText(first.name, { exact: true }).click()
  else await row.getByRole("link", { name: first.name, exact: true }).click()
  await page.waitForURL((url) => url.pathname === `/th/assets/${first.id}`)
  await expect(page.getByRole("heading", { level: 1, name: first.name })).toBeVisible()
  await record(measure, "the asset opened from a person's search", testInfo)
})

test("the สถานะอื่น tab lists an asset waiting for disposal, and the line under the tabs adds them up and names the status (group 4 spec §6.2)", async ({ page, measure, e2eDevice }, testInfo) => {
  const data = readRunData()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RO1", "โน้ตบุ๊กรอตัดจำหน่ายสถานะอื่น")
  // IT staff ask for its disposal through the request's route (the body the form posts): it waits as รอตัดจำหน่าย.
  const requested = await page.request.post("/api/disposal-requests", {
    data: {
      assetId: asset.id,
      disposalType: "dispose",
      reason: `${asset.assetTag} ทดสอบแท็บสถานะอื่น`,
      requestedById: data.employees.itStaff.id,
      approverId: null,
      saleValue: null,
      salvageValue: null,
      sourceType: null,
      sourceId: null,
    },
  })
  expect(requested.status(), `POST /api/disposal-requests: ${(await requested.text()).slice(0, 300)}`).toBe(201)
  const status = (await readAsset(page, asset.id)).status
  expect(status.name, "a status with no tab of its own").toBe("Pending Disposal")

  // The register searched to this asset: under ทั้งหมด, and สถานะอื่น counts it.
  await visit(measure, `/th/assets?search=${encodeURIComponent(asset.assetTag)}`, "register, the asset waiting for disposal", testInfo)
  await expect(statusTab(page, REGISTER_WORDS.tabAll)).toHaveAttribute("aria-current", "page")
  await expect(statusTab(page, REGISTER_WORDS.tabOther)).toHaveText(new RegExp(`^${escapeRegExp(REGISTER_WORDS.tabOther)}\\s*1$`))
  await expect(registerRow(page, e2eDevice, asset.assetTag)).toHaveCount(1)

  // สถานะอื่น: the tab is current, the asset is listed, and the line reads the five tabs and สถานะอื่น adding up to 1.
  await statusTab(page, REGISTER_WORDS.tabOther).click()
  await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("statusGroup") === "other" && url.searchParams.get("search") === asset.assetTag)
  await record(measure, "register, the สถานะอื่น tab", testInfo)
  await expect(statusTab(page, REGISTER_WORDS.tabOther)).toHaveAttribute("aria-current", "page")
  await expect(registerRow(page, e2eDevice, asset.assetTag)).toHaveCount(1)
  await expect(page.locator("[data-asset-status-sum]")).toBeVisible()
  await expect(page.locator("[data-asset-status-sum]")).toHaveText(
    templatePattern(REGISTER_WORDS.sumLine, { terms: "(?:0 \\+ )*1", total: "1", other: "1", breakdown: escapeRegExp(`${status.nameTh} 1`) }),
  )
  await expect(page.locator("[data-asset-register-summary]")).toContainText(fillTemplate(REGISTER_WORDS.range, { from: 1, to: 1, total: 1 }))
})

test("a saved view: บันทึกมุมมองนี้ asks for a name first, then keeps the view in this browser, and the row opens it again (group 4 spec §6.4)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const { runId } = readRunState()
  const name = `E2E ${runId}`
  // The view: this project's assets of the run under สถานะอื่น (whatever it lists; only the query is kept).
  const search = txAssetTag(runId, testInfo.project.name, "R")
  await visit(measure, `/th/assets?search=${encodeURIComponent(search)}&statusGroup=other`, "register, a view to save", testInfo)
  const views = page.getByRole("navigation", { name: REGISTER_WORDS.savedViews, exact: true })
  await expect(views).toBeVisible()
  await views.getByRole("button", { name: REGISTER_WORDS.saveView, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: REGISTER_WORDS.saveView })
  await expect(dialog).toBeVisible()

  // A wrong entry first: no name. The error shows under the field and the field takes focus; nothing is kept.
  await dialog.getByRole("button", { name: REGISTER_WORDS.save, exact: true }).click()
  await expectFieldError(page, "asset-saved-view-name", REGISTER_WORDS.viewNameRequired)
  await expect(page.locator("#asset-saved-view-name")).toBeFocused()
  await record(measure, "save a view, its error", testInfo)

  await page.locator("#asset-saved-view-name").fill(name)
  await dialog.getByRole("button", { name: REGISTER_WORDS.save, exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const saved = views.getByRole("link", { name, exact: true })
  // The view on screen is the one just saved, so it is current.
  await expect(saved).toHaveAttribute("aria-current", "page")
  const href = new URL((await saved.getAttribute("href")) ?? "", page.url())
  expect([href.pathname, href.searchParams.get("search"), href.searchParams.get("statusGroup"), href.searchParams.get("page")]).toEqual(["/th/assets", search, "other", null])
  await record(measure, "register, a view saved", testInfo)

  // Another view, from a fresh load: the saved one is kept in this browser and no longer current.
  await visit(measure, `/th/assets?search=${encodeURIComponent(search)}`, "register, another view", testInfo)
  await expect(saved).toBeVisible()
  await expect(saved).not.toHaveAttribute("aria-current", "page")
  await saved.click()
  await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("search") === search && url.searchParams.get("statusGroup") === "other")
  await record(measure, "register, the saved view opened again", testInfo)
  await expect(saved).toHaveAttribute("aria-current", "page")
  await expect(statusTab(page, REGISTER_WORDS.tabOther)).toHaveAttribute("aria-current", "page")
})
