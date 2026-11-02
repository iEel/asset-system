// Page group 4 plan 2 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §7; plan rulings
// P2-R1, P2-R3, P2-R4, P2-R5, P2-R6): the edit page is a data correction, as IT staff use it.
// - a บุคคล asset with no holder, in another department than the run's, in all four projects: the header names it; a
//   holder picked locks แผนก to "ตามผู้ถือครอง: <the holder's>"; the save first asks for เหตุผลที่แก้ under its field and
//   sends nothing; the footer's "แก้ไข n ช่อง" (a popover on the desktop, a bottom sheet on the phone) lists the holder
//   and แผนก เดิม → ใหม่ with the reason; บันทึกการแก้ไข saves; the asset is read back with the holder and the holder's
//   department, and the history reads แก้ไขข้อมูลผู้ถือครอง and แก้ไขข้อมูลแผนก with the reason, never เปลี่ยนผู้ถือครอง (a
//   real move's line);
// - เปลี่ยนรหัส, desktop only (one tag change a run is enough; the dialog is the same on the phone): the dialog's
//   warning and its error first, then a new tag that the one PUT saves, and the history's เปลี่ยนรหัสทรัพย์สิน;
// - an asset with an open handover, in all four projects: the holder, the room and แผนก are read-only, the notice names
//   the HO- and links to the handover document, never to โอนย้าย (P2-R3).
// Every asset is the test's own, made through the asset API; the department the first starts in is an existing one
// read by the seed admin (readSecondDepartment); the holder is the run's receiver. No master data is changed.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { txAssetTag } from "../transactions/tx-plan.ts"
import {
  createTxAsset,
  expectFieldError,
  handoverByApi,
  pickSearchable,
  readAsset,
  readAssetMasters,
  readSecondDepartment,
  record,
  visitAssetPage,
} from "../transactions/tx-support.ts"
import { REGISTER_WORDS } from "./register-words.ts"

asUser("itStaff")

const DESKTOP_ONLY = "one tag change a run is enough; the เปลี่ยนรหัส dialog is the same on the phone (group 4 spec §7.1)"
const FOOTER = '[data-slot="sticky-form-footer"]'
// The edit page opened from the asset page: a save goes back there (returnTo; without it the edit goes to the register).
const editFromAssetPage = (assetId: string) => `/th/assets/${assetId}/edit?returnTo=${encodeURIComponent(`/th/assets/${assetId}`)}`
// The edit page checks its tag and Serial 450 ms after it opens (the duplicate check of asset-form.tsx): บันทึกการแก้ไข
// waits (aria-disabled, #asset-save-reason) and fades back to its primary colours (transition-colors, 150 ms) when the
// answer comes. axe read it half way in E2E-1103C (phone-dark: color-contrast on .border-primary; the same page passed
// once settled), as e2e/audit/settle.ts documents for the scan's save. So the page is recorded once the check has
// answered and its wait is gone; record() then waits out the fade.
async function visitEdit(measure: Parameters<typeof record>[0], path: string, label: string, testInfo: Parameters<typeof record>[2]) {
  const page = measure.page
  const checked = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets/duplicates")
  await page.goto(path, { waitUntil: "load" })
  await checked
  await expect(page.locator("#asset-save-reason")).toHaveCount(0)
  return record(measure, label, testInfo)
}

