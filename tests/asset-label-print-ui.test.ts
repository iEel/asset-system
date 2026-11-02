import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"

test("label print page exposes QR target safety messaging", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /isLikelyLocalAssetQrValue/)
  assert.match(source, /qrLocalWarning/)
  assert.match(source, /qrPrintTarget/)
})

test("label print typography uses high-contrast black text for thermal tape", () => {
  // The label moved into the shared sheet (group 4 plan 6 Task 2); it keeps its exact print colors inline.
  const source = readFileSync("src/components/assets/asset-label-sheet.tsx", "utf8")

  assert.match(source, /printColorAdjust: "exact"/)
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
  // The route's GET calls the queue lib, which reads the filters and the sort (group 4 plan 6 Task 1).
  assert.match(readFileSync("src/app/api/assets/label-prints/route.ts", "utf8"), /parseLabelQueueRequest\(/)
  const source = readFileSync("src/lib/asset-label-queue.ts", "utf8")

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
  // The three gates of the queue stay focusable and say why (v-track final task 2).
  assert.match(source, /<Button\n\s+aria-disabled=\{recentAssets\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{recentAssets\.length === 0 \? "asset-label-add-filtered-reason" : undefined\}\n\s+onClick=\{addRecentAssets\}\n\s+className="w-full shrink-0 sm:w-auto"\n\s+>/)
  assert.match(source, /<Button variant="outline" onClick=\{resetQueueFilters\}>/)
  assert.match(source, /<Button variant="outline" onClick=\{loadMoreQueue\} className="mt-3 w-full">/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printFirstLabel\}\n\s+className="w-full"\n\s+>/)
  assert.match(source, /<Button\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printLabels\}\n\s+className="w-full"\n\s+>/)
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

test("the label search placeholder names only what the asset search finds (critique 2026-10-20 B2)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  assert.match(page, /searchPlaceholder: t\("scanPlaceholder"\)/)
  assert.doesNotMatch(page, /searchPlaceholder: tGlobalSearch\("placeholder"\)/)
  assert.match(readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8"), /&scope=asset`/)
})

// Group 4 plan 6 Task 2 (P6-R2, P6-R9, Review Focus 4-5, recon X1, X4, X6, X11): one self-sized label part, one settings
// loader, tape and note from the hash, at most 100 labels.
const readLf = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const SHEET = "src/components/assets/asset-label-sheet.tsx"
const PRINT = "src/components/assets/asset-label-print.tsx"
const BATCH_PAGE = "src/app/[locale]/(print)/assets/labels/page.tsx"
const SINGLE_PAGE = "src/app/[locale]/(print)/assets/[id]/label/page.tsx"

test("the print hash carries tape and note; unknown or missing values fall back to the defaults (P6-R9)", async () => {
  const { buildAssetLabelPrintHash, parseAssetLabelPrintHash, LABEL_PRINT_NOTE_MAX } = await import("../src/lib/asset-label-print-hash.ts")
  assert.equal(LABEL_PRINT_NOTE_MAX, 500)
  assert.equal(buildAssetLabelPrintHash({ tapeSize: "18", note: "ชั้น 2 & ห้อง #3" }), `#tape=18&note=${encodeURIComponent("ชั้น 2 & ห้อง #3")}`)
  assert.equal(buildAssetLabelPrintHash({ tapeSize: "custom", note: "" }), "#tape=custom&note=")
  assert.deepEqual(parseAssetLabelPrintHash(buildAssetLabelPrintHash({ tapeSize: "24", note: "ชั้น 2 & ห้อง #3 + 50%" }), "18"), { tapeSize: "24", note: "ชั้น 2 & ห้อง #3 + 50%" })
  for (const tape of ["12", "18", "24", "custom"] as const) assert.equal(parseAssetLabelPrintHash(`#tape=${tape}`, "18").tapeSize, tape)
  assert.deepEqual(parseAssetLabelPrintHash("", "12"), { tapeSize: "12", note: "" })
  assert.deepEqual(parseAssetLabelPrintHash("#", "24"), { tapeSize: "24", note: "" })
  assert.deepEqual(parseAssetLabelPrintHash("#tape=36&note=", "18"), { tapeSize: "18", note: "" })
  assert.deepEqual(parseAssetLabelPrintHash("#tape=CUSTOM&note=%E0%B8", "12"), { tapeSize: "12", note: "" }, "a broken escape is no note")
  assert.deepEqual(parseAssetLabelPrintHash("#purchase", "18"), { tapeSize: "18", note: "" })
  // Review Focus 4: a 500-character Thai note rides the hash whole; a longer one is cut to the field's 500.
  const thai = "ก".repeat(500)
  assert.equal(parseAssetLabelPrintHash(buildAssetLabelPrintHash({ tapeSize: "18", note: thai }), "18").note, thai)
  assert.equal(parseAssetLabelPrintHash(`#note=${encodeURIComponent("ข".repeat(600))}`, "18").note, "ข".repeat(500))
})

test("the print route fills tape and note from the hash and never prints or records on load (P6-R9, Review Focus 5)", () => {
  const source = readLf(PRINT)
  assert.match(source, /import \{ parseAssetLabelPrintHash \} from "@\/lib\/asset-label-print-hash"/)
  const effect = source.match(/useEffect\(\(\) => \{\n([\s\S]*?)\n {2}\}, \[labelTemplates\.defaultTapeSize\]\)/)
  assert.ok(effect, "one effect reads the hash")
  assert.match(effect[1], /parseAssetLabelPrintHash\(window\.location\.hash, labelTemplates\.defaultTapeSize\)/)
  assert.match(effect[1], /setTapeSize\(prefill\.tapeSize\)/)
  assert.match(effect[1], /setPrintReason\(prefill\.note\)/)
  assert.doesNotMatch(effect[1], /fetch\(|print\(|requestSubmit|handlePrint|submit/)
  // The one record and the one window.print sit in the submit handler only.
  assert.equal(source.match(/\bfetch\(/g)?.length, 1)
  assert.equal(source.match(/window\.print\(\)/g)?.length, 1)
  const handler = source.slice(source.indexOf("async function handlePrint("), source.indexOf("\n  return (\n"))
  assert.match(handler, /fetch\("\/api\/assets\/label-prints"/)
  assert.match(handler, /window\.print\(\)/)
  assert.doesNotMatch(source, /autoFocus|\.requestSubmit\(|\.submit\(\)/)
})

test("the print route takes at most the first 100 ids and goes back to the labels page (P6-R2, recon X4)", async () => {
  const batch = readLf(BATCH_PAGE)
  assert.match(batch, /normalizeLabelPrintAssetIds\(\[\.\.\.repeatedIds, \.\.\.commaIds\]\)/)
  assert.doesNotMatch(batch, /new Set\(/)
  assert.match(batch, /backHref=\{`\/\$\{locale\}\/asset-management\/labels`\}/)
  const { normalizeLabelPrintAssetIds } = await import("../src/lib/asset-label-print-tracking.ts")
  const ids = Array.from({ length: 105 }, (_, index) => `asset-${index}`)
  const normalized = normalizeLabelPrintAssetIds([" asset-3 ", "asset-3", ...ids])
  assert.equal(normalized.length, 100)
  assert.deepEqual(normalized.slice(0, 3), ["asset-3", "asset-0", "asset-1"])
  assert.equal(normalized.at(-1), "asset-99", "asset-3 is not counted twice")
})

test("both print routes read the settings through the one loader (recon X11)", () => {
  for (const path of [BATCH_PAGE, SINGLE_PAGE]) {
    const source = readLf(path)
    assert.match(source, /import \{ loadAssetLabelPrintSettings \} from "@\/lib\/asset-label-print-settings"/, path)
    assert.match(source, /loadAssetLabelPrintSettings\(\)/, path)
    assert.match(source, /labelTemplates=\{labelSettings\.templates\}/, path)
    assert.match(source, /buildAssetQrValue\(\{ assetId: asset\.id, publicBaseUrl: labelSettings\.qrBaseUrl \}\)/, path)
    assert.doesNotMatch(source, /systemSetting|process\.env|assetLabelSettingKeys|parseAssetLabelTemplates/, path)
  }
})

test("the settings loader reads the label keys and resolves the QR base on the server (AUTH_URL fallback)", async () => {
  const state = globalThis as unknown as { __labelSettingsRows: { key: string; value: string }[]; __labelSettingsArgs: unknown[] }
  state.__labelSettingsArgs = []
  const registerHooks = (nodeModule as unknown as {
    registerHooks(options: {
      resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
    }): void
  }).registerHooks
  const fakeDb = `export const prisma = { systemSetting: { findMany: async (args) => { globalThis.__labelSettingsArgs.push(args); return globalThis.__labelSettingsRows } } }`
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@/lib/db") return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(fakeDb)}`, shortCircuit: true }
      return nextResolve(specifier, context)
    },
  })
  const { loadAssetLabelPrintSettings } = await import("../src/lib/asset-label-print-settings.ts")
  const { assetLabelSettingKeys } = await import("../src/lib/asset-label-template.ts")
  const savedAuthUrl = process.env.AUTH_URL
  try {
    state.__labelSettingsRows = [
      { key: "asset_label_default_tape_size", value: "24" },
      { key: "asset_label_24_width_mm", value: "90" },
      { key: "asset_qr_public_base_url", value: "https://assets.example.com/" },
    ]
    process.env.AUTH_URL = "http://localhost:3000"
    const settings = await loadAssetLabelPrintSettings()
    assert.equal(settings.defaultTapeSize, "24")
    assert.equal(settings.templates.defaultTapeSize, "24")
    assert.equal(settings.templates.tapes["24"].widthMm, 90)
    assert.equal(settings.qrBaseUrl, "https://assets.example.com")
    assert.deepEqual(state.__labelSettingsArgs, [{
      where: { key: { in: [...assetLabelSettingKeys, "asset_qr_public_base_url"] } },
      select: { key: true, value: true },
    }])

    state.__labelSettingsRows = []
    process.env.AUTH_URL = "https://app.example.com/login?x=1"
    const fallback = await loadAssetLabelPrintSettings()
    assert.equal(fallback.qrBaseUrl, "https://app.example.com/login")
    assert.equal(fallback.defaultTapeSize, "18")

    delete process.env.AUTH_URL
    assert.equal((await loadAssetLabelPrintSettings()).qrBaseUrl, "")
  } finally {
    if (savedAuthUrl === undefined) delete process.env.AUTH_URL
    else process.env.AUTH_URL = savedAuthUrl
  }
})

test("the label sizes itself in mm from its template, prints black on white and names its QR (recon X1, X4 axe svg-img-alt)", () => {
  const sheet = readLf(SHEET)
  assert.match(sheet, /^"use client"/)
  assert.match(sheet, /export function AssetLabelItem\(/)
  assert.match(sheet, /export function AssetLabelSheet\(/)
  assert.match(sheet, /export function AssetLabelPreview\(/)
  assert.match(sheet, /<QRCodeSVG value=\{asset\.qrValue\} title=\{asset\.assetTag\} size=\{template\.qrSize\} level="M" includeMargin=\{false\} \/>/)
  assert.match(sheet, /width: `\$\{template\.widthMm\}mm`,\n\s+height: `\$\{template\.heightMm\}mm`,/)
  assert.match(sheet, /printColorAdjust: "exact"/)
  assert.match(sheet, /WebkitPrintColorAdjust: "exact"/)
  assert.match(sheet, /className="asset-label-item overflow-hidden rounded border border-slate-300 bg-white text-black"/)
  // The page's preview never gets the print route's page or print rules.
  assert.doesNotMatch(sheet, /@page|@media print|<style|jsx global/)
  // The print route keeps the one @page rule; the label's size, ink and preview scale left its global block.
  const print = readLf(PRINT)
  assert.match(print, /@page \{\n\s+size: \$\{pageSize\};\n\s+margin: 0;\n\s+\}/)
  assert.equal(print.match(/@page/g)?.length, 1)
  assert.doesNotMatch(print, /\.asset-label-item \{\n\s+width:|color: #000000|--asset-label-preview-scale|<QRCodeSVG|function AssetLabelItem/)
  assert.match(print, /import \{ AssetLabelSheet, type AssetLabelSheetAsset \} from "@\/components\/assets\/asset-label-sheet"/)
  assert.match(print, /<AssetLabelSheet\n\s+assets=\{assets\}\n\s+template=\{config\}/)
})
