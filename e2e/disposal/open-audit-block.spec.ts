// An asset inside an open audit round cannot be disposed, with the reason shown (spec §6.4.4, wiki rule 12). The test
// opens its own round on its own room (spec §11: no workflow depends on another's state); the IT head then cancels the
// round, and the same request saves. The request form is board DP-New (group 6 plan 3): a ready asset opened by
// ?assetId= shows as its card, a blocked one is not chosen and the page names why, and the send needs a method and a
// photo.
import { asUser, expect, test } from "../support/fixtures.ts"
import {
  actAs,
  chooseMethod,
  createAssets,
  createRoom,
  escapeRegExp,
  expectPresetRequester,
  expectReadyAssetCard,
  PHOTO_PNG,
  readAssetChoices,
  recordPrefix,
  requestPhotoInput,
  sendRequestButton,
  expectToast,
} from "./disposal-support.ts"

asUser("itStaff")

test("IT staff cannot request disposal of an asset in an open audit round, and can once the round is cancelled", async ({ page, measure, e2eTheme }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP3")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])
  const reason = `${prefix} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`

  // 1. IT staff open the request for the asset while it is still ready (as the audit finding's "open a disposal request"
  // link does) and fill it: the card and its ready line, the method, the reason, a photo.
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request opened for the asset")
  await expectReadyAssetCard(page, asset)
  await expectPresetRequester(page, "itStaff")
  await chooseMethod(page, "ทำลาย")
  await page.locator("#disposal-request-reason").fill(reason)
  await requestPhotoInput(page).setInputFiles(PHOTO_PNG)
  await expect(page.locator("[data-disposal-queued-photo]")).toHaveCount(1)

  // 2. Meanwhile IT staff open a round on the room (the round's own workflow is spec §6.2's; here it is the condition).
  const today = new Date().toISOString().slice(0, 10)
  const roundResponse = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบตรวจนับห้องตัดจำหน่าย`,
      auditYear: new Date().getFullYear(),
      scopeCompanyId: null,
      scopeBranchId: null,
      scopeDepartmentId: null,
      scopeLocationId: roomId,
      scopeCategoryId: null,
      scopeCustodianId: null,
      scopeStatusId: null,
      scopeConditionId: null,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: today,
      endDate: today,
      status: "open",
    },
  })
  expect(roundResponse.status(), await roundResponse.text()).toBe(201)
  const round = (await roundResponse.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the round holds the room's one asset").toBe(1)

  // 3. The filled request is refused on send, with the reason, and the asset keeps its status.
  measure.expectRefusal({ method: "POST", url: /\/api\/disposal-requests$/, status: 400, reason: "an asset in an open audit round cannot be disposed (DISPOSAL_ASSET_BLOCKED)" })
  await sendRequestButton(page).click()
  await expectToast(page, "ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย")
  await expect(page).toHaveURL(/\/th\/disposal\/new\?assetId=/)
  await measure.recordPage("IT staff: the refusal's reason")
  const before = (await (await page.request.get(`/api/assets/${asset.id}`)).json()) as { status?: { name?: string } }
  expect(before.status?.name).toBe("Ready")

  // 4. The request form's asset search shows the asset, not choosable, with the reason.
  await measure.visit("/th/disposal/new", "IT staff: new disposal request")
  await page.locator("#disposal-request-asset").fill(asset.assetTag)
  const option = page.getByRole("option", { name: new RegExp(escapeRegExp(asset.assetTag)) })
  await expect(option).toBeDisabled()
  await expect(option).toContainText("อยู่ในรอบตรวจนับที่ยังไม่ปิด")
  await measure.recordPage("IT staff: the asset in an open round, with its reason")

  // 5. Opened for the asset now, the form does not choose it: the page names it and why, over the picker.
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request opened for a blocked asset")
  const blocked = page.locator("[data-disposal-initial-blocked]")
  await expect(blocked).toContainText(asset.assetTag)
  await expect(blocked).toContainText("ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย · อยู่ในรอบตรวจนับที่ยังไม่ปิด")
  await expect(page.locator("[data-disposal-asset-card]")).toHaveCount(0)
  await measure.recordPage("IT staff: the blocked asset named over the picker")

  // 6. The IT head cancels the round (closing it needs every item checked; cancelling is the IT head's other way out).
  await actAs(page, "itHead", e2eTheme)
  const cancel = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ยกเลิกรอบเพื่อทดสอบการตัดจำหน่าย` } })
  expect(cancel.status(), await cancel.text()).toBe(200)

  // 7. The same request now saves.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request after the round is cancelled")
  await expectReadyAssetCard(page, asset)
  await chooseMethod(page, "ทำลาย")
  await page.locator("#disposal-request-reason").fill(reason)
  await requestPhotoInput(page).setInputFiles(PHOTO_PNG)
  await measure.timed("IT staff: save the request", async () => {
    await sendRequestButton(page).click()
    await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างคำขอตัดจำหน่ายสำเร็จ")
  await expect(page.getByRole("main").getByText("รอพิจารณา").filter({ visible: true }).first()).toBeVisible()
  await measure.recordPage("IT staff: the request, pending approval")
})
