// The transaction rehearsal's axe findings, one expected-to-fail test each (known-findings.ts): the workflow tests drop
// exactly these violations, and these tests keep them in view. Each passes once the app is fixed, and Playwright then
// reports it ("expected to fail, but passed"): the fix task removes the test.fail line and the known entry together.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { createTxAsset, ensureSecondLocation, handoverByApi, pickSearchable, readAssetMasters, settle } from "./tx-support.ts"

asUser("itStaff")

test("the asset page's QR code has a text alternative (finding TX-A2)", async ({ page, measure }, testInfo) => {
  test.fail(true, "TX-A2: axe svg-img-alt, the QR code's svg has role img and no title")
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "QR1", "โน้ตบุ๊กตรวจป้าย QR")
  const record = await measure.visit(`/th/assets/${asset.id}`, "asset page")
  expect(record.axe?.failing.filter((violation) => violation.id === "svg-img-alt") ?? []).toEqual([])
})

test("an A4 document's fields are a description list (finding TX-A3)", async ({ page, measure }, testInfo) => {
  // TX-A3 fixed (FX1): this test now keeps the documents' fields a description list.
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "DL1", "โน้ตบุ๊กตรวจเอกสาร A4")
  const handover = await handoverByApi(page, asset.id, readRunData().employees.receiver2.id, masters.goodConditionId)
  const record = await measure.visit(`/th/asset-management/checkouts/${handover.id}`, "HO- document")
  expect(record.axe?.failing.filter((violation) => violation.id === "dlitem") ?? []).toEqual([])
})

test("a review dialog that scrolls on the phone takes keyboard focus (finding TX-A8)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice !== "phone", "the review dialog scrolls on the phone only")
  test.fail(true, "TX-A8: axe scrollable-region-focusable, the dialog body scrolls and takes no focus")
  const receiver = readRunData().employees.receiver2
  const room = await ensureSecondLocation()
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "SC1", "โน้ตบุ๊กตรวจหน้าตรวจสอบ")
  await page.goto(`/th/asset-management/transfer?assetId=${asset.id}`)
  await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
  await pickSearchable(page, page.getByRole("button", { name: /^ผู้ถือครองปลายทาง/ }), receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.locator("#transfer-reason").fill(`${asset.assetTag} ตรวจหน้าตรวจสอบบนมือถือ`)
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "ตรวจสอบก่อนโอนย้าย" })).toBeVisible()
  await settle(page)
  const record = await measure.recordPage("transfer review on the phone")
  expect(record.axe?.failing.filter((violation) => violation.id === "scrollable-region-focusable") ?? []).toEqual([])
})
