// Group 3 spec §8.2, §8.5, §8.6, §7.1 and §17: a return that leaves one component out, the parent's next ส่งมอบ that warns
// of it, and its late return while the parent sits in IT stock. Three serial tests per project on a computer of their
// own and two ส่วนควบ installed through the component route (the run has no computer with components). รับคืน has no
// phone steps (§8.8): both devices save through the footer and the review. The summary card shows from lg only (P2-R12),
// so the phone reads the footer's counts instead. ส่งมอบ is opened and never saved: a handed-over parent would make the
// late return stand alone (§8.6). The other late-return branch, ผู้คืน who is not the holder, ถอดออก and the department
// setting are the units' and UAT's (plan 2 tasks 1-5).
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { thaiDay } from "./tx-plan.ts"
import {
  type CreatedAsset,
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  findAssetRow,
  handoverByApi,
  installComponentByApi,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  readReturnDepartment,
  record,
  returnChecklistBox,
  saveLateReturn,
  saveReturnForm,
  visit,
  visitAssetPage,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itStaff")

// The component left out: one word, so "<holder code> <this word>" is a two-word search that finds it (§8.6, §11).
const LEFT_OUT_LABEL = "อะแดปเตอร์ติดเครื่อง"

type ComponentsRun = { parent: CreatedAsset; kept: CreatedAsset; leftOut: CreatedAsset; checkin: { id: string; documentNo: string } }
const runs = new Map<string, ComponentsRun>()

test.describe("a component left out of a return", () => {
  test.describe.configure({ mode: "serial" })

  test("a return with one component left out: the checklist, the counts, the RT- lists it, and it stays with the person returning (spec §8.2, §8.4, §8.5)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const { department: runDepartment, location: runRoom } = runRecords(readRunState().runId)
    const room = await ensureSecondLocation()
    const returnDepartment = await readReturnDepartment()
    const masters = await readAssetMasters(page)
    const parent = await createTxAsset(page, masters, testInfo.project.name, "RCP", "โน้ตบุ๊กคืนส่วนควบ")
    const kept = await createTxAsset(page, masters, testInfo.project.name, "RCM", "เมาส์ติดเครื่อง", { ownershipType: "component" })
    const leftOut = await createTxAsset(page, masters, testInfo.project.name, "RCK", LEFT_OUT_LABEL, { ownershipType: "component" })
    await installComponentByApi(page, parent.id, kept.id, "เมาส์", "1")
    await installComponentByApi(page, parent.id, leftOut.id, "อะแดปเตอร์", "2")
    const handover = await handoverByApi(page, parent.id, receiver.id, masters.goodConditionId)
    expect((await readAsset(page, leftOut.id)).custodianId, "the handover took the component along (§7.1)").toBe(receiver.id)

    await visit(measure, `/th/asset-management/checkin?checkoutId=${handover.id}`, "return form, a computer with two components", testInfo)
    await expect(pickedAsset(page, parent.id)).toContainText(parent.assetTag)
    // Every component that travelled is listed and ticked (§8.2, call 10); unticked, it reads ยังไม่ได้คืน.
    const checklist = page.locator("#checkin-components")
    await expect(checklist.getByRole("checkbox")).toHaveCount(2)
    await expect(returnChecklistBox(page, kept.assetTag)).toBeChecked()
    await expect(returnChecklistBox(page, leftOut.assetTag)).toBeChecked()
    await expect(checklist).not.toContainText(TX_WORDS.componentNotReturned)
    await returnChecklistBox(page, leftOut.assetTag).uncheck()
    await expect(returnChecklistBox(page, leftOut.assetTag)).not.toBeChecked()
    await expect(checklist).toContainText(TX_WORDS.componentNotReturned)

    await conditionChip(page, "ดี", "checkin-condition-after").check()
    await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
    await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
    const counts = fillTemplate(TX_WORDS.componentsBack, { returned: 1, missing: 1 })
    if (e2eDevice === "desktop") {
      // The summary: ได้คืน 1 · ขาด 1, the return department, and the warning that names the one left out and its holder (§8.4).
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator('[data-summary-row="components"]')).toContainText(counts)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(returnDepartment.name)
      await expect(summary).toContainText(templatePattern(TX_WORDS.missingWarning, {}))
      await expect(summary).toContainText(leftOut.assetTag)
      await expect(summary).toContainText(receiver.fullNameTh)
    } else {
      // The phone's footer counts them over the primary button (§8.8).
      await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.phoneComponentsFooter, { returned: 1, missing: 1 }))
    }
    await record(measure, "return form, one component left out", testInfo)

    const checkin = await saveReturnForm(page, parent.id, async (review) => {
      await expect(review).toContainText(counts)
      await record(measure, "return review, one component left out", testInfo)
    })
    expect(checkin.missingComponents).toEqual([{ assetTag: leftOut.assetTag, name: leftOut.name }])
    runs.set(testInfo.project.name, { parent, kept, leftOut, checkin: { id: checkin.id, documentNo: checkin.documentNo } })

    // The RT- lists it as missing, with the person and the room it stays with (§8.5); nothing has come back late yet.
    const missing = page.locator('[data-document-line="missing"]')
    await expect(missing).toHaveCount(1)
    await expect(missing).toHaveText(fillTemplate(TX_WORDS.documentMissingHeld, { component: `${leftOut.assetTag} - ${leftOut.name}`, holder: `${receiver.code} - ${receiver.fullNameTh}`, location: `${runRoom.code} - ${runRoom.name}` }))
    await expect(page.locator('[data-document-line="returned"]')).toHaveCount(0)
    await record(measure, "RT- document, a component left out", testInfo)

    // The parent and the component that came back: IT stock in the chosen room, the return department (§6). The one left
    // out keeps ผู้คืน (its holder already), its room and its department (§8.5, P2-R7).
    expect((await readAsset(page, parent.id)).status.name).toBe("Ready")
    for (const [assetId, label] of [[parent.id, "the parent"], [kept.id, "the component that came back"]] as const) {
      const after = await readAsset(page, assetId)
      expect([after.custodianId, after.currentLocationId, after.departmentId], label).toEqual([null, room.id, returnDepartment.id])
    }
    const stays = await readAsset(page, leftOut.id)
    expect([stays.custodianId, stays.currentLocationId, stays.departmentId], "the component left out").toEqual([receiver.id, data.locationId, data.departmentId])

    // The parent's component manager (Task 5) keeps it as ค้างคืน · อยู่กับ <holder> · <RT-> (§8.5).
    await visit(measure, `/th/assets/${parent.id}/components`, "the parent's components, one outstanding", testInfo)
    await expect(page.getByRole("main")).toContainText(`${TX_WORDS.componentOutstanding} · ${fillTemplate(TX_WORDS.componentOutstandingWith, { holder: `${receiver.code} - ${receiver.fullNameTh}` })} · ${checkin.documentNo}`)
    // The asset pages read the same line (Task 12, spec §8.5): the parent's components tab lists it apart from its count,
    // and the component's own page names its parent with it in the first fact.
    for (const [assetId, view, label] of [[parent.id, "components", "the parent's components tab, one outstanding"], [leftOut.id, undefined, "the outstanding component's page"]] as const) {
      await visitAssetPage(measure, assetId, label, testInfo, view)
      await expect(page.getByRole("main")).toContainText(`${TX_WORDS.componentOutstanding} · ${fillTemplate(TX_WORDS.componentOutstandingWith, { holder: `${receiver.code} - ${receiver.fullNameTh}` })} · ${checkin.documentNo}`)
    }
  })

  test("the parent's next ส่งมอบ warns that a component is still out and leaves it behind (spec §7.1, §7.3, decision 8)", async ({ page, measure, e2eDevice }, testInfo) => {
    const run = runs.get(testInfo.project.name)
    expect(run, "the return test ran first").toBeTruthy()
    if (!run) return
    const receiver = readRunData().employees.receiver1
    await visit(measure, `/th/asset-management/checkout?assetId=${run.parent.id}`, "handover form, a component still out", testInfo)
    await expect(pickedAsset(page, run.parent.id)).toContainText(run.parent.assetTag)
    // Section 1, the phone's step 1: the warning "ยังค้างคืน 1 รายการ: <tag> <name> · อยู่กับ <holder> · ตั้งแต่ <RT->"
    // (checkout.componentsOutstanding), apart from the one that travels. Its list is read part by part.
    const part = page.locator('[data-checkout-part="asset"]')
    const warning = part.locator("[data-checkout-outstanding]")
    await expect(warning).toBeVisible()
    await expect(warning).toContainText(templatePattern(TX_WORDS.checkoutOutstanding, { count: "1" }))
    for (const text of [run.leftOut.assetTag, run.leftOut.name, receiver.fullNameTh, run.checkin.documentNo]) await expect(warning).toContainText(text)
    await expect(part).toContainText(fillTemplate(TX_WORDS.componentsTravel, { count: 1 }))
    const travelling = part.locator("ul").filter({ has: page.getByText(run.kept.assetTag, { exact: true }) })
    await expect(travelling).toHaveCount(1)
    await expect(travelling).not.toContainText(run.leftOut.assetTag)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="operation-summary-card"] [data-summary-row="components"]')).toContainText(fillTemplate(TX_WORDS.checkoutSummaryOutstanding, { count: 1 }))
    }
    await record(measure, "handover form, a component still out", testInfo)
    // Not saved: the late return re-attaches only while the parent sits in IT stock (§8.6).
  })

  test("the late return of the component, its parent in IT stock: found by its tag and by its holder, re-attached, and the RT- line (spec §8.6)", async ({ page, measure, e2eDevice }, testInfo) => {
    const run = runs.get(testInfo.project.name)
    expect(run, "the return test ran first").toBeTruthy()
    if (!run) return
    const { parent, leftOut, checkin } = run
    const data = readRunData()
    const receiver = data.employees.receiver1
    const staff = data.employees.itStaff
    const holder = `${receiver.code} - ${receiver.fullNameTh}`
    const room = await ensureSecondLocation()
    const returnDepartment = await readReturnDepartment()

    await visit(measure, "/th/asset-management/checkin", "return form, empty", testInfo)
    // Its own row, takeable: "ส่วนควบค้างคืน ของ <parent> · <RT->". It is never ข้อมูลเก่า (neither the line nor the badge),
    // although it has a holder and no handover (§8.5).
    const row = await findAssetRow(page, "checkin-checkout", leftOut.assetTag, leftOut.assetTag)
    await expect(row).not.toHaveAttribute("aria-disabled", "true")
    await expect(row).toContainText(`${fillTemplate(TX_WORDS.outstandingLine, { parentTag: parent.assetTag })} · ${checkin.documentNo}`)
    await expect(row).not.toContainText("ข้อมูลเก่า")
    await record(measure, "return picker, a component still out", testInfo)
    // The holder's code and a word of its name find it, under the holder (§8.6, §11).
    const byHolder = await findAssetRow(page, "checkin-checkout", `${receiver.code} ${LEFT_OUT_LABEL}`, leftOut.assetTag)
    await expect(page.locator("#checkin-checkout-listbox [data-asset-option-group]").filter({ has: page.locator(`[data-asset-option="${leftOut.id}"]`) })).toContainText(holder)
    await byHolder.click()
    await expect(pickedAsset(page, leftOut.id)).toContainText(leftOut.assetTag)

    // The short panel (§8.6, P2-R4): the parent, the RT-, ผู้รับคืน = you. No room is asked, since the parent is in IT
    // stock, and the full form's parts are not rendered.
    const main = page.getByRole("main")
    for (const text of [parent.assetTag, parent.name, checkin.documentNo]) await expect(main).toContainText(text)
    await expect(page.locator("#checkin-late-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
    for (const id of ["checkin-late-location", "checkin-components", "checkin-condition-after", "checkin-next-status", "checkin-next-location"]) await expect(page.locator(`#${id}`), id).toHaveCount(0)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.checkinFooter, { tag: leftOut.assetTag, returner: holder }))
    }
    await record(measure, "late return panel, the parent in IT stock", testInfo)

    // The day the panel sends, read before the save: a clock read after it could fall on the next Bangkok day.
    const lateReturnDay = await page.locator("#checkin-late-return-date").inputValue()
    const late = await saveLateReturn(page, leftOut.id, async (review) => {
      await expect(review).toContainText(leftOut.assetTag)
      await record(measure, "late return review", testInfo)
    })
    expect(late).toEqual({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome: "reattached" })

    // The RT- keeps it in its list, now followed by its late return (§8.6): no new document number.
    await expect(page.locator('[data-document-line="missing"]')).toHaveCount(1)
    await expect(page.locator('[data-document-line="returned"]')).toHaveText(fillTemplate(TX_WORDS.documentComponentReturned, { tag: leftOut.assetTag, date: thaiDay(lateReturnDay), name: `${staff.code} - ${staff.fullNameTh}` }))
    await record(measure, "RT- document, the late return", testInfo)

    // Re-attached: the parent's room and department, no holder (P2-R7); the parent stays in IT stock.
    const back = await readAsset(page, leftOut.id)
    expect([back.custodianId, back.currentLocationId, back.departmentId], "the component back in its parent").toEqual([null, room.id, returnDepartment.id])
    const parentAfter = await readAsset(page, parent.id)
    expect([parentAfter.status.name, parentAfter.custodianId, parentAfter.currentLocationId]).toEqual(["Ready", null, room.id])
    await visit(measure, `/th/assets/${parent.id}/components`, "the parent's components, all installed", testInfo)
    await expect(page.getByRole("main")).toContainText(leftOut.assetTag)
    await expect(page.getByRole("main")).not.toContainText(fillTemplate(TX_WORDS.componentOutstandingWith, { holder }))
  })
})
