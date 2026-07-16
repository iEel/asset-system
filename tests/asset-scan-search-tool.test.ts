import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset scan page auto-opens direct QR resolver matches", () => {
  const source = readFileSync("src/components/assets/asset-scan-search-tool.tsx", "utf8")

  assert.match(source, /const directAssetHref = buildDirectAssetHrefFromScanValue/)
  assert.match(source, /const scanReturnHref = `\/\$\{locale\}\/asset-management\/scan`/)
  assert.match(source, /if \(!directAssetHref\) return[\s\S]+router\.push\(appendReturnTo\(directAssetHref, scanReturnHref\)\)/)
  assert.match(source, /onScanSuccess=\{handleScannedValue\}/)
  assert.match(source, /function handleScannedValue\(value: string\)[\s\S]+router\.push\(appendReturnTo\(href, scanReturnHref\)\)/)
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

test("asset scan page labels only the native input and uses asset-specific search copy", () => {
  const tool = readFileSync("src/components/assets/asset-scan-search-tool.tsx", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/scan/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(tool, /<label[^>]+htmlFor="asset-scan-query"/)
  assert.match(tool, /<ScannerTextInput[\s\S]+id="asset-scan-query"/)
  assert.doesNotMatch(tool, /<label className="block">[\s\S]+<ScannerTextInput/)
  assert.match(tool, /inputClassName="min-h-11 w-full min-w-0[^"]*sm:flex-1/)
  assert.match(page, /placeholder: t\("scanPlaceholder"\)/)
  assert.doesNotMatch(page, /placeholder: tGlobalSearch\("placeholder"\)/)
  assert.equal(th.assetTools.scanPlaceholder, "ค้นหาด้วย Asset Tag, Serial Number, ผู้ถือครอง หรือสถานที่")
  assert.equal(en.assetTools.scanPlaceholder, "Search by Asset Tag, Serial Number, custodian, or location")
})
