// ยืนยันผลตรวจ from the asset's own page and from the findings list (inspection-confirm plan 5 task 4), on the computer
// and the phone in the light theme. The test makes two run-marked shared assets without a holder, each in a room of its
// own: one in a round it opens over its room and walks (found as the register has it, so the round files no finding),
// the other in no round. Then the suite's one direct write (e2e/audit/inspection-setup.ts, the user's option A of
// 2026-11-09) sets both to "Under Inspection" in the dev database: no app path makes that status.
// - The asset in the round: its page shows the notice with "ยืนยันผลตรวจในรอบ <auditNo>", which opens the round's confirm
//   page on พร้อมยืนยัน, whose back link returns to the asset page; the old "แก้ไขสถานะ" is not offered (no handover, so
//   no escape hatch).
// - The findings list of that round: no finding waits and one asset is unconfirmed, so the hand-off banner names
//   ยืนยันผลตรวจ with its link to the confirm page, whose back link returns to the list; the unfiltered list shows no
//   banner.
// - The asset in no round: the notice's button opens the one-step dialog. ใช้งานอยู่ without a holder is refused under
//   ผู้ถือครอง; with the run's employee, a third room of the run and a reason it is confirmed (a toast, then the refreshed
//   page has no notice), and the page reads ใช้งานอยู่, the holder and the room; the history has the status, holder and
//   location rows.
// No cleanup: the records are run-marked, and the round is the test's own (it stays open with its asset unconfirmed).
import { asUser, expect, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createRoom, recordPrefix } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { pickSearchable } from "../transactions/tx-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expectFieldError } from "../cross-cutting/support/ui.ts"
import { DETAIL_WORDS } from "../asset-detail/detail-words.ts"
import { factCell, openMoreActionsIfShown, readMenuEntries } from "../asset-detail/detail-steps.ts"
import { readAuditMasters } from "./audit-data.ts"
import { markUnderInspection } from "./inspection-setup.ts"
import * as rounds from "./round-steps.ts"
import { recordSettled } from "./settle.ts"
import { INSPECTION_DETAIL_WORDS as W } from "./inspection-detail-words.ts"

asUser("itStaff")

// The page type of the suite's steps (a spec imports nothing from @playwright/test).
type Page = Parameters<typeof rounds.tab>[0]

// The confirm page's back link (plan 5 final review): it names where the page was opened from and leads back to that
// path (with whatever query that page carried).
async function expectConfirmBackLink(page: Page, label: string, path: string) {
  const back = page.getByRole("main").getByRole("link", { name: label, exact: true }).filter({ visible: true }).last()
  await expect(back).toHaveAttribute("href", new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#]|$)`))
}

// The notice on the asset's overview (src/components/assets/detail/asset-inspection-notice.tsx).
function inspectionNotice(page: Page) {
  return page.getByRole("main").locator('[data-slot="asset-inspection-notice"]').filter({ visible: true })
}

// The run's rows of the confirm page: the phone's cards or the desktop table's rows (the other one is hidden).
function confirmRows(page: Page, device: E2eDevice, text: string) {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: text })
}

// The old Ready-only correction is not offered for an asset under inspection: not on the page, not in "อื่น ๆ".
async function expectNoStatusCorrection(page: Page, device: E2eDevice) {
  const main = page.getByRole("main")
  await expect(main.getByRole("button", { name: W.statusCorrection, exact: true }).or(main.getByRole("link", { name: W.statusCorrection, exact: true })).filter({ visible: true })).toHaveCount(0)
  const menu = await openMoreActionsIfShown(page, device)
  if (!menu) return
  expect((await readMenuEntries(menu)).map((entry) => entry.label), "อื่น ๆ").not.toContain(W.statusCorrection)
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
}

