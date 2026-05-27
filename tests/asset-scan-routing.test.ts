import assert from "node:assert/strict"
import test from "node:test"
import { buildDirectAssetHrefFromScanValue } from "../src/lib/asset-scan-routing.ts"

test("opens asset detail directly from printed QR resolver URL", () => {
  assert.equal(
    buildDirectAssetHrefFromScanValue(
      "https://asset.soniclogistic.org/q/a/41552d77-e2e7-45d2-8594-0fa3e7dea45f",
      "th"
    ),
    "/th/assets/41552d77-e2e7-45d2-8594-0fa3e7dea45f"
  )
})

test("opens asset detail directly from existing asset detail URL", () => {
  assert.equal(
    buildDirectAssetHrefFromScanValue(
      "https://asset.soniclogistic.org/th/assets/41552d77-e2e7-45d2-8594-0fa3e7dea45f#ownership",
      "th"
    ),
    "/th/assets/41552d77-e2e7-45d2-8594-0fa3e7dea45f"
  )
})

test("does not route arbitrary serial or asset tag values directly", () => {
  assert.equal(buildDirectAssetHrefFromScanValue("SNI-EQU-16-0031", "th"), "")
})
