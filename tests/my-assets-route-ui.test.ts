import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("my assets page is employee scoped and does not require broad asset view", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/my-assets/page.tsx", "utf8")

  assert.match(page, /buildMyAssetsWhere\(\{ employeeId: user\.employeeId \}\)/)
  assert.match(page, /custodianId/)
  assert.doesNotMatch(page, /requirePagePermission\(locale,\s*"asset",\s*"view"\)/)
  assert.doesNotMatch(page, /purchasePrice|supplier|fixedAssetCode/)
})

test("my assets route has Thai and English translations", () => {
  const th = readFileSync("messages/th.json", "utf8")
  const en = readFileSync("messages/en.json", "utf8")

  assert.match(th, /"myAssets"/)
  assert.match(th, /"ทรัพย์สินของฉัน"/)
  assert.match(en, /"myAssets"/)
  assert.match(en, /"My Assets"/)
})

test("sidebar exposes My Assets only through linked employee identity", () => {
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8")

  assert.match(sidebar, /labelKey: "myAssets"/)
  assert.match(sidebar, /user\.employeeId/)
  assert.match(sidebar, /href: `\/\$\{locale\}\/my-assets`/)
  assert.doesNotMatch(
    sidebar,
    /labelKey: "myAssets"[\s\S]{0,220}permission: \{ module: "asset", action: "view" \}/
  )
})
