import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  assetRegisterColumnPresets,
  normalizeAssetRegisterColumns,
} from "../src/lib/asset-register-columns.ts"

const assetsPageSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8")
const registerTableSource = () => readFileSync("src/components/assets/asset-register-table.tsx", "utf8")
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
  assert.match(source, /window\.localStorage\.setItem\(\s*assetRegisterColumnStorageKey/s)
  assert.match(source, /applyColumnPreset/)
  assert.match(source, /columnPresetOperations/)
  assert.match(source, /columnPresetAccounting/)
  assert.match(source, /columnPresetAudit/)
})

test("asset register table starts in the operational column preset before stored preferences load", () => {
  const source = registerTableSource()

  assert.match(source, /new Set\(assetRegisterColumnPresets\.operations\)/)
  assert.doesNotMatch(source, /useState<Set<AssetRegisterColumnKey>>\(new Set\(assetRegisterColumnPresets\.all\)\)/)
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
    "quickFilterCrossScopeAll",
    "quickFilterCustodianCrossCompany",
    "quickFilterCustodianCrossBranch",
    "quickFilterLocationCrossBranch",
    "quickFilterReady",
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
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = assetMessages(locale)
    const missing = keys.filter((key) => !(key in messages))
    assert.deepEqual(missing, [], `${locale} asset messages are missing keys`)
  }
})
