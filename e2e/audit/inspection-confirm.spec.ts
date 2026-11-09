// ยืนยันผลตรวจ (inspection-confirm plan 3 task 4): the round's confirm page, on the computer and the phone in the light
// theme. The test opens its own round on its own room of three run-marked assets: one personal with a holder, one shared
// without one, and one IT staff mark not found. The two are checked as found, the third is marked not found from the
// pending list, and then the suite's one direct write (e2e/audit/inspection-setup.ts, the user's option A of
// 2026-11-09) sets all three to "Under Inspection" in the dev database: no app path makes that status.
// - Before that write the confirm page of the round shows ยืนยันผลตรวจครบแล้ว and the way back to the round.
// - The IT head reads the round: its not-found finding waits (the card's step is หัวหน้า IT พิจารณา, as
//   buildAuditRoundPageSteps orders review before ยืนยันผลตรวจ), the ยืนยันผลตรวจ column waits on 3, the close line reads
//   "ยังมี 3 ชิ้นค้างสถานะอยู่ระหว่างตรวจสอบ", the card offers no close, and the close route refuses with 3 unconfirmed.
// - The viewer (no asset:edit) reads the rows and the notice, with no tick.
// - IT staff (asset:edit) read 2 in พร้อมยืนยัน and the third in รอพิจารณา, select all, read the dialog's lines (ใช้งานอยู่ 1,
//   พร้อมใช้งาน 1) and confirm; the notice says so; each asset's page shows its new status and its history links the
//   round.
// No cleanup: the records are run-marked, and the round is the test's own (it stays open with its finding).
import { asUser, expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { actAs, createRoom, recordPrefix } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { readAuditMasters } from "./audit-data.ts"
import { markUnderInspection } from "./inspection-setup.ts"
import * as pending from "./pending-steps.ts"
import * as roundPage from "./round-page-steps.ts"
import * as rounds from "./round-steps.ts"
import { INSPECTION_CONFIRM_WORDS as W } from "./inspection-confirm-words.ts"

asUser("itStaff")

// The page type of the suite's steps (a spec imports nothing from @playwright/test).
type Page = Parameters<typeof pending.pendingRows>[0]

// The run's rows of the confirm page: the phone's cards or the desktop table's rows (the other one is hidden).
function confirmRows(page: Page, device: E2eDevice, text: string) {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: text })
}

// The five tabs with their counts, the current one marked.
async function expectConfirmTabs(page: Page, current: string, counts: { ready: number; awaitingReview: number }) {
  await rounds.expectTabs(page, current, {
    [W.tabReady]: counts.ready,
    [W.tabAwaitingReview]: counts.awaitingReview,
    [W.tabDamaged]: 0,
    [W.tabNotFound]: 0,
    [W.tabNotScanned]: 0,
  })
}

