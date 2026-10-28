// Spec §6.1.4: IT staff take an E2E asset back (รับคืน) from the receiver: the RT- document, then the asset's status
// and room after it; a return marked "send to repair" (ส่งซ่อม) opens a repair record. A wrong entry first shows its
// errors under the fields (spec §6.7). The handover before each return goes through the checkout API (handover.spec.ts
// walks the handover form itself).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
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
  record,
  searchAssets,
  signOnPad,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { bangkokDate } from "./tx-plan.ts"
import { TX_WORDS } from "./tx-words.ts"
import { factCell, primaryAction } from "../asset-detail/detail-steps.ts"
import { DETAIL_WORDS } from "../asset-detail/detail-words.ts"

asUser("itStaff")

test("a return: the RT- document prints, and the asset is Ready in the room it was taken to, with no custodian", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
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
  // The handover's holder returns it: return-by starts filled (spec 6.3).
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await record(measure, "return form", testInfo)

  // A wrong entry first: nothing chosen; each error shows under its field and the first takes focus.
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  for (const field of ["checkin-receive-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"]) {
    await expectFieldError(page, field, "กรุณาระบุข้อมูลนี้")
  }
  await expect(page.locator("#checkin-receive-by")).toBeFocused()

  await pickSearchable(page, "checkin-receive-by", staff.code, `${staff.code} - ${staff.fullNameTh}`)
  await page.locator("#checkin-condition-after").selectOption({ label: "ดี" })
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await page.locator("#checkin-next-location").selectOption({ label: `${room.code} - ${room.name}` })
  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByRole("main")).toContainText("photo.png")
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับคืน" }), e2eDevice, browserName)

  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toContainText(receiver.fullNameTh)
  await expect(review).toContainText(staff.fullNameTh)
  await expect(review).toContainText("พร้อมใช้งาน")
  await expect(review).toContainText(room.code)
  await expect(review).toContainText("รูปหรือ ลายเซ็น 3 รายการ")
  await record(measure, "return review", testInfo)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkin`) && response.request().method() === "POST")
  await measure.timed("return save", async () => {
    await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
    await saved
  })
  const checkin = (await (await saved).json()) as { id: string; documentNo: string }
  expect(checkin.documentNo).toMatch(/^RT-/)

  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${checkin.id}`)
  await expect(page.getByRole("heading", { level: 1, name: "ใบรับคืนทรัพย์สิน" })).toBeVisible()
  await expect(page.getByText(checkin.documentNo, { exact: true }).first()).toBeVisible()
  await record(measure, "RT- document", testInfo)
  await expectPrints(page, "พิมพ์ใบรับคืน")

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Ready")
  expect(after.currentLocationId).toBe(room.id)
  expect(after.custodianId).toBeNull()
  await visitAssetPage(measure, asset.id, "asset after the return", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("พร้อมใช้งาน")
  await expect(page.getByRole("main")).toContainText(room.name)
})

test("a return sent to repair opens an unfinished repair record, and the asset is Under Maintenance", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver2
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RT2", "โน้ตบุ๊กคืนส่งซ่อม")
  const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
  const problem = `${asset.assetTag} จอแตกตอนรับคืน`

  // Found on the empty form (spec 6.3): by the holder's name the answer is one group, theirs; picked by its tag, the
  // handover's document shows and its holder starts as return-by.
  await visit(measure, "/th/asset-management/checkin", "return form", testInfo)
  const listbox = await searchAssets(page, "checkin-checkout", receiver.fullNameTh)
  const groups = listbox.locator("[data-asset-option-group]")
  await expect(groups).toHaveCount(1)
  await expect(groups).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(groups).toContainText(new RegExp(TX_WORDS.holderCount.replace("{count}", "\\d+")))
  await record(measure, "return picker, grouped by the holder", testInfo)
  await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)
  await expect(page.getByRole("main")).toContainText(handover.documentNo)
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await pickSearchable(page, "checkin-receive-by", staff.code, `${staff.code} - ${staff.fullNameTh}`)
  await page.locator("#checkin-condition-after").selectOption({ label: "เสียหาย" })
  await page.locator("#checkin-next-status").selectOption({ label: "ส่งซ่อม" })
  await page.locator("#checkin-next-location").selectOption({ label: `${room.code} - ${room.name}` })
  await expect(page.getByRole("main")).toContainText("ระบบจะสร้างบันทึกซ่อม (ยังซ่อมไม่เสร็จ) ให้อัตโนมัติ")
  await page.getByLabel("รายละเอียดปัญหาในใบซ่อม").fill(problem)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)

  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toContainText("อยู่ระหว่างซ่อม")
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkin`) && response.request().method() === "POST")
  await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
  const checkin = (await (await saved).json()) as { id: string; documentNo: string }
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${checkin.id}`)
  await record(measure, "RT- document (sent to repair)", testInfo)

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Under Maintenance")
  const tickets = (await (await page.request.get(`/api/maintenance-tickets?assetId=${asset.id}`)).json()) as { data: { id: string; repairNo: string; repairStatus: string; problem: string }[] }
  expect(tickets.data, "one repair record for the asset").toHaveLength(1)
  const [ticket] = tickets.data
  expect(ticket.problem).toContain(problem)
  expect(["open", "in_progress"]).toContain(ticket.repairStatus)

  // The repair record is where the person goes next: it opens from the asset page.
  await visitAssetPage(measure, asset.id, "asset sent to repair", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("อยู่ระหว่างซ่อม")
  await visit(measure, `/th/maintenance/${ticket.id}`, "the repair record", testInfo)
  await expect(page.getByRole("main")).toContainText(ticket.repairNo)
  await expect(page.getByRole("main")).toContainText(asset.assetTag)
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
  await expect(page.getByRole("main")).toContainText("มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่")
  await expect(page.getByLabel("รายละเอียดปัญหาในใบซ่อม")).toHaveCount(0)
  await record(measure, "return form, an open repair", testInfo)
  await pickSearchable(page, "checkin-receive-by", staff.code, `${staff.code} - ${staff.fullNameTh}`)
  await page.locator("#checkin-condition-after").selectOption({ label: "เสียหาย" })
  await page.locator("#checkin-next-location").selectOption({ label: `${room.code} - ${room.name}` })
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้คืน" }), e2eDevice, browserName)

  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toContainText("อยู่ระหว่างซ่อม")
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkin`) && response.request().method() === "POST")
  await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
  const savedResponse = await saved
  expect(savedResponse.status(), "the return under repair is saved").toBe(201)
  const checkin = (await savedResponse.json()) as { id: string; documentNo: string }
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkins/${checkin.id}`)
  await record(measure, "RT- document (returned under repair)", testInfo)

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
