// An asset inside an open audit round cannot be disposed, with the reason shown (spec §6.4.4, wiki rule 12). The test
// opens its own round on its own room (spec §11: no workflow depends on another's state); the IT head then cancels the
// round, and the same request saves.
import { asUser, expect, test } from "../support/fixtures.ts"
import {
  actAs,
  chooseSearchable,
  createAssets,
  createRoom,
  employeeLabel,
  escapeRegExp,
  readAssetChoices,
  recordPrefix,
  expectToast,
} from "./disposal-support.ts"

asUser("itStaff")

test("IT staff cannot request disposal of an asset in an open audit round, and can once the round is cancelled", async ({ page, measure, e2eTheme }, testInfo) => {
  const prefix = recordPrefix(testInfo, "DSP3")
  const roomId = await createRoom(`${prefix}-R`, `${prefix} ห้องทดสอบตัดจำหน่าย`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${prefix}-A1`])

  // IT staff open a round on the room (the round's own workflow is spec §6.2's; here it is the condition).
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

  // 1. The request form's asset search shows the asset, not choosable, with the reason.
  await measure.visit("/th/disposal/new", "IT staff: new disposal request")
  await page.locator("#disposal-request-asset").fill(asset.assetTag)
  const option = page.getByRole("option", { name: new RegExp(escapeRegExp(asset.assetTag)) })
  await expect(option).toBeDisabled()
  await expect(option).toContainText("อยู่ในรอบตรวจนับที่ยังไม่ปิด")
  await measure.recordPage("IT staff: the asset in an open round, with its reason")

  // 2. The request opened for the asset (as the audit finding's "open a disposal request" link does) is refused on save,
  // with the reason, and the asset keeps its status.
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request opened for the asset")
  await expect(page.getByText(`${asset.assetTag} - ${asset.name}`)).toBeVisible()
  await chooseSearchable(page, "disposal-request-requested-by", employeeLabel("itStaff"))
  await page.locator("#disposal-request-reason").fill(`${prefix} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`)
  measure.expectRefusal({ method: "POST", url: /\/api\/disposal-requests$/, status: 400, reason: "an asset in an open audit round cannot be disposed (DISPOSAL_ASSET_BLOCKED)" })
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expectToast(page, "ทรัพย์สินยังมีงานค้างที่ต้องปิดก่อนสร้างคำขอตัดจำหน่าย")
  await expect(page).toHaveURL(/\/th\/disposal\/new\?assetId=/)
  await measure.recordPage("IT staff: the refusal's reason")
  const before = (await (await page.request.get(`/api/assets/${asset.id}`)).json()) as { status?: { name?: string } }
  expect(before.status?.name).toBe("Ready")

  // 3. The IT head cancels the round (closing it needs every item checked; cancelling is the IT head's other way out).
  await actAs(page, "itHead", e2eTheme)
  const cancel = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ยกเลิกรอบเพื่อทดสอบการตัดจำหน่าย` } })
  expect(cancel.status(), await cancel.text()).toBe(200)

  // 4. The same request now saves.
  await actAs(page, "itStaff", e2eTheme)
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "IT staff: the request after the round is cancelled")
  await chooseSearchable(page, "disposal-request-requested-by", employeeLabel("itStaff"))
  await page.locator("#disposal-request-reason").fill(`${prefix} ชำรุดเกินซ่อม เสนอตัดจำหน่าย`)
  await measure.timed("IT staff: save the request", async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await page.waitForURL(/\/th\/disposal\/[0-9a-f-]{36}$/)
  })
  await expectToast(page, "สร้างคำขอตัดจำหน่ายสำเร็จ")
  await expect(page.getByRole("main").getByText("รออนุมัติ").first()).toBeVisible()
  await measure.recordPage("IT staff: the request, pending approval")
})
