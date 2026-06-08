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
  assert.match(source, /name: true, nameTh: true/)
  assert.match(source, /status\.name === "Ready"/)
  assert.match(source, /status\.name === "Pending Repair"/)
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
    "quickFilterReady",
    "quickFilterPendingRepair",
    "quickFilterUnderMaintenance",
    "openImportWizard",
    "collapseImportWizard",
    "columnPresets",
    "columnPresetAll",
    "columnPresetOperations",
    "columnPresetAccounting",
    "columnPresetAudit",
  ]

  for (const locale of ["th", "en"] as const) {
    const messages = assetMessages(locale)
    const missing = keys.filter((key) => !(key in messages))
    assert.deepEqual(missing, [], `${locale} asset messages are missing keys`)
  }
})
