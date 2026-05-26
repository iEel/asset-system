import assert from "node:assert/strict"
import test from "node:test"

import {
  assetLabelQrSizeToMm,
  defaultAssetLabelTemplates,
  formatAssetLabelPageSize,
  getAssetLabelTapePrinterSize,
  parseAssetLabelTemplates,
} from "../src/lib/asset-label-template.ts"

test("defaults label printing to 18mm tape", () => {
  assert.equal(defaultAssetLabelTemplates.defaultTapeSize, "18")
  assert.equal(parseAssetLabelTemplates({}).defaultTapeSize, "18")
})

test("maps Brother 18mm tape to the expected printer size label", () => {
  assert.equal(getAssetLabelTapePrinterSize("18"), '18mm / 0.70"')
  assert.equal(getAssetLabelTapePrinterSize("24"), '24mm / 0.94"')
})

test("formats the 18mm print page size from the selected template", () => {
  const config = defaultAssetLabelTemplates.tapes["18"]

  assert.equal(formatAssetLabelPageSize(config), "70mm 18mm")
})

test("keeps the 18mm QR size and margin suitable for laminated tape", () => {
  const config = defaultAssetLabelTemplates.tapes["18"]
  const qrSizeMm = assetLabelQrSizeToMm(config.qrSize)

  assert.ok(qrSizeMm >= 10, `expected QR size at least 10mm, got ${qrSizeMm}`)
  assert.ok(qrSizeMm <= 12, `expected QR size no more than 12mm, got ${qrSizeMm}`)
  assert.ok(config.marginMm >= 1)
  assert.ok(config.marginMm <= 2)
})