test("a holder given on the edit page is a correction: แผนก follows the holder, the reason is asked first, the change list shows เดิม → ใหม่, and the history reads แก้ไขข้อมูลผู้ถือครอง with the reason (group 4 spec §7.1, §7.3, §7.5; P2-R4, P2-R5)", async ({ page, measure }, testInfo) => {
  const { runId } = readRunState()
  const data = readRunData()
  const runDepartment = runRecords(runId).department
  const holder = data.employees.receiver2
  const other = await readSecondDepartment()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RE1", "โน้ตบุ๊กแก้ไขผู้ถือครองหน้าแก้ไข", { departmentId: other.id })

  await visitEdit(measure, editFromAssetPage(asset.id), "asset edit, a บุคคล asset with no holder", testInfo)
  // The header names the asset, with the way back to its page (§7.1).
  await expect(page.getByRole("heading", { level: 1, name: fillTemplate(REGISTER_WORDS.editTitleNamed, { name: asset.name }) })).toBeVisible()
  await expect(page.getByRole("main").getByRole("link", { name: REGISTER_WORDS.viewAssetPage, exact: true })).toHaveAttribute("href", new RegExp(`^/th/assets/${asset.id}(?:\\?|$)`))
  const department = page.locator("#asset-department")
  await expect(department).toBeEnabled()
  await expect(department).toHaveValue(other.id)

  // A holder picked: แผนก is locked to the holder's (P2-R1), shown as the one option "ตามผู้ถือครอง: <แผนก>".
  await pickSearchable(page, "asset-custodian", holder.code, `${holder.code} - ${holder.fullNameTh}`)
  await expect(department).toBeDisabled()
  await expect(department).toContainText(fillTemplate(REGISTER_WORDS.departmentFollowsHolder, { department: runDepartment.name }))
  await expect(page.locator("[data-slot=asset-changed-field]").filter({ has: page.locator("#asset-custodian") })).toContainText(REGISTER_WORDS.fieldChanged)
  await record(measure, "asset edit, a holder picked and แผนก locked", testInfo)

  // A wrong entry first: no reason. The error shows under the field, which takes focus, and nothing is sent (P2-R4).
  let put = 0
  page.on("request", (request) => {
    if (request.method() === "PUT" && new URL(request.url()).pathname === `/api/assets/${asset.id}`) put += 1
  })
  const save = page.getByRole("button", { name: REGISTER_WORDS.saveCorrection, exact: true }).filter({ visible: true })
  await save.click()
  await expectFieldError(page, "asset-correction-reason", REGISTER_WORDS.correctionReasonRequired)
  await expect(page.locator("#asset-correction-reason")).toBeFocused()
  expect(put, "the wrong entry sends nothing").toBe(0)
  await record(measure, "asset edit, the reason asked for", testInfo)

  const reason = `${runId} บันทึกผู้ใช้งานตกหล่น`
  await page.locator("#asset-correction-reason").fill(reason)

  // The footer's change list (§7.5): a popover on the desktop, a bottom sheet on the phone, both a dialog named by the
  // count. It lists the holder and แผนก เดิม → ใหม่, then the reason.
  const count = fillTemplate(REGISTER_WORDS.changeCount, { count: 2 })
  await page.locator(FOOTER).getByRole("button", { name: count, exact: true }).click()
  const list = page.getByRole("dialog", { name: count })
  await expect(list).toBeVisible()
  for (const text of [REGISTER_WORDS.holderLabel, holder.fullNameTh, REGISTER_WORDS.departmentLabel, other.name, runDepartment.name]) await expect(list).toContainText(text)
  await expect(list).toContainText(fillTemplate(REGISTER_WORDS.changeListReason, { reason }))
  await record(measure, "asset edit, the change list", testInfo)
  await page.keyboard.press("Escape")
  await expect(list).toHaveCount(0)

  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/assets/${asset.id}` && response.request().method() === "PUT")
  await measure.timed("asset edit correction save", async () => {
    await save.click()
    await saved
  })
  expect((await saved).status(), `PUT /api/assets/${asset.id}`).toBe(200)
  await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}`)

  // Read back: held by the receiver, in the holder's department (the run's).
  const after = await readAsset(page, asset.id)
  expect([after.custodianId, after.departmentId]).toEqual([holder.id, data.departmentId])

  // The history: the correction's own lines with the reason, and no real move's line (P2-R5).
  await visitAssetPage(measure, asset.id, "asset history after an edit correction", testInfo, "history")
  const main = page.getByRole("main")
  await expect(main).toContainText(REGISTER_WORDS.holderCorrected)
  await expect(main).toContainText(REGISTER_WORDS.departmentCorrected)
  await expect(main).toContainText(reason)
  await expect(main).not.toContainText(REGISTER_WORDS.holderChanged)
})

