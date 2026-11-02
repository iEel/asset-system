// Page group 4 plan 4 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §14, §17; plan
// docs/superpowers/plans/2026-11-02-group4-components-scan.md Task 6): the scan page typed into, as IT staff use it in
// the field while the QR labels are not all stuck on, in all four projects. A computer of the test's own with a
// run-unique Serial, a ส่วนควบ installed in it and handed over to a receiver (the asset, checkout and component APIs);
// part of the Serial typed finds one card that says it matched the Serial, with its facts, its components and the
// actions it can take now (P4-R7); the card opens the asset, the asset page goes back to the scan, "เปิดล่าสุด" lists it
// and "ล้างรายการ" empties the list; Enter on the full tag opens the asset at once (P4-R2). No master data is changed.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { projectCode } from "../transactions/tx-plan.ts"
import { createTxAsset, handoverByApi, installComponentByApi, readAsset, readAssetMasters, record, visit } from "../transactions/tx-support.ts"
import { SCAN_WORDS } from "./register-words.ts"

asUser("itStaff")

const SCAN_PATH = "/th/asset-management/scan"
const SCAN_SEARCH_PATH = "/api/assets/scan-search"

// The scan field typed into, with the answer to exactly that text awaited.
async function typeScan(page: Page, text: string) {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === SCAN_SEARCH_PATH && url.searchParams.get("q") === text
  })
  await page.locator("#asset-scan-query").fill(text)
  expect((await answered).status(), `${SCAN_SEARCH_PATH} q=${text}`).toBe(200)
}

// The cards under the heading "พบ n รายการ …" (each card is a panel of its own).
const resultCards = (page: Page): Locator => page.locator('section[aria-labelledby="asset-scan-results-title"]').locator("section")

// The asset page opened from the scan: its path, and the scan as the way back (the detail page compares it exactly).
const openedFromScan = (assetId: string) => (url: URL) => url.pathname === `/th/assets/${assetId}` && url.searchParams.get("returnTo") === SCAN_PATH