test("ยืนยันผลตรวจ: the close waits on 3 under inspection, the viewer reads without ticks, IT staff confirm the 2 ready as ใช้งานอยู่ and พร้อมใช้งาน (inspection-confirm plan 3)", async ({ page, measure, e2eDevice, e2eTheme }, testInfo) => {
  test.skip(e2eTheme === "dark", "the light projects are enough for ยืนยันผลตรวจ (inspection-confirm plan 3 task 4)")
  test.setTimeout(300_000)
  const { runId } = readRunState()
  const run = readRunData()
  const prefix = recordPrefix(testInfo, "INC")
  const room = { code: `${prefix}-R`, name: `${prefix} ห้องทดสอบยืนยันผลตรวจ` }
  const roomId = await createRoom(room.code, room.name)
  const masters = await readAuditMasters(page)
  const holder = run.employees.receiver1

  // Three assets in the room, Ready, made by IT staff through the asset API: personal with a holder (→ ใช้งานอยู่),
  // shared without one (→ พร้อมใช้งาน), and the one that is not found.
  const plans = [
    { key: "personal", tag: `${prefix}-A1`, name: `${prefix} โน้ตบุ๊กยืนยันผลตรวจ`, ownershipType: "personal", custodianId: holder.id },
    { key: "shared", tag: `${prefix}-A2`, name: `${prefix} จอภาพยืนยันผลตรวจ`, ownershipType: "shared", custodianId: null },
    { key: "notFound", tag: `${prefix}-A3`, name: `${prefix} โปรเจกเตอร์ยืนยันผลตรวจ`, ownershipType: "shared", custodianId: null },
  ] as const
  const assets = {} as Record<(typeof plans)[number]["key"], { id: string; tag: string; name: string }>
  for (const plan of plans) {
    const response = await page.request.post("/api/assets", {
      data: {
        assetTag: plan.tag,
        name: plan.name,
        categoryId: masters.categoryDesktop,
        companyId: run.companyId,
        branchId: run.branchId,
        ownershipType: plan.ownershipType,
        custodianId: plan.custodianId,
        departmentId: run.departmentId,
        currentLocationId: roomId,
        homeLocationId: roomId,
        statusId: masters.statusReady,
        conditionId: masters.conditionGood,
        remark: `${prefix} ยืนยันผลตรวจ (E2E)`,
        // The schema takes a missing optional date or number only when its key is there (foundation note N3).
        licenseTotalSeats: null,
        licenseUsedSeats: null,
        purchaseDate: null,
        purchasePrice: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
      },
    })
    expect(response.status(), await response.text()).toBe(201)
    assets[plan.key] = { id: ((await response.json()) as { id: string }).id, tag: plan.tag, name: plan.name }
  }

  // The round over the room (the body the round form sends, spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบยืนยันผลตรวจ`,
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
  expect(round.generatedItems, "the room's three assets").toBe(3)
  const roundPath = `/th/audit/rounds/${round.id}`
  const confirmPath = `${roundPath}/confirm`

  // The walk: the two are found as the register has them (the scan route takes the expected values when none is
  // sent), and the third is marked not found from the pending list.
  for (const asset of [assets.personal, assets.shared]) {
    const scanned = await page.request.post(`/api/audit-rounds/${round.id}/scan`, { data: { assetId: asset.id, scanSource: "manual" } })
    expect(scanned.status(), await scanned.text()).toBe(200)
  }
  await measure.visit(`${roundPath}/pending`, "pending list, the confirm round (IT staff)")
  await expect(pending.pendingRows(page, e2eDevice, prefix)).toHaveCount(1)
  await pending.markNotFound(page, e2eDevice, { tag: assets.notFound.tag, name: assets.notFound.name, room, custodian: null })

  // Nothing of the round is under inspection yet: the confirm page is empty, with the way back to the round.
  await measure.visit(confirmPath, "confirm page, nothing under inspection (IT staff)")
  await expect(page.getByRole("heading", { level: 1, name: W.title })).toBeVisible()
  await expect(page.getByRole("main").getByText(W.emptyTitle, { exact: true })).toBeVisible()
  await expect(page.getByRole("main").getByRole("link", { name: W.backToRound, exact: true }).filter({ visible: true }).last()).toHaveAttribute("href", new RegExp(`^${roundPath}(?:[?#]|$)`))
  await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)

  // The suite's one direct write: the run's three assets are "Under Inspection" (dev database only).
  await markUnderInspection(runId, [assets.personal.id, assets.shared.id, assets.notFound.id])

  // The IT head on the round: the not-found finding waits first, then ยืนยันผลตรวจ waits on 3, and the close waits on both.
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(roundPath, "round page, 3 under inspection (IT head)")
  const card = roundPage.nextStepCard(page)
  await expect(card.getByRole("heading", { level: 2, name: fillTemplate(W.nextStepTitle, { step: W.stepReview }) })).toBeVisible()
  await expect(card.getByRole("link", { name: fillTemplate(W.stepConfirmWaiting, { count: 3 }), exact: true })).toHaveAttribute("href", new RegExp(`^${confirmPath}$`))
  await expect(card.getByRole("link", { name: fillTemplate(W.closeUnconfirmedCount, { count: 3 }), exact: true })).toHaveAttribute("href", new RegExp(`^${confirmPath}$`))
  await expect(card.getByRole("button", { name: W.closeRound })).toHaveCount(0)
  // The close route refuses (the IT head did not open the round): the checklist names the 3 still under inspection.
  const close = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "close" } })
  expect(close.status(), "the close is refused").toBe(400)
  const refused = (await close.json()) as { checklist?: { unconfirmedAssets: number; canClose: boolean } }
  expect(refused.checklist, "the close waits on the 3 under inspection").toMatchObject({ unconfirmedAssets: 3, canClose: false })

  // The viewer (audit:view, no asset:edit): the rows and the notice, no tick and no select-all.
  await actAs(page, "viewer", e2eTheme)
  await measure.visit(confirmPath, "confirm page (viewer)")
  await expectConfirmTabs(page, W.tabReady, { ready: 2, awaitingReview: 1 })
  await expect(page.getByRole("main").getByText(W.noEditNotice, { exact: true })).toBeVisible()
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(2)
  for (const asset of [assets.personal, assets.shared]) await expect(confirmRows(page, e2eDevice, asset.tag)).toHaveCount(1)
  await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
  await expect(page.getByRole("main").getByRole("button", { name: W.selectAll, exact: true })).toHaveCount(0)

  // IT staff (asset:edit): 2 ready, the third waits in รอพิจารณา with its banner.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(confirmPath, "confirm page (IT staff)")
  await expectConfirmTabs(page, W.tabReady, { ready: 2, awaitingReview: 1 })
  await expect(page.getByRole("main").getByText(W.noEditNotice, { exact: true })).toHaveCount(0)
  await rounds.tab(page, W.tabAwaitingReview).click()
  await page.waitForURL((url) => url.pathname === confirmPath && url.searchParams.get("tab") === "awaitingReview")
  await expectConfirmTabs(page, W.tabAwaitingReview, { ready: 2, awaitingReview: 1 })
  await expect(page.getByRole("main").getByText(W.awaitingReviewBanner, { exact: true })).toBeVisible()
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(1)
  await expect(confirmRows(page, e2eDevice, assets.notFound.tag)).toHaveCount(1)
  await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
  // Back on พร้อมยืนยัน by its tab, so the page stays on it after the confirm empties it.
  await rounds.tab(page, W.tabReady).click()
  await page.waitForURL((url) => url.pathname === confirmPath && url.searchParams.get("tab") === "ready")
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(2)
  await measure.recordPage("confirm page, พร้อมยืนยัน (IT staff)")

  // Select all: the bar counts 2 and splits them by the status each takes.
  await page.getByRole("main").getByRole("button", { name: W.selectAll, exact: true }).click()
  const bar = page.getByRole("group", { name: W.title, exact: true }).filter({ visible: true })
  await expect(bar).toContainText(fillTemplate(W.selectedCount, { count: 2 }))
  await expect(bar).toContainText(fillTemplate(W.selectionSummary, { inUse: 1, ready: 1, checkedOut: 0 }))
  await bar.getByRole("button", { name: W.confirmOpen, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: fillTemplate(W.dialogTitle, { count: 2 }) })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("listitem")).toHaveText([new RegExp(`^${W.dialogLineInUse}\\s*1$`), new RegExp(`^${W.dialogLineReady}\\s*1$`)])
  await measure.recordPage("confirm dialog, 2 assets (IT staff)")
  const confirmed = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/audit-rounds/${round.id}/confirm-results` && response.request().method() === "POST")
  await dialog.getByRole("button", { name: fillTemplate(W.submit, { count: 2 }), exact: true }).click()
  const answer = await confirmed
  expect(answer.status(), "the confirm").toBe(200)
  expect(await answer.json()).toMatchObject({ confirmed: 2 })
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("main").getByText(fillTemplate(W.successNotice, { count: 2 }), { exact: true })).toBeVisible()
  await expectConfirmTabs(page, W.tabReady, { ready: 0, awaitingReview: 1 })
  await expect(page.getByRole("main").getByText(W.emptyTabTitle, { exact: true }).filter({ visible: true })).toHaveCount(1)

  // Each asset's page: its new status, and its history's row links the round by its number.
  for (const [asset, status, statusTh] of [
    [assets.personal, "In Use", W.statusInUse],
    [assets.shared, "Ready", W.statusReady],
  ] as const) {
    const saved = (await (await page.request.get(`/api/assets/${asset.id}`)).json()) as { status: { name: string } }
    expect(saved.status.name, `${asset.tag}: its status`).toBe(status)
    await measure.visit(`/th/assets/${asset.id}?view=history`, `the asset's history after ยืนยันผลตรวจ (${status})`)
    await expect(page.getByRole("main").getByText(statusTh, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("main").getByRole("link", { name: round.auditNo }).filter({ visible: true }).first()).toHaveAttribute("href", new RegExp(`^/th/audit/rounds/${round.id}(?:[?#]|$)`))
  }
  // The not-found asset is still under inspection, so the round's close line still waits on it.
  await measure.visit(roundPath, "round page after the confirm (IT staff)")
  await expect(roundPage.nextStepCard(page).getByRole("link", { name: fillTemplate(W.closeUnconfirmedCount, { count: 1 }), exact: true })).toBeVisible()
})
