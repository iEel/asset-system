import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/assets/page.tsx")
const toolbar = () => read("src/components/assets/asset-register-toolbar.tsx")
const sheet = () => read("src/components/assets/asset-register-filter-sheet.tsx")
const tabs = () => read("src/components/assets/asset-register-status-tabs.tsx")
const chips = () => read("src/components/assets/asset-register-filter-chips.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("the page counts statuses with the list's own filters and renders the new filter parts", () => {
  const source = page()

  assert.match(source, /applyAssetCrossScopeFilter\(buildAssetStatusCountWhere\(filters\), filters\.crossScope\)/)
  assert.match(source, /filters\.statusId \? \{ AND: \[statusCountWhere, \{ statusId: filters\.statusId \}\] \} : statusCountWhere/)
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["statusId"\],\s*where: statusCountWhere,\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /<AssetRegisterNavigationProvider filters=\{filters\}>/)
  for (const component of ["AssetRegisterToolbar", "AssetRegisterStatusTabs", "AssetRegisterFilterChips", "AssetRegisterTable"]) {
    assert.match(source, new RegExp(`<${component}\\b`), component)
  }
  assert.doesNotMatch(source, /function AssetFilters|QuickFilterLink|data-asset-quick-filters|<details/)
})

test("every hidden filter gets a readable chip, including activity, department and supplier", () => {
  const source = page()

  assert.match(source, /buildAssetRegisterChips\(\{/)
  assert.match(source, /department: t\("dataQualityDepartment"\)/)
  assert.match(source, /activity: \{ idle_180d: t\("activityIdle180d"\) \}/)
  assert.match(source, /prisma\.supplier\.findUnique\(/)
  assert.match(source, /buildAssetRegisterClearAllHref\(`\/\$\{locale\}\/assets`, filters\)/)
})

test("the toolbar applies scope selects at once and has no submit button", () => {
  const source = toolbar()

  assert.match(source, /getCompanyChangeOverrides\(event\.target\.value, filters\.branchId, options\.branches\)/)
  assert.match(source, /navigate\(\{ branchId: event\.target\.value \}\)/)
  assert.match(source, /navigate\(\{ categoryId: event\.target\.value \}\)/)
  assert.match(source, /key=\{`company-\$\{filters\.companyId\}`\}/)
  assert.match(source, /hidden md:contents/)
  assert.match(source, /sticky top-0[^"]*md:static/)
  assert.doesNotMatch(source, /type="submit"/)
})

test("the filter sheet applies changes at once, keeps its trigger and shows the real result count", () => {
  const source = sheet()

  assert.match(source, /<SheetTrigger asChild>\{trigger\}<\/SheetTrigger>/)
  assert.match(source, /side=\{isDesktop \? "right" : "bottom"\}/)
  assert.match(source, /buildSheetClearOverrides\(filters, scope\)/)
  assert.match(source, /disabled=\{activeCount === 0\}/)
  assert.match(source, /t\("filterSheetShowResults", \{ count:/)
  assert.match(source, /t\("filterSheetNoResults"\)/)
  assert.match(source, /onClick=\{\(\) => setOpen\(false\)\}/)
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
  assert.match(source, /aria-pressed=\{active\}/)
  assert.match(source, /min-h-11/)
  assert.doesNotMatch(source, /type="submit"/)
})

test("status tabs are server-rendered links that mark the current tab and scroll sideways on phones", () => {
  const source = tabs()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<nav aria-label=\{label\}/)
  assert.match(source, /aria-current=\{item\.active \? "page" : undefined\}/)
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /min-h-11/)
})

test("filter chips keep 44px phone targets and hide scope chips on desktop", () => {
  const source = chips()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /min-h-11[^"]*md:min-h-8/)
  assert.match(source, /chip\.mobileOnly && "md:hidden"/)
  assert.match(source, /href=\{clearAllHref\}/)
  assert.match(source, /aria-label=\{`\$\{labels\.remove\}: \$\{chip\.label\}`\}/)
})

test("filter copy exists in Thai and English", () => {
  const keys = [
    "filterSheetTitle",
    "filterSheetClear",
    "filterSheetShowResults",
    "filterSheetNoResults",
    "filterSheetLoading",
    "filterSheetScope",
    "filterSheetState",
    "filterSheetDisplay",
    "dataQualityDepartment",
    "statusTabsLabel",
    "pageSizeLabel",
  ]
  for (const locale of ["th", "en"] as const) {
    const missing = keys.filter((key) => typeof messages(locale)[key] !== "string")
    assert.deepEqual(missing, [], locale)
  }
  assert.equal(messages("th").filterSheetShowResults, "แสดง {count} รายการ")
  assert.equal(messages("th").dataQualityDepartment, "แผนกไม่ครบ")
})
