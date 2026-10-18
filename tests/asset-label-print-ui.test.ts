import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("label print page exposes QR target safety messaging", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /isLikelyLocalAssetQrValue/)
  assert.match(source, /qrLocalWarning/)
  assert.match(source, /qrPrintTarget/)
})

test("label print typography uses high-contrast black text for thermal tape", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /print-color-adjust: exact/)
  assert.match(source, /text-black/)
  assert.match(source, /secondaryClass[\s\S]+font-black/)
  assert.doesNotMatch(source, /text-slate-600|text-slate-700/)
})

test("label print pages provide tape size placeholder to translated printer guidance", () => {
  const batchPage = readFileSync("src/app/[locale]/(print)/assets/labels/page.tsx", "utf8")
  const singlePage = readFileSync("src/app/[locale]/(print)/assets/[id]/label/page.tsx", "utf8")

  for (const source of [batchPage, singlePage]) {
    assert.match(source, /printerTapeGuidance:\s*t\("labelPrinterTapeGuidance",\s*{\s*tapeSize:\s*"{tapeSize}"\s*}\)/)
    assert.doesNotMatch(source, /printerTapeGuidance:\s*t\("labelPrinterTapeGuidance"\)/)
  }
})

test("label print template settings expose compact printable asset names", () => {
  const template = readFileSync("src/lib/asset-label-template.ts", "utf8")
  const defaults = readFileSync("src/lib/system-setting-defaults.ts", "utf8")
  const validation = readFileSync("src/lib/validations/system-settings.ts", "utf8")
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")
  const settingsPage = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(template, /"labelAssetName"/)
  assert.match(defaults, /asset_label_compact_asset_name_enabled/)
  assert.match(defaults, /asset_label_18_secondary_template", value: "\{labelAssetName\}"/)
  assert.match(validation, /asset_label_compact_asset_name_enabled/)
  assert.match(form, /labels\.compactLabelAssetName/)
  assert.match(form, /labels\.compactLabelAssetNameDescription/)
  assert.match(form, /asset_label_compact_asset_name_enabled/)
  assert.match(form, /<LabelAssetNameModeField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
  assert.match(form, /compactLabelAssetNameShort/)
  assert.match(form, /compactLabelAssetNameFull/)
  assert.match(form, /<Segmented aria-label=\{label\}[\s\S]*?showCheck/)
  assert.match(form, /Check/)
  assert.match(readFileSync("src/components/ui/segmented.tsx", "utf8"), /"bg-primary-soft font-semibold text-primary-hover"/)
  // The asset name choice shows the focus ring of Segmented itself (the form has no hand-made focus classes since 2D-2).
  assert.match(readFileSync("src/components/ui/segmented.tsx", "utf8"), /focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(form, /role="switch"/)
  assert.doesNotMatch(form, /<InlineToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
  assert.doesNotMatch(form, /<ToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
  assert.match(settingsPage, /compactLabelAssetName:\s*t\("compactLabelAssetName"\)/)
  assert.match(settingsPage, /compactLabelAssetNameDescription:\s*t\("compactLabelAssetNameDescription"\)/)
  assert.match(settingsPage, /compactLabelAssetNameShort:\s*t\("compactLabelAssetNameShort"\)/)
  assert.match(settingsPage, /compactLabelAssetNameFull:\s*t\("compactLabelAssetNameFull"\)/)

  assert.equal(th.systemSettingsPage.compactLabelAssetName, "ชื่อทรัพย์สินบนป้าย")
  assert.equal(
    th.systemSettingsPage.compactLabelAssetNameDescription,
    "เลือกว่าจะย่อชื่อที่ระบบแนะนำเฉพาะตอนพิมพ์ หรือใช้ชื่อทรัพย์สินเต็ม"
  )
  assert.equal(th.systemSettingsPage.compactLabelAssetNameShort, "ย่ออัตโนมัติ")
  assert.equal(th.systemSettingsPage.compactLabelAssetNameFull, "ชื่อเต็ม")
  assert.equal(en.systemSettingsPage.compactLabelAssetName, "Asset name on labels")
  assert.equal(
    en.systemSettingsPage.compactLabelAssetNameDescription,
    "Choose whether labels shorten suggested names at print time or use the full asset name."
  )
  assert.equal(en.systemSettingsPage.compactLabelAssetNameShort, "Shorten automatically")
  assert.equal(en.systemSettingsPage.compactLabelAssetNameFull, "Full name")
})

test("label batch tool exposes queue filters and print-order controls", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(source, /queueFilters/)
  assert.match(source, /selectedSort/)
  assert.match(source, /labelPrint\.count/)
  assert.match(source, /printFirstLabel/)
  assert.match(source, /loadMoreQueue/)
})

test("label queue display name de-duplicates asset brand and model text", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-label-display.ts", "utf8")

  assert.match(page, /buildAssetLabelSubtitle/)
  assert.match(component, /buildAssetLabelSubtitle/)
  assert.match(helper, /isRedundantLabelPart/)
  assert.doesNotMatch(page, /\[asset\.name,\s*asset\.brand\?\.name,\s*asset\.model\?\.name\]/)
  assert.doesNotMatch(component, /\[asset\.name,\s*asset\.brand\?\.name,\s*asset\.model\?\.name\]/)
})

test("label queue branch filter stays scoped to the selected company", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /branches:\s*branches\.map\(\(branch\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{branch\.company\.code\} \/ \$\{branch\.code\} - \$\{branch\.name\}`[\s\S]*companyId:\s*branch\.companyId/)
  assert.match(component, /companyId\?: string/)
  assert.match(component, /filteredBranchOptions/)
  assert.match(component, /branch\.companyId === queueFilters\.companyId/)
  assert.match(component, /updateQueueFilter\("branchId", "all"\)/)
})

test("label queue location filter follows company and branch hierarchy", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*branchId:\s*true,\s*branch:\s*{\s*select:\s*{\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /locations:\s*locations\.map\(\(location\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{location\.branch\.company\.code\} \/ \$\{location\.branch\.code\} \/ \$\{location\.code\} - \$\{location\.name\}`[\s\S]*branchId:\s*location\.branchId[\s\S]*companyId:\s*location\.branch\.companyId/)
  assert.match(component, /branchId\?: string/)
  assert.match(component, /shortLabel\?: string/)
  assert.match(component, /filteredLocationOptions/)
  assert.match(component, /location\.branchId === queueFilters\.branchId/)
  assert.match(component, /location\.companyId === queueFilters\.companyId/)
  assert.match(component, /isLocationInScope/)
  assert.match(component, /locationId:\s*"all"/)
})

test("label queue API consumes operational filters and sort order", () => {
  const source = readFileSync("src/app/api/assets/label-prints/route.ts", "utf8")

  assert.match(source, /normalizeLabelPrintQueueFilters/)
  assert.match(source, /buildAssetLabelPrintQueueOrderBy/)
  assert.match(source, /companyId/)
  assert.match(source, /createdFrom/)
  assert.match(source, /createdTo/)
})

test("label tool messages include queue filter and print ordering labels", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th.assetTools, en.assetTools]) {
    assert.equal(typeof messages.labelQueueFiltersTitle, "string")
    assert.equal(typeof messages.queueFilterCompany, "string")
    assert.equal(typeof messages.queueFilterCreatedFrom, "string")
    assert.equal(typeof messages.selectedSortLabel, "string")
    assert.equal(typeof messages.printFirstLabel, "string")
    assert.equal(typeof messages.labelPrintedBadge, "string")
  }
})

