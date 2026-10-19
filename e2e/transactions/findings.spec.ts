// The transaction rehearsal's axe findings, one expected-to-fail test each (known-findings.ts): the workflow tests drop
// exactly these violations, and these tests keep them in view. Each passes once the app is fixed, and Playwright then
// reports it ("expected to fail, but passed"): the fix task removes the test.fail line and the known entry together.
import { asUser, expect, test } from "../support/fixtures.ts"
import { createTxAsset, readAssetMasters } from "./tx-support.ts"

asUser("itStaff")

test("the asset page's QR code has a text alternative (finding TX-A2)", async ({ page, measure }, testInfo) => {
  test.fail(true, "TX-A2: axe svg-img-alt, the QR code's svg has role img and no title")
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "QR1", "โน้ตบุ๊กตรวจป้าย QR")
  const record = await measure.visit(`/th/assets/${asset.id}`, "asset page")
  expect(record.axe?.failing.filter((violation) => violation.id === "svg-img-alt") ?? []).toEqual([])
})
