// Spec §6.1.4: IT staff take an E2E asset back (รับคืน) from the receiver: the RT- document, then the asset's status
// and room after it; a return marked "send to repair" (ส่งซ่อม) opens a repair record. A wrong entry first shows its
// errors under the fields (spec §6.7). The handover before each return goes through the checkout API (handover.spec.ts
// walks the handover form itself). The return writes the return department (group 3 spec §6, §12: the setting's default
// IT, which E2E never saves); the page's people start filled, the condition chips start empty and the room is
// searchable (§8.3); and a ส่งซ่อม return links its repair record from the RT- (§8.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import {
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  expectPrints,
  handoverByApi,
  PHOTO_FIXTURE,
  pickAsset,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  readReturnDepartment,
  record,
  saveReturnForm,
  searchAssets,
  signOnPad,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { bangkokDate, RETURN_DEPARTMENT_CODE } from "./tx-plan.ts"
import { TX_WORDS } from "./tx-words.ts"
import { factCell, primaryAction } from "../asset-detail/detail-steps.ts"
import { DETAIL_WORDS } from "../asset-detail/detail-words.ts"

asUser("itStaff")

test("a return: the RT- document prints, and the asset is Ready in the room it was taken to, with no custodian and the return department", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
  const returnDepartment = await readReturnDepartment()
  const runDepartment = runRecords(readRunState().runId).department
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RT1", "โน้ตบุ๊กรับคืน")
  const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)

  // From the asset page's primary action (spec §7.1: an open handover's is รับคืน).
  await visitAssetPage(measure, asset.id, "asset handed over", testInfo)
  const primary = primaryAction(page, e2eDevice)
  await expect(primary).toHaveAccessibleName("รับคืน")
  await primary.click()
  await expect(page).toHaveURL(new RegExp(`/th/asset-management/checkin\\?checkoutId=${handover.id}`))
  await expect(page.getByRole("heading", { level: 1, name: "รับคืนทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await expect(page.getByRole("main")).toContainText(handover.documentNo)
  // The handover's holder returns it, and the signed-in person receives it, tagged คุณ (group 3 spec §8.3).
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(page.locator("#checkin-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
  await record(measure, "return form", testInfo)

  // A wrong entry first: the condition (no default), the status after the return and the room are empty. Each error shows
  // under its field, and the condition group's first chip takes focus.
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  for (const field of ["checkin-condition-after", "checkin-next-status", "checkin-next-location"]) {
    await expectFieldError(page, field, "กรุณาระบุข้อมูลนี้")
  }
  await expect(page.locator('input[name="checkin-condition-after"]').first()).toBeFocused()

  await conditionChip(page, "ดี", "checkin-condition-after").check()
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByRole("main")).toContainText("photo.png")
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับคืน" }), e2eDevice, browserName)
  if (e2eDevice === "desktop") {
    // The summary promises the return department (spec §6, §8.4), and the footer names the return (spec §5).
    const department = page.locator('[data-slot="operation-summary-card"] [data-summary-row="department"]')
    await expect(department).toContainText(runDepartment.name)
    await expect(department).toContainText(returnDepartment.name)
    await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.checkinFooter, { tag: asset.assetTag, returner: `${receiver.code} - ${receiver.fullNameTh}` }))
    await record(measure, "return summary", testInfo)
  }

  const checkin = await saveReturnForm(page, asset.id, async (review) => {
    await expect(review).toContainText(receiver.fullNameTh)
    await expect(review).toContainText(staff.fullNameTh)
    await expect(review).toContainText("พร้อมใช้งาน")
    await expect(review).toContainText(room.code)
    await expect(review).toContainText("รูปหรือ ลายเซ็น 3 รายการ")
    await record(measure, "return review", testInfo)
  })
  expect(checkin.documentNo).toMatch(/^RT-/)
  expect([checkin.missingComponents, checkin.repair]).toEqual([[], null])
  await expect(page.getByRole("heading", { level: 1, name: "ใบรับคืนทรัพย์สิน" })).toBeVisible()
  await expect(page.getByText(checkin.documentNo, { exact: true }).first()).toBeVisible()
  await expect(page.locator("[data-document-lines]")).toHaveCount(0)
  await record(measure, "RT- document", testInfo)
  await expectPrints(page, "พิมพ์ใบรับคืน")

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Ready")
  expect(after.currentLocationId).toBe(room.id)
  expect(after.custodianId).toBeNull()
  // The return department, read from the asset (spec §6, §12): the setting's default; the change is its own history line.
  expect(after.departmentId).toBe(returnDepartment.id)
  expect(after.department?.code).toBe(RETURN_DEPARTMENT_CODE)
  await visitAssetPage(measure, asset.id, "asset after the return", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("พร้อมใช้งาน")
  await expect(page.getByRole("main")).toContainText(room.name)
  await visitAssetPage(measure, asset.id, "asset history after the return", testInfo, "history")
  await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
})

test("a return sent to repair opens an unfinished repair record, the asset is Under Maintenance, and the RT- links the record", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver2
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RT2", "โน้ตบุ๊กคืนส่งซ่อม")
  const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
  const problem = `${asset.assetTag} จอแตกตอนรับคืน`

  // Found on the empty form (spec 6.3): by the holder's code the answer is one group, theirs; picked by its tag, the
  // handover's document shows and its holder starts as return-by.
  await visit(measure, "/th/asset-management/checkin", "return form", testInfo)
  // by the holder's code: a full name is several words, and each word now matches on its own (group 3 spec §11)
  const listbox = await searchAssets(page, "checkin-checkout", receiver.code)
  const groups = listbox.locator("[data-asset-option-group]")
  await expect(groups).toHaveCount(1)
  await expect(groups).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(groups).toContainText(new RegExp(TX_WORDS.holderCount.replace("{count}", "\\d+")))
  await record(measure, "return picker, grouped by the holder", testInfo)
  await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)
  await expect(page.getByRole("main")).toContainText(handover.documentNo)
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(page.locator("#checkin-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
  await conditionChip(page, "เสียหาย", "checkin-condition-after").check()
  // The broken condition already picks ส่งซ่อม (P2-R16); choosing it again changes nothing.
  await page.locator("#checkin-next-status").selectOption({ label: "ส่งซ่อม" })
  await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
  await expect(page.getByRole("main")).toContainText(TX_WORDS.sendToRepairHint)
  await page.getByLabel("รายละเอียดปัญหาในใบซ่อม").fill(problem)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)

  const checkin = await saveReturnForm(page, asset.id, async (review) => {
    await expect(review).toContainText("อยู่ระหว่างซ่อม")
  })
  await record(measure, "RT- document (sent to repair)", testInfo)

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Under Maintenance")
  const tickets = (await (await page.request.get(`/api/maintenance-tickets?assetId=${asset.id}`)).json()) as { data: { id: string; repairNo: string; repairStatus: string; problem: string }[] }
  expect(tickets.data, "one repair record for the asset").toHaveLength(1)
  const [ticket] = tickets.data
  expect(ticket.problem).toContain(problem)
  expect(["open", "in_progress"]).toContain(ticket.repairStatus)
  expect(checkin.repair).toEqual({ id: ticket.id, repairNo: ticket.repairNo, joined: false })

  // The RT- links the record the return opened (spec §8.7): the person goes there from the document.
  const repairLink = page.getByRole("link", { name: fillTemplate(TX_WORDS.repairOpened, { repairNo: ticket.repairNo }), exact: true })
  await expect(repairLink).toHaveAttribute("href", `/th/maintenance/${ticket.id}`)
  await repairLink.click()
  await page.waitForURL((url) => url.pathname === `/th/maintenance/${ticket.id}`)
  await expect(page.getByRole("main")).toContainText(ticket.repairNo)
  await expect(page.getByRole("main")).toContainText(asset.assetTag)
  await record(measure, "the repair record, from the RT- document", testInfo)
  await visitAssetPage(measure, asset.id, "asset sent to repair", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("อยู่ระหว่างซ่อม")
})

test("a permanent handover whose asset went into repair is returned into ส่งซ่อม under that repair, with no second record and no custodian (S-R48)", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RT3", "โน้ตบุ๊กซ่อมแล้วรับคืน")
  await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)

  // An unfinished repair through the repair form's own route (every key of its body): the handed-over notebook goes
  // In Use -> Under Maintenance (src/lib/repair-record-policy.ts), its handover still open.
  const problem = `${asset.assetTag} เปิดไม่ติด ส่งซ่อมระหว่างถือครอง`
  const opened = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId: asset.id,
      maintenancePlanId: null,
      problem,
      reportedDate: bangkokDate(),
      done: false,
      outcome: "usable",
      reportedById: staff.id,
      vendorId: null,
      repairCost: null,
      invoiceNo: null,
      remark: "E2E repair before the return",
    },
  })
  expect(opened.status(), `POST /api/maintenance-tickets: ${(await opened.text()).slice(0, 300)}`).toBe(201)
  const repair = (await opened.json()) as { id: string; repairNo: string; repairStatus: string }
  expect(repair.repairStatus).toBe("in_progress")
  expect((await readAsset(page, asset.id)).status.name, "the repair moved the asset").toBe("Under Maintenance")

  // On รับคืน the asset is takeable, and its next status is locked to ส่งซ่อม under the open repair (S-R43).
  await visit(measure, "/th/asset-management/checkin", "return form", testInfo)
  await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)
  const nextStatus = page.locator("#checkin-next-status option")
  await expect(nextStatus).toHaveCount(1)
  await expect(nextStatus).toHaveText("ส่งซ่อม")
  await expect(page.getByRole("main")).toContainText(TX_WORDS.openRepairNotice)
  await expect(page.getByLabel("รายละเอียดปัญหาในใบซ่อม")).toHaveCount(0)
  await record(measure, "return form, an open repair", testInfo)
  await expect(page.locator("#checkin-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
  await conditionChip(page, "เสียหาย", "checkin-condition-after").check()
  await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)

  const checkin = await saveReturnForm(page, asset.id, async (review) => {
    await expect(review).toContainText("อยู่ระหว่างซ่อม")
  })
  expect(checkin.repair).toEqual({ id: repair.id, repairNo: repair.repairNo, joined: true })
  await record(measure, "RT- document (returned under repair)", testInfo)
  // The RT- links the record the return joined (spec §8.7).
  await expect(page.getByRole("link", { name: fillTemplate(TX_WORDS.repairJoined, { repairNo: repair.repairNo }), exact: true })).toHaveAttribute("href", `/th/maintenance/${repair.id}`)

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Under Maintenance")
  expect(after.custodianId).toBeNull()
  // The repair list still has the one record, still open: the return joined it.
  const listed = (await (await page.request.get(`/api/maintenance-tickets?assetId=${asset.id}`)).json()) as { data: { id: string; repairStatus: string }[] }
  expect(listed.data.map((ticket) => ticket.id), "one repair record for the asset").toEqual([repair.id])
  expect(listed.data[0].repairStatus).toBe("in_progress")

  await visitAssetPage(measure, asset.id, "asset returned under repair", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("อยู่ระหว่างซ่อม")
  await expect(factCell(page, DETAIL_WORDS.custodianCell)).toContainText("ไม่มีผู้ถือครอง")
})
