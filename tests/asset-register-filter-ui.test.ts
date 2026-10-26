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

  assert.match(source, /const \{ statusCountWhere, where \} = await buildAssetRegisterWhere\(filters\)/)
  const registerWhere = read("src/lib/asset-list-where-options.ts")
  assert.match(registerWhere, /const whereOptions = await getAssetWhereOptions\(filters\)\n\s+const statusCountWhere = await applyAssetCrossScopeFilter\(buildAssetStatusCountWhere\(filters, whereOptions\), filters\.crossScope\)/)
  assert.match(registerWhere, /filters\.statusId \? \{ AND: \[statusCountWhere, \{ statusId: filters\.statusId \}\] \} : statusCountWhere/)
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
  assert.match(source, /warranty: t\("dataQualityWarranty"\),\n\s+licenseExpiry: t\("dataQualityLicenseExpiry"\),\n\s+returnDue: t\("dataQualityReturnDue"\),/)
  assert.match(source, /custodianState: \{ assigned: t\("custodianStateAssigned"\) \}/)
  assert.match(source, /location: selectedLocation \? `\$\{selectedLocation\.code\} - \$\{selectedLocation\.name\}` : undefined,/)
  assert.match(source, /location: t\("location"\),/)
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
  // Plan 2D-3: the toggle chips are ChoiceChip checkboxes (44px below md, the input shows the state).
  assert.match(source, /<ChoiceChip\n\s+key=\{option\.value\}\n\s+type="checkbox"\n\s+checked=\{active\}/)
  assert.doesNotMatch(source, /type="submit"/)
})

test("status tabs are server-rendered links that mark the current tab and scroll sideways on phones", () => {
  const source = tabs()
  // TabNav (2B-1, I9) draws the links: aria-current on the current one, a row that scrolls, 44px targets below md.
  const tabNav = read("src/components/ui/tab-nav.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<TabNav\b[\s\S]*?aria-label=\{label\}[\s\S]*?data-asset-status-tabs/)
  assert.match(source, /current=\{items\.find\(\(item\) => item\.active\)\?\.key \?\? ""\}/)
  assert.match(source, /className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"/, "the row still scrolls to the screen edge on phones")
  assert.doesNotMatch(source, /<nav\b|<Link\b|aria-current|rounded-full|fullBleed/)
  assert.match(tabNav, /aria-current=/)
  assert.match(tabNav, /overflow-x-auto/)
  assert.match(tabNav, /min-h-11/)
})

test("filter chips keep 44px phone targets and hide scope chips on desktop", () => {
  const source = chips()
  // FilterChipList (2B-1, I7) draws the chips: 44px on phones and 36px from md, scope chips hidden from md, and each
  // chip named "<remove label>: <chip>", the same name as before because the page still passes clearDrilldownFilter.
  const list = read("src/components/ui/filter-chips.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<FilterChipList\b/)
  assert.match(source, /label=\{labels\.activeFilters\}/)
  assert.match(source, /removeLabel=\{labels\.remove\}/)
  assert.match(source, /clearAll=\{\{ href: clearAllHref, label: labels\.clearAll \}\}/)
  assert.match(source, /className="mb-3"/)
  assert.doesNotMatch(source, /<Link\b|rounded-full/)
  assert.match(list, /min-h-11[^"]*md:h-9 md:min-h-0/)
  assert.match(list, /chip\.mobileOnly && "md:hidden"/)
  assert.match(list, /href=\{clearAll\.href\}/)
  assert.match(list, /aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\}/)
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
  assert.match(page(), /<PageHeader\s+compactOnMobile/)
  assert.match(tabs(), /mb-2 [^"]*md:mb-3/)
})

test("the page header hides the meta below md only when compactOnMobile is set", () => {
  const header = read("src/components/ui/page-header.tsx")

  assert.match(header, /compactOnMobile\?: boolean/)
  assert.match(header, /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/)
  assert.match(header, /compactOnMobile && "max-md:text-xl"/)
  assert.match(header, /compactOnMobile && "max-md:hidden"/)
  assert.match(header, /compactOnMobile && "shrink-0"/)
  assert.match(page(), /<PageHeader\n\s+compactOnMobile\n\s+className="mb-4 md:mb-6"/, "the register keeps 16px / 24px under its compact header (spec 2B §4.6.1 rule 3)")
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

// Plan 2B-3 Task 13 (spec 2B §7.4, I2, I32, N6): the register calls PageHeader itself, keeps the 16/24px gap under it as
// the header's class, and formats the tab counts with formatCount. MasterDataHeader has no caller left (2B-5 deletes it).
test("the register page header is PageHeader with its create link, and the tab counts use formatCount (spec 2B §7.4)", () => {
  const source = page()

  assert.match(source, /^import \{ PageHeader \} from "@\/components\/ui\/page-header"$/m)
  assert.match(source, /<div>\n\s+<PageHeader\n\s+compactOnMobile\n\s+className="mb-4 md:mb-6"\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{canCreateAssets \? \(\n\s+<Link href=\{`\/\$\{locale\}\/assets\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{tCommon\("create"\)\}\n\s+<\/Link>\n\s+\) : undefined\}\n\s+\/>/)
  assert.match(source, /count: formatCount\(tab\.count\)/)
  assert.doesNotMatch(source, /toLocaleString\(|MasterDataHeader|numberLocale/)
})

test("the register's routes build the same where as the page, and only the windowed values read the settings (group 1 spec §6.3)", () => {
  for (const path of ["src/app/api/assets/route.ts", "src/app/api/assets/export/route.ts"]) {
    assert.match(read(path), /buildAssetWhere\(filters, await getAssetWhereOptions\(filters\)\)/, path)
  }
  const options = read("src/lib/asset-list-where-options.ts")
  assert.match(options, /today: startOfBangkokDay\(now\)/)
  assert.match(options, /rules: assetFiltersUseWaitingWorkRules\(filters\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
  assert.doesNotMatch(sheet(), /licenseExpiry|returnDue|custodianState|locationId/, "link-only values: the filter sheet offers no chip for them")
})