test("เปลี่ยนรหัส: the dialog warns about the printed labels and asks for the new tag, the one save keeps it, and the history reads เปลี่ยนรหัสทรัพย์สิน (group 4 spec §7.1; P2-R5, P2-R6)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const { runId } = readRunState()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RE2", "โน้ตบุ๊กเปลี่ยนรหัสหน้าแก้ไข")
  const newTag = txAssetTag(runId, testInfo.project.name, "RE2N")

  await visitEdit(measure, editFromAssetPage(asset.id), "asset edit, before a tag change", testInfo)
  // On the edit page the tag is text with เปลี่ยนรหัส beside it (§7.1).
  const tag = page.locator("#asset-tag")
  await expect(tag.locator(".tag")).toHaveText(asset.assetTag)
  // The button's name reads the field and the current code before เปลี่ยนรหัส (its label points at the row).
  await tag.getByRole("button", { name: `${REGISTER_WORDS.assetTagLabel} ${asset.assetTag} ${REGISTER_WORDS.changeTag}`, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: REGISTER_WORDS.changeTagTitle })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(REGISTER_WORDS.changeTagWarning)
  await expect(page.locator("#asset-tag-new")).toHaveValue(asset.assetTag)

  // A wrong entry first: an empty tag. The error shows under the field and the field keeps focus.
  await page.locator("#asset-tag-new").fill("")
  await dialog.getByRole("button", { name: REGISTER_WORDS.changeTagConfirm, exact: true }).click()
  await expectFieldError(page, "asset-tag-new", REGISTER_WORDS.required)
  await expect(page.locator("#asset-tag-new")).toBeFocused()
  await record(measure, "asset edit, the tag dialog and its error", testInfo)

  // The new tag only sets the form's tag (P2-R6): the field shows it with แก้แล้ว and the old tag after เดิม.
  await page.locator("#asset-tag-new").fill(newTag)
  await dialog.getByRole("button", { name: REGISTER_WORDS.changeTagConfirm, exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(tag.locator(".tag")).toHaveText(newTag)
  const changed = page.locator("[data-slot=asset-changed-field]").filter({ has: tag })
  await expect(changed).toContainText(REGISTER_WORDS.fieldChanged)
  await expect(changed).toContainText(fillTemplate(REGISTER_WORDS.fieldWas, { value: asset.assetTag }))
  await expect(page.locator(FOOTER).getByRole("button", { name: fillTemplate(REGISTER_WORDS.changeCount, { count: 1 }), exact: true })).toBeVisible()
  await record(measure, "asset edit, a new tag set", testInfo)

  // A tag change asks for no reason: the one PUT saves it.
  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/assets/${asset.id}` && response.request().method() === "PUT")
  await page.getByRole("button", { name: REGISTER_WORDS.saveCorrection, exact: true }).filter({ visible: true }).click()
  expect((await saved).status(), `PUT /api/assets/${asset.id}`).toBe(200)
  await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}`)
  expect((await readAsset(page, asset.id)).assetTag).toBe(newTag)

  await visitAssetPage(measure, asset.id, "asset history after a tag change", testInfo, "history")
  await expect(page.getByRole("main")).toContainText(REGISTER_WORDS.tagChanged)
})

test("an open handover locks the holder, the room and แผนก on the edit page: the notice names the HO- and links to the handover document, not to โอนย้าย (group 4 spec §7.3; P2-R3)", async ({ page, measure }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RE3", "โน้ตบุ๊กมีใบส่งมอบหน้าแก้ไข")
  const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
  const held = await readAsset(page, asset.id)
  expect(held.custodianId, "the handover gave the asset its holder").toBe(receiver.id)

  await visitEdit(measure, `/th/assets/${asset.id}/edit`, "asset edit, an open handover", testInfo)
  const main = page.getByRole("main")
  await expect(main).toContainText(fillTemplate(REGISTER_WORDS.openHandoverLock, { documentNo: handover.documentNo }))
  await expect(main.getByRole("link", { name: REGISTER_WORDS.openHandoverLink, exact: true })).toHaveAttribute("href", `/th/asset-management/checkouts/${handover.id}`)
  await expect(main.locator('a[href*="/asset-management/transfer"]')).toHaveCount(0)

  // Read-only, each still showing the stored value (the server lock refuses all three, P2-R3).
  const custodian = page.locator("#asset-custodian")
  await expect(custodian).toBeDisabled()
  await expect(custodian).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  const room = page.locator("#asset-current-location")
  await expect(room).toBeDisabled()
  await expect(room).toHaveValue(held.currentLocationId)
  const department = page.locator("#asset-department")
  await expect(department).toBeDisabled()
  await expect(department).toHaveValue(held.departmentId ?? "")
  // Nothing changed, so no reason field and no change list.
  await expect(page.locator("#asset-correction-reason")).toHaveCount(0)
  await expect(page.locator(FOOTER).getByRole("button", { name: templatePattern(REGISTER_WORDS.changeCount, { count: "\\d+" }) })).toHaveCount(0)
})