test("label search pre-query guidance stays compact under the input", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(source, /hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}/)
  assert.doesNotMatch(source, /<div className="p-6 text-center text-sm text-muted-foreground">\{labels\.minChars\}<\/div>/)
})

test("label queue presents company and branch print scope before location filtering", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(source, /queueScopeSummary/)
  assert.match(source, /getQueueScopeSummary/)
  assert.match(source, /addFilteredQueue/)
  assert.match(source, /addFilteredQueueUnavailable/)
  assert.match(page, /queueScopeTitle:\s*t\("queueScopeTitle"\)/)

  for (const messages of [th.assetTools, en.assetTools]) {
    assert.equal(typeof messages.queueScopeTitle, "string")
    assert.equal(typeof messages.queueScopeHelp, "string")
    assert.equal(typeof messages.queueScopeCompany, "string")
    assert.equal(typeof messages.queueScopeBranch, "string")
    assert.equal(typeof messages.queueScopeLocation, "string")
    assert.equal(typeof messages.queueScopeAll, "string")
    assert.equal(typeof messages.addFilteredQueue, "string")
    assert.equal(typeof messages.addFilteredQueueUnavailable, "string")
  }
})

// Phase 2C batch 4 (spec 2C §8.9 O19, §4.5, §4.9, §6.4.2; 2B spec I13): the label batch tool's header, fields and
// buttons on the shared parts. The result and queue rows stay list buttons (2D); the two status-line spinners stay and
// stop for users who reduce motion (I27).
test("the label batch tool uses PageHeader, shared fields and Button (2C batch 4)", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PageHeader title=\{labels\.title\} meta=\{labels\.subtitle\} \/>/)
  assert.match(source, /<Field label=\{labels\.searchLabel\} hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}>\n\s+<SearchField value=\{query\} onChange=\{\(event\) => setQuery\(event\.target\.value\)\} placeholder=\{labels\.searchPlaceholder\} \/>\n\s+<\/Field>/)
  assert.match(source, /<Field label=\{icon \? <span className="inline-flex items-center gap-1">\{icon\}\{label\}<\/span> : label\}>\n\s+<NativeSelect value=\{value\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.equal(source.match(/<Field label=\{labels\.queueFilterCreated(?:From|To)\}>\n\s+<Input\n\s+type="date"/g)?.length, 2)
  assert.match(source, /icon=\{<ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-primary" \/>\}/)
  assert.equal(source.match(/<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/g)?.length, 2)
  assert.match(source, /<Button disabled=\{recentAssets\.length === 0\} onClick=\{addRecentAssets\} className="w-full shrink-0 sm:w-auto">/)
  assert.match(source, /<Button variant="outline" onClick=\{resetQueueFilters\}>/)
  assert.match(source, /<Button variant="outline" onClick=\{loadMoreQueue\} className="mt-3 w-full">/)
  assert.match(source, /<Button variant="outline" disabled=\{selectedForPrint\.length === 0\} onClick=\{printFirstLabel\} className="w-full">/)
  assert.match(source, /<Button disabled=\{selectedForPrint\.length === 0\} onClick=\{printLabels\} className="w-full">/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => removeAsset\(asset\.id\)\}\n\s+className="shrink-0"\n\s+title=\{labels\.remove\}\n\s+aria-label=\{labels\.remove\}/)
  assert.equal(source.match(/<button\b/g)?.length, 2, "only the result and queue rows stay list buttons (2D)")
  assert.doesNotMatch(source, /<h1\b|<select\b|<input\b|<label\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
})

// Phase 2C batch 4 (spec 2C §4.9 K21, §4.18 item 9, §6.4.2, K13): the print toolbar keeps its boxed labels with the
// field colors, 16px text below md, 40px from md and the field focus look on the box; the print button is busy with
// one label; the print heading stays 700 (2B spec I13).
test("the label print toolbar keeps its boxed fields with a focus ring and a busy print button (2C batch 4)", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8").replace(/\r\n/g, "\n")
  // v-track plan 2 A7: the reason box adds the field error look through cn, so its class string opens a cn( call.
  const boxes = [...source.matchAll(/<label className="([^"]+)">|<label\n\s+className=\{cn\(\n\s+"([^"]+)",/g)].map((match) => match[1] ?? match[2])
  assert.equal(boxes.length, 2)
  for (const box of boxes) {
    assert.match(box, /\bborder-input bg-surface\b/, box)
    assert.match(box, /\btext-base\b.*\bmd:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus$/, box)
    assert.doesNotMatch(box, /(?<![\w:-])(?:border-border|bg-background|text-sm)\b|\bsm:h-10\b/, box)
  }
  assert.equal(source.match(/className="min-w-0 flex-1 bg-transparent (?:font-medium )?outline-none/g)?.length, 2, "the controls inside the boxes stay bare")
  assert.match(source, /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /Loader2|translations\.recordingPrint|disabled=\{recordingPrint\}/)
  assert.match(source, /<h1 className="text-2xl font-bold">\{translations\.title\}<\/h1>/, "the print heading stays 700")
  assert.match(source, /maxLength=\{500\}/)
})
