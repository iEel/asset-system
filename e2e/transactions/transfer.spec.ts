// Spec §6.1.5: IT staff transfer (โอนย้าย) an E2E asset to the run's second room and a new custodian: the TR- document,
// the new room and custodian. Transfer had no data in the dev database and its print page had never been previewed
// (wiki #22). A wrong entry first shows its errors under the fields (spec §6.7).
// Group 3 plan 3 (spec §6, §9, §17): the page's footer ตรวจสอบและบันทึก, the ตอนนี้ → ปลายทาง table, the แผนก row that
// follows the holder, a reason chip, the summary on the desktop and the footer's line on the phone. The asset takes its
// holder's department, read back from the asset, its history (เปลี่ยนแผนก) and the TR- (แผนกเดิม). A held asset moved
// only to another room takes its holder's department (spec §14 call 4); a ส่วนกลาง asset keeps its own; a computer's
// component follows it; a broken asset is refused a new holder but still moves room (P3-R1). A transfer to a holder
// makes no HO-, so the asset comes back as a ข้อมูลเก่า row (P3-R22). The cross-branch line, inactive rooms, employees
// and departments, and the TR- cancel are the unit tests' and UAT's: both run rooms are in the run's branch, and E2E
// never changes master data.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { valueBeside } from "../repair/repair-data.ts"
import {
  centreInView,
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  expectPrints,
  findAssetRow,
  installComponentByApi,
  pickedAsset,
  pickSearchable,
  pickTransferHolder,
  readAsset,
  readAssetMasters,
  readConditionId,
  readSecondDepartment,
  record,
  saveTransferForm,
  transferNowCell,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"
import { menuItem, openMoreActions, primaryAction } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

const transfers = new Map<string, { assetId: string; assetTag: string; transferId: string; documentNo: string; custodian: string }>()

test.describe("transfer", () => {
  test.describe.configure({ mode: "serial" })

  test("a transfer to the second room and a new custodian through the footer: the แผนก row follows the holder, a reason chip starts the text, the asset takes the holder's department, and the TR- document opens, names the department before and prints", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver2
    const { department: runDepartment, location: runRoom } = runRecords(readRunState().runId)
    const room = await ensureSecondLocation()
    // The asset starts in another department, so the new holder's department is a change (spec §6, §17).
    const second = await readSecondDepartment()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR1", "โน้ตบุ๊กโอนย้าย", { departmentId: second.id })

    await visitAssetPage(measure, asset.id, "asset before the transfer", testInfo)
    // A Ready asset's primary is ส่งมอบ; its transfer is in "อื่น ๆ" (spec §7.1).
    await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("ส่งมอบ")
    await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()
    await expect(page).toHaveURL(new RegExp(`/th/asset-management/transfer\\?assetId=${asset.id}`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    // ตอนนี้ (spec §9.2): the room, no holder, the department. The cells fill from the asset's detail, so the detail has
    // landed before any save leaves the page.
    await expect(transferNowCell(page, "location")).toContainText(`${runRoom.code} - ${runRoom.name}`)
    await expect(transferNowCell(page, "holder")).toContainText(TX_WORDS.noneNow)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // No holder now and none chosen: the แผนก row is free (spec §6).
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeEnabled()
    await record(measure, "transfer form", testInfo)

    // A wrong entry first: no destination and no reason.
    await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
    await expectFieldError(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ")
    await expectFieldError(page, "transfer-reason", "กรุณาระบุข้อมูลนี้")
    await expect(page.locator("#transfer-to-location")).toBeFocused()

    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    // The table keeps the picker's name (P3-R17): its label is hidden from sight, not dropped.
    await expect(page.locator("#transfer-to-custodian")).toHaveAccessibleName(/^ผู้ถือครองปลายทาง/)
    await pickTransferHolder(page, asset.id, receiver)
    // A holder chosen: the แผนก row follows them and cannot be picked (spec §6, §9.2).
    await expect(department).toBeDisabled()
    await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))

    // A reason chip writes its word at the start of the text, focuses it and shows pressed; the person types on (§9.3).
    const chip = page.getByRole("group", { name: /^เหตุผลการโอนย้าย/ }).getByRole("button", { name: TX_WORDS.reasonChipUser, exact: true })
    await expect(chip).toHaveAttribute("data-transfer-reason-chip", "user")
    // Centred first: on the phone the footer sits right under the chips (P3-R23).
    await centreInView(chip)
    await chip.click()
    const reason = page.locator("#transfer-reason")
    await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: `)
    await expect(reason).toBeFocused()
    await expect(chip).toHaveAttribute("aria-pressed", "true")
    await reason.press("End")
    await reason.pressSequentially(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: ${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(page.locator("#transfer-to-location-error")).toHaveCount(0)

    const footer = page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    if (e2eDevice === "desktop") {
      // สรุปก่อนบันทึก (§9.3): three changes, each row by name, the next status, and no cross-branch line (both rooms are
      // in the run's branch). The footer names the changes.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      const lead = summary.locator("[data-summary-lead]")
      await expect(lead).toContainText(templatePattern(TX_WORDS.transferLead, { count: "3" }))
      await expect(lead).not.toContainText(TX_WORDS.transferKeptBoth)
      await expect(summary.locator('[data-summary-row="location"]')).toContainText(room.name)
      await expect(summary.locator('[data-summary-row="holder"]')).toContainText(receiver.fullNameTh)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(second.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.inUseStatus)
      await expect(summary).not.toContainText(templatePattern(TX_WORDS.transferCrossBranch, {}))
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))
      for (const name of [room.name, receiver.fullNameTh, runDepartment.name]) await expect(footer).toContainText(name)
    } else {
      // The phone has no card: the footer's one line counts the changes (§9.4).
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferLead, { count: "3" }))
    }
    await record(measure, "transfer form, filled", testInfo)

    const transfer = await saveTransferForm(page, asset.id, async (review) => {
      // The review lists the changes; the room and the employee read code - name (P3-R18).
      await expect(review).toContainText(room.code)
      await expect(review).toContainText(receiver.fullNameTh)
      await expect(review).toContainText(runDepartment.name)
      await expect(review).toContainText(TX_WORDS.inUseStatus)
      await record(measure, "transfer review", testInfo)
    })
    expect(transfer.documentNo).toMatch(/^TR-/)
    transfers.set(testInfo.project.name, { assetId: asset.id, assetTag: asset.assetTag, transferId: transfer.id, documentNo: transfer.documentNo, custodian: receiver.fullNameTh })

    // The form opens the TR- document, with the asset page's returnTo (user decision 2026-10-21, FX10).
    await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    const after = await readAsset(page, asset.id)
    expect(after.currentLocationId).toBe(room.id)
    expect(after.custodianId).toBe(receiver.id)
    expect(after.status.name).toBe("In Use")
    // The new holder's department (spec §6), with its own history line (spec §14 call 6).
    expect(after.departmentId).toBe(data.departmentId)
    await visitAssetPage(measure, asset.id, "asset after the transfer", testInfo)
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(receiver.fullNameTh)
    await visitAssetPage(measure, asset.id, "asset history after the transfer", testInfo, "history")
    await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)

    // The TR- document (wiki #22: never previewed before), opened at its address: the department before and after (P3-R8).
    await visit(measure, `/th/asset-management/transfers/${transfer.id}`, "TR- document", testInfo)
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    await expect(page.getByText(transfer.documentNo, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(valueBeside(page, TX_WORDS.fromDepartment)).toHaveText(`${second.code} - ${second.name}`)
    await expect(valueBeside(page, "แผนก")).toHaveText(`${runDepartment.code} - ${runDepartment.name}`)
    await expectPrints(page, "พิมพ์เอกสารโอนย้าย")
  })

  // Finding TX-A4: no page linked to /asset-management/transfers/<id>, so a person could not open the TR- document they
  // had just made.
  test("the TR- document opens from the asset page (finding TX-A4)", async ({ page, measure }, testInfo) => {
    // TX-A4 fixed (FX10): this test keeps the TR- document linked from the asset's history.
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    // The overview's ความเคลื่อนไหวล่าสุด and the history tab both link it (spec §7.5, §7.6).
    for (const view of [undefined, "history"] as const) {
      await visitAssetPage(measure, transfer.assetId, `asset after the transfer (${view ?? "overview"})`, testInfo, view)
      expect(await page.locator(`a[href*="/asset-management/transfers/${transfer.transferId}"]`).count(), `links to the TR- document (${view ?? "overview"})`).toBeGreaterThan(0)
    }
  })

  // Finding TX-A6: the TR- document printed the status and room before and after, and the department after, but not the
  // custodian, so a transfer that hands the asset to a new holder had no paper naming them. Since group 3 plan 3 it also
  // prints แผนกเดิม (P3-R8; the first test reads it).
  test("the TR- document names the new custodian (finding TX-A6)", async ({ page, measure }, testInfo) => {
    // TX-A6 fixed (FX13): this test now keeps the custodian on the TR- document.
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    await visit(measure, `/th/asset-management/transfers/${transfer.transferId}`, "TR- document", testInfo)
    await expect(page.getByRole("main")).toContainText(transfer.custodian, { timeout: 3_000 })
  })

  // The transferred asset is held with no handover: รับคืน lists it as ข้อมูลเก่า under its holder, ready to pick (spec
  // 6.3). It is read, never picked, so no backfill is made (S-R7).
  test("the transferred asset is a ข้อมูลเก่า row on รับคืน, under its holder (server asset search)", async ({ page, measure }, testInfo) => {
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    const room = await ensureSecondLocation()
    await visit(measure, "/th/asset-management/checkin", "return form, empty", testInfo)
    const row = await findAssetRow(page, "checkin-checkout", transfer.assetTag, transfer.assetTag)
    await expect(row).not.toHaveAttribute("aria-disabled", "true")
    // The ข้อมูลเก่า line names the room the transfer took it to (S-R47).
    await expect(row).toContainText(TX_WORDS.legacyRow.replace("{location}", `${room.code} - ${room.name}`))
    // The group that holds the row (the inner locator is relative to the group: Playwright queries it inside each group).
    await expect(page.locator("#checkin-checkout-listbox [data-asset-option-group]").filter({ has: page.locator(`[data-asset-option="${transfer.assetId}"]`) })).toContainText(transfer.custodian)
  })
})

// Group 3 plan 3 (spec §6, §9.2, §14 call 4, and §19's question, answered by P3-R1). Each test makes its own assets, so
// these are not serial: one failing skips none of the others.
test.describe("transfer: the department rule, ส่วนกลาง, a component and a broken asset", () => {
  test("a held asset moved only to another room takes its holder's department: the row is locked from the start, the summary shows the change, and the holder and the status stay (spec §6, §14 call 4)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const holder = data.employees.receiver1
    const runDepartment = runRecords(readRunState().runId).department
    const room = await ensureSecondLocation()
    const second = await readSecondDepartment()
    // A Ready asset with a holder and a department other than theirs (an old mismatch), made in one call: the asset API
    // creates only Draft or Ready, so this is the ข้อมูลเก่า shape (D21); the rule is the same for an In Use holder.
    const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "TR2", "โน้ตบุ๊กย้ายห้องตามผู้ถือครอง", { departmentId: second.id, custodianId: holder.id })
    const before = await readAsset(page, asset.id)
    expect([before.custodianId, before.departmentId, before.status.name]).toEqual([holder.id, second.id, "Ready"])

    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a held asset in another department", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "holder")).toContainText(`${holder.code} - ${holder.fullNameTh}`)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // The asset has a holder: the แผนก row follows them before anything is chosen.
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeDisabled()
    await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))

    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายห้องอย่างเดียว`)
    const footer = page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    if (e2eDevice === "desktop") {
      // Two changes: the room, and the department the holder's corrects. The holder and the status stay.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator("[data-summary-lead]")).toContainText(templatePattern(TX_WORDS.transferLead, { count: "2" }))
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(second.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="holder"]')).toContainText(fillTemplate(TX_WORDS.summaryKept, { value: holder.fullNameTh }))
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.statusUnchanged)
      // The footer names the changed rows only (P3-R12).
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))
      await expect(footer).toContainText(runDepartment.name)
      await expect(footer).not.toContainText(holder.fullNameTh)
    } else {
      await expect(footer).toContainText(templatePattern(TX_WORDS.transferLead, { count: "2" }))
    }
    await record(measure, "transfer form, a held asset moved only to another room", testInfo)

    await saveTransferForm(page, asset.id, async (review) => {
      // Real changes only (P3-R18): the room and the department, not the holder who stays.
      await expect(review).toContainText(room.code)
      await expect(review).toContainText(runDepartment.name)
      await expect(review).toContainText(TX_WORDS.statusUnchanged)
      await expect(review).not.toContainText(holder.fullNameTh)
    })
    const after = await readAsset(page, asset.id)
    expect([after.currentLocationId, after.custodianId, after.departmentId, after.status.name]).toEqual([room.id, holder.id, data.departmentId, "Ready"])
    await visitAssetPage(measure, asset.id, "asset history after a room-only transfer", testInfo, "history")
    await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
  })

  test("a ส่วนกลาง asset given a holder keeps its own department: the row stays free, and the save writes no department and no เปลี่ยนแผนก line (spec §6, Q1)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const runDepartment = runRecords(readRunState().runId).department
    const second = await readSecondDepartment()
    const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "TR3", "จอส่วนกลางโอนย้าย", { ownershipType: "shared", departmentId: second.id })
    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a ส่วนกลาง asset", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    await pickTransferHolder(page, asset.id, receiver)
    // ส่วนกลาง: the row stays free with a holder chosen (spec §9.2, Q1).
    const department = page.locator("#transfer-to-department")
    await expect(department).toBeEnabled()
    await expect(department).not.toContainText(templatePattern(TX_WORDS.transferFollowsHolder, {}))
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ให้ผู้ใช้งานดูแล`)
    if (e2eDevice === "desktop") {
      // The card keeps the department and never promises the holder's.
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(fillTemplate(TX_WORDS.summaryKept, { value: second.name }))
      await expect(summary).not.toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="status"]')).toContainText(TX_WORDS.inUseStatus)
    }
    await record(measure, "transfer form, a ส่วนกลาง asset to a holder", testInfo)

    const transfer = await saveTransferForm(page, asset.id)
    const after = await readAsset(page, asset.id)
    expect([after.custodianId, after.departmentId, after.status.name, after.currentLocationId]).toEqual([receiver.id, second.id, "In Use", data.locationId])
    // The history links the TR- and has no department line (P3-R7; one would also push AD2's three documents out).
    await visitAssetPage(measure, asset.id, "asset history after a ส่วนกลาง transfer", testInfo, "history")
    await expect(page.locator(`a[href*="/asset-management/transfers/${transfer.id}"]`).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("main")).not.toContainText(TX_WORDS.departmentChange)
  })

  test("a computer with an installed ส่วนควบ: the line under the table names it, and the component's room, holder and department follow the computer's (spec §9.2, §6)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver2
    const room = await ensureSecondLocation()
    const second = await readSecondDepartment()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR4", "คอมพิวเตอร์โอนย้ายพร้อมส่วนควบ", { departmentId: second.id })
    const component = await createTxAsset(page, masters, testInfo.project.name, "TR4C", "เมาส์ติดเครื่องโอนย้าย", { ownershipType: "component", departmentId: second.id })
    await installComponentByApi(page, asset.id, component.id, "เมาส์", "1")

    await visit(measure, `/th/asset-management/transfer?assetId=${asset.id}`, "transfer form, a computer with a component", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)
    // Under the table, from the sync's own filter (P3-R14).
    const travelling = page.locator("[data-transfer-components]")
    await expect(travelling).toContainText(templatePattern(TX_WORDS.transferComponentsMove, { count: "1" }))
    await expect(travelling).toContainText(component.name)
    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await pickTransferHolder(page, asset.id, receiver)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายพร้อมส่วนควบ`)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="operation-summary-card"] [data-summary-row="components"]')).toContainText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))
    }
    await record(measure, "transfer form, a computer with a component", testInfo)

    await saveTransferForm(page, asset.id, async (review) => {
      // The review's components line is the label ส่วนควบ beside the card's count (Y3).
      await expect(valueBeside(review, "ส่วนควบ")).toHaveText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))
    })
    // The computer and its component: the new room, the new holder and the holder's department (the sync, spec §6).
    for (const [assetId, label] of [[asset.id, "the computer"], [component.id, "its component"]] as const) {
      const after = await readAsset(page, assetId)
      expect([after.custodianId, after.currentLocationId, after.departmentId], label).toEqual([receiver.id, room.id, data.departmentId])
    }
  })

  test("a broken asset is refused a new holder: picking one removes it with the reason, the route refuses the same, and a room-only move saves (P3-R1, spec §19)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const damaged = await readConditionId(page, "เสียหาย")
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR5", "โน้ตบุ๊กเสียโอนย้าย", { conditionId: damaged })
    const path = `/th/asset-management/transfer?assetId=${asset.id}`

    // With no holder chosen it only moves, so the page takes it.
    await visit(measure, path, "transfer form, a broken asset", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    // A holder chosen: the page asks again under the holder's rule and removes it, with the reason (S-R40, P3-R1).
    await pickTransferHolder(page, asset.id, receiver)
    await expectFieldError(page, "transfer-asset", fillTemplate(TX_WORDS.assetClearedForCustodian, { assetTag: asset.assetTag, reason: TX_WORDS.reasonTransferDamaged }))
    await expect(page.locator("[data-asset-picked]")).toHaveCount(0)
    await record(measure, "transfer form, a broken asset removed for a holder", testInfo)

    // The route refuses the same under the asset field (a stale tab or an API caller), and nothing changes.
    const refused = await page.request.post(`/api/assets/${asset.id}/transfer`, {
      data: { toLocationId: "", toCustodianId: receiver.id, toDepartmentId: "", reason: `${asset.assetTag} ให้ผู้ถือครองใหม่`, remark: "" },
    })
    const refusal = (await refused.json()) as { code?: string; fieldErrors?: Record<string, string> }
    expect([refused.status(), refusal.code, refusal.fieldErrors?.assetId]).toEqual([409, "ASSET_TRANSFER_CONDITION_BLOCKED", "transferConditionDamaged"])
    expect((await readAsset(page, asset.id)).custodianId).toBeNull()

    // Another room needs no holder: it saves, and the asset keeps no holder, its status and its department.
    await visit(measure, path, "transfer form, a broken asset, room only", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expect(transferNowCell(page, "holder")).toContainText(TX_WORDS.noneNow)
    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายเข้าห้องเก็บ`)
    // One change; the holder and the department stay (§9.3): the card's lead, or the phone's footer line.
    const changes = e2eDevice === "desktop" ? page.locator('[data-slot="operation-summary-card"] [data-summary-lead]') : page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })
    await expect(changes).toContainText(templatePattern(TX_WORDS.transferLead, { count: "1" }))
    await expect(changes).toContainText(TX_WORDS.transferKeptBoth)
    await saveTransferForm(page, asset.id)
    const after = await readAsset(page, asset.id)
    expect([after.currentLocationId, after.custodianId, after.status.name, after.departmentId]).toEqual([room.id, null, "Ready", data.departmentId])
  })
})
