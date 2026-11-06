// Page group 7 plan 4 (docs/superpowers/plans/2026-11-06-group7-multi-return.md Task 5): รับคืนหลายรายการ, in all four
// projects, as the IT head (the run's role holds employee:view for the employee page, and asset:edit).
// - The seed admin creates the run's employee (as the employees spec does). It holds five run assets: three handed over
//   (HO-), one held with no handover (ข้อมูลเก่า, created with the person as custodian) and one held with no handover and
//   an open repair.
// - Crafted requests first (Review Focus 2, 4, 5): no signatures is refused before anything is read; a request that
//   holds the repair machine is refused with the machine named, and nothing is saved (the ข้อมูลเก่า one still has no HO-).
// - The return page's holder group links "รับคืนทั้งหมดของ {holder}" to the form.
// - The employee page's "รับคืนหลายรายการ" opens the form: four ticked, the repair one locked with "รับคืนทีละรายการ"
//   and its link to the single form. One condition is changed to เสียหาย; both signatures.
// - Review Focus 1: meanwhile one machine is returned elsewhere (a one-machine batch through the API); the save is
//   refused, the banner and the row name it, everything typed is kept; นำรายการที่รับคืนไม่ได้ออก, then the save.
// - The RT- lists the three machines (the ข้อมูลเก่า one with its backfilled HO-); each asset is Ready with no custodian;
//   the employee page then holds only the repair one (and the one returned elsewhere is gone too).
// - Review Focus 3: one line is cancelled from the RT- page (the single cancel, a POST); the page shows it voided and
//   the others active.
// Every record made here carries the run id and the project's code; no shared master data is changed.
import { readFileSync } from "node:fs"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { EMPLOYEE_WORDS as W } from "../master-data/employees-words.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { bangkokDate, projectCode, txAssetName } from "./tx-plan.ts"
import {
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  handoverByApi,
  PHOTO_FIXTURE,
  pickSearchable,
  readAsset,
  readAssetMasters,
  searchAssets,
  signOnPad,
  TRANSACTION_PAGE_ARRIVAL_MS,
  type AssetMasters,
  type CreatedAsset,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itHead")

type RunEmployee = { id: string; code: string; fullNameTh: string }
type Room = { id: string; code: string; name: string }
type BatchItem = { assetId: string; checkoutId: string | null; conditionAfter: string; nextStatusId: string }

const BATCH_PATH = "/api/asset-checkins/batch"

// The run's employee of this project, created by the seed admin (the employee API's whole body, as employees.spec.ts):
// E2E-1107A-DL-MR.
async function createRunEmployee(projectName: string): Promise<RunEmployee> {
  const { runId } = readRunState()
  const run = readRunData()
  const code = `${runId}-${projectCode(projectName)}-MR`
  const fullNameTh = txAssetName(runId, projectName, "พนักงานคืนหลายรายการ")
  const admin = await seedAdminApi()
  try {
    const response = await admin.post("/api/employees", {
      data: {
        code, fullNameTh, fullNameEn: null, email: null, companyId: run.companyId, branchId: run.branchId, departmentId: run.departmentId,
        position: null, employmentStatus: "active", managerId: null, isActive: true,
      },
    })
    expect(response.status(), `POST /api/employees ${code}: ${(await response.text()).slice(0, 300)}`).toBe(201)
    return { id: ((await response.json()) as { id: string }).id, code, fullNameTh }
  } finally {
    await admin.dispose()
  }
}

// An unfinished repair through the repair form's own route (every key of its body), as return.spec.ts opens one.
async function openRepair(page: Page, asset: CreatedAsset): Promise<void> {
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId: asset.id, maintenancePlanId: null, problem: `${asset.assetTag} เปิดไม่ติด ส่งซ่อมระหว่างถือครอง`, reportedDate: bangkokDate(),
      done: false, outcome: "usable", reportedById: readRunData().employees.itHead.id, vendorId: null, repairCost: null, invoiceNo: null,
      remark: "E2E repair of a held asset (the multi-return)",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
}

// The batch API as the form posts it (multipart), from the test itself: page.request is not the page's own network, so
// its refusals are the test's assertions, not app errors.
async function postBatch(page: Page, employee: RunEmployee, room: Room, items: BatchItem[], options: { signatures: boolean }) {
  const head = readRunData().employees.itHead
  const png = { name: "signature.png", mimeType: "image/png", buffer: readFileSync(PHOTO_FIXTURE) }
  return page.request.post(BATCH_PATH, {
    multipart: {
      employeeId: employee.id,
      returnDate: bangkokDate(),
      returnBy: `${employee.code} - ${employee.fullNameTh}`,
      returnByEmployeeId: employee.id,
      receiveBy: `${head.code} - ${head.fullNameTh}`,
      receiveByEmployeeId: head.id,
      nextLocationId: room.id,
      items: JSON.stringify(items),
      ...(options.signatures ? { returnSignatureFile: png, receiveSignatureFile: png } : {}),
    },
  })
}
const item = (masters: AssetMasters, asset: CreatedAsset, checkoutId: string | null): BatchItem =>
  ({ assetId: asset.id, checkoutId, conditionAfter: masters.goodConditionId, nextStatusId: masters.readyStatusId })

// A machine's card on the form, and its tick.
const formRow = (page: Page, asset: CreatedAsset): Locator => page.locator(`[data-batch-checkin-row="${asset.assetTag}"]`)
const tick = (page: Page, asset: CreatedAsset): Locator => page.locator(`#batch-checkin-tick-${asset.id}`)
// A held asset on the employee page: the table row on the desktop, the card on the phone.
const heldEntry = (page: Page, asset: CreatedAsset): Locator =>
  page.locator("[data-employee-held-row], [data-employee-held-card]").filter({ visible: true, hasText: asset.assetTag })
// The form's footer action (the phone's bar or the desktop's), "รับคืน {n} รายการ".
const footerSave = (page: Page, count: number): Locator =>
  page.getByRole("button", { name: fillTemplate(TX_WORDS.multiReturnFooter, { count }), exact: true }).filter({ visible: true })

test("รับคืนหลายรายการ from the employee page: the repair machine locked, one returned elsewhere refused and removed, one RT- with three machines and the ข้อมูลเก่า one's HO-, Ready with no custodian, then one line cancelled (group 7 plan 4; Review Focus 1-5)", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  test.setTimeout(300_000)
  const project = testInfo.project.name
  const head = readRunData().employees.itHead
  const masters = await readAssetMasters(page)
  const room = await ensureSecondLocation()
  const employee = await createRunEmployee(project)

  const damaged = await createTxAsset(page, masters, project, "MR1", "โน้ตบุ๊กคืนหลายรายการ 1")
  const damagedHandover = await handoverByApi(page, damaged.id, employee.id, masters.goodConditionId)
  const second = await createTxAsset(page, masters, project, "MR2", "โน้ตบุ๊กคืนหลายรายการ 2")
  const secondHandover = await handoverByApi(page, second.id, employee.id, masters.goodConditionId)
  const elsewhere = await createTxAsset(page, masters, project, "MR3", "โน้ตบุ๊กคืนที่อื่นก่อน")
  const elsewhereHandover = await handoverByApi(page, elsewhere.id, employee.id, masters.goodConditionId)
  const legacy = await createTxAsset(page, masters, project, "MRL", "โน้ตบุ๊กข้อมูลเก่าคืนหลายรายการ", { custodianId: employee.id })
  const inRepair = await createTxAsset(page, masters, project, "MRR", "โน้ตบุ๊กมีงานซ่อมคืนหลายรายการ", { custodianId: employee.id })
  await openRepair(page, inRepair)

  // Review Focus 4: no signatures is refused under both signature fields, before anything else.
  const unsigned = await postBatch(page, employee, room, [item(masters, second, secondHandover.id)], { signatures: false })
  expect(unsigned.status(), (await unsigned.text()).slice(0, 300)).toBe(400)
  const unsignedBody = (await unsigned.json()) as { code: string; fieldErrors: Record<string, string> }
  expect(unsignedBody.code).toBe("BATCH_CHECKIN_SIGNATURE_REQUIRED")
  expect(Object.keys(unsignedBody.fieldErrors).sort()).toEqual(["receiveSignatureFile", "returnSignatureFile"])
  // Review Focus 2 and 5: a crafted request with the repair machine is refused, naming it alone; nothing is saved, so the
  // ข้อมูลเก่า machine keeps no HO- and the handed-over one stays with the person.
  const crafted = await postBatch(page, employee, room, [item(masters, second, secondHandover.id), item(masters, legacy, null), item(masters, inRepair, null)], { signatures: true })
  expect(crafted.status(), (await crafted.text()).slice(0, 300)).toBe(409)
  const craftedBody = (await crafted.json()) as { blocked: { assetId: string; code: string }[] }
  expect(craftedBody.blocked).toEqual([expect.objectContaining({ assetId: inRepair.id, code: "BATCH_CHECKIN_NEEDS_SINGLE" })])
  for (const asset of [second, legacy]) {
    const read = await readAsset(page, asset.id)
    expect([read.custodianId, read.status.name], `${asset.assetTag} unchanged after the refusal`).toEqual([employee.id, asset === second ? "In Use" : "Ready"])
  }

  // The return page: the holder's group links รับคืนทั้งหมดของ {holder} to the form.
  await page.goto("/th/asset-management/checkin", { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: W.checkinTitle })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  const listbox = await searchAssets(page, "checkin-checkout", employee.code)
  await expect(listbox.locator("[data-asset-option-group]")).toContainText(employee.fullNameTh)
  // The group's link stands under the list (a listbox holds options only).
  const groupLink = page.locator("[data-asset-option-group-action]").getByRole("link", { name: new RegExp(`^${TX_WORDS.multiReturnHolderGroupLink.replace("{holder}", "")}`) })
  await expect(groupLink).toHaveCount(1)
  await expect(groupLink).toContainText(employee.fullNameTh)
  await expect(groupLink).toHaveAttribute("href", new RegExp(`^/th/asset-management/checkin/batch\\?employeeId=${employee.id}`))
  await recordSettled(page, measure, "return picker, รับคืนทั้งหมดของ the holder")

  // The employee page's รับคืนหลายรายการ opens the form.
  const employeePath = `/th/master-data/employees/${employee.id}`
  await page.goto(employeePath, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: employee.fullNameTh })).toBeVisible()
  await expect(heldEntry(page, legacy)).toContainText(W.legacy)
  await recordSettled(page, measure, "employee page, five held")
  await page.getByRole("link", { name: TX_WORDS.multiReturnTitle, exact: true }).filter({ visible: true }).click()
  await page.waitForURL((url) => url.pathname === "/th/asset-management/checkin/batch" && url.searchParams.get("employeeId") === employee.id && Boolean(url.searchParams.get("returnTo")))
  await expect(page.getByRole("heading", { level: 1, name: TX_WORDS.multiReturnTitle })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  await expect(page.getByRole("main")).toContainText(fillTemplate(TX_WORDS.multiReturnHolderLine, { holder: employee.fullNameTh, count: 5 }))

  // Four ticked; the repair one locked, with its reason and รับคืนทีละรายการ to the single form (Review Focus 2).
  for (const asset of [damaged, second, elsewhere, legacy]) {
    await expect(tick(page, asset)).toBeChecked()
    await expect(tick(page, asset)).toBeEnabled()
  }
  await expect(tick(page, inRepair)).not.toBeChecked()
  await expect(tick(page, inRepair)).toBeDisabled()
  await expect(formRow(page, inRepair)).toContainText(W.reasonOpenRepair)
  const single = formRow(page, inRepair).getByRole("link", { name: TX_WORDS.multiReturnNeedsSingle, exact: true })
  await expect(single).toHaveAttribute("href", new RegExp(`^/th/asset-management/checkin\\?assetId=${inRepair.id}&returnTo=`))
  await expect(formRow(page, damaged)).toContainText(damagedHandover.documentNo)
  await expect(formRow(page, legacy)).toContainText(TX_WORDS.multiReturnLegacy)
  await expect(page.locator(`#batch-checkin-receive-by`)).toContainText(`${head.code} - ${head.fullNameTh}`)
  await expect(page.locator(`#batch-checkin-return-by`)).toContainText(employee.fullNameTh)
  // Every ticked row starts ดี and พร้อมใช้งาน; one is changed to เสียหาย (its status stays พร้อมใช้งาน, with the hint).
  await expect(conditionChip(page, "ดี", `batch-checkin-condition-${second.id}`)).toBeChecked()
  await conditionChip(page, "เสียหาย", `batch-checkin-condition-${damaged.id}`).check()
  await expect(formRow(page, damaged).locator("select")).toHaveValue(masters.readyStatusId)
  await pickSearchable(page, "batch-checkin-next-location", room.code, `${room.code} - ${room.name}`)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับคืน" }), e2eDevice, browserName)
  await recordSettled(page, measure, "multi-return form, four ticked")

  // Review Focus 1: meanwhile one machine is returned elsewhere (a one-machine batch); the save is refused, naming it.
  const away = await postBatch(page, employee, room, [item(masters, elsewhere, elsewhereHandover.id)], { signatures: true })
  expect(away.status(), (await away.text()).slice(0, 300)).toBe(201)
  measure.expectRefusal({ method: "POST", url: /\/api\/asset-checkins\/batch$/, status: 409, reason: "one machine returned elsewhere after the form opened (group 7 plan 4 Review Focus 1)" })
  const refused = page.waitForResponse((response) => response.url().endsWith(BATCH_PATH) && response.request().method() === "POST")
  await footerSave(page, 4).click()
  const firstReview = page.getByRole("dialog", { name: fillTemplate(TX_WORDS.multiReturnReviewTitle, { count: 4 }) })
  await expect(firstReview).toBeVisible()
  await firstReview.getByRole("button", { name: TX_WORDS.returnConfirm, exact: true }).click()
  expect((await refused).status()).toBe(409)
  await expect(firstReview).toBeHidden()
  const banner = page.locator("#batch-checkin-rows-error")
  await expect(banner).toContainText(fillTemplate(TX_WORDS.multiReturnBlocked, { count: 1 }))
  await expect(banner).toContainText(elsewhere.assetTag)
  await expect(formRow(page, elsewhere).locator(`#batch-checkin-reason-${elsewhere.id}`)).not.toBeEmpty()
  // Everything typed is kept: the เสียหาย pick, the room and both signatures.
  await expect(conditionChip(page, "เสียหาย", `batch-checkin-condition-${damaged.id}`)).toBeChecked()
  await expect(page.locator("#batch-checkin-next-location")).toContainText(room.code)
  await expect(page.getByRole("group", { name: "ลายเซ็นผู้คืน" }).getByRole("button", { name: "ล้างลายเซ็น" })).toBeEnabled()
  await expect(page.getByRole("group", { name: "ลายเซ็นผู้รับคืน" }).getByRole("button", { name: "ล้างลายเซ็น" })).toBeEnabled()
  await recordSettled(page, measure, "multi-return form, one machine refused")
  await page.getByRole("button", { name: TX_WORDS.multiReturnRemoveBlocked, exact: true }).click()
  await expect(tick(page, elsewhere)).not.toBeChecked()

  // The save: one RT- for the three machines.
  const saved = page.waitForResponse((response) => response.url().endsWith(BATCH_PATH) && response.request().method() === "POST")
  await footerSave(page, 3).click()
  const review = page.getByRole("dialog", { name: fillTemplate(TX_WORDS.multiReturnReviewTitle, { count: 3 }) })
  await expect(review).toBeVisible()
  for (const asset of [damaged, second, legacy]) await expect(review).toContainText(asset.assetTag)
  await expect(review).not.toContainText(elsewhere.assetTag)
  await expect(review).toContainText(room.code)
  await recordSettled(page, measure, "multi-return review")
  await review.getByRole("button", { name: TX_WORDS.returnConfirm, exact: true }).click()
  const response = await saved
  expect(response.status(), `POST ${BATCH_PATH}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const created = (await response.json()) as { documentNo: string; checkinIds: string[]; firstCheckinId: string }
  expect(created.documentNo).toMatch(/^RT-/)
  expect(created.checkinIds).toHaveLength(3)
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${created.firstCheckinId}`)
  await expect(page.getByRole("heading", { level: 1, name: W.returnDocumentTitle })).toBeVisible()
  await expect(page.getByText(created.documentNo, { exact: true }).first()).toBeVisible()
  const machines = page.locator("[data-document-machine]")
  await expect(machines).toHaveCount(3)
  const machine = (asset: CreatedAsset) => machines.filter({ hasText: asset.assetTag })
  await expect(machine(damaged)).toContainText("เสียหาย")
  await expect(machine(damaged)).toContainText(damagedHandover.documentNo)
  await expect(machine(second)).toContainText(secondHandover.documentNo)
  // Review Focus 5: the ข้อมูลเก่า machine got its backfilled HO- in the same save.
  await expect(machine(legacy)).toContainText(/HO-/)
  await expect(page.locator('[data-document-machine][data-voided="true"]')).toHaveCount(0)
  await recordSettled(page, measure, "RT- document, three machines")

  for (const asset of [damaged, second, legacy]) {
    const after = await readAsset(page, asset.id)
    expect([after.status.name, after.custodianId, after.currentLocationId], asset.assetTag).toEqual(["Ready", null, room.id])
  }

  // กลับ: the employee page, which now holds only the repair machine.
  await page.getByRole("link", { name: W.back, exact: true }).filter({ visible: true }).first().click()
  await page.waitForURL((url) => url.pathname === employeePath)
  for (const asset of [damaged, second, elsewhere, legacy]) await expect(heldEntry(page, asset)).toHaveCount(0)
  await expect(heldEntry(page, inRepair)).toContainText(W.reasonOpenRepair)
  await expect(page.getByRole("link", { name: TX_WORDS.multiReturnTitle, exact: true })).toHaveCount(0)
  await recordSettled(page, measure, "employee page, after the multi-return")

  // Review Focus 3: one line cancelled from the RT- page (the single cancel, its own record); it shows voided, the others active.
  await page.goto(`/th/asset-management/checkins/${created.firstCheckinId}`, { waitUntil: "load" })
  const damagedLine = machine(damaged)
  const damagedCheckinId = (await damagedLine.getAttribute("data-document-machine")) ?? ""
  await damagedLine.getByRole("button", { name: TX_WORDS.cancelAction }).click()
  const dialog = page.getByRole("dialog", { name: TX_WORDS.cancelTitle })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("กำลังตรวจสอบว่าสามารถยกเลิกได้หรือไม่")).toHaveCount(0)
  await dialog.getByLabel(TX_WORDS.cancelReason).fill(`${damaged.assetTag} รับคืนผิดเครื่อง`)
  await recordSettled(page, measure, "RT- document, cancel one line")
  const cancelled = page.waitForResponse((answer) => answer.url().endsWith(`/api/asset-checkins/${damagedCheckinId}/cancel`) && answer.request().method() === "POST")
  await dialog.getByRole("button", { name: TX_WORDS.cancelConfirm, exact: true }).click()
  expect((await cancelled).status()).toBe(200)
  await expect(dialog).toBeHidden()
  await expect(page.locator('[data-document-machine][data-voided="true"]')).toHaveCount(1)
  await expect(damagedLine).toHaveAttribute("data-voided", "true")
  await expect(damagedLine).toContainText(TX_WORDS.multiReturnMachineVoided)
  for (const asset of [second, legacy]) {
    await expect(machine(asset)).not.toHaveAttribute("data-voided", "true")
    await expect(machine(asset).getByRole("button", { name: TX_WORDS.cancelAction })).toHaveCount(1)
  }
  await expect(page.getByRole("status").filter({ hasText: "VOID / ยกเลิกแล้ว" })).toHaveCount(0)
  await recordSettled(page, measure, "RT- document, one line voided")
  const restored = await readAsset(page, damaged.id)
  expect([restored.status.name, restored.custodianId], "the cancel gives the machine back to the person").toEqual(["In Use", employee.id])
})
