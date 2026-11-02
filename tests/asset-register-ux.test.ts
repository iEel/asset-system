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
  // Group 4 plan 1 Task 2 (spec §6.1, P1-R4): the tag and the name are one "asset" column.
  assert.deepEqual(assetRegisterColumnPresets.operations, [
    "asset",
    "currentLocation",
    "custodian",
    "status",
    "condition",
  ])
  assert.deepEqual(assetRegisterColumnPresets.accounting, [
    "asset",
    "companyBranch",
    "category",
    "purchasePrice",
    "status",
  ])
  assert.deepEqual(normalizeAssetRegisterColumns(["assetTag", "bad-column", "name"]), ["asset"])
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

test("an exact register link neither restores nor overwrites the saved view", () => {
  const source = registerViewMemorySource()

  assert.match(source, /if \(isExactAssetRegisterLink\(current\)\) return[\s\S]*hasExplicitAssetRegisterView\(current\)/)
})

test("a link-only value (custodianState, locationId) never overwrites the saved view (group 1 spec §7.4)", () => {
  const source = registerViewMemorySource()

  // A row's returnTo drops exact=1, so the way back from an asset opened in a location list must not save that list as the view.
  assert.match(source, /if \(isExactAssetRegisterLink\(current\)\) return\s+if \(current\.get\("custodianState"\) \|\| current\.get\("locationId"\)\) return/)
})

test("dashboard, work-center and notification links open the register exactly", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
  // The dashboard's register links are built in src/lib/dashboard-page.ts; the page only calls it (group 1 dashboard task 9).
  const dashboard = read("src/lib/dashboard-page.ts")
  const page = read("src/app/[locale]/(dashboard)/dashboard/page.tsx")
  const workCenter = read("src/app/[locale]/(dashboard)/work-center/page.tsx")
  const notifications = read("src/lib/waiting-work-rules.ts")

  for (const source of [dashboard, workCenter]) {
    assert.doesNotMatch(source, /`\/\$\{locale\}\/assets(\?|`)/)
    assert.match(source, /buildExactAssetRegisterHref\(/)
  }
  assert.doesNotMatch(notifications, /`\/\$\{locale\}\/assets(\?|`)|\/assets\?dataQuality=|asset-management\/checkin|ownershipType=software_license/)
  for (const value of ["warranty", "licenseExpiry", "returnDue"]) {
    assert.match(notifications, new RegExp(`buildExactAssetRegisterHref\\(locale, \\{ dataQuality: "${value}" \\}\\)`), value)
  }
  assert.doesNotMatch(page, /`\/\$\{locale\}\/assets(\?|`)|buildExactAssetRegisterHref\(/)
  assert.match(page, /buildDashboardRegisterHref\(locale, "total", companyId\)/)
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

