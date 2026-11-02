import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
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

// Group 4 plan 6 Task 4: the tool is the shell; the search and the queue are asset-label-queue.tsx, the right column
// asset-label-print-list.tsx.
const QUEUE_PART = "src/components/assets/asset-label-queue.tsx"
const PRINT_LIST_PART = "src/components/assets/asset-label-print-list.tsx"
const QUEUE_RULES = "src/lib/asset-label-queue-rules.ts"

test("label batch tool exposes queue filters and print-order controls", () => {
  const queue = readFileSync(QUEUE_PART, "utf8")
  const list = readFileSync(PRINT_LIST_PART, "utf8")

  assert.match(queue, /queueFilters/)
  // Group 4 plan 6 Task 5: the order sits in the list card's head; test print is the preview's label (P6-R8).
  assert.match(list, /onOrderChange\(event\.target\.value as LabelPrintOrder\)/)
  assert.match(list, /onClick=\{onTestPrint\}/)
  assert.match(queue, /showMoreQueue/)
  assert.match(queue, /pageSize: LABEL_QUEUE_MORE_STEP, skip: queue\.rows\.length/)
})

test("label rows show the queue row's own name; the brand and model subtitle helper left with its last reader", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const queue = readFileSync(QUEUE_PART, "utf8")

  assert.equal(existsSync("src/lib/asset-label-display.ts"), false)
  for (const source of [page, queue, readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8"), readFileSync(PRINT_LIST_PART, "utf8")]) {
    assert.doesNotMatch(source, /buildAssetLabelSubtitle|asset-label-display/)
  }
  assert.match(queue, /\{row\.name\}/)
})

test("label queue branch filter stays scoped to the selected company", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync(QUEUE_PART, "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /branches:\s*branches\.map\(\(branch\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{branch\.company\.code\} \/ \$\{branch\.code\} - \$\{branch\.name\}`[\s\S]*companyId:\s*branch\.companyId/)
  assert.match(component, /companyId\?: string/)
  assert.match(component, /filteredBranchOptions/)
  assert.match(component, /branch\.companyId === queueFilters\.companyId/)
  assert.match(component, /updateQueueFilter\("branchId", "all"\)/)
})

test("label queue location filter follows company and branch hierarchy", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync(QUEUE_PART, "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*branchId:\s*true,\s*branch:\s*{\s*select:\s*{\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /locations:\s*locations\.map\(\(location\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{location\.branch\.company\.code\} \/ \$\{location\.branch\.code\} \/ \$\{location\.code\} - \$\{location\.name\}`[\s\S]*branchId:\s*location\.branchId[\s\S]*companyId:\s*location\.branch\.companyId/)
  assert.match(component, /branchId\?: string/)
  assert.match(component, /shortLabel\?: string/)
  assert.match(component, /filteredLocationOptions/)
  assert.match(component, /location\.branchId === queueFilters\.branchId/)
  assert.match(component, /location\.companyId === queueFilters\.companyId/)
  assert.match(component, /isLocationInScope/)
  assert.match(component, /updateQueueFilter\("locationId", "all"\)/)
  assert.match(readFileSync(QUEUE_RULES, "utf8"), /locationId:\s*"all"/)
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
    assert.equal(typeof messages.labelsPage.filtersLabel, "string")
    assert.equal(typeof messages.labelsPage.filter.company, "string")
    assert.equal(typeof messages.labelsPage.created.fromLabel, "string")
    assert.equal(typeof messages.labelsPage.orderLabel, "string")
    for (const key of ["selected", "assetTag", "location", "category"]) assert.equal(typeof messages.labelsPage.order[key], "string", key)
    assert.equal(typeof messages.labelsPage.testPrint, "string")
    // The old queue words lost their last reader in group 4 plan 6 Task 4, the right column's in Task 5 (P6-C1).
    for (const key of [
      "labelQueueFiltersTitle", "queueFilterCompany", "queueFilterCreatedFrom", "labelPrintedBadge", "labelUnprintedBadge", "queueModeLabel", "resetQueueFilters", "loadMoreQueue", "addFilteredQueue", "scanPlaceholder",
      "labelsTitle", "labelsSubtitle", "selectedLabelsTitle", "noSelectedLabels", "selectedSortLabel", "selectedSortManual", "queueSortAssetTag", "queueSortLocation", "queueSortCategory", "printFirstLabel",
    ]) {
      assert.equal(messages[key], undefined, key)
    }
  }
})

test("label search guidance always sits under the input (board)", () => {
  const source = readFileSync(QUEUE_PART, "utf8")

  assert.match(source, /<Field label=\{t\("searchLabel"\)\} hint=\{t\("searchHint"\)\}>/)
  assert.doesNotMatch(source, /<div className="p-6 text-center text-sm text-muted-foreground">/)
})

