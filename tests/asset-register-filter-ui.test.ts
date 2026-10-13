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
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/)
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

test("the asset register page uses the compact mobile header", () => {
  assert.match(page(), /<MasterDataHeader\s+compactOnMobile/)
  assert.match(tabs(), /mb-2 [^"]*md:mb-3/)
})

test("the page header hides the meta below md only when compactOnMobile is set", () => {
  const header = read("src/components/ui/page-header.tsx")
  const layout = read("src/components/master-data/master-data-layout.tsx")

  assert.match(header, /compactOnMobile\?: boolean/)
  assert.match(header, /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/)
  assert.match(header, /compactOnMobile && "max-md:text-xl"/)
  assert.match(header, /compactOnMobile && "max-md:hidden"/)
  assert.match(header, /compactOnMobile && "shrink-0"/)
  assert.match(layout, /compactOnMobile \? "mb-4 md:mb-6" : "mb-6"/)
})

// Plan 2B-3 Task 5 (spec 2B §7.5, B3(4), I6): from md the register toolbar has no card and its controls are 36px:
// FilterSelect with a screen-reader label for the three scope selects, and an outline Button for the filter sheet.
test("the toolbar has no card from md, its scope selects are FilterSelect hideLabel at 36px and the sheet trigger is a Button (2B §7.5)", () => {
  const source = toolbar()

  assert.equal(source.match(/<FilterSelect\s+label=\{t\("(?:company|branch|category)"\)\}\s+hideLabel\s+fieldSize="md"\s+className="w-44 shrink-0 lg:w-48"/g)?.length, 3)
  assert.match(source, /className="sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0 md:py-0"/)
  assert.match(source, /trigger=\{\n\s+<Button variant="outline" size="md">\n\s+<SlidersHorizontal className="size-4" aria-hidden="true" \/>/)
  assert.doesNotMatch(source, /md:rounded-lg md:border|md:bg-surface|getFieldControlClasses|<select\b|<NativeSelect\b|<button\b|aria-label=/)
})

// Plan 2B-3 Task 7 (spec 2B §7.6, I6, I26): the sheet's seven selects are FilterSelect with a visible label at lg,
// status and condition carry their 24px help button in labelAction, and the result button is busy while it loads.
test("the filter sheet uses FilterSelect with labelAction help and a busy result button (2B §7.6)", () => {
  const source = sheet()

  assert.equal(source.match(/<FilterSelect\b/g)?.length, 7)
  assert.match(source, /key=\{`status-\$\{filters\.statusId\}`\}\n\s+defaultValue=\{filters\.statusId\}\n\s+onChange=\{\(event\) => navigate\(\{ statusId: event\.target\.value \}\)\}/)
  assert.match(source, /key=\{`pageSize-\$\{filters\.pageSize\}`\}\n\s+defaultValue=\{String\(filters\.pageSize\)\}\n\s+onChange=\{\(event\) => navigate\(\{ pageSize: Number\(event\.target\.value\) \}\)\}/)
  assert.equal(new Set(source.match(/key=\{`[A-Za-z]+-\$\{filters\./g)).size, 7, "sibling FilterSelects need distinct keys: an unset filter is the same empty value in every select")
  assert.match(source, /<Button onClick=\{\(\) => setOpen\(false\)\} aria-live="polite" busy=\{isPending\}>/)
  assert.match(source, /t\("filterSheetShowResults", \{ count: formatCount\(total\) \}\)/)
  assert.match(source, /<SheetHeader>/)
  assert.doesNotMatch(source, /function LabeledSelect|<select\b|Loader2|closeLabel=|pr-14|getFieldControlClasses|toLocaleString\(|useLocale/)
})
