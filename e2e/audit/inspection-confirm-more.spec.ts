// ยืนยันผลตรวจ, the damaged and not-found paths (inspection-confirm plan 4 task 5, with the user's option A of 2026-11-09:
// disposal waits for the round's close), on the computer and the phone in the light theme. The test opens its own round
// on its own room of four run-marked shared assets without a holder: one found as the register has it, one checked as
// เสียหาย (the scan files its wrong_condition finding, as the walk does), and two marked not found from the pending list.
// - The IT head approves the three findings (the register's condition becomes เสียหาย), then the suite's one direct
//   write (e2e/audit/inspection-setup.ts) sets all four to "Under Inspection" in the dev database.
// - IT staff, while the round is open: the damaged tab offers บันทึกซ่อม and ยืนยันผลอย่างเดียว, no disposal;
//   "ยืนยันแล้วบันทึกซ่อม" confirms the one asset (→ พร้อมใช้งาน) and opens the repair form with it chosen and the way back
//   to the confirm page (not saved). The found one is confirmed through the route (plan 3 covers its dialog). On the
//   not-found tab both are ticked and set to หาไม่พบ; the lost block counts 2 with its after-close note and no link.
// - The IT head (not the opener) closes the round from its page. The closed card reads "ขอตัดจำหน่ายจากรอบนี้ได้ 3 ชิ้น"
//   (2 lost, 1 damaged with no repair record: the form was never saved) and opens the confirm page's
//   "ตัดจำหน่ายหลังปิดรอบ": the lost link opens the batch form with both and สูญหาย (the computer; the phone reads its
//   note), where ขาย leaves the หาไม่พบ asset unpickable; the damaged one opens the single form with it ready. Nothing
//   is sent.
// No cleanup: the records are run-marked, and the round is the test's own (closed, with no request made from it).
import { asUser, expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { actAs, batchMachineRow, batchSearch, chooseMethod, createRoom, escapeRegExp, expectReadyAssetCard, recordPrefix } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { readAuditMasters } from "./audit-data.ts"
import { markUnderInspection } from "./inspection-setup.ts"
import * as pending from "./pending-steps.ts"
import * as review from "./review-steps.ts"
import * as roundPage from "./round-page-steps.ts"
import * as rounds from "./round-steps.ts"
import { recordSettled } from "./settle.ts"
import { INSPECTION_CONFIRM_MORE_WORDS as W } from "./inspection-confirm-more-words.ts"

asUser("itStaff")

// The page type of the suite's steps (a spec imports nothing from @playwright/test).
type Page = Parameters<typeof pending.pendingRows>[0]

// The run's rows of the confirm page: the phone's cards or the desktop table's rows (the other one is hidden).
function confirmRows(page: Page, device: E2eDevice, text: string) {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: text })
}

// The five tabs with their counts, the current one marked.
async function expectConfirmTabs(page: Page, current: string, counts: { ready: number; damaged: number; notFound: number }) {
  await rounds.expectTabs(page, current, {
    [W.tabReady]: counts.ready,
    [W.tabAwaitingReview]: 0,
    [W.tabDamaged]: counts.damaged,
    [W.tabNotFound]: counts.notFound,
    [W.tabNotScanned]: 0,
  })
}

// The next answer of the round's confirm route.
function confirmResponse(page: Page, roundId: string) {
  return page.waitForResponse((response) => new URL(response.url()).pathname === `/api/audit-rounds/${roundId}/confirm-results` && response.request().method() === "POST")
}

async function assetState(page: Page, assetId: string): Promise<{ status: string; condition: string }> {
  const saved = (await (await page.request.get(`/api/assets/${assetId}`)).json()) as { status: { name: string }; condition: { name: string } }
  return { status: saved.status.name, condition: saved.condition.name }
}

