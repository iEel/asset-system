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
  const picker = readFileSync("src/components/assets/asset-register-column-picker.tsx", "utf8")

  assert.match(source, /assetRegisterColumnStorageKey/)
  assert.match(source, /window\.localStorage\.getItem\(assetRegisterColumnStorageKey\)/)
  assert.match(source, /window\.localStorage\.setItem\([\s\S]*assetRegisterColumnStorageKey/)
  assert.match(source, /onApplyPreset=\{applyColumnPreset\}/)
  assert.match(picker, /columnPresetOperations/)
  assert.match(picker, /columnPresetAccounting/)
  assert.match(picker, /columnPresetAudit/)
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

test("asset register desktop table pins the tag and actions columns only", () => {
  const source = registerTableSource()

  assert.match(source, /assetRegisterStickyFirstColumnClasses/)
  assert.match(source, /assetRegisterStickyActionsColumnClasses/)
  assert.doesNotMatch(source, /assetRegisterStickyNameColumnClasses|\[left:11rem\]/)
  assert.match(source, /right-0/)
  assert.match(source, /group-hover:bg-accent\/50/)
})

test("asset register keeps adaptive desktop and mobile responsibilities explicit", () => {
  const list = readFileSync("src/components/assets/asset-register-mobile-list.tsx", "utf8")
  const source = registerTableSource()

  assert.match(list, /data-asset-mobile-list/)
  assert.match(list, /data-asset-mobile-row/)
  assert.match(list, /md:hidden/)
  assert.match(source, /data-asset-desktop-table/)
  assert.match(source, /getDesktopTableOnlyClasses\(\)/)
})

test("asset register selects canonical state values for semantic badges", () => {
  const source = assetsPageSource()

  assert.match(source, /status:\s*\{\s*select:\s*\{\s*name:\s*true,\s*nameTh:\s*true/)
  assert.match(source, /condition:\s*\{\s*select:\s*\{\s*name:\s*true,\s*nameTh:\s*true/)
  assert.match(source, /status:\s*\{\s*value:\s*asset\.status\.name,\s*label:\s*asset\.status\.nameTh\s*\}/)
  assert.match(source, /condition:\s*\{\s*value:\s*asset\.condition\.name,\s*label:\s*asset\.condition\.nameTh\s*\}/)
})

test("asset register keeps table utility controls out of the mobile-first path", () => {
  assert.match(registerTableSource(), /<div className="hidden items-center gap-2 md:flex">\s*<AssetRegisterColumnPicker/)
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

test("asset register reuses the authoritative activity filter type", () => {
  const source = registerTableSource()

  assert.match(source, /import type \{ AssetActivityFilter \} from "@\/lib\/asset-activity-filter"/)
  assert.match(source, /activity: AssetActivityFilter/)
  assert.doesNotMatch(source, /activity: "" \| "idle_180d"/)
})

test("asset register desktop table explains horizontal scroll only when it overflows", () => {
  const source = registerTableSource()

  assert.match(source, /data-asset-table-scroll-hint/)
  assert.match(source, /tableScrollHint/)
  assert.match(source, /overscroll-x-contain/)
  assert.match(source, /\{isOverflowing \? \(/)
})

test("asset register table keeps names on one line with the full name on hover and visible row focus", () => {
  const tableSource = registerTableSource()
  const rowSource = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8")

  assert.match(tableSource, /title=\{asset\.name\}/)
  assert.match(tableSource, /truncate font-medium/)
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
    "advancedFilters",
    "advancedFiltersHelp",
    "openImportWizard",
    "collapseImportWizard",
    "columnPresets",
    "columnPresetAll",
    "columnPresetOperations",
    "columnPresetAccounting",
    "columnPresetAudit",
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
