// Group 3 spec §6, §11, §17 (plan 1 task 8): ส่งมอบ reads the department back from the asset after the save, on both
// devices (the desktop's footer and review, the phone's three steps). A บุคคล asset takes the receiver's department and
// the history shows the move; a ส่วนกลาง asset keeps its own whether it goes to an employee or to a department (P1-R2),
// and the desktop's สรุปก่อนบันทึก never promises otherwise. Every run employee sits in the run's department, so the
// assets of the first three tests start in an existing active department of the master data other than the run's (code
// IT first, readSecondDepartment); the run makes no department. A search of the name's words plus a department word finds
// the asset on the picker, and another department's word finds nothing. The refusal of an inactive destination needs a
// master-data change, so it is left to the checkout route's unit tests (plan 1 task 2).
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { bangkokDate, departmentWord } from "./tx-plan.ts"
import {
  conditionChip,
  createTxAsset,
  expectNoAssetFound,
  findAssetRow,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  readSecondDepartment,
  record,
  saveHandoverForm,
  visit,
  visitAssetPage,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itStaff")
// A word of the run's department name (e2e/support/run-plan.ts: "<run> แผนกทดสอบ E2E").
const RUN_DEPARTMENT_WORD = "แผนกทดสอบ"

test("a บุคคล asset handed to an employee takes the employee's department, shown before the save and kept in the history (spec §6)", async ({ page, measure, e2eDevice }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const runDepartment = runRecords(readRunState().runId).department
  const second = await readSecondDepartment()
  const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "DR1", "โน้ตบุ๊กแผนกตามผู้รับ", { departmentId: second.id })
  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "handover form, an asset of another department", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await expect(conditionChip(page, "ดี")).toBeChecked()
  if (e2eDevice === "desktop") {
    const summary = page.locator('[data-slot="operation-summary-card"]')
    await expect(summary).toContainText(second.name)
    await expect(summary).toContainText(runDepartment.name)
    await record(measure, "handover summary, the department follows the receiver", testInfo)
  }
  await saveHandoverForm(page, e2eDevice, asset.id)
  const after = await readAsset(page, asset.id)
  expect(after.departmentId).toBe(data.departmentId)
  expect(after.custodianId).toBe(receiver.id)
  expect(after.status.name).toBe("In Use")
  await visitAssetPage(measure, asset.id, "asset history after the department moved", testInfo, "history")
  await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
})

test("a ส่วนกลาง asset handed to an employee keeps its department (P1-R2)", async ({ page, measure, e2eDevice }, testInfo) => {
  const receiver = readRunData().employees.receiver2
  const runDepartment = runRecords(readRunState().runId).department
  const second = await readSecondDepartment()
  const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "DR2", "จอส่วนกลางคงแผนก", { ownershipType: "shared", departmentId: second.id })
  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "handover form, a ส่วนกลาง asset to an employee", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  if (e2eDevice === "desktop") {
    // The card must not promise the receiver's department: a ส่วนกลาง asset keeps its own.
    const summary = page.locator('[data-slot="operation-summary-card"]')
    await expect(summary).toContainText(second.name)
    await expect(summary).not.toContainText(runDepartment.name)
  }
  await saveHandoverForm(page, e2eDevice, asset.id)
  const after = await readAsset(page, asset.id)
  expect(after.departmentId).toBe(second.id)
  expect(after.custodianId).toBe(receiver.id)
  expect(after.status.name).toBe("In Use")
})

test("a ส่วนกลาง asset lent to a department keeps its department (P1-R2)", async ({ page, measure, e2eDevice }, testInfo) => {
  const runDepartment = runRecords(readRunState().runId).department
  const second = await readSecondDepartment()
  const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "DR3", "โปรเจกเตอร์ส่วนกลางให้แผนก", { ownershipType: "shared", departmentId: second.id })
  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "handover form, a ส่วนกลาง asset to a department", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await page.locator("#checkout-type").getByRole("button", { name: "แผนก", exact: true }).click()
  await pickSearchable(page, "checkout-destination", runDepartment.code, `${runDepartment.code} - ${runDepartment.name}`)
  await page.locator("#checkout-expected-return").fill(bangkokDate(7))
  if (e2eDevice === "desktop") {
    // The card must not promise the chosen department (P1-R2); its checklist shows labels only.
    const summary = page.locator('[data-slot="operation-summary-card"]')
    await expect(summary).toContainText(second.name)
    await expect(summary).not.toContainText(runDepartment.name)
    await record(measure, "handover summary, a ส่วนกลาง asset to a department", testInfo)
  }
  await saveHandoverForm(page, e2eDevice, asset.id)
  const after = await readAsset(page, asset.id)
  expect(after.departmentId).toBe(second.id)
  expect(after.status.name).toBe("Checked Out")
  expect(after.custodianId).toBeNull()
})

test("a search of the name's words and a department word finds the asset on ส่งมอบ, and another department's word does not (spec §11, P1-R6)", async ({ page, measure }, testInfo) => {
  const runDepartment = runRecords(readRunState().runId).department
  const second = await readSecondDepartment()
  const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "MW1", "โน้ตบุ๊กค้นหาหลายคำ")
  await visit(measure, "/th/asset-management/checkout", "handover form, no asset yet", testInfo)
  // The name's three words and one of the run's department name: 4 words, each matching a field of this asset only.
  const row = await findAssetRow(page, "checkout-asset", `${asset.name} ${RUN_DEPARTMENT_WORD}`, asset.assetTag)
  await expect(row).not.toHaveAttribute("aria-disabled", "true")
  await expect(row.locator("mark", { hasText: "โน้ตบุ๊กค้นหาหลายคำ" })).toHaveCount(1)
  await record(measure, "handover picker, a multi-word answer", testInfo)
  // The same name with a word of the other department's name, which the asset's own text does not hold: nothing.
  const secondWord = departmentWord(second.name, [asset.assetTag, asset.name, runDepartment.name])
  await expectNoAssetFound(page, "checkout-asset", `${asset.name} ${secondWord}`)
})