test("ยืนยันผลตรวจ: a damaged asset goes on to the repair form, the not-found ones become หาไม่พบ, and after the IT head's close the round offers their disposal forms (inspection-confirm plan 4)", async ({ page, measure, e2eDevice, e2eTheme }, testInfo) => {
  test.skip(e2eTheme === "dark", "the light projects are enough for ยืนยันผลตรวจ (inspection-confirm plan 4 task 5)")
  test.setTimeout(360_000)
  const { runId } = readRunState()
  const run = readRunData()
  const prefix = recordPrefix(testInfo, "INM")
  const room = { code: `${prefix}-R`, name: `${prefix} ห้องทดสอบยืนยันผลเสียหาย` }
  const roomId = await createRoom(room.code, room.name)
  const masters = await readAuditMasters(page)

  // Four shared assets in the room, Ready and ดี, with no holder (each confirms to พร้อมใช้งาน), made by IT staff.
  const plans = [
    { key: "found", tag: `${prefix}-A1`, name: `${prefix} จอภาพพบตรง` },
    { key: "damaged", tag: `${prefix}-A2`, name: `${prefix} เครื่องพิมพ์สภาพเสียหาย` },
    { key: "lost1", tag: `${prefix}-A3`, name: `${prefix} โปรเจกเตอร์หาไม่พบหนึ่ง` },
    { key: "lost2", tag: `${prefix}-A4`, name: `${prefix} โปรเจกเตอร์หาไม่พบสอง` },
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
        ownershipType: "shared",
        custodianId: null,
        departmentId: run.departmentId,
        currentLocationId: roomId,
        homeLocationId: roomId,
        statusId: masters.statusReady,
        conditionId: masters.conditionGood,
        remark: `${prefix} ยืนยันผลตรวจ เสียหายและไม่พบ (E2E)`,
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

  // The round over the room, opened by IT staff (the body the round form sends, spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบยืนยันผลเสียหายและไม่พบ`,
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
  expect(round.generatedItems, "the room's four assets").toBe(4)
  const roundPath = `/th/audit/rounds/${round.id}`
  const confirmPath = `${roundPath}/confirm`

  // The walk: the first is found as the register has it, the second is found เสียหาย (the scan files a pending
  // wrong_condition finding; the register keeps ดี until it is approved), and the two others are marked not found.
  for (const [asset, actual] of [
    [assets.found, {}],
    [assets.damaged, { actualConditionId: masters.conditionDamaged }],
  ] as const) {
    const scanned = await page.request.post(`/api/audit-rounds/${round.id}/scan`, { data: { assetId: asset.id, scanSource: "manual", ...actual } })
    expect(scanned.status(), await scanned.text()).toBe(200)
  }
  await measure.visit(`${roundPath}/pending`, "pending list, the damaged and not-found round (IT staff)")
  await expect(pending.pendingRows(page, e2eDevice, prefix)).toHaveCount(2)
  const notFoundFindingIds: string[] = []
  for (const asset of [assets.lost1, assets.lost2]) {
    notFoundFindingIds.push(await pending.markNotFound(page, e2eDevice, { tag: asset.tag, name: asset.name, room, custodian: null }))
  }
  await expect(pending.pendingRows(page, e2eDevice, prefix)).toHaveCount(0)

  // The IT head approves the three findings: the condition one is read off the findings page of the round.
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(`/th/audit/findings?status=pending&roundId=${round.id}`, "findings of the damaged and not-found round (IT head)")
  const conditionFindingId = await review.findingId(review.findingEntry(page, e2eDevice, assets.damaged.tag, "wrong_condition"), e2eDevice)
  for (const findingId of [conditionFindingId, ...notFoundFindingIds]) {
    const reviewed = await page.request.post(`/api/audit-findings/${findingId}/review`, { data: { action: "approve" } })
    expect(reviewed.status(), await reviewed.text()).toBe(200)
  }
  expect(await assetState(page, assets.damaged.id), "the approved condition is the register's").toMatchObject({ condition: "Damaged" })

  // The suite's one direct write: the run's four assets are "Under Inspection" (dev database only).
  await markUnderInspection(runId, [assets.found.id, assets.damaged.id, assets.lost1.id, assets.lost2.id])

  // IT staff on the confirm page: 1 ready, 1 damaged, 2 not found.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(confirmPath, "confirm page, damaged and not found (IT staff)")
  await expect(page.getByRole("heading", { level: 1, name: W.title })).toBeVisible()
  await expectConfirmTabs(page, W.tabReady, { ready: 1, damaged: 1, notFound: 2 })

  // The damaged tab, round open: บันทึกซ่อม and ยืนยันผลอย่างเดียว, no disposal yet (it waits for the close).
  await rounds.tab(page, W.tabDamaged).click()
  await page.waitForURL((url) => url.pathname === confirmPath && url.searchParams.get("tab") === "damaged")
  await expectConfirmTabs(page, W.tabDamaged, { ready: 1, damaged: 1, notFound: 2 })
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(1)
  const damagedRow = confirmRows(page, e2eDevice, assets.damaged.tag)
  await expect(damagedRow).toHaveCount(1)
  await expect(damagedRow.getByRole("button", { name: W.damagedRepair, exact: true })).toBeEnabled()
  await expect(damagedRow.getByRole("button", { name: W.damagedConfirmOnly, exact: true })).toBeEnabled()
  await expect(page.getByRole("main").getByRole("button", { name: W.damagedDispose, exact: true })).toHaveCount(0)
  await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
  await measure.recordPage("confirm page, สภาพเสียหาย, round open (IT staff)")

  // "ยืนยันแล้วบันทึกซ่อม": the dialog of the one asset (→ พร้อมใช้งาน) with its reason, then the repair form.
  await damagedRow.getByRole("button", { name: W.damagedRepair, exact: true }).click()
  const damagedDialog = page.getByRole("dialog", { name: fillTemplate(W.dialogTitle, { count: 1 }) })
  await expect(damagedDialog).toBeVisible()
  await expect(damagedDialog.getByRole("listitem")).toHaveText([new RegExp(`^${W.dialogLineReady}\\s*1$`)])
  await expect(damagedDialog.getByRole("textbox")).toHaveValue(fillTemplate(W.damagedReasonDefault, { auditNo: round.auditNo }))
  await measure.recordPage("confirm dialog, the damaged asset (IT staff)")
  const damagedConfirmed = confirmResponse(page, round.id)
  await damagedDialog.getByRole("button", { name: fillTemplate(W.submit, { count: 1 }), exact: true }).click()
  const damagedAnswer = await damagedConfirmed
  expect(damagedAnswer.status(), "the damaged confirm").toBe(200)
  expect(await damagedAnswer.json()).toMatchObject({ confirmed: 1 })
  await page.waitForURL((url) => url.pathname === "/th/maintenance/new" && url.searchParams.get("assetId") === assets.damaged.id)
  await expect(page.locator("[data-repair-asset-card]")).toContainText(assets.damaged.tag)
  await expect(page.locator('[data-slot="page-back-link"]').filter({ visible: true }).first()).toHaveAttribute("href", `${confirmPath}?tab=damaged`)
  await measure.recordPage("repair form from ยืนยันผลตรวจ (IT staff, not saved)")
  // The §4 target: shared with no holder is พร้อมใช้งาน; the condition stays เสียหาย. The form is left unsaved.
  expect(await assetState(page, assets.damaged.id), "the damaged asset after its confirm").toEqual({ status: "Ready", condition: "Damaged" })

  // The found one through the route (plan 3 walks the ready tab's dialog), so the close waits on nothing else.
  const foundConfirmed = await page.request.post(`/api/audit-rounds/${round.id}/confirm-results`, {
    data: { assetIds: [assets.found.id], reason: fillTemplate(W.damagedReasonDefault, { auditNo: round.auditNo }), outcome: "confirm" },
  })
  expect(foundConfirmed.status(), await foundConfirmed.text()).toBe(200)

  // The not-found tab: tick both, "ตั้งเป็นหาไม่พบ…", the dialog's one line and its reason, then the confirm.
  await roundPage.settlePageRequests(page)
  await measure.visit(`${confirmPath}?tab=notFound`, "confirm page, ไม่พบ (IT staff)")
  await expectConfirmTabs(page, W.tabNotFound, { ready: 0, damaged: 0, notFound: 2 })
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(2)
  for (const asset of [assets.lost1, assets.lost2]) {
    await page.getByRole("main").getByRole("checkbox", { name: `${asset.tag} ${asset.name}`, exact: true }).filter({ visible: true }).check()
  }
  const bar = page.getByRole("group", { name: W.title, exact: true }).filter({ visible: true })
  await expect(bar).toContainText(fillTemplate(W.selectedCount, { count: 2 }))
  await bar.getByRole("button", { name: W.missingOpen, exact: true }).click()
  const missingDialog = page.getByRole("dialog", { name: fillTemplate(W.missingDialogTitle, { count: 2 }) })
  await expect(missingDialog).toBeVisible()
  await expect(missingDialog.getByRole("listitem")).toHaveText([new RegExp(`^${W.missingDialogLine}\\s*2$`)])
  await expect(missingDialog.getByRole("textbox")).toHaveValue(fillTemplate(W.missingReasonDefault, { auditNo: round.auditNo }))
  await measure.recordPage("หาไม่พบ dialog, 2 assets (IT staff)")
  const missingConfirmed = confirmResponse(page, round.id)
  await missingDialog.getByRole("button", { name: fillTemplate(W.missingSubmit, { count: 2 }), exact: true }).click()
  const missingAnswer = await missingConfirmed
  expect(missingAnswer.status(), "the หาไม่พบ confirm").toBe(200)
  expect(await missingAnswer.json()).toMatchObject({ confirmed: 2 })
  await expect(missingDialog).toBeHidden()
  // Both rows leave, and nothing of the round is under inspection now: the empty page, with the lost block's count and
  // its note while the round is open, and no link.
  const main = page.getByRole("main")
  await expect(main.getByText(fillTemplate(W.missingSuccess, { count: 2 }), { exact: true })).toBeVisible()
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(0)
  await expect(main.getByText(W.emptyTitle, { exact: true })).toBeVisible()
  await expect(main.getByText(fillTemplate(W.lostBlock, { count: 2 }), { exact: true })).toBeVisible()
  await expect(main.getByText(W.lostAfterClose, { exact: true })).toBeVisible()
  await expect(main.getByRole("link", { name: W.lostLink, exact: true })).toHaveCount(0)
  await expect(main.getByRole("heading", { level: 2, name: W.afterCloseTitle })).toHaveCount(0)
  await recordSettled(page, measure, "confirm page, หาไม่พบ set, round open (IT staff)")
  for (const asset of [assets.lost1, assets.lost2]) expect((await assetState(page, asset.id)).status, `${asset.tag}: หาไม่พบ`).toBe("Missing")

  // The IT head, who did not open the round, closes it from its page: every step is done.
  await roundPage.settlePageRequests(page)
  await actAs(page, "itHead", e2eTheme)
  await measure.visit(roundPath, "round page, ready to close (IT head)")
  const nextStep = roundPage.nextStepCard(page)
  const close = nextStep.getByRole("button", { name: W.closeRound, exact: true })
  await expect(close).toBeEnabled()
  await close.click()
  const closeDialog = page.getByRole("alertdialog", { name: W.closeConfirm })
  await expect(closeDialog).toBeVisible()
  await closeDialog.getByRole("button", { name: W.closeRound, exact: true }).click()
  await expect(page.getByText(W.closeSuccess)).toBeVisible()
  await expect(close).toHaveCount(0)
  await expect(main.getByRole("heading", { level: 2, name: W.stepsClosedTitle })).toBeVisible()
  await recordSettled(page, measure, "round page, closed with disposal to make (IT head)")

  // The closed card: 3 may go to disposal from this round (2 หาไม่พบ, 1 เสียหาย with no repair record), linked to the
  // confirm page.
  const disposalLine = main.getByRole("link", { name: fillTemplate(W.closedDisposalLine, { count: 3 }), exact: true })
  await expect(disposalLine).toHaveAttribute("href", new RegExp(`^${confirmPath}(?:[?]returnTo=[^#]*)?$`))
  await roundPage.settlePageRequests(page)
  await disposalLine.click()
  await page.waitForURL((url) => url.pathname === confirmPath)

  // "ตัดจำหน่ายหลังปิดรอบ": the lost block with its link, and the damaged asset with the single form.
  const afterClose = main.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: W.afterCloseTitle }) }).last()
  await expect(afterClose).toBeVisible()
  await expect(main.getByText(W.emptyTitle, { exact: true })).toBeVisible()
  await expect(afterClose.getByText(fillTemplate(W.lostBlock, { count: 2 }), { exact: true })).toBeVisible()
  await expect(main.getByText(W.lostAfterClose, { exact: true })).toHaveCount(0)
  const lostLink = afterClose.getByRole("link", { name: W.lostLink, exact: true })
  await expect(lostLink).toHaveAttribute("href", new RegExp(`^/th/disposal/batch/new\\?type=lost&fromAuditRound=${round.id}&returnTo=`))
  await expect(afterClose.getByRole("heading", { level: 3, name: W.damagedForDisposalTitle })).toBeVisible()
  const damagedItems = afterClose.getByRole("listitem").filter({ hasText: prefix })
  await expect(damagedItems).toHaveCount(1)
  const damagedLink = damagedItems.filter({ hasText: assets.damaged.tag }).getByRole("link", { name: W.damagedDisposeLink, exact: true })
  await expect(damagedLink).toHaveAttribute("href", new RegExp(`^/th/disposal/new\\?assetId=${assets.damaged.id}&sourceType=audit_round&sourceId=${round.id}&returnTo=`))
  await recordSettled(page, measure, "confirm page, after the close (IT head)")

  // The lost link: the batch form with both chosen and สูญหาย (the computer); the phone reads the form's note.
  await roundPage.settlePageRequests(page)
  await lostLink.click()
  await page.waitForURL((url) => url.pathname === "/th/disposal/batch/new" && url.searchParams.get("fromAuditRound") === round.id)
  if (e2eDevice === "phone") {
    await expect(page.locator("[data-disposal-batch-phone]")).toContainText(W.batchPhoneNote)
    await expect(page.locator("[data-disposal-batch-desktop]")).toBeHidden()
    await measure.recordPage("batch form from the round, the phone's note (IT head)")
  } else {
    await expect(page.locator("[data-disposal-batch-from-round]")).toContainText(fillTemplate(W.fromRoundNotice, { auditNo: round.auditNo, count: 2 }))
    for (const asset of [assets.lost1, assets.lost2]) await expect(batchMachineRow(page, { id: asset.id, assetTag: asset.tag, name: asset.name })).toBeVisible()
    await expect(page.locator("[data-disposal-batch-machine]").filter({ hasText: prefix })).toHaveCount(2)
    await expect(page.getByRole("radio", { name: W.methodLost, exact: true })).toBeChecked()
    await measure.recordPage("batch form from the round, 2 หาไม่พบ (IT head, not sent)")
    // Another method: the picker does not offer a หาไม่พบ asset (its status), so ขาย cannot take it.
    await chooseMethod(page, W.methodSell)
    await batchSearch(page).fill(assets.lost1.tag)
    const option = page.getByRole("option", { name: new RegExp(escapeRegExp(assets.lost1.tag)) })
    await expect(option).toBeDisabled()
    await expect(option).toContainText(W.blockerStatus)
  }
  // The picker's route on both screens: a หาไม่พบ asset is eligible for สูญหาย only.
  for (const [type, eligible] of [["", false], ["&type=lost", true]] as const) {
    const found = await page.request.get(`/api/disposal-assets?q=${encodeURIComponent(assets.lost1.tag)}${type}`)
    expect(found.status()).toBe(200)
    const option = ((await found.json()) as { data: Array<{ id: string; eligible: boolean }> }).data.find((entry) => entry.id === assets.lost1.id)
    expect(option?.eligible, `${assets.lost1.tag} with ${type || "no type"}`).toBe(eligible)
  }

  // The damaged asset's link: the single request form with it chosen and ready (the round is closed). Not sent.
  await roundPage.settlePageRequests(page)
  await measure.visit(confirmPath, "confirm page, after the close, again (IT head)")
  await roundPage.settlePageRequests(page)
  await damagedLink.click()
  await page.waitForURL((url) => url.pathname === "/th/disposal/new" && url.searchParams.get("assetId") === assets.damaged.id)
  await expectReadyAssetCard(page, { id: assets.damaged.id, assetTag: assets.damaged.tag, name: assets.damaged.name })
  await measure.recordPage("disposal form for the damaged asset from the round (IT head, not sent)")
})
