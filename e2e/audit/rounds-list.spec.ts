// The rounds list (group 2 spec §6, §16): the status tabs and their counts follow the search; one status badge,
// never ร่าง; the next step whole, to the scan page for IT staff and to the pending list for a viewer; the viewer's
// pending list counts the room's items and offers no scan or not-found, and the viewer's round page opens the pending
// list (group 2 spec §8, §9); the viewer's strip cell opens a work view with its removable chip; a cancelled round moves to ยกเลิก. The test opens its own
// round on its own room, finds it by its number (spec §16: never on a first page), and the IT head cancels it
// whatever happens.
import { asUser, expect, test } from "../support/fixtures.ts"
import { actAs, createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import * as rounds from "./round-steps.ts"
import { ROUNDS_WORDS as W } from "./rounds-words.ts"
import * as pending from "./pending-steps.ts"
import * as roundPage from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as P } from "./round-page-words.ts"

asUser("itStaff")

test("the rounds list: status tabs that follow the search, the next step whole and by role, a work view's chip, a cancelled round under ยกเลิก", async ({ page, measure, e2eDevice, e2eTheme, playwright, baseURL }, testInfo) => {
  test.setTimeout(240_000)
  const prefix = recordPrefix(testInfo, "AUL")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบรายการรอบ`)
  const choices = await readAssetChoices(page, measure)
  const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])
  // The body the form sends (spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบรายการรอบ`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the room's two assets").toBe(2)
  const list = `/th/audit/rounds?search=${encodeURIComponent(round.auditNo)}`
  const scanHref = new RegExp(`^/th/audit/rounds/${round.id}/scan(?:[?#]|$)`)
  const pendingHref = new RegExp(`^/th/audit/rounds/${round.id}/pending(?:[?#]|$)`)
  const nextName = fillTemplate(W.continueScanRow, { count: 2 })
  const entry = rounds.roundEntry(page, e2eDevice, round.auditNo)
  let cancelled = false
  try {
    // IT staff: the open tab by default; the tab counts and the header's "1 รอบ" follow the search (R1).
    await measure.visit(list, "rounds list, the test's round (IT staff)")
    await expect(page.getByRole("heading", { level: 1, name: W.listTitle })).toBeVisible()
    await rounds.expectTabs(page, W.tabOpen, { [W.tabOpen]: 1, [W.tabClosed]: 0, [W.tabCancelled]: 0, [W.tabAll]: 1 })
    await expect(page.locator('main [data-slot="page-header-meta"]')).toHaveText(fillTemplate(W.roundCount, { count: 1 }))
    await expect(entry).toHaveCount(1)
    // One status badge (spec §6, §14), and nothing checked yet.
    await expect(entry.getByText(W.statusOpen, { exact: true })).toHaveCount(1)
    if (e2eDevice === "desktop") {
      await expect(entry.getByText(W.notStarted, { exact: true })).toBeVisible()
      await expect(entry.getByText(new RegExp(`^${W.daysLeft.replace("{days}", "\\d+")}$`))).toBeVisible()
    }
    // The next step: whole, to the scan page for a person with audit:edit.
    const next = entry.getByRole("link", { name: nextName, exact: true })
    await expect(next).toHaveAttribute("href", scanHref)
    await rounds.expectWhole(next)
    // The strip's cell is round-wide: a scan page, maybe of another run's round.
    await expect(page.getByRole("link", { name: W.continueScan, exact: true })).toHaveAttribute("href", /^\/th\/audit\/rounds\/[0-9a-f-]{36}\/scan(?:[?#]|$)/)
    // ปิดแล้ว holds nothing for this search; ทั้งหมด holds the round.
    await rounds.tab(page, W.tabClosed).click()
    await page.waitForURL(/[?&]view=closed(?:&|$)/)
    await expect(rounds.tab(page, W.tabClosed)).toHaveAttribute("aria-current", "page")
    await expect(entry).toHaveCount(0)
    if (e2eDevice === "desktop") await expect(page.getByRole("link", { name: W.clearSearch, exact: true })).toBeVisible()
    await rounds.tab(page, W.tabAll).click()
    await page.waitForURL(/[?&]view=all(?:&|$)/)
    await expect(entry).toHaveCount(1)
    await measure.recordPage("rounds list, ทั้งหมด (IT staff)")
    await next.click()
    await page.waitForURL(`**/th/audit/rounds/${round.id}/scan**`)

    // The viewer: the next step opens the pending list, and no scan page is offered (spec §5).
    await actAs(page, "viewer", e2eTheme)
    await measure.visit(list, "rounds list, the test's round (viewer)")
    const viewerNext = entry.getByRole("link", { name: nextName, exact: true })
    await expect(viewerNext).toHaveAttribute("href", pendingHref)
    await rounds.expectWhole(viewerNext)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)
    // The strip's cell opens the work view รอตรวจ: a removable chip under the กำลังดำเนินการ tab.
    const stripCell = page.getByRole("link", { name: W.continueScan, exact: true })
    await expect(stripCell).toHaveAttribute("href", /[?&]view=pending(?:&|$)/)
    await stripCell.click()
    await page.waitForURL(/[?&]view=pending(?:&|$)/)
    const chip = rounds.workViewChip(page, W.viewPending)
    await expect(chip).toBeVisible()
    await expect(rounds.tab(page, W.tabOpen)).toHaveAttribute("aria-current", "page")
    // The work view holds the round (it has items to check); its chip clears the view and keeps the search.
    await measure.visit(`/th/audit/rounds?view=pending&search=${encodeURIComponent(round.auditNo)}`, "rounds list, work view รอตรวจ (viewer)")
    await expect(entry).toHaveCount(1)
    await chip.click()
    await page.waitForURL((url) => url.searchParams.get("view") !== "pending" && url.searchParams.get("search") === round.auditNo)
    await expect(chip).toHaveCount(0)
    await expect(entry).toHaveCount(1)
    await viewerNext.click()
    await page.waitForURL(`**/th/audit/rounds/${round.id}/pending**`)
    // The pending list as the viewer (group 2 spec §9, §13 bug 14, P2-R7): the title and the room chip count the round's
    // two items, the rows show them with a way to the asset (the name on the desktop, whose whole row opens it too,
    // P2-R28; "ดูทรัพย์สิน" on the phone card), and nothing scans or records.
    await measure.recordPage("pending list (viewer)")
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(P.pendingTitle, { count: 2 }) })).toBeVisible()
    await pending.expectRoomChips(page, 2, { [roomId]: 2 }, "all")
    await expect(pending.pendingRows(page, e2eDevice, prefix)).toHaveCount(2)
    for (const asset of assets) {
      const assetLink = pending.pendingEntry(page, e2eDevice, asset.assetTag).getByRole("link", { name: e2eDevice === "phone" ? P.viewAsset : asset.name, exact: true })
      await expect(assetLink).toHaveAttribute("href", new RegExp(`^/th/assets/${asset.id}(?:[?#]|$)`))
    }
    await expect(page.getByRole("main").getByRole("button", { name: P.markNotFound, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("link", { name: P.scanThis, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${W.continueScan}`) })).toHaveCount(0)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)

    // The round page as the viewer (P2-R7): its next step opens the pending list; no scan link, no export or อื่น ๆ menu.
    await measure.visit(`/th/audit/rounds/${round.id}`, "round page (viewer)")
    await expect(roundPage.nextStepCard(page).getByRole("link", { name: nextName, exact: true })).toHaveAttribute("href", pendingHref)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: P.exportMenu, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: P.more, exact: true })).toHaveCount(0)

    // The IT head cancels the round: it leaves กำลังดำเนินการ for ยกเลิก, with its badge and no next step.
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรายการรอบ`)
    cancelled = true
    await measure.visit(list, "rounds list after the cancel (viewer)")
    await rounds.expectTabs(page, W.tabOpen, { [W.tabOpen]: 0, [W.tabClosed]: 0, [W.tabCancelled]: 1, [W.tabAll]: 1 })
    await expect(entry).toHaveCount(0)
    await rounds.tab(page, W.tabCancelled).click()
    await page.waitForURL(/[?&]view=cancelled(?:&|$)/)
    await expect(entry.getByText(W.statusCancelled, { exact: true })).toHaveCount(1)
    await expect(entry.getByRole("link", { name: nextName, exact: true })).toHaveCount(0)
  } finally {
    if (!cancelled) await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรายการรอบ`)
  }
})
