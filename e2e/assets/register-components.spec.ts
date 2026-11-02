// Page group 4 plan 4 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §12, §17; plan
// docs/superpowers/plans/2026-11-02-group4-components-scan.md Task 6): the components page as IT staff use it, in all
// four projects. A computer and a ส่วนควบ of the test's own (the asset API); the header with its install button; the
// install panel opened from it, the component found and picked (name first, ยังไม่ได้ติดตั้ง, P4-R5), a role chosen from
// the select (P4-R4), the review and the save; the table's current row; its ⋯ (the menu on the desktop, the sheet on
// the phone, P4-R3) and ถอดส่วนควบ, whose dialog reads ตอนนี้ | หลังยืนยัน; a real removal through POST …/remove (P4-R1:
// it marks the link removed with its reason and photo, nothing is deleted); the past row with its date, who removed it
// and the reason; and the candidate's line that says it was installed here before (P4-R5). No master data is changed.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { menuItem, type Locator, type Page } from "../asset-detail/detail-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate, thaiDay } from "../transactions/tx-plan.ts"
import { createTxAsset, PHOTO_FIXTURE, readAssetMasters, record, visit } from "../transactions/tx-support.ts"
import { COMPONENT_WORDS } from "./register-words.ts"

asUser("itStaff")

const CANDIDATES_PATH = "/api/assets/component-candidates"

// The install panel's search: emptied first, so the same text typed again asks the server again, then typed with the
// answer to exactly that text awaited.
async function searchCandidates(page: Page, text: string): Promise<Locator> {
  const panel = page.locator("#component-install")
  const field = panel.locator("#component-install-search")
  await field.fill("")
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === CANDIDATES_PATH && url.searchParams.get("search") === text
  })
  await field.fill(text)
  expect((await answered).status(), `${CANDIDATES_PATH} search=${text}`).toBe(200)
  return panel
}

// A candidate row of the panel (a pressed-state button) and its lines: the name, "<tag> · ยังไม่ได้ติดตั้ง", and the
// last removal from this parent when there was one.
const candidateRow = (panel: Locator, assetTag: string): Locator => panel.getByRole("button").filter({ hasText: assetTag })
const candidateLines = (row: Locator): Locator => row.locator("span.block")

// The one table of links (ประวัติส่วนควบ): the desktop table's row or the phone's row, by the component's tag.
function historyPanel(page: Page): Locator {
  return page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { level: 2, name: COMPONENT_WORDS.history, exact: true }) })
}
function linkRow(page: Page, device: "desktop" | "phone", assetTag: string): Locator {
  return historyPanel(page).locator(device === "desktop" ? "tbody tr" : "li").filter({ hasText: assetTag })
}
const rowMenuTrigger = (page: Page, assetTag: string): Locator =>
  page.getByRole("button", { name: fillTemplate(COMPONENT_WORDS.moreActionsFor, { code: assetTag }), exact: true }).filter({ visible: true })

