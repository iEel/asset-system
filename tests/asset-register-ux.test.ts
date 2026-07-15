import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  assetRegisterColumnPresets,
  normalizeAssetRegisterColumns,
} from "../src/lib/asset-register-columns.ts"
import { getPersistedAssetRegisterView } from "../src/lib/asset-register-view-memory.ts"

const assetsPageSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8")
const registerTableSource = () => readFileSync("src/components/assets/asset-register-table.tsx", "utf8")
const registerViewMemorySource = () => readFileSync("src/components/assets/asset-register-view-memory.tsx", "utf8")
const importPanelSource = () => readFileSync("src/components/assets/asset-import-preview-panel.tsx", "utf8")
const importExportPageSource = () =>
  readFileSync("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx", "utf8")
const assetMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("asset register column presets cover focused work modes and sanitize stored preferences", () => {
  assert.deepEqual(assetRegisterColumnPresets.operations, [
    "assetTag",
    "name",
    "currentLocation",
    "custodian",
    "status",
    "condition",
  ])
  assert.deepEqual(assetRegisterColumnPresets.accounting, [
    "assetTag",
    "name",
    "companyBranch",
    "category",
    "purchasePrice",
    "status",
  ])
  assert.deepEqual(normalizeAssetRegisterColumns(["assetTag", "bad-column", "name"]), ["assetTag", "name"])
  assert.deepEqual(normalizeAssetRegisterColumns(["bad-column"]), assetRegisterColumnPresets.all)
})

