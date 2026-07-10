import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset scan page auto-opens direct QR resolver matches", () => {
  const source = readFileSync("src/components/assets/asset-scan-search-tool.tsx", "utf8")

  assert.match(source, /const directAssetHref = buildDirectAssetHrefFromScanValue/)
  assert.match(source, /if \(!directAssetHref\) return[\s\S]+router\.push\(directAssetHref\)/)
  assert.match(source, /onScanSuccess=\{handleScannedValue\}/)
  assert.match(source, /function handleScannedValue\(value: string\)[\s\S]+router\.push\(href\)/)
})

test("asset scan page provides camera utility labels for QR scanning", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/scan/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /cameraOpening: t\("cameraOpening"\)/)
  assert.match(page, /torchOn: t\("torchOn"\)/)
  assert.match(page, /torchOff: t\("torchOff"\)/)
  assert.match(page, /torchUnsupported: t\("torchUnsupported"\)/)
  assert.match(page, /zoomCamera: t\.raw\("zoomCamera"\)/)
  assert.match(page, /zoomUnsupported: t\("zoomUnsupported"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.assetTools.cameraOpening, "string")
    assert.equal(typeof messages.assetTools.torchOn, "string")
    assert.equal(typeof messages.assetTools.torchOff, "string")
    assert.equal(typeof messages.assetTools.torchUnsupported, "string")
    assert.equal(typeof messages.assetTools.zoomCamera, "string")
    assert.equal(typeof messages.assetTools.zoomUnsupported, "string")
  }
})
