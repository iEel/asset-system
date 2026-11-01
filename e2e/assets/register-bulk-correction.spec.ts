// Page group 4 plan 1 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §6.3, §6.5, §6.6,
// decision 11; plan rulings P1-R1, P1-R6): the register's bulk update is a correction. IT staff tick a บุคคล asset and a
// ส่วนกลาง asset (both พร้อมใช้งาน with no holder and no handover, both in another department than the run's), open
// "แก้ไขข้อมูลหลายรายการ" from the selection bar's "อื่น ๆ", see its errors first, then give both one holder with a
// reason. The บุคคล asset takes the holder's department (the line in the dialog says so), the ส่วนกลาง asset keeps its
// own; the history reads แก้ไขข้อมูลผู้ถือครอง (and แก้ไขข้อมูลแผนก for the บุคคล one only) with the reason.
// Desktop only: the selection bar with "อื่น ๆ" is the desktop's (§6.5); the phone's floating bar is the old one, kept.
// The department the assets start in is an existing one read by the seed admin (readSecondDepartment, as the
// department tests of group 3 read it); the holder is the run's receiver. No master data is changed.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, expectFieldError, readAsset, readAssetMasters, readSecondDepartment, record, visit, visitAssetPage } from "../transactions/tx-support.ts"
import { REGISTER_WORDS } from "./register-words.ts"

asUser("itStaff")

const DESKTOP_ONLY = "the selection bar's อื่น ๆ is the desktop's (group 4 spec §6.5)"
const BAR = "[data-asset-selection-bar]"

