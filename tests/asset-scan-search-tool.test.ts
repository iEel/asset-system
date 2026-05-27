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