// Group 4 plan 1 Task 2 (spec §6.1): the tag is no longer a sticky first column; only the actions column is pinned.
test("asset register desktop table pins the actions column only", () => {
  const source = registerTableSource()

  assert.doesNotMatch(source, /assetRegisterStickyFirstColumnClasses/)
  assert.match(source, /assetRegisterStickyActionsColumnClasses/)
  assert.doesNotMatch(source, /assetRegisterStickyNameColumnClasses|\[left:11rem\]/)
  assert.match(source, /right-0/)
  assert.match(source, /group-hover\/row:bg-row-hover group-focus-within\/row:bg-row-hover group-has-\[\[aria-expanded=true\]\]\/row:bg-row-hover/)
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

// Group 4 plan 5 Task 4 (spec §13, P5-R2, P5-R8): the import card is open on arrival, with no toggle.
test("the import card is open on arrival: no toggle, one divided panel titled นำเข้าทรัพย์สินจาก Excel", () => {
  const source = importPanelSource()

  assert.doesNotMatch(source, /isOpen|aria-expanded|openImportWizard|collapseImportWizard|ChevronDown|ChevronUp/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 1)
  assert.match(source, /<ContentPanel divided flush title=\{t\("importPage\.title"\)\} actions=\{batchBadge\}>/)
  assert.match(source, /const t = useTranslations\("asset"\)/)
})

test("the import card snapshots the picked file's bytes and confirms with that copy, the batch id and the promised count (P5-R2)", () => {
  const source = importPanelSource().replace(/\r\n/g, "\n")

  assert.match(source, /const snapshot = new File\(\[await file\.arrayBuffer\(\)\], file\.name, \{ type: file\.type \}\)\n\s+const formData = new FormData\(\)\n\s+formData\.append\("file", snapshot\)/)
  assert.match(source, /setSelectedFile\(snapshot\)\n\s+setPreview\(payload\)\n\s+setFilter\(defaultImportFilter\(payload\.summary\)\)/)
  // A new pick keeps the old result until the new one arrives: nothing clears the preview before the request.
  const handleFile = source.slice(source.indexOf("async function handleFile"), source.indexOf("async function confirmImport"))
  assert.doesNotMatch(handleFile, /setPreview\(null\)|setSelectedFile\(null\)/)
  assert.match(source, /formData\.append\("file", selectedFile\)/)
  assert.match(source, /formData\.append\("batchId", preview\.batch\.batchId\)/)
  assert.match(source, /formData\.append\("expectedReadyRows", String\(preview\.summary\.readyRows\)\)/)
})

test("on 409 previewChanged the fresh preview replaces the shown one with its notice; batchUsed and changedDuringImport show their own words", () => {
  const source = importPanelSource().replace(/\r\n/g, "\n")

  assert.match(source, /if \(response\.status === 409 && payload\?\.code === "previewChanged" && payload\.preview\) \{\n(?:\s+\/\/.*\n)*\s+setPreview\(payload\.preview\)\n\s+setFilter\(defaultImportFilter\(payload\.preview\.summary\)\)\n\s+setNotice\("previewChanged"\)\n\s+return/)
  assert.match(source, /const confirmRefusalCodes = \["batchUsed", "changedDuringImport"\] as const/)
  assert.match(source, /if \(response\.status === 409 && \(confirmRefusalCodes as readonly string\[\]\)\.includes\(payload\?\.code\)\) \{\n\s+setNotice\(payload\.code\)/)
  assert.match(source, /return t\(`importPage\.\$\{code\}`\)/)
  assert.match(source, /<Notice tone=\{notice === "previewChanged" \? "warning" : "danger"\} role="alert">/)
})

test("the import card: FileDropzone with the stable id, the filter and row hooks, the template link, the done state", () => {
  const source = importPanelSource().replace(/\r\n/g, "\n")

  assert.match(source, /<FileDropzone\n\s+id="asset-import-file"\n\s+file=\{selectedFile\}/)
  assert.match(source, /accept="\.xlsx"\n\s+optimizeImages=\{false\}/)
  for (const filter of ["error", "ready", "all"]) assert.match(source, new RegExp(`<span data-import-filter="${filter}">`))
  assert.equal(source.match(/data-import-row=\{row\.rowNumber\}/g)?.length, 2, "the table row and the phone row")
  assert.match(source, /<a href="\/api\/assets\/import-template" download className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /const shown = preview \? filterImportRows\(preview\.rows, filter\) : null/)
  assert.match(source, /<Notice tone="success" role="status" title=\{t\("importPage\.doneSummary", \{ imported: result\.imported, skipped: result\.skipped \}\)\}>/)
  assert.match(source, /<Button onClick=\{startOver\}>\{t\("importPage\.importAnother"\)\}<\/Button>/)
  assert.match(source, /result\.assets\.slice\(0, 5\)/)
})

// Phase 2C batch 4 (spec 2C §8.9 row asset-import-preview-panel.tsx, O13, §6.4.2, §6.5.2, I35): the panel's three
// buttons are Button; choose-file and import stay in place with busy and keep their labels (K13), and the error box is
// a danger Notice that is announced (role="alert"). The hidden .xlsx input stays (tests/file-evidence-ui.test.ts).
// Phase 2C batch 4 (O13), moved by group 4 plan 5 Task 4: the footer's two actions are the "อัปโหลดไฟล์ที่แก้แล้ว" label
// for the dropzone's input (styled as a button) and the confirm Button with its count; server errors are a danger
// Notice that is announced. The only file input is FileDropzone's (tests/file-evidence-ui.test.ts).
test("the import card's footer: the upload-again label and the counted confirm Button, sticky from lg only, never fixed (P5-R8, K4)", () => {
  const source = importPanelSource().replace(/\r\n/g, "\n")
  assert.match(source, /<label htmlFor="asset-import-file" className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{t\("importPage\.uploadFixed"\)\}\n\s+<\/label>/)
  // v-track plan 2 A6: with no ready row the import waits focusable, tied to the counts beside it.
  assert.match(source, /<Button\n\s+busy=\{isImporting\}\n\s+aria-disabled=\{noReadyRows \|\| undefined\}\n\s+aria-describedby=\{noReadyRows \? "asset-import-ready-summary" : undefined\}\n\s+onClick=\{\(\) => void confirmImport\(\)\}\n\s+>\n\s+\{t\("importPage\.confirm", \{ count: preview\.summary\.readyRows \}\)\}\n\s+<\/Button>/)
  assert.match(source, /className="flex flex-col gap-3 rounded-b-lg border-t border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 lg:sticky lg:bottom-0 lg:z-10"/)
  assert.match(source, /<Notice tone="danger" role="alert">\n\s+<ApiErrorText error=\{error\} \/>\n\s+<\/Notice>/)
  assert.doesNotMatch(source, /<button\b|type="file"|\bfixed\b|StickyFormFooter|disabled:opacity|border-danger-border bg-danger-soft|labels\./)
})

test("the import card translates itself; the page passes no labels (ui.md D13)", () => {
  const source = importExportPageSource()

  assert.match(source, /<AssetImportPreviewPanel \/>/)
  assert.doesNotMatch(source, /openImportWizard|collapseImportWizard|importWizard|importField/)
})

test("asset import history shows no rollback block or asset list: no undo exists (group 4 plan 5, call 21)", () => {
  const source = importExportPageSource()

  assert.doesNotMatch(source, /rollbackSummary|importHistoryRollback|importHistoryMoreAssets|labels\.moreAssets/)
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

// Group 4 plan 1 Task 2 (spec §6.1): the full name wraps to two lines (it was one), with the full name on hover.
test("asset register table shows names on up to two lines with the full name on hover and visible row focus", () => {
  const tableSource = registerTableSource()
  const rowSource = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8")

  assert.match(tableSource, /title=\{asset\.name\}/)
  assert.match(tableSource, /line-clamp-2 font-medium/)
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

// Plan 2B-3 Task 14 (spec 2B §7.11, §10.4 table C row LK1, N7): the import-export page header is PageHeader and the import
// history facts are one KeyValueList. This file reads the page raw (CRLF), so these regexes hold no line break.
test("the import-export page header is PageHeader and the import history facts are a KeyValueList (spec 2B §7.11)", () => {
  const source = importExportPageSource()

  assert.match(source, /<div className="mx-auto max-w-6xl space-y-6">\s*<PageHeader title=\{tTools\("importExportTitle"\)\} meta=\{tTools\("importExportSubtitle"\)\} \/>/)
  assert.doesNotMatch(source, /<h1\b|font-bold/)
  assert.match(source, /<KeyValueList\s+className="mt-3"\s+items=\{\[/)
  assert.match(source, /\{ key: "sourceFile", label: labels\.sourceFile, value: `\$\{batch\.fileName\} \(\$\{formatFileSize\(batch\.fileSize\)\}\)` \}/)
  assert.doesNotMatch(source, /function Info\b|<Info\b/)
})
