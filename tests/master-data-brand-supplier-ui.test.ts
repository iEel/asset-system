import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("brand model page exposes create model action in the top header", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(source, /<MasterDataHeader[\s\S]*createHref=\{`\/\$\{locale\}\/master-data\/brands\/models\/new`\}/)
  assert.match(source, /createLabel=\{t\("createModel"\)\}/)
  assert.match(source, /actions=\{[\s\S]*master-data\/brands\/new/)
})

test("brand model page uses a brand navigator beside the model workspace", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(source, /brandNavigatorItems/)
  assert.match(source, /t\("brandNavigatorTitle"\)/)
  assert.match(source, /t\("modelWorkspaceTitle"\)/)
  assert.match(source, /lg:grid-cols-\[minmax\(240px,320px\)_minmax\(0,1fr\)\]/)
  assert.match(source, /href=\{`\$\{basePath\}\?\$\{buildBrandModelQueryString\(listState, \{ modelBrandId: brand\.id, modelPage: 1 \}\)\}`\}/)

  const navigatorIndex = source.indexOf('t("brandNavigatorTitle")')
  const workspaceIndex = source.indexOf('t("modelWorkspaceTitle")')
  assert.ok(navigatorIndex > -1 && workspaceIndex > navigatorIndex)
})

test("brand model page messages cover the navigator workspace layout", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th.brandModel, en.brandModel]) {
    assert.equal(typeof messages.brandNavigatorTitle, "string")
    assert.equal(typeof messages.brandNavigatorSubtitle, "string")
    assert.equal(typeof messages.allBrandNavigator, "string")
    assert.equal(typeof messages.modelWorkspaceTitle, "string")
    assert.equal(typeof messages.modelFiltersTitle, "string")
    assert.equal(typeof messages.selectedBrandActions, "string")
  }
})

test("supplier code labels guide Thai vendors toward tax id without removing legacy code support", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(th.supplier.code, "เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย")
  assert.equal(en.supplier.code, "Tax ID / Supplier Code")
  assert.match(th.supplier.searchPlaceholder, /เลขประจำตัวผู้เสียภาษี/)
  assert.match(en.supplier.searchPlaceholder, /tax ID/i)
})
