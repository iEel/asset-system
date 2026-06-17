import assert from "node:assert/strict"
import test from "node:test"

import {
  assetLabelQrSizeToMm,
  buildAssetLabelTokenValues,
  defaultAssetLabelTemplates,
  formatAssetLabelPageSize,
  getAssetLabelTapePrinterSize,
  parseAssetLabelTemplates,
  renderAssetLabelTemplate,
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

test("uses compact printable asset names for the default 18mm label line", () => {
  const config = defaultAssetLabelTemplates.tapes["18"]

  assert.equal(config.lines[1], "{labelAssetName}")
  assert.equal(parseAssetLabelTemplates({}).compactAssetNameEnabled, true)
})

test("upgrades the legacy 18mm default asset name line when compact labels are enabled", () => {
  const templates = parseAssetLabelTemplates({
    asset_label_compact_asset_name_enabled: "true",
    asset_label_18_secondary_template: "{assetName}",
  })

  assert.equal(templates.tapes["18"].lines[1], "{labelAssetName}")
})

test("keeps the legacy 18mm asset name line when compact labels are disabled", () => {
  const templates = parseAssetLabelTemplates({
    asset_label_compact_asset_name_enabled: "false",
    asset_label_18_secondary_template: "{assetName}",
  })

  assert.equal(templates.tapes["18"].lines[1], "{assetName}")
})

test("builds a compact label asset name without changing the full asset name token", () => {
  const values = buildAssetLabelTokenValues(
    {
      assetTag: "SNI-EQU-25-0132",
      assetName: "Computer Component TRANSCEND 16GB DDR4-3200",
      serialNumber: "SN123",
      category: "Computer Component - อุปกรณ์คอมพิวเตอร์",
      company: "SNI",
      branch: "HQ",
      location: "IT Store",
      scanHint: "Scan for asset detail",
    },
    { compactAssetNameEnabled: true }
  )

  assert.equal(values.assetName, "Computer Component TRANSCEND 16GB DDR4-3200")
  assert.equal(values.labelAssetName, "TRANSCEND 16GB DDR4-3200")
  assert.equal(renderAssetLabelTemplate("{labelAssetName}", values), "TRANSCEND 16GB DDR4-3200")
})

test("can disable compact printable asset names for label templates", () => {
  const values = buildAssetLabelTokenValues(
    {
      assetTag: "SNI-EQU-25-0132",
      assetName: "Computer Component TRANSCEND 16GB DDR4-3200",
      serialNumber: "SN123",
      category: "Computer Component - อุปกรณ์คอมพิวเตอร์",
      company: "SNI",
      branch: "HQ",
      location: "IT Store",
      scanHint: "Scan for asset detail",
    },
    { compactAssetNameEnabled: false }
  )

  assert.equal(values.assetName, "Computer Component TRANSCEND 16GB DDR4-3200")
  assert.equal(values.labelAssetName, "Computer Component TRANSCEND 16GB DDR4-3200")
})

test("keeps the 18mm QR size and margin suitable for laminated tape", () => {
  const config = defaultAssetLabelTemplates.tapes["18"]
  const qrSizeMm = assetLabelQrSizeToMm(config.qrSize)

  assert.ok(qrSizeMm >= 10, `expected QR size at least 10mm, got ${qrSizeMm}`)
  assert.ok(qrSizeMm <= 12, `expected QR size no more than 12mm, got ${qrSizeMm}`)
  assert.ok(config.marginMm >= 1)
  assert.ok(config.marginMm <= 2)
})