test("asset register table exposes persisted column presets", () => {
  const source = registerTableSource()

  assert.match(source, /assetRegisterColumnStorageKey/)
  assert.match(source, /window\.localStorage\.getItem\(assetRegisterColumnStorageKey\)/)
  assert.match(source, /window\.localStorage\.setItem\([\s\S]*assetRegisterColumnStorageKey/)
  assert.match(source, /applyColumnPreset/)
  assert.match(source, /columnPresetOperations/)
  assert.match(source, /columnPresetAccounting/)
  assert.match(source, /columnPresetAudit/)
})

test("asset register keeps bulk controls conditional and relies on the shared view-memory helpers", () => {
  const source = registerTableSource()

  assert.match(source, /selectedAssets\.length > 0 \? \(/)
  assert.match(source, /rememberAssetRegisterScrollPosition/)
  assert.deepEqual(
    Array.from(getPersistedAssetRegisterView(new URLSearchParams("page=2&sort=name&direction=asc")).entries()),
    [["sort", "name"], ["direction", "asc"]]
  )
})

test("asset register restores browser-local views and detail-return scroll without replacing explicit URLs", () => {
  const source = registerViewMemorySource()

  assert.match(source, /window\.localStorage\.setItem\(assetRegisterViewPreferenceKey/)
  assert.match(source, /current\.size > 0 \|\| restoredSavedViewRef\.current/)
  assert.match(source, /router\.replace\(`\$\{pathname\}\?\$\{saved\.toString\(\)\}`/)
  assert.match(source, /window\.sessionStorage\.getItem\(key\)/)
  assert.match(source, /\[data-dashboard-main\]/)
})

test("asset register and dashboard state routes reuse the standard state surface", () => {
  const tableSource = registerTableSource()
  const accessDeniedSource = readFileSync("src/app/[locale]/(dashboard)/access-denied/page.tsx", "utf8")
  const errorSource = readFileSync("src/app/[locale]/(dashboard)/error.tsx", "utf8")

  assert.match(tableSource, /ActionEmptyState \{\.\.\.emptyState\}/)
  assert.match(accessDeniedSource, /<ActionEmptyState[\s\S]*tone="permission"/)
  assert.match(errorSource, /<ActionEmptyState[\s\S]*tone="error"/)
  assert.match(errorSource, /unstable_retry/)
})

test("asset register table starts in the operational column preset before stored preferences load", () => {
  const source = registerTableSource()

  assert.match(source, /new Set\(assetRegisterColumnPresets\.operations\)/)
  assert.doesNotMatch(source, /useState<Set<AssetRegisterColumnKey>>\(new Set\(assetRegisterColumnPresets\.all\)\)/)
})

test("asset register desktop table keeps key columns frozen during horizontal scroll", () => {
  const source = registerTableSource()

  assert.match(source, /assetRegisterStickyFirstColumnClasses/)
  assert.match(source, /assetRegisterStickyNameColumnClasses/)
  assert.match(source, /assetRegisterStickyActionsColumnClasses/)
  assert.match(source, /visibleColumns\.has\("assetTag"\) \? assetRegisterStickyNameColumnClasses : assetRegisterStickyFirstColumnClasses/)
  assert.match(source, /right-0/)
  assert.match(source, /group-hover:bg-accent\/50/)
})

test("asset register keeps adaptive desktop and mobile responsibilities explicit", () => {
  const source = registerTableSource()

  assert.match(source, /data-asset-mobile-list/)
  assert.match(source, /data-asset-mobile-card/)
  assert.match(source, /data-asset-desktop-table/)
  assert.match(source, /getMobileCardListClasses\(\)/)
  assert.match(source, /getDesktopTableOnlyClasses\(\)/)
})

test("asset register selects canonical state values for semantic badges", () => {
  const source = assetsPageSource()

  assert.match(source, /status:\s*\{\s*select:\s*\{\s*name:\s*true,\s*nameTh:\s*true/)
  assert.match(source, /condition:\s*\{\s*select:\s*\{\s*name:\s*true,\s*nameTh:\s*true/)
  assert.match(source, /status:\s*\{\s*value:\s*asset\.status\.name,\s*label:\s*asset\.status\.nameTh\s*\}/)
  assert.match(source, /condition:\s*\{\s*value:\s*asset\.condition\.name,\s*label:\s*asset\.condition\.nameTh\s*\}/)
})

test("mobile asset cards prioritize field lookup context", () => {
  const source = registerTableSource()
  const start = source.indexOf("data-asset-mobile-card")
  const end = source.indexOf("</article>", start)

  assert.ok(start > -1 && end > start)
  const card = source.slice(start, end)
  assert.match(card, /asset\.assetTag/)
  assert.match(card, /asset\.name/)
  assert.match(card, /asset\.status/)
  assert.match(card, /asset\.currentLocation/)
  assert.match(card, /asset\.custodian/)
})

test("mobile asset selection keeps a 44px labeled target around the visible checkbox", () => {
  const source = registerTableSource()
  const start = source.indexOf("data-asset-mobile-card")
  const end = source.indexOf("</article>", start)

  assert.ok(start > -1 && end > start)
  const card = source.slice(start, end)
  assert.match(
    card,
    /<label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">[\s\S]*?<input[\s\S]*?type="checkbox"[\s\S]*?checked=\{selectedIds\.has\(asset\.id\)\}[\s\S]*?onChange=\{\(\) => toggleAsset\(asset\.id\)\}[\s\S]*?aria-label=\{asset\.assetTag\}[\s\S]*?className="h-5 w-5 rounded border-border text-primary"[\s\S]*?<\/label>/,
  )
})

test("mobile asset cards preserve field lookup order and secondary action access", () => {
  const source = registerTableSource()
  const start = source.indexOf("data-asset-mobile-card")
  const end = source.indexOf("</article>", start)

  assert.ok(start > -1 && end > start)
  const card = source.slice(start, end)
  const orderedValues = [
    "asset.assetTag",
    "asset.status",
    "asset.name",
    "asset.serialNumber",
    "asset.category",
    "asset.currentLocation",
    "asset.custodian",
    "<details",
  ]

  let previousIndex = -1
  for (const value of orderedValues) {
    const index = card.indexOf(value)
    assert.ok(index > previousIndex, `${value} must follow the prior mobile card value`)
    previousIndex = index
  }

  assert.doesNotMatch(card, /asset\.companyBranch/)
  assert.doesNotMatch(card, /asset\.purchasePrice/)
  assert.match(card, /<details className="mt-2 border-t border-border pt-2">/)
  assert.match(card, /<summary className="flex min-h-11 w-full cursor-pointer items-center rounded-md px-3 text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:text-foreground">/)
})

test("asset register uses mutually exclusive responsive helper boundaries", () => {
  const source = registerTableSource()

  assert.match(source, /data-asset-mobile-list className=\{`\$\{getMobileCardListClasses\(\)\}/)
  assert.match(source, /data-asset-desktop-table className=\{`\$\{getDesktopTableOnlyClasses\(\)\}/)
})

test("asset register keeps table utility controls out of the mobile-first path", () => {
  const source = registerTableSource()

  assert.match(source, /hidden min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:flex/)
})

test("asset register import wizard starts collapsed and expands on demand", () => {
  const source = importPanelSource()

  assert.match(source, /const \[isOpen, setIsOpen\] = useState\(false\)/)
  assert.match(source, /aria-expanded=\{isOpen\}/)
  assert.match(source, /openImportWizard/)
  assert.match(source, /if \(!isOpen\)/)
})

test("asset import wizard labels are passed on every import surface", () => {
  const source = importExportPageSource()

  assert.match(source, /openImportWizard: t\("openImportWizard"\)/)
  assert.match(source, /collapseImportWizard: t\("collapseImportWizard"\)/)
})

test("asset import history formats hidden asset count when rendering", () => {
  const source = importExportPageSource()

  assert.doesNotMatch(source, /moreAssets:\s*t\("importHistoryMoreAssets"\)/)
  assert.match(source, /moreAssets:\s*\(count: string\) => t\("importHistoryMoreAssets", \{ count \}\)/)
  assert.match(source, /labels\.moreAssets\(batch\.rollbackSummary\.hiddenAssetCount\.toLocaleString\("th-TH"\)\)/)
})

test("asset register page exposes operational quick filters", () => {
  const source = assetsPageSource()

  assert.match(source, /quickFilters/)
  assert.match(source, /dataQuality: "serial"/)
  assert.match(source, /dataQuality: "photo"/)
  assert.match(source, /dataQuality: "purchase"/)
  assert.match(source, /dataQuality: "warranty"/)
  assert.match(source, /buildCrossScopeQuickFilter\("cross-scope-all", labels\.quickFilterCrossScopeAll, "all"\)/)
  assert.match(source, /buildCrossScopeQuickFilter\("cross-scope-custodian-company", labels\.quickFilterCustodianCrossCompany, "custodian_company"\)/)
  assert.match(source, /buildCrossScopeQuickFilter\("cross-scope-custodian-branch", labels\.quickFilterCustodianCrossBranch, "custodian_branch"\)/)
  assert.match(source, /buildCrossScopeQuickFilter\("cross-scope-location-branch", labels\.quickFilterLocationCrossBranch, "location_branch"\)/)
  assert.match(source, /name: true, nameTh: true/)
  assert.match(source, /status\.name === "Ready"/)
  assert.match(source, /status\.name === "Checked Out"/)
  assert.match(source, /status\.name === "In Use"/)
  assert.match(source, /status\.name === "Pending Repair"/)
})

test("asset register groups quick filters and collapses advanced filters", () => {
  const source = assetsPageSource()

  assert.match(source, /quickFilterGroups/)
  assert.match(source, /quickFilterGroupDataQuality/)
  assert.match(source, /quickFilterGroupCrossScope/)
  assert.match(source, /quickFilterGroupLifecycle/)
  assert.match(source, /advancedFilters/)
  assert.match(source, /data-asset-advanced-filters/)
})

test("asset register prioritizes search before quick filters on mobile", () => {
  const source = assetsPageSource()

  assert.match(source, /data-asset-filter-layout className="flex min-w-0 max-w-full flex-col"/)
  assert.match(source, /data-asset-quick-filters className="order-2 mt-4 mb-4 border-b border-border pb-4 md:order-1 md:mt-0"/)
  assert.match(source, /data-asset-search-form className="order-1 space-y-3 md:order-3"/)
  assert.match(source, /data-asset-active-filters className="order-3 mb-4 rounded-md border border-primary\/20 bg-primary\/5 px-3 py-2 md:order-2"/)
})

test("asset register surfaces scoped brand and model drilldown filters", () => {
  const source = assetsPageSource()

  assert.match(source, /selectedBrand/)
  assert.match(source, /selectedModel/)
  assert.match(source, /activeDrilldownFilters/)
  assert.match(source, /buildAssetQueryString\(filters, \{ brandId: "", page: 1 \}\)/)
  assert.match(source, /buildAssetQueryString\(filters, \{ modelId: "", page: 1 \}\)/)
  assert.match(source, /name="brandId"/)
  assert.match(source, /name="modelId"/)
})

test("asset register summarizes active filters and provides a clear all action", () => {
  const source = assetsPageSource()

  assert.match(source, /activeFilterChips/)
  assert.match(source, /data-asset-active-filters/)
  assert.match(source, /clearAllFilters/)
  assert.match(source, /buildAssetQueryString\(filters, \{[\s\S]*search: "",[\s\S]*companyId: "",[\s\S]*branchId: ""/)
})

test("asset register exposes a removable idle activity filter", () => {
  const source = assetsPageSource()

  assert.match(source, /activityIdle180d: string/)
  assert.match(source, /activityIdle180d: t\("activityIdle180d"\)/)
  assert.match(source, /filters\.activity[\s\S]*key: "activity"[\s\S]*label: labels\.activityIdle180d/)
  assert.match(source, /buildAssetQueryString\(filters, \{ activity: "", page: 1 \}\)/)
  assert.match(source, /clearAllFiltersHref[\s\S]*crossScope: "",[\s\S]*activity: "",[\s\S]*page: 1/)
  assert.match(source, /filters\.activity \? <input type="hidden" name="activity" value=\{filters\.activity\} \/> : null/)
})

test("asset active-filter actions stay at least 44px tall below md", () => {
  const source = assetsPageSource()

  assert.match(source, /activeFilterChips\.map[\s\S]*className="inline-flex min-h-11[^"]*md:min-h-8"/)
  assert.match(source, /href=\{clearAllFiltersHref\}[\s\S]*className="inline-flex min-h-11[^"]*md:min-h-9"/)
})

test("asset register reuses the authoritative activity filter type", () => {
  const source = registerTableSource()

  assert.match(source, /import type \{ AssetActivityFilter \} from "@\/lib\/asset-activity-filter"/)
  assert.match(source, /activity: AssetActivityFilter/)
  assert.doesNotMatch(source, /activity: "" \| "idle_180d"/)
})

test("asset register desktop table exposes horizontal scroll affordance", () => {
  const source = registerTableSource()

  assert.match(source, /data-asset-table-scroll-hint/)
  assert.match(source, /tableScrollHint/)
  assert.match(source, /overscroll-x-contain/)
})

test("asset register table improves frozen name readability and row focus", () => {
  const tableSource = registerTableSource()
  const rowSource = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8")

  assert.match(tableSource, /title=\{asset\.name\}/)
  assert.match(tableSource, /line-clamp-2 font-medium leading-snug/)
  assert.match(rowSource, /focus-visible:ring-2/)
  assert.match(rowSource, /focus-visible:ring-inset/)
})

test("asset register UX messages exist in Thai and English", () => {
  const keys = [
    "quickFilters",
    "quickFiltersHelp",
    "quickFilterAll",
    "dataQualitySerial",
    "dataQualityPhoto",
    "dataQualityPurchase",
    "dataQualityWarranty",
    "dataQualityResponsibility",
    "activityIdle180d",
    "quickFilterCrossScopeAll",
    "quickFilterCustodianCrossCompany",
    "quickFilterCustodianCrossBranch",
    "quickFilterLocationCrossBranch",
    "quickFilterReady",
    "quickFilterCheckedOut",
    "quickFilterInUse",
    "quickFilterPendingRepair",
    "quickFilterUnderMaintenance",
    "quickFilterGroupDataQuality",
    "quickFilterGroupCrossScope",
    "quickFilterGroupLifecycle",
    "advancedFilters",
    "advancedFiltersHelp",
    "openImportWizard",
    "collapseImportWizard",
    "columnPresets",
    "columnPresetAll",
    "columnPresetOperations",
    "columnPresetAccounting",
    "columnPresetAudit",
    "activeDrilldownFilters",
    "clearDrilldownFilter",
    "activeFilters",
    "clearAllFilters",
    "tableScrollHint",
    "noResultsTitle",
    "noResultsDescription",
    "noAssetsTitle",
    "noAssetsDescription",
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = assetMessages(locale)
    const missing = keys.filter((key) => !(key in messages))
    assert.deepEqual(missing, [], `${locale} asset messages are missing keys`)
  }
})

test("asset activity filter messages are equivalent in Thai and English", () => {
  assert.equal(assetMessages("th").activityIdle180d, "ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด")
  assert.equal(assetMessages("en").activityIdle180d, "No movement in the latest 180 days")
})