test("part of a Serial typed finds one card that matched the Serial, with its facts, its components and the actions it can take; it opens, the recent list keeps it until cleared, and Enter on the full tag opens the asset (group 4 spec §14, P4-R2, P4-R7)", async ({ page, measure }, testInfo) => {
  const { runId } = readRunState()
  const { location: runRoom } = runRecords(runId)
  const holder = readRunData().employees.receiver2
  const masters = await readAssetMasters(page)
  // A Serial no other asset holds, in this run and this project: the typed part is found in it and nowhere else (the
  // tags end in -SC1/-SC2, the names hold spaces).
  const typed = `${runId}-${projectCode(testInfo.project.name)}-SCAN`
  const serial = `SN-${typed}`
  const asset = await createTxAsset(page, masters, testInfo.project.name, "SC1", "โน้ตบุ๊กสแกนค้นหา", { serialNumber: serial })
  const component = await createTxAsset(page, masters, testInfo.project.name, "SC2", "อะแดปเตอร์สแกนค้นหา", { ownershipType: "component" })
  await installComponentByApi(page, asset.id, component.id, "Adapter", "1")
  const handover = await handoverByApi(page, asset.id, holder.id, masters.goodConditionId)
  const held = await readAsset(page, asset.id)
  // A บุคคล asset takes its holder's department at the handover (group 4 plan 2, P2-R9): the card names the holder's.
  const holderLine = held.department ? `${holder.fullNameTh} · ${held.department.name}` : holder.fullNameTh

  await visit(measure, SCAN_PATH, "scan, on arrival", testInfo)
  await expect(page.getByRole("heading", { level: 1, name: SCAN_WORDS.title })).toBeVisible()

  // Part of the Serial: one card, the heading says which field matched, the typed part is marked in the Serial.
  await typeScan(page, typed)
  await expect(page.getByRole("heading", { level: 2, name: fillTemplate(SCAN_WORDS.foundMatch, { count: 1, field: SCAN_WORDS.matchSerial }), exact: true })).toBeVisible()
  const cards = resultCards(page)
  await expect(cards).toHaveCount(1)
  const card = cards.first()
  await expect(card.getByRole("heading", { level: 3, name: asset.name, exact: true })).toBeVisible()
  await expect(card.locator("mark")).toHaveText([typed])
  for (const text of [asset.assetTag, serial, held.status.nameTh, holderLine, runRoom.name]) await expect(card).toContainText(text)
  await expect(card).toContainText(templatePattern(SCAN_WORDS.condition, { condition: "\\S+" }))
  await expect(card).toContainText(fillTemplate(SCAN_WORDS.componentsValue, { count: 1, names: component.name }))

  // The actions it can take now (P4-R7): รับคืน of this handover, บันทึกซ่อม, พิมพ์ป้าย; ส่งมอบ and โอนย้าย cannot run
  // while the handover is open, so the card leaves them out. Each comes back to the scan.
  const actions = card.getByRole("group", { name: SCAN_WORDS.nextActions })
  await expect(actions.getByRole("link")).toHaveText([SCAN_WORDS.checkin, SCAN_WORDS.recordRepair, SCAN_WORDS.printLabel])
  const href = async (name: string) => new URL((await actions.getByRole("link", { name, exact: true }).getAttribute("href")) ?? "", "http://scan.test")
  const checkin = await href(SCAN_WORDS.checkin)
  expect([checkin.pathname, checkin.searchParams.get("checkoutId"), checkin.searchParams.get("returnTo")]).toEqual(["/th/asset-management/checkin", handover.id, SCAN_PATH])
  const repair = await href(SCAN_WORDS.recordRepair)
  expect([repair.pathname, repair.searchParams.get("assetId")]).toEqual(["/th/maintenance/new", asset.id])
  expect((await href(SCAN_WORDS.printLabel)).pathname).toBe(`/th/assets/${asset.id}/label`)
  await record(measure, "scan, one card found by part of the Serial", testInfo)

  // Enter on a part that is no exact tag or Serial stays on the scan (typing alone never jumps away, P4-R2).
  await page.locator("#asset-scan-query").press("Enter")
  await expect(page).toHaveURL((url) => url.pathname === SCAN_PATH)
  await expect(cards).toHaveCount(1)

  // The card opens the asset with the scan as the way back; the asset page goes back to the scan.
  await card.getByRole("link", { name: SCAN_WORDS.openAsset, exact: true }).click()
  await page.waitForURL(openedFromScan(asset.id))
  await expect(page.getByRole("heading", { level: 1, name: asset.name })).toBeVisible()
  await record(measure, "the asset opened from the scan's card", testInfo)
  await page.getByRole("main").getByRole("link", { name: SCAN_WORDS.backToScan, exact: true }).click()
  await page.waitForURL((url) => url.pathname === SCAN_PATH)

  // เปิดล่าสุด lists it, the name and the tag only (P4-R7), and opens it with the scan as the way back.
  const recent = page.getByRole("list", { name: SCAN_WORDS.recent, exact: true })
  await expect(recent.getByRole("link")).toHaveCount(1)
  const recentLink = recent.getByRole("link").first()
  await expect(recentLink).toContainText(asset.name)
  await expect(recentLink).toContainText(asset.assetTag)
  await expect(recentLink).not.toContainText(held.status.nameTh)
  await expect(recentLink).toHaveAttribute("href", `/th/assets/${asset.id}?returnTo=${encodeURIComponent(SCAN_PATH)}`)
  await record(measure, "scan, the recent list", testInfo)

  // ล้างรายการ empties it.
  await page.getByRole("button", { name: SCAN_WORDS.recentClear, exact: true }).click()
  await expect(page.getByRole("heading", { name: SCAN_WORDS.recent, exact: true })).toHaveCount(0)
  await expect(recent).toHaveCount(0)
  await record(measure, "scan, the recent list cleared", testInfo)

  // Enter on the full tag, one exact match: the asset opens at once (P4-R2).
  await page.locator("#asset-scan-query").fill(asset.assetTag)
  await page.locator("#asset-scan-query").press("Enter")
  await page.waitForURL(openedFromScan(asset.id))
  await expect(page.getByRole("heading", { level: 1, name: asset.name })).toBeVisible()
  await record(measure, "the asset opened by Enter on its tag", testInfo)
})