test("label queue presents company and branch print scope before location filtering", () => {
  const source = readFileSync(QUEUE_PART, "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(source, /queueScopeSummary/)
  assert.match(source, /getQueueScopeSummary/)
  // By name, no codes (board): the branch and the room of a location.
  assert.match(source, /\[location\.branchName, location\.name\]\.filter\(Boolean\)\.join\(" \/ "\)/)
  assert.match(source, /t\("addAllSummary", \{ matched: addAll\.a, listed: addAll\.b, added: addAll\.c \}\)/)

  for (const messages of [th.assetTools.labelsPage, en.assetTools.labelsPage]) {
    for (const key of ["company", "branch", "location", "all"]) assert.equal(typeof messages.scope[key], "string", key)
    for (const key of ["addAllSummary", "addAll", "addSome", "addFirst100", "addRemaining", "addAllRoom", "addAllNone"]) assert.equal(typeof messages[key], "string", key)
  }
})

// Phase 2C batch 4 (spec 2C §8.9 O19, §4.5, §4.9, §6.4.2; 2B spec I13): the label batch tool's header, fields and
// buttons on the shared parts. The result and queue rows stay list buttons (2D); the status-line spinner stays and
// stops for users who reduce motion (I27). Group 4 plan 6 Task 4 split the tool into the shell and two parts.
test("the label batch tool uses PageHeader, shared fields and Button (2C batch 4)", () => {
  const shell = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8").replace(/\r\n/g, "\n")
  const source = readFileSync(QUEUE_PART, "utf8").replace(/\r\n/g, "\n")
  const list = readFileSync(PRINT_LIST_PART, "utf8").replace(/\r\n/g, "\n")
  assert.match(shell, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.match(source, /<Field label=\{t\("searchLabel"\)\} hint=\{t\("searchHint"\)\}>\n\s+<SearchField value=\{query\} onChange=\{\(event\) => setQuery\(event\.target\.value\)\} placeholder=\{tTools\("labelSearchPlaceholder"\)\} \/>\n\s+<\/Field>/)
  assert.equal(source.match(/<Field label=\{t\("created\.(?:from|to)Label"\)\}>\n\s+<Input\n\s+type="date"/g)?.length, 2)
  assert.match(list, /<Field label=\{t\("note"\)\} hint=\{t\("noteHint", \{ max: LABEL_PRINT_NOTE_MAX \}\)\}>\n\s+<Input\n/)
  assert.equal(source.match(/<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/g)?.length, 1, "one loading line part for the search and the queue")
  assert.match(source, /<LoadingLine label=\{tSearch\("loading"\)\} \/>/)
  assert.match(source, /<LoadingLine label=\{t\("queueLoading"\)\} \/>/)
  assert.match(source, /<Button variant="ghost" size="sm" onClick=\{resetQueueFilters\}>/)
  assert.match(source, /<Button variant="outline" size="sm" busy=\{moreLoading\} onClick=\{showMoreQueue\} className="ml-auto">/)
  assert.match(list, /<Button\n\s+variant="outline"\n\s+size="md"\n\s+aria-disabled=\{waits \|\| undefined\}\n\s+aria-describedby=\{waits \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{onTestPrint\}\n\s+>/)
  assert.match(list, /<Button\n\s+size="md"\n\s+aria-disabled=\{waits \|\| undefined\}\n\s+aria-describedby=\{waits \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{onPrint\}\n\s+>/)
  assert.match(list, /<Button variant="ghost" size="icon-sm" onClick=\{\(\) => onRemove\(asset\.id\)\} aria-label=\{t\("remove", \{ tag: asset\.assetTag \}\)\}>/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "only the search and queue row part stays a list button (2D)")
  for (const file of [shell, source, list]) {
    if (file !== source) assert.equal(file.match(/<button\b/g)?.length ?? 0, 0)
    assert.doesNotMatch(file, /<h1\b|<select\b|<input\b|<label\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
  }
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
    // One mapper for the label's data, shared with the labels page's preview (Task 5 review).
    assert.match(source, /toAssetLabelData\(\{ \.\.\.asset, location: asset\.currentLocation \}, labelSettings\.qrBaseUrl\)/, path)
    assert.doesNotMatch(source, /buildAssetQrValue|serialNumber: asset\.serialNumber/, path)
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

test("the label search placeholder names only what the asset search finds (critique 2026-10-20 B2, P6-R12)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const queue = readFileSync(QUEUE_PART, "utf8")
  assert.doesNotMatch(page, /scanPlaceholder|searchPlaceholder: tGlobalSearch\("placeholder"\)/)
  assert.match(queue, /placeholder=\{tTools\("labelSearchPlaceholder"\)\}/)
  assert.match(queue, /&scope=asset`/)
  assert.equal(JSON.parse(readFileSync("messages/th.json", "utf8")).assetTools.labelSearchPlaceholder, "รหัสทรัพย์สิน ชื่อ Serial ผู้ถือครอง หรือที่ตั้ง")
})

// Group 4 plan 6 Task 4 (P6-R2..R7, R11, the stable hooks): search rows through the lookup, the four modes, the chips,
// rows with their hooks and the board's names, the paging, and the 100 cap in the shell.
test("search results come through the lookup, so they show their real print state (P6-R11)", () => {
  const queue = readLf(QUEUE_PART)
  assert.match(queue, /setResults\(await fetchLabelRows\(\(payload\?\.results \?\? \[\]\)\.map\(\(result\) => result\.id\), locale, controller\.signal\)\)/)
  assert.match(queue, /fetch\(`\$\{labelPrintsApi\}\?\$\{buildLabelLookupSearch\(ids, locale\)\}`, \{ signal \}\)/)
  // Add-all fetches the rows of the ids it adds, from the queue's matching ids (P6-R3).
  assert.match(queue, /const rows = await fetchLabelRows\(addAll\.addIds, locale\)\n\s+onAdd\(rows\)/)
  assert.match(queue, /const addAll = addAllCounts\(\{ total: queue\.total, matchIds: queue\.ids, selectedIds, room \}\)/)
})

test("the queue: four modes as Segmented from md and a select below, the chips, and the reprint cap (P6-R4, P6-R5, P6-R6)", () => {
  const queue = readLf(QUEUE_PART)
  assert.match(queue, /const queueModes: readonly LabelPrintQueueMode\[\] = \["unprinted", "printed", "recent", "reprint"\]/)
  assert.match(queue, /<div className="hidden items-center gap-3 md:flex">\n\s+<span id="asset-label-queue-mode"[^\n]*\n\s+<Segmented\n\s+labelledBy="asset-label-queue-mode"/)
  assert.match(queue, /label: <span data-label-mode=\{mode\}>\{t\(`mode\.\$\{mode\}`\)\}<\/span>/)
  assert.match(queue, /<Field label=\{t\("queueModeLabel"\)\} className="md:hidden">\n\s+<NativeSelect/)
  assert.match(queue, /<option key=\{mode\} value=\{mode\} data-label-mode=\{mode\}>/)
  assert.match(queue, /<div role="group" aria-label=\{t\("filtersLabel"\)\} className="flex flex-wrap gap-1\.5">/)
  assert.equal(queue.match(/<FilterMenuChip\n/g)?.length, 6)
  for (const key of ["company", "branch", "location", "category", "created", "sort"]) assert.ok(queue.includes(`label={t("filter.${key}")}`), key)
  assert.match(queue, /label=\{t\("filter\.location"\)\}\n\s+searchable\n/)
  assert.match(queue, /label=\{t\("filter\.sort"\)\}[\s\S]*?active=\{false\}/)
  assert.match(queue, /queueFilters\.mode === "reprint" && queue\.reprintCapped \? \(\n\s+<Notice tone="warning">\{t\("reprintCap", \{ max: LABEL_REPRINT_CANDIDATE_CAP \}\)\}<\/Notice>/)
  assert.doesNotMatch(queue, /\bFilterSelect\b|\bLabeledSelect\b|\bFilter\(/)
})

test("queue rows: the stable hook, the board's names, ป้ายเดิม, and paging with the page (P6-R7)", () => {
  const queue = readLf(QUEUE_PART)
  assert.match(queue, /const hook = source === "queue" \? \{ "data-label-queue-row": row\.id \} : \{ "data-label-search-row": row\.id \}/)
  assert.match(queue, /<button\n\s+type="button"\n\s+\{\.\.\.hook\}\n\s+disabled=\{listed\}\n\s+aria-label=\{t\(name\.key, name\.values\)\}\n\s+aria-describedby=\{`\$\{metaId\} \$\{stateId\}`\}\n\s+onClick=\{\(\) => onAdd\(\[row\]\)\}/)
  assert.match(queue, /const name = labelRowNameKey\(row, \{ listed, duplicateNames \}\)/)
  assert.match(queue, /const holder = labelQueueRowHolder\(row, t\("sharedOwner"\)\)/)
  assert.match(queue, /const oldTag = labelQueueOldTag\(row\)/)
  assert.match(queue, /<ul aria-label=\{t\("queueListLabel", \{ count: queue\.total \}\)\} className="divide-y divide-border-soft">/)
  assert.match(queue, /\{t\("shownOf", \{ shown: queue\.rows\.length, total: queue\.total \}\)\}/)
  assert.match(queue, /\{queue\.rows\.length < queue\.total \? \(/)
  assert.match(queue, /setQueue\(\(current\) => \(\{ \.\.\.page, rows: appendQueueRows\(current\.rows, page\.rows\) \}\)\)/)
  assert.match(queue, /if \(currentSearch\.current !== search\) return/, "an answer for older filters is dropped")
  assert.doesNotMatch(queue, /overflow-y-auto/, "the queue scrolls with the page")
  // The selected rows carry their hook too (Task 5: numbered list items).
  assert.match(readLf(PRINT_LIST_PART), /<li key=\{asset\.id\} data-label-selected-row=\{asset\.id\}/)
})

test("the print list never passes 100 and says so in its status line (P6-R2)", () => {
  const shell = readLf("src/components/assets/asset-label-batch-tool.tsx")
  assert.match(shell, /const incoming = mergeIntoPrintList\(\[\], preselectedRows\)/)
  assert.match(shell, /setPrintList\(\(current\) => \{\n\s+const result = mergeIntoPrintList\(current\.rows, rows\)/)
  assert.match(shell, /const room = printListRoom\(ordered\.length\)/)
  assert.match(shell, /<AssetLabelQueueCard locale=\{locale\} filterOptions=\{filterOptions\} selectedIds=\{selectedIds\} room=\{room\} onAdd=\{addRows\} \/>/)
  assert.match(shell, /<AssetLabelSearchCard locale=\{locale\} selectedIds=\{selectedIds\} onAdd=\{addRows\} \/>/)
  assert.match(readLf(PRINT_LIST_PART), /<p role="status" className="border-t border-border-soft px-4 py-2\.5 text-meta text-muted-foreground empty:hidden md:px-5">\{status\}<\/p>/)
  // The incoming ids: in their order, once each, at most 100, through the lookup.
  const page = readLf("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx")
  assert.match(page, /const preselectedIds = normalizeLabelPrintAssetIds\(\(assetIds \?\? ""\)\.split\(","\)\)/)
  assert.match(page, /preselectedRows=\{preselected\.rows\}/)
})

// Task 4 review (fix round 1): no silent failure. Each failed request says so beside the control that failed, with a
// "ลองอีกครั้ง" that runs it again; add-all says how many deactivated assets it could not add; the add-all box shows the
// queue's loading state instead of a button that waits with no reason.
test("the queue says when a load, add-all, show-more or a search add fails, with retry (Task 4 review)", () => {
  const queue = readLf(QUEUE_PART)
  const retry = (handler: string) => new RegExp(`<Notice\\n\\s+tone="danger"\\n\\s+role="alert"\\n(?:\\s+className="[^"]+"\\n)?\\s+action=\\{<Button variant="outline" size="md" onClick=\\{${handler}\\}>\\{tCommon\\("tryAgain"\\)\\}</Button>\\}\\n\\s+>`)
  // The search (and its lookup): an error line under the search, not "ไม่พบผลลัพธ์".
  assert.match(queue, /setSearchError\(true\)/)
  assert.match(queue, retry("retrySearch"))
  assert.match(queue, /\{tSearch\("failed"\)\}/)
  assert.match(queue, /\}, \[locale, trimmedQuery, searchAttempt\]\)/)
  // The queue load.
  assert.match(queue, /setQueueError\(true\)/)
  assert.match(queue, retry("retryQueue"))
  assert.match(queue, /\{t\("queueLoadFailed"\)\}/)
  assert.match(queue, /\}, \[firstPageSearch, queueReload\]\)/)
  // Show more.
  assert.match(queue, /setMoreError\(true\)/)
  assert.match(queue, retry("showMoreQueue"))
  assert.match(queue, /\{t\("showMoreFailed"\)\}/)
  // Add-all, and the assets the lookup no longer returns.
  assert.match(queue, /setAddAllError\(true\)/)
  assert.match(queue, retry("addAllMatching"))
  assert.match(queue, /\{t\("addAllFailed"\)\}/)
  assert.match(queue, /setAddAllSkipped\(lookupMissingCount\(addAll\.addIds, rows\)\)/)
  assert.match(queue, /\{addAllSkipped > 0 \? <p role="status" className="mt-1 text-muted-foreground">\{t\("addAllSkipped", \{ count: addAllSkipped \}\)\}<\/p> : null\}/)
  assert.doesNotMatch(queue, /catch \{\n\s+\/\/[^\n]*\n\s+\}/, "no catch swallows a failure")
  // While the queue loads (or failed), the box says so in a status line the button points at.
  assert.match(queue, /const addAllReason = queueLoading \? t\("queueLoading"\) : queueError \? t\("queueLoadFailed"\) : addAllNoteText\n/)
  assert.match(queue, /const addAllWaits = queueLoading \|\| queueError \|\| addAll\.c === 0\n/)
  assert.match(queue, /<p id="asset-label-add-all-reason" role="status" className="mt-1 text-muted-foreground empty:hidden">\n\s+\{addAllReason\}\n\s+<\/p>/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).assetTools.labelsPage
  assert.equal(th.queueLoading, "กำลังโหลดคิวป้าย")
  assert.equal(th.queueLoadFailed, "โหลดคิวป้ายไม่สำเร็จ")
  assert.equal(th.showMoreFailed, "โหลดรายการเพิ่มไม่สำเร็จ")
  assert.equal(th.addAllFailed, "เพิ่มเข้ารายการพิมพ์ไม่สำเร็จ")
  assert.equal(th.addAllSkipped, "ไม่ได้เพิ่ม {count, number} รายการที่ปิดใช้งานแล้ว")
})

// Group 4 plan 6 Task 5 (P6-R1, R2, R8, R9, R10, R13; Review Focus 3 and 4): the numbered print list, tape and note, the
// label-by-label preview, the print bar and the refetch after a print in the other tab.
const SHELL = "src/components/assets/asset-label-batch-tool.tsx"
const LABELS_PAGE = "src/app/[locale]/(dashboard)/asset-management/labels/page.tsx"
const PRINT_LIST_RULES = "../src/lib/asset-label-print-list-rules.ts"
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`

test("the print URL holds at most 100 ids in its query; tape and note ride only in its hash (P6-R9, Review Focus 4)", async () => {
  const { buildLabelPrintUrl } = await import(PRINT_LIST_RULES)
  const { parseAssetLabelPrintHash } = await import("../src/lib/asset-label-print-hash.ts")
  const ids = [uuid(7), uuid(7), ...Array.from({ length: 104 }, (_, index) => uuid(index))]
  const note = "ก".repeat(500)
  const href = buildLabelPrintUrl({ locale: "th", ids, tapeSize: "24", note })
  const url = new URL(href, "https://assets.example.test")
  assert.equal(url.pathname, "/th/assets/labels")
  assert.deepEqual([...new Set(url.searchParams.keys())], ["id"], "the query holds the ids only")
  const queryIds = url.searchParams.getAll("id")
  assert.equal(queryIds.length, 100)
  assert.deepEqual(queryIds.slice(0, 3), [uuid(7), uuid(0), uuid(1)], "the list order, once each")
  assert.equal(new Set(queryIds).size, 100)
  assert.ok(!url.search.includes(encodeURIComponent("ก")) && !url.search.includes("note"), "no note in the query")
  // Well under Nginx's 8 KB request line: the hash never reaches the server.
  assert.ok(href.split("#")[0].length < 4200)
  assert.deepEqual(parseAssetLabelPrintHash(url.hash, "18"), { tapeSize: "24", note })
  // A longer note is cut to the record's 500; the spaces around it go.
  const long = new URL(buildLabelPrintUrl({ locale: "en", ids: [uuid(1)], tapeSize: "custom", note: `  ${"ข".repeat(600)}  ` }), "https://assets.example.test")
  assert.equal(long.pathname, "/en/assets/labels")
  assert.deepEqual(parseAssetLabelPrintHash(long.hash, "18"), { tapeSize: "custom", note: "ข".repeat(500) })
  // The shell opens it in a new tab, as before.
  const shell = readLf(SHELL)
  assert.match(shell, /window\.open\(buildLabelPrintUrl\(\{ locale, ids, tapeSize, note: printNote \}\), "_blank", "noopener,noreferrer"\)/)
  assert.match(shell, /function printLabels\(\) \{\n\s+if \(ordered\.length === 0\) return\n\s+openPrint\(ordered\.map\(\(asset\) => asset\.id\), note\)/)
})

test("the incoming ids keep the register's order, once each, and say they came from the register (P6-R1, Review Focus 3)", async () => {
  const { normalizeLabelPrintAssetIds } = await import("../src/lib/asset-label-print-tracking.ts")
  const { mergeIntoPrintList } = await import("../src/lib/asset-label-queue-rules.ts")
  // The register sends 100 ids with duplicates: each asset once, in the register's order.
  const sent = Array.from({ length: 100 }, (_, index) => uuid(index % 60))
  const ids = normalizeLabelPrintAssetIds(sent)
  assert.deepEqual(ids, Array.from({ length: 60 }, (_, index) => uuid(index)))
  const merged = mergeIntoPrintList([], ids.map((id) => ({ id })))
  assert.deepEqual(merged.next.map((row) => row.id), ids)
  assert.equal(merged.added, 60)
  const page = readLf(LABELS_PAGE)
  assert.match(page, /searchParams: Promise<\{ assetIds\?: string; from\?: string \}>/)
  assert.match(page, /const \{ assetIds, from \} = await searchParams/)
  assert.match(page, /const preselectedIds = normalizeLabelPrintAssetIds\(\(assetIds \?\? ""\)\.split\(","\)\)/)
  assert.match(page, /loadAssetLabelPrintSettings\(\),/)
  assert.match(page, /fromRegister=\{from === "register"\}/)
  assert.match(page, /settings=\{labelSettings\}/)
  assert.doesNotMatch(page, /getTranslations|systemSetting|process\.env/)
  // The line shows only with from=register: the count is what came in, and clearing the list forgets it.
  const shell = readLf(SHELL)
  assert.match(shell, /fromRegister: fromRegister \? incoming\.next\.length : 0/)
  assert.match(shell, /setPrintList\(\{ rows: \[\], lastAdd: null, fromRegister: 0 \}\)/)
  const list = readLf(PRINT_LIST_PART)
  assert.match(list, /\{fromRegisterCount > 0 \? \(\n\s+<p className="border-t border-border-soft px-4 py-2\.5 text-meta text-muted-foreground md:px-5">\{t\("fromRegister", \{ count: fromRegisterCount \}\)\}<\/p>\n\s+\) : null\}/)
})

test("test print sends the label shown in the preview, with พิมพ์ทดสอบ when no note was typed (P6-R8)", async () => {
  const { labelTestPrint, labelPreviewIndex } = await import(PRINT_LIST_RULES)
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }]
  assert.deepEqual(labelTestPrint(rows, 1, "", "พิมพ์ทดสอบ"), { ids: ["b"], note: "พิมพ์ทดสอบ" })
  assert.deepEqual(labelTestPrint(rows, 2, "   ", "พิมพ์ทดสอบ"), { ids: ["c"], note: "พิมพ์ทดสอบ" })
  assert.deepEqual(labelTestPrint(rows, 0, "ลองเทปใหม่", "พิมพ์ทดสอบ"), { ids: ["a"], note: "ลองเทปใหม่" })
  // An index past the end (a row was removed) is the last label, the one the preview shows.
  assert.deepEqual(labelTestPrint(rows, 9, "", "พิมพ์ทดสอบ"), { ids: ["c"], note: "พิมพ์ทดสอบ" })
  assert.equal(labelTestPrint([], 0, "", "พิมพ์ทดสอบ"), null)
  assert.equal(labelPreviewIndex(5, 3), 2)
  assert.equal(labelPreviewIndex(-1, 3), 0)
  assert.equal(labelPreviewIndex(4, 0), 0)
  const shell = readLf(SHELL)
  assert.match(shell, /function testPrint\(\) \{\n(?:\s+\/\/[^\n]*\n)*\s+const request = labelTestPrint\(ordered, previewIndex, note, t\("testPrintNote"\)\)\n\s+if \(!request\) return\n\s+openPrint\(request\.ids, request\.note\)/)
  // The preview shows the same index, clamped the same way.
  assert.match(readLf(PRINT_LIST_PART), /const index = labelPreviewIndex\(previewIndex, rows\.length\)\n\s+const shown = rows\[index\]/)
})

test("the print order, the preview's label data and the refreshed rows (P6-R11, P6-R13)", async () => {
  const { sortLabelPrintList, labelTapeText, refreshLabelRows, labelPrintOrders } = await import(PRINT_LIST_RULES)
  const { toAssetLabelData } = await import("../src/lib/asset-label-data.ts")
  const { queueRefreshPageSize } = await import("../src/lib/asset-label-queue-rules.ts")
  const row = (id: string, assetTag: string, location: string | null, category: string) => ({
    id,
    assetTag,
    name: `name ${id}`,
    serialNumber: id === "2" ? null : `SN-${id}`,
    ownershipType: "personal",
    holder: null,
    location: location ? { code: location, name: `room ${location}` } : null,
    company: { code: "GRL", name: "Glink" },
    branch: { code: "HQ", name: "Head office" },
    category: { code: category, name: `cat ${category}` },
    lastPrint: null,
  })
  const rows = [row("1", "A-10", "R2", "C1"), row("2", "A-9", null, "C2"), row("3", "A-11", "R1", "C1")]
  const ids = (list: { id: string }[]) => list.map((item) => item.id)
  assert.deepEqual(labelPrintOrders, ["selected", "assetTag", "location", "category"])
  assert.deepEqual(ids(sortLabelPrintList(rows, "selected")), ["1", "2", "3"])
  assert.deepEqual(ids(sortLabelPrintList(rows, "assetTag")), ["2", "1", "3"], "numeric order")
  assert.deepEqual(ids(sortLabelPrintList(rows, "location")), ["2", "3", "1"])
  assert.deepEqual(ids(sortLabelPrintList(rows, "category")), ["1", "3", "2"])
  // The preview draws what the print route draws, through the same mapper: the serial, codes for company and branch,
  // "code - name" for category and room.
  assert.deepEqual(toAssetLabelData(rows[0], "https://assets.example.test"), {
    id: "1",
    assetTag: "A-10",
    name: "name 1",
    serialNumber: "SN-1",
    category: "C1 - cat C1",
    company: "GRL",
    branch: "HQ",
    location: "R2 - room R2",
    qrValue: "https://assets.example.test/q/a/1",
  })
  assert.equal(toAssetLabelData(rows[1], "").location, "")
  assert.equal(toAssetLabelData(rows[1], "").qrValue, "/q/a/2")
  assert.equal(toAssetLabelData(rows[1], "").serialNumber, null)
  assert.equal(labelTapeText("18", "กำหนดเอง"), "18 mm")
  assert.equal(labelTapeText("custom", "กำหนดเอง"), "กำหนดเอง")
  // The refetch replaces each listed row with today's, in the list's order; a row the lookup did not return stays.
  const fresh = { ...rows[2], assetTag: "A-12", lastPrint: { printedAt: "2026-11-02T00:00:00.000Z", assetTag: "A-11" } }
  assert.deepEqual(refreshLabelRows(rows, [fresh]).map((item: { assetTag: string }) => item.assetTag), ["A-10", "A-9", "A-12"])
  // The queue asks again for as many rows as it shows, from the top: at least the first page, at most 100.
  assert.equal(queueRefreshPageSize(0), 20)
  assert.equal(queueRefreshPageSize(40), 40)
  assert.equal(queueRefreshPageSize(130), 100)
})

test("the print list card: numbered rows with the hook, the count badge and the order in the head, the cap line (board, P6-R2)", () => {
  const list = readLf(PRINT_LIST_PART)
  assert.match(list, /<ContentPanel\n\s+divided\n\s+flush\n\s+title=\{t\("listTitle"\)\}\n\s+actions=\{\n\s+<>\n\s+<StatusBadge label=\{t\("listCount", \{ count: rows\.length \}\)\} tone="info" \/>\n\s+<NativeSelect\n\s+aria-label=\{t\("orderLabel"\)\}/)
  assert.match(list, /\{labelPrintOrders\.map\(\(value\) => \(\n\s+<option key=\{value\} value=\{value\}>\n?\s*\{t\(`order\.\$\{value\}`\)\}/)
  assert.match(list, /<ol aria-label=\{t\("listTitle"\)\} className="divide-y divide-border-soft">/)
  assert.match(list, /<li key=\{asset\.id\} data-label-selected-row=\{asset\.id\} className="[^"]+">\n\s+<span aria-hidden="true" className="num w-6 shrink-0 text-meta text-muted-foreground">\n?\s*\{formatCount\(index \+ 1\)\}/)
  assert.match(list, /<span className="block break-words text-sm font-medium text-foreground">\{asset\.name\}<\/span>\n\s+<span className="block text-meta text-muted-foreground">\n\s+<span className="tag">\{asset\.assetTag\}<\/span>/)
  assert.match(list, /<Button variant="ghost" size="icon-sm" onClick=\{\(\) => onRemove\(asset\.id\)\} aria-label=\{t\("remove", \{ tag: asset\.assetTag \}\)\}>/)
  assert.match(list, /<EmptyNote id="asset-label-print-reason" padded>\n?\s*\{t\("listEmpty"\)\}/)
  assert.match(list, /<p role="status" className="border-t border-border-soft px-4 py-2\.5 text-meta text-muted-foreground empty:hidden md:px-5">\n?\s*\{status\}/)
  assert.doesNotMatch(list, /<form\b|labels\.|selectedSort|printFirstLabel|max-h-\[/)
})

test("the settings card: tape as Segmented, a note of at most 500, the preview label by label, the Brother hint and the QR (board, P6-R9, recon X11)", () => {
  const list = readLf(PRINT_LIST_PART)
  assert.match(list, /<ContentPanel divided title=\{t\("settingsTitle"\)\}>/)
  assert.match(list, /<span id="asset-label-tape-size" className="text-sm font-medium text-foreground">\n?\s*\{t\("tapeSize"\)\}\n?\s*<\/span>\n\s+<Segmented\n\s+labelledBy="asset-label-tape-size"\n\s+fill\n\s+value=\{tapeSize\}\n\s+onValueChange=\{onTapeSizeChange\}\n\s+options=\{assetLabelTapeSizes\.map\(\(size\) => \(\{ value: size, label: labelTapeText\(size, t\("tapeCustom"\)\) \}\)\)\}/)
  assert.match(list, /<Field label=\{t\("note"\)\} hint=\{t\("noteHint", \{ max: LABEL_PRINT_NOTE_MAX \}\)\}>\n\s+<Input\n\s+value=\{note\}\n\s+onChange=\{\(event\) => onNoteChange\(event\.target\.value\)\}\n\s+maxLength=\{LABEL_PRINT_NOTE_MAX\}\n\s+placeholder=\{t\("notePlaceholder"\)\}/)
  assert.match(list, /\{t\("previewPosition", \{ index: index \+ 1, total: rows\.length \}\)\}/)
  assert.match(list, /aria-label=\{t\("previewPrevious"\)\}\n\s+aria-disabled=\{index === 0 \|\| undefined\}/)
  assert.match(list, /aria-label=\{t\("previewNext"\)\}\n\s+aria-disabled=\{index >= rows\.length - 1 \|\| undefined\}/)
  assert.match(list, /<AssetLabelPreview\n\s+asset=\{sheetAsset\}\n\s+template=\{settings\.templates\.tapes\[tapeSize\]\}\n\s+scanHint=\{tAsset\("scanToOpenDetail"\)\}\n\s+compactAssetNameEnabled=\{settings\.templates\.compactAssetNameEnabled\}\n\s+label=\{t\("previewName", \{ size: tapeText, tag: sheetAsset\.assetTag \}\)\}/)
  assert.match(list, /const sheetAsset = shown \? toAssetLabelData\(shown, settings\.qrBaseUrl\) : null/)
  assert.match(list, /<Notice tone="neutral">\{t\("brotherHint", \{ size: getAssetLabelTapePrinterSize\(tapeSize\) \}\)\}<\/Notice>/)
  assert.match(list, /\{t\("qrTarget"\)\} <span className="break-all font-mono text-foreground">\{sheetAsset\.qrValue\}<\/span>/)
  assert.match(list, /\{isLikelyLocalAssetQrValue\(sheetAsset\.qrValue\) \? <Notice tone="warning">\{tAsset\("labelQrLocalWarning"\)\}<\/Notice> : null\}/)
  // The label stays light inside the shared part: no scope, paper or raw color of its own here.
  assert.doesNotMatch(list, /data-theme|bg-white|text-black|#[0-9a-fA-F]{3,6}\b|rgba?\(|\bdark:/)
})

test("the print bar: DesktopSelectionBar last on the page from md while the list holds a label; inline actions below md (P6-R10)", () => {
  const shell = readLf(SHELL)
  const list = readLf(PRINT_LIST_PART)
  assert.match(shell, /\{ordered\.length > 0 \? \(\n\s+<DesktopSelectionBar\n\s+label=\{t\("listTitle"\)\}\n\s+countLabel=\{summary\}\n\s+clearLabel=\{t\("clearList"\)\}\n\s+onClear=\{clearList\}\n\s+actions=\{<AssetLabelPrintActions count=\{ordered\.length\} onTestPrint=\{testPrint\} onPrint=\{printLabels\} className="contents" \/>\}\n\s+\/>\n\s+\) : null\}\n\s+<\/div>\n\s+\)\n\}/, "the bar is the wrapper's last child")
  assert.match(shell, /const summary = t\("barSummary", \{ count: ordered\.length, size: labelTapeText\(tapeSize, t\("tapeCustom"\)\) \}\)/)
  // overflow-x-clip, not hidden: a sticky bar needs no scroll container between it and main (DESIGN.md).
  assert.match(shell, /<div className="mx-auto max-w-7xl space-y-5 overflow-x-clip">/)
  assert.doesNotMatch(shell, /overflow-x-hidden|StickyFormFooter|\bfixed\b/)
  // Below md the two actions sit at the end of the list card, waiting with their reason while the list is empty.
  assert.match(list, /<div className="grid gap-2 border-t border-border-soft px-4 py-3 md:hidden">\n\s+\{rows\.length > 0 \? <p className="text-meta text-muted-foreground">\{summary\}<\/p> : null\}\n\s+<AssetLabelPrintActions count=\{rows\.length\} onTestPrint=\{onTestPrint\} onPrint=\{onPrint\} className="grid gap-2 sm:grid-cols-2" \/>/)
  // The stable names: "พิมพ์ทดสอบ 1 ดวง" and "พิมพ์ป้าย {count} ดวง", the primary last.
  assert.match(list, /<Button\n\s+variant="outline"\n\s+size="md"\n\s+aria-disabled=\{waits \|\| undefined\}\n\s+aria-describedby=\{waits \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{onTestPrint\}\n\s+>\n\s+\{t\("testPrint"\)\}\n\s+<\/Button>\n\s+<Button\n\s+size="md"\n\s+aria-disabled=\{waits \|\| undefined\}\n\s+aria-describedby=\{waits \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{onPrint\}\n\s+>\n\s+<Printer aria-hidden="true" \/>\n\s+\{t\("print", \{ count \}\)\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).assetTools.labelsPage
  assert.equal(th.print, "พิมพ์ป้าย {count, number} ดวง")
  assert.equal(th.testPrint, "พิมพ์ทดสอบ 1 ดวง")
  assert.equal(th.clearList, "ล้างรายการพิมพ์")
  assert.equal(th.barSummary, "{count, number} ดวงที่จะพิมพ์ · เทป {size}")
})

test("after a print in the other tab, the page asks again for the queue and the list's rows when it is visible (P6-R13)", () => {
  const shell = readLf(SHELL)
  const queue = readLf(QUEUE_PART)
  for (const source of [shell, queue]) {
    assert.match(source, /if \(document\.visibilityState !== "visible"/)
    assert.match(source, /document\.addEventListener\("visibilitychange", refresh(?:List|Queue)\)\n\s+return \(\) => document\.removeEventListener\("visibilitychange", refresh(?:List|Queue)\)/)
  }
  assert.match(shell, /const rows = await fetchLabelRows\(listIds, locale\)\n\s+setPrintList\(\(current\) => \(\{ \.\.\.current, rows: refreshLabelRows\(current\.rows, rows\) \}\)\)/)
  assert.match(shell, /setRefreshFailed\(true\)/)
  assert.match(queue, /export async function fetchLabelRows\(/)
  assert.match(queue, /const page = await fetchQueuePage\(buildLabelQueueSearch\(queueFilters, \{ pageSize: queueRefreshPageSize\(shownRows\), skip: 0, locale \}\)\)\n\s+if \(currentSearch\.current !== search\) return\n\s+setQueue\(page\)/)
  assert.equal(JSON.parse(readFileSync("messages/th.json", "utf8")).assetTools.labelsPage.listRefreshFailed, "โหลดสถานะล่าสุดของรายการพิมพ์ไม่สำเร็จ")
})

// Task 5 review: the page's preview shows the lines the label prints. The print routes (from the Prisma asset) and the
// preview (from the queue row) feed AssetLabelItem through one mapper, so the same asset gives the same fields.
test("the page preview and the print route feed the label the same fields, serial included (Task 5 review)", async () => {
  const { toAssetLabelData } = await import("../src/lib/asset-label-data.ts")
  const prismaAsset = {
    id: "asset-1",
    assetTag: "GRL-COM-26-0017",
    name: "Notebook Lenovo ThinkPad E14 Gen 5",
    serialNumber: "PF4ABC12",
    isActive: true,
    category: { code: "COM", name: "คอมพิวเตอร์" },
    company: { code: "GRL", nameTh: "จีแอลอาร์" },
    branch: { code: "HQ", name: "สำนักงานใหญ่" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" },
  }
  const queueRow = {
    id: "asset-1",
    assetTag: "GRL-COM-26-0017",
    name: "Notebook Lenovo ThinkPad E14 Gen 5",
    serialNumber: "PF4ABC12",
    ownershipType: "personal",
    holder: { code: "E001", name: "สมชาย ใจดี" },
    location: { code: "IT-2", name: "ห้อง IT ชั้น 2" },
    company: { code: "GRL", name: "จีแอลอาร์" },
    branch: { code: "HQ", name: "สำนักงานใหญ่" },
    category: { code: "COM", name: "คอมพิวเตอร์" },
    lastPrint: null,
  }
  const base = "https://assets.example.test"
  const printed = toAssetLabelData({ ...prismaAsset, location: prismaAsset.currentLocation }, base)
  assert.deepEqual(toAssetLabelData(queueRow, base), printed)
  assert.equal(printed.serialNumber, "PF4ABC12")
  // The queue row and the lookup select the serial (P6-R11).
  assert.match(readLf("src/lib/asset-label-queue.ts"), /name: true,\n\s+serialNumber: true,\n/)
  // No second mapper: the page's rules no longer build label data, and every caller imports the shared one.
  assert.doesNotMatch(readLf("src/lib/asset-label-print-list-rules.ts"), /labelSheetAsset|buildAssetQrValue/)
  for (const path of [BATCH_PAGE, SINGLE_PAGE, PRINT_LIST_PART]) {
    assert.match(readLf(path), /import \{ toAssetLabelData \} from "@\/lib\/asset-label-data"/, path)
  }
})
