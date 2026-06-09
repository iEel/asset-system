import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("brand model page exposes create model action in the top header", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(source, /const createModelHref = appendBrandModelReturnTo/)
  assert.match(source, /<MasterDataHeader[\s\S]*createHref=\{createModelHref\}/)
  assert.match(source, /createLabel=\{t\("createModel"\)\}/)
  assert.match(source, /actions=\{[\s\S]*master-data\/brands\/new/)
})

test("brand model page uses a brand navigator beside the model workspace", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(source, /brandNavigatorItems/)
  assert.match(source, /buildBrandDrilldownHrefs/)
  assert.match(source, /buildModelDrilldownHrefs/)
  assert.match(source, /t\("brandNavigatorTitle"\)/)
  assert.match(source, /t\("modelWorkspaceTitle"\)/)
  assert.match(source, /lg:grid-cols-\[minmax\(180px,220px\)_minmax\(0,1fr\)\]/)
  assert.match(source, /href=\{`\$\{basePath\}\?\$\{buildBrandModelQueryString\(listState, \{ modelBrandId: brand\.id, modelPage: 1 \}\)\}`\}/)
  assert.match(source, /href=\{brandDrilldown\.assets\}/)
  assert.match(source, /href=\{modelDrilldown\.assets\}/)

  const navigatorIndex = source.indexOf('t("brandNavigatorTitle")')
  const workspaceIndex = source.indexOf('t("modelWorkspaceTitle")')
  assert.ok(navigatorIndex > -1 && workspaceIndex > navigatorIndex)
})

test("category and brand count cells use branch-style drilldown links", () => {
  const categorySource = readFileSync("src/app/[locale]/(dashboard)/master-data/categories/page.tsx", "utf8")
  const brandSource = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(categorySource, /category\._count\.models > 0/)
  assert.match(categorySource, /href=\{drilldown\.models\}/)
  assert.match(categorySource, /category\._count\.assets > 0/)
  assert.match(categorySource, /href=\{drilldown\.assets\}/)
  assert.match(categorySource, /text-xs font-medium text-primary transition-colors hover:bg-primary\/10/)

  assert.match(brandSource, /brand\._count\.assets > 0/)
  assert.match(brandSource, /model\._count\.assets > 0/)
  assert.match(brandSource, /text-xs font-medium text-primary transition-colors hover:bg-primary\/10/)
})

test("brand model edit flow preserves the selected brand workspace after save", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")
  const editPageSource = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/models/[id]/edit/page.tsx", "utf8")
  const newPageSource = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/models/new/page.tsx", "utf8")
  const formSource = readFileSync("src/components/master-data/asset-model-form.tsx", "utf8")
  const querySource = readFileSync("src/lib/brand-model-query.ts", "utf8")

  assert.match(querySource, /normalizeBrandModelReturnTo/)
  assert.match(querySource, /appendBrandModelReturnTo/)
  assert.match(querySource, /url\.pathname !== fallback/)
  assert.match(listSource, /const brandModelReturnHref = `\$\{basePath\}\?\$\{buildBrandModelQueryString\(listState, \{\}\)\}`/)
  assert.match(listSource, /appendBrandModelReturnTo\(`\/\$\{locale\}\/master-data\/brands\/models\/new`, brandModelReturnHref\)/)
  assert.match(listSource, /appendBrandModelReturnTo\(`\/\$\{locale\}\/master-data\/brands\/models\/\$\{model\.id\}\/edit`, brandModelReturnHref\)/)
  assert.match(editPageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(editPageSource, /normalizeBrandModelReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(editPageSource, /backHref=\{returnToHref\}/)
  assert.match(newPageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(newPageSource, /normalizeBrandModelReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(newPageSource, /backHref=\{returnToHref\}/)
  assert.match(formSource, /backHref: providedBackHref/)
  assert.match(formSource, /const backHref = providedBackHref \?\? `\/\$\{locale\}\/master-data\/brands`/)
  assert.match(formSource, /router\.push\(backHref\)/)
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