test("a บุคคล and a ส่วนกลาง asset given one holder in one correction: the บุคคล one takes the holder's department, the ส่วนกลาง one keeps its own, and the history reads แก้ไขข้อมูลผู้ถือครอง with the reason (group 4 spec §6.6, plan 1 Review Focus 2)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const { runId } = readRunState()
  const data = readRunData()
  const runDepartment = runRecords(runId).department
  const holder = data.employees.receiver2
  const other = await readSecondDepartment()
  const masters = await readAssetMasters(page)
  const personal = await createTxAsset(page, masters, testInfo.project.name, "RBP", "โน้ตบุ๊กแก้ไขข้อมูลบุคคล", { departmentId: other.id })
  const shared = await createTxAsset(page, masters, testInfo.project.name, "RBS", "โน้ตบุ๊กแก้ไขข้อมูลส่วนกลาง", { ownershipType: "shared", departmentId: other.id })

  // The two tags' common start finds them and nothing else.
  const search = txAssetTag(runId, testInfo.project.name, "RB")
  await visit(measure, `/th/assets?search=${encodeURIComponent(search)}`, "register, two assets to correct", testInfo)
  const main = page.getByRole("main")
  await expect(main).toContainText(fillTemplate(REGISTER_WORDS.range, { from: 1, to: 2, total: 2 }))

  // The header's ส่งออก / นำเข้า (§6.3): the export with the filter's count, and the import on its own page.
  await main.getByRole("button", { name: REGISTER_WORDS.exportImportMenu, exact: true }).click()
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem", { name: fillTemplate(REGISTER_WORDS.exportFilteredCount, { count: 2 }) })).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: REGISTER_WORDS.importFromExcel })).toHaveAttribute("href", "/th/asset-management/import-export")
  await page.keyboard.press("Escape")
  await expect(menu).toHaveCount(0)

  // Both ticked: the bar counts them, with พิมพ์ป้าย and อื่น ๆ (§6.5).
  const table = page.locator("[data-asset-desktop-table]")
  for (const asset of [personal, shared]) await table.getByRole("checkbox", { name: asset.assetTag, exact: true }).check()
  const bar = page.locator(BAR)
  await expect(bar).toContainText(fillTemplate(REGISTER_WORDS.selectedOnPage, { count: 2 }))
  await expect(bar.getByRole("button", { name: fillTemplate(REGISTER_WORDS.printLabelsCount, { count: 2 }), exact: true })).toBeVisible()
  await bar.getByRole("button", { name: REGISTER_WORDS.moreActions, exact: true }).click()
  await page.getByRole("menu").getByRole("menuitem", { name: REGISTER_WORDS.bulkUpdate, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: REGISTER_WORDS.bulkCorrectionTitle })
  await expect(dialog).toBeVisible()
  await record(measure, "register, two ticked and the correction open", testInfo)

  // A wrong entry first: nothing chosen and no reason. Both errors show under their fields, the first takes focus, and
  // nothing is posted.
  let posted = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/assets/bulk-update") posted += 1
  })
  await dialog.getByRole("button", { name: REGISTER_WORDS.applyBulkUpdate, exact: true }).click()
  await expectFieldError(page, "asset-bulk-location", REGISTER_WORDS.bulkFieldRequired)
  await expectFieldError(page, "asset-bulk-reason", REGISTER_WORDS.required)
  await expect(page.locator("#asset-bulk-location")).toBeFocused()
  expect(posted, "the wrong entry posts nothing").toBe(0)
  await record(measure, "the correction's errors", testInfo)

  // The holder: the line says the department follows for the บุคคล one only (the ส่วนกลาง one keeps its own).
  await page.locator("#asset-bulk-custodian").selectOption(holder.id)
  await expect(dialog.locator("[data-asset-bulk-department]")).toHaveText(fillTemplate(REGISTER_WORDS.departmentFollows, { department: runDepartment.name, count: 1 }))
  const reason = `${runId} แก้ไขผู้ถือครองตามจริง`
  await page.locator("#asset-bulk-reason").fill(reason)
  await record(measure, "the correction filled", testInfo)

  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets/bulk-update" && response.request().method() === "POST")
  await measure.timed("bulk correction save", async () => {
    await dialog.getByRole("button", { name: REGISTER_WORDS.applyBulkUpdate, exact: true }).click()
    await saved
  })
  expect((await saved).status()).toBe(200)
  expect(await (await saved).json()).toMatchObject({ updated: 2, unchanged: 0 })
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: REGISTER_WORDS.bulkUpdateSuccess })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await expect(bar).toHaveCount(0)
  // The list is read again: the บุคคล row shows the holder with the holder's department.
  const personalRow = table.locator("tbody tr").filter({ has: page.getByRole("checkbox", { name: personal.assetTag, exact: true }) })
  await expect(personalRow).toContainText(holder.fullNameTh)
  await expect(personalRow).toContainText(runDepartment.name)
  await record(measure, "register after the correction", testInfo)

  // Read back: both held by the receiver; the บุคคล one in the holder's department and in use, the ส่วนกลาง one in its
  // own department and still ready (decision 3; Review Focus 2).
  const personalAfter = await readAsset(page, personal.id)
  expect([personalAfter.custodianId, personalAfter.departmentId, personalAfter.status.name]).toEqual([holder.id, data.departmentId, "In Use"])
  const sharedAfter = await readAsset(page, shared.id)
  expect([sharedAfter.custodianId, sharedAfter.departmentId, sharedAfter.status.name]).toEqual([holder.id, other.id, "Ready"])

  // The history: the correction's own lines with the reason typed (P1-R6).
  await visitAssetPage(measure, personal.id, "the บุคคล asset's history", testInfo, "history")
  await expect(main).toContainText(REGISTER_WORDS.holderCorrected)
  await expect(main).toContainText(REGISTER_WORDS.departmentCorrected)
  await expect(main).toContainText(reason)
  await visitAssetPage(measure, shared.id, "the ส่วนกลาง asset's history", testInfo, "history")
  await expect(main).toContainText(REGISTER_WORDS.holderCorrected)
  await expect(main).toContainText(reason)
  await expect(main).not.toContainText(REGISTER_WORDS.departmentCorrected)
})