test("a component installed from the header's button, then removed from its row's ⋯ through the before/after dialog, and offered again as installed here before (group 4 spec §12, P4-R1, P4-R3..R5)", async ({ page, measure, e2eDevice }, testInfo) => {
  const { location: runRoom } = runRecords(readRunState().runId)
  const itStaff = readRunData().employees.itStaff
  const masters = await readAssetMasters(page)
  const parent = await createTxAsset(page, masters, testInfo.project.name, "CM1", "โน้ตบุ๊กติดตั้งส่วนควบ")
  const component = await createTxAsset(page, masters, testInfo.project.name, "CM2", "อะแดปเตอร์ติดตั้งแล้วถอด", { ownershipType: "component" })
  const main = page.getByRole("main")

  // The header: the parent's name and tag, no holder, its room; the install button, the panel closed on arrival.
  await visit(measure, `/th/assets/${parent.id}/components`, "components, on arrival", testInfo)
  await expect(page.getByRole("heading", { level: 1, name: COMPONENT_WORDS.title })).toBeVisible()
  for (const text of [parent.name, parent.assetTag, COMPONENT_WORDS.noCustodian, runRoom.name]) await expect(main).toContainText(text)
  const install = main.getByRole("button", { name: COMPONENT_WORDS.installAction, exact: true })
  await expect(install).toHaveAttribute("aria-expanded", "false")
  await expect(page.locator("#component-install")).toHaveCount(0)
  await expect(historyPanel(page)).toContainText(fillTemplate(COMPONENT_WORDS.historyCount, { total: 0, installed: 0, removed: 0 }))

  // ติดตั้งส่วนควบ opens the panel at its first step with the search focused.
  await install.click()
  await expect(install).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("heading", { level: 2, name: fillTemplate(COMPONENT_WORDS.installPanelStep, { step: 1, total: 3 }) })).toBeVisible()
  await expect(page.locator("#component-install-search")).toBeFocused()
  await record(measure, "components, the install panel open", testInfo)

  // The component found by its tag: name first, then "<tag> · ยังไม่ได้ติดตั้ง", no line about this parent.
  let panel = await searchCandidates(page, component.assetTag)
  let candidate = candidateRow(panel, component.assetTag)
  await expect(candidate).toHaveCount(1)
  await expect(candidateLines(candidate)).toHaveText([component.name, `${component.assetTag} · ${COMPONENT_WORDS.notInstalled}`])
  await record(measure, "components, a candidate found", testInfo)

  // Picked; the role from the select's Thai labels (P4-R4) and a slot; the review; the save.
  await candidate.click()
  await page.locator("#component-install-role").selectOption({ label: COMPONENT_WORDS.roleAdapter })
  await page.locator("#component-install-slot").fill("1")
  await expect(panel).toContainText(fillTemplate(COMPONENT_WORDS.installPanelStep, { step: 2, total: 3 }))
  await panel.getByRole("button", { name: COMPONENT_WORDS.continueReview, exact: true }).click()
  await expect(panel).toContainText(COMPONENT_WORDS.roleAdapter)
  await record(measure, "components, the install review", testInfo)
  const installed = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/assets/${parent.id}/components`)
  await panel.getByRole("button", { name: COMPONENT_WORDS.confirmInstall, exact: true }).click()
  expect((await installed).status(), "the install").toBe(201)
  await expect(panel).toContainText(COMPONENT_WORDS.installSuccess)

  // The table's current row: the name, the Thai role with the slot, ติดตั้งอยู่, who installed it; the count line.
  const row = linkRow(page, e2eDevice, component.assetTag)
  await expect(row).toHaveCount(1)
  for (const text of [component.name, `${COMPONENT_WORDS.roleAdapter} · 1`, COMPONENT_WORDS.stillInstalled, itStaff.fullNameTh]) await expect(row).toContainText(text)
  await expect(historyPanel(page)).toContainText(fillTemplate(COMPONENT_WORDS.historyCount, { total: 1, installed: 1, removed: 0 }))
  await record(measure, "components, one installed", testInfo)

  // Its ⋯: the dropdown on the desktop, the bottom sheet on the phone, with เปิดหน้าทรัพย์สิน and ถอดส่วนควบ.
  await expect(rowMenuTrigger(page, component.assetTag)).toHaveCount(1)
  await rowMenuTrigger(page, component.assetTag).click()
  const menu = e2eDevice === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  await expect(menuItem(menu, COMPONENT_WORDS.openAsset)).toBeVisible()
  await record(measure, "components, a row's actions open", testInfo)
  await menuItem(menu, COMPONENT_WORDS.remove).click()

  // The dialog: ตอนนี้ | หลังยืนยัน, the status ติดตั้งกับทรัพย์สินหลัก → ถอดแล้ว and the count 1 → 0 รายการ.
  const dialog = page.getByRole("dialog", { name: COMPONENT_WORDS.removeTitle })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(component.assetTag)
  await expect(dialog.getByRole("columnheader", { name: COMPONENT_WORDS.removeNow, exact: true })).toBeVisible()
  await expect(dialog.getByRole("columnheader", { name: COMPONENT_WORDS.removeAfter, exact: true })).toBeVisible()
  await expect(dialog.getByRole("row").filter({ hasText: COMPONENT_WORDS.status }).getByRole("cell"))
    .toHaveText([COMPONENT_WORDS.status, COMPONENT_WORDS.installedState, COMPONENT_WORDS.removedState])
  await expect(dialog.getByRole("row").filter({ hasText: COMPONENT_WORDS.countHere }).getByRole("cell"))
    .toHaveText([COMPONENT_WORDS.countHere, fillTemplate(COMPONENT_WORDS.countValue, { count: 1 }), fillTemplate(COMPONENT_WORDS.countValue, { count: 0 })])
  await record(measure, "components, the removal dialog", testInfo)

  // A reason and a photo, then ยืนยันถอดส่วนควบ: the POST …/remove answers ok (P4-R1).
  const reason = `${component.assetTag} ถอดเพื่อทดสอบ`
  await dialog.locator("#component-remove-reason").fill(reason)
  await dialog.locator("input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(dialog.getByText(COMPONENT_WORDS.evidenceChosen)).toBeVisible()
  const removed = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === "POST" && url.pathname.startsWith(`/api/assets/${parent.id}/components/`) && url.pathname.endsWith("/remove")
  })
  await dialog.getByRole("button", { name: COMPONENT_WORDS.confirmRemove, exact: true }).click()
  expect((await removed).status(), "the removal").toBe(200)
  const removedOn = thaiDay(bangkokDate())
  await expect(dialog).toBeHidden()

  // The row is a past one now: the removal's date, who removed it, the reason and the photo; no ⋯; the count line.
  await expect(row).toHaveCount(1)
  for (const text of [removedOn, itStaff.fullNameTh, reason, fillTemplate(COMPONENT_WORDS.photoCount, { count: 1 })]) await expect(row).toContainText(text)
  await expect(row).not.toContainText(COMPONENT_WORDS.stillInstalled)
  await expect(rowMenuTrigger(page, component.assetTag)).toHaveCount(0)
  await expect(historyPanel(page)).toContainText(fillTemplate(COMPONENT_WORDS.historyCount, { total: 1, installed: 0, removed: 1 }))
  await record(measure, "components, one removed", testInfo)

  // ติดตั้งส่วนควบ again and the same search: the candidate says it was installed here and when it was removed (P4-R5).
  await install.click()
  await expect(page.locator("#component-install")).toBeVisible()
  panel = await searchCandidates(page, component.assetTag)
  candidate = candidateRow(panel, component.assetTag)
  await expect(candidate).toHaveCount(1)
  await expect(candidateLines(candidate)).toHaveText([
    component.name,
    `${component.assetTag} · ${COMPONENT_WORDS.notInstalled}`,
    fillTemplate(COMPONENT_WORDS.removedHere, { date: removedOn }),
  ])
  await record(measure, "components, a candidate installed here before", testInfo)
})
