import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { normalizeAssetReturnTo } from "../src/lib/asset-return-navigation.ts"

test("preserves the General Asset Scan route as a safe asset-detail return target", () => {
  assert.equal(normalizeAssetReturnTo("th", "/th/asset-management/scan"), "/th/asset-management/scan")
})

test("asset scan carries its route into direct QR and search-result detail navigation", () => {
  const source = readFileSync("src/components/assets/asset-scan-search-tool.tsx", "utf8")

  assert.match(source, /scanReturnHref/)
  assert.match(source, /appendReturnTo\(directAssetHref, scanReturnHref\)/)
  assert.match(source, /appendReturnTo\(href, scanReturnHref\)/)
})

test("asset detail exposes a scan-next action only for scanner-origin return navigation", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /const isAssetScanReturn = returnToHref === scanReturnHref/)
  assert.match(source, /scanNext=\{isAssetScanReturn \? \{ key: "scanNext", label: t\("scanNext"\), href: scanReturnHref \} : null\}/)
  assert.match(readFileSync("src/components/assets/detail/asset-detail-actions.tsx", "utf8"), /<ScanLine className="h-4 w-4" \/>/)
})