test("ยืนยันผลตรวจ from the asset page: the notice links the round's confirm page, the findings list hands off to it, and an asset in no round is confirmed in one step (inspection-confirm plan 5)", async ({ page, measure, e2eDevice, e2eTheme }, testInfo) => {
  test.skip(e2eTheme === "dark", "the light projects are enough for ยืนยันผลตรวจ (inspection-confirm plan 5 task 4)")
  test.setTimeout(300_000)
  const { runId } = readRunState()
  const run = readRunData()
  const prefix = recordPrefix(testInfo, "IND")
  const rooms = {
    round: { code: `${prefix}-R1`, name: `${prefix} ห้องรอบตรวจหน้าทรัพย์สิน` },
    noRound: { code: `${prefix}-R2`, name: `${prefix} ห้องนอกรอบตรวจ` },
    target: { code: `${prefix}-R3`, name: `${prefix} ห้องที่ตั้งยืนยันผลตรวจ` },
  }
  const roundRoomId = await createRoom(rooms.round.code, rooms.round.name)
  const noRoundRoomId = await createRoom(rooms.noRound.code, rooms.noRound.name)
  const targetRoomId = await createRoom(rooms.target.code, rooms.target.name)
  const masters = await readAuditMasters(page)
  const holder = run.employees.receiver1

  // Two shared assets without a holder, Ready, made by IT staff through the asset API: one in the round's room, one in
  // a room no round covers.
  const plans = [
    { key: "inRound", tag: `${prefix}-A1`, name: `${prefix} จอภาพในรอบตรวจ`, roomId: roundRoomId },
    { key: "noRound", tag: `${prefix}-A2`, name: `${prefix} จอภาพนอกรอบตรวจ`, roomId: noRoundRoomId },
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
        currentLocationId: plan.roomId,
        homeLocationId: plan.roomId,
        statusId: masters.statusReady,
        conditionId: masters.conditionGood,
        remark: `${prefix} ยืนยันผลตรวจจากหน้าทรัพย์สิน (E2E)`,
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

  // The round over the first room (the body the round form sends, spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบยืนยันผลตรวจหน้าทรัพย์สิน`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roundRoomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the room's one asset").toBe(1)
  const confirmPath = `/th/audit/rounds/${round.id}/confirm`

  // The walk: the asset is found as the register has it (the scan route takes the expected values when none is sent),
  // so the round files no finding.
  const scanned = await page.request.post(`/api/audit-rounds/${round.id}/scan`, { data: { assetId: assets.inRound.id, scanSource: "manual" } })
  expect(scanned.status(), await scanned.text()).toBe(200)

  // The suite's one direct write: the run's two assets are "Under Inspection" (dev database only).
  await markUnderInspection(runId, [assets.inRound.id, assets.noRound.id])

  // The asset in the round: the notice links the round's confirm page on พร้อมยืนยัน, with the asset page as returnTo.
  const inRoundPath = `/th/assets/${assets.inRound.id}`
  await measure.visit(inRoundPath, "asset page, under inspection in a round (IT staff)")
  const roundNotice = inspectionNotice(page)
  await expect(roundNotice).toHaveCount(1)
  await expect(roundNotice).toContainText(W.noticeTitle)
  const roundLink = roundNotice.getByRole("link", { name: fillTemplate(W.roundLink, { auditNo: round.auditNo }), exact: true })
  await expect(roundLink).toHaveAttribute("href", new RegExp(`^${confirmPath}\\?tab=ready&returnTo=${encodeURIComponent(inRoundPath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
  await expect(roundNotice.getByRole("button", { name: W.button, exact: true })).toHaveCount(0)
  await expectNoStatusCorrection(page, e2eDevice)
  await recordSettled(page, measure, "asset page, the notice with its round (IT staff)")
  await roundLink.click()
  await page.waitForURL((url) => url.pathname === confirmPath && url.searchParams.get("tab") === "ready" && url.searchParams.has("returnTo"))
  await rounds.expectTabs(page, W.tabReady, { [W.tabReady]: 1, [W.tabAwaitingReview]: 0, [W.tabDamaged]: 0, [W.tabNotFound]: 0, [W.tabNotScanned]: 0 })
  await expect(confirmRows(page, e2eDevice, prefix)).toHaveCount(1)
  await expect(confirmRows(page, e2eDevice, assets.inRound.tag)).toHaveCount(1)
  await expectConfirmBackLink(page, W.backToAsset, inRoundPath)
  await recordSettled(page, measure, "confirm page from the asset's notice (IT staff)")

  // The findings list of the round: no finding at all (so none waits) and one asset unconfirmed, so the page names
  // ยืนยันผลตรวจ as the next step, linked to the confirm page with this list as the way back.
  const findingsPath = `/th/audit/findings?roundId=${round.id}`
  await measure.visit(findingsPath, "findings of the round, the hand-off (IT staff)")
  const handoff = page.locator("[data-audit-findings-confirm-handoff]").filter({ visible: true })
  await expect(handoff).toHaveCount(1)
  await expect(handoff).toContainText(fillTemplate(W.handoffConfirm, { auditNo: round.auditNo, count: 1 }))
  const handoffLink = handoff.getByRole("link", { name: W.handoffConfirmLink, exact: true })
  await expect(handoffLink).toHaveAttribute("href", new RegExp(`^${confirmPath}\\?returnTo=`))
  await handoffLink.click()
  await page.waitForURL((url) => url.pathname === confirmPath && url.searchParams.has("returnTo"))
  await expect(confirmRows(page, e2eDevice, assets.inRound.tag)).toHaveCount(1)
  await expectConfirmBackLink(page, W.backToFindings, "/th/audit/findings")
  // Without a round chosen the list has no hand-off.
  await measure.visit("/th/audit/findings", "findings, no round chosen (IT staff)")
  await expect(page.locator("[data-audit-findings-confirm-handoff]")).toHaveCount(0)

  // The asset in no round: the notice's button, no round link, and no old correction.
  const noRoundPath = `/th/assets/${assets.noRound.id}`
  await measure.visit(noRoundPath, "asset page, under inspection in no round (IT staff)")
  const notice = inspectionNotice(page)
  await expect(notice).toHaveCount(1)
  await expect(notice).toContainText(W.noticeTitle)
  await expect(notice.getByRole("link")).toHaveCount(0)
  await expectNoStatusCorrection(page, e2eDevice)
  await notice.getByRole("button", { name: W.button, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: fillTemplate(W.dialogTitle, { assetTag: assets.noRound.tag }) })
  await expect(dialog).toBeVisible()
  // The rule's target for a shared asset without a holder is พร้อมใช้งาน; the room is the asset's own.
  const status = dialog.locator("#asset-confirm-inspection-status")
  await expect(status).toHaveValue("Ready")
  await expect(dialog.locator("#asset-confirm-inspection-location")).toContainText(`${rooms.noRound.code} - ${rooms.noRound.name}`)
  await measure.recordPage("one-step dialog, opened (IT staff)")

  // ใช้งานอยู่ without a holder: the error under ผู้ถือครอง, and nothing is sent.
  const reason = `${prefix} ตรวจสอบแล้ว ของอยู่กับผู้ถือครอง`
  await dialog.locator("#asset-confirm-inspection-reason").fill(reason)
  await status.selectOption("In Use")
  let sent = 0
  const countSent = (request: { url(): string; method(): string }) => {
    if (new URL(request.url()).pathname === `/api/assets/${assets.noRound.id}/confirm-inspection` && request.method() === "POST") sent += 1
  }
  page.on("request", countSent)
  await dialog.getByRole("button", { name: W.submit, exact: true }).click()
  await expectFieldError(page, "asset-confirm-inspection-holder", W.inUseNeedsHolder)
  page.off("request", countSent)
  expect(sent, "the refusal is the dialog's own").toBe(0)
  await measure.recordPage("one-step dialog, ใช้งานอยู่ without a holder (IT staff)")

  // The run's employee, the third room, then the confirm: a toast, and the refreshed page has no notice.
  await pickSearchable(page, "asset-confirm-inspection-holder", holder.code, `${holder.code} - ${holder.fullNameTh}`)
  await pickSearchable(page, "asset-confirm-inspection-location", rooms.target.code, `${rooms.target.code} - ${rooms.target.name}`)
  const confirmed = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/assets/${assets.noRound.id}/confirm-inspection` && response.request().method() === "POST")
  await dialog.getByRole("button", { name: W.submit, exact: true }).click()
  const answer = await confirmed
  expect(answer.status(), await answer.text()).toBe(200)
  // The toast and the refresh together: on a slow server the toast can end before the refreshed page arrives.
  await Promise.all([
    expect(page.getByText(W.success, { exact: true })).toBeVisible(),
    expect(inspectionNotice(page)).toHaveCount(0),
  ])
  await expect(dialog).toBeHidden()

  // The page reads ใช้งานอยู่, the holder and the room; the register agrees.
  await expect(page.getByRole("main").getByText(W.statusInUse, { exact: true }).filter({ visible: true }).first()).toBeVisible()
  await expect(factCell(page, DETAIL_WORDS.custodianCell)).toContainText(holder.fullNameTh)
  await expect(factCell(page, DETAIL_WORDS.locationCell)).toContainText(rooms.target.name)
  const saved = (await (await page.request.get(`/api/assets/${assets.noRound.id}`)).json()) as { status: { name: string }; custodianId: string | null; currentLocationId: string }
  expect(saved, "the register after ยืนยันผลตรวจ").toMatchObject({ status: { name: "In Use" }, custodianId: holder.id, currentLocationId: targetRoomId })
  await recordSettled(page, measure, "asset page after the one-step confirm (IT staff)")

  // The history: the status, holder and location rows.
  await measure.visit(`${noRoundPath}?view=history`, "the asset's history after the one-step confirm (IT staff)")
  for (const label of [W.movementStatusCorrection, W.movementCustodianChange, W.movementLocationChange]) {
    await expect(page.getByRole("main").getByText(label, { exact: true }).filter({ visible: true }).first(), label).toBeVisible()
  }
})
