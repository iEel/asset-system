import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M12, M15, M22, M23, M25, M27, M29, M32, M33): the asset pages, the asset tools and
// my assets on the shared parts. Panels are ContentPanel (or getPanelClasses where the element cannot be one), tables
// DataTable, numbers StatStrip, label and value pairs KeyValueList, messages Notice by meaning, states StatusBadge, names
// the shared Chip, empty states EmptyNote or ActionEmptyState, codes tag, empty values Nil. Each test pins one file (or
// one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("status correction: a dialog with the dialog parts, the description in the dialog head, no panel of its own (group 1 asset detail task 8A)", () => {
  const source = read(`${C}assets/asset-status-correction-dialog.tsx`)
  assert.match(source, /import \{ AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses \} from "@\/components\/ui\/accessible-dialog"/)
  assert.match(source, /description=\{labels\.description\}/)
  assert.doesNotMatch(source, /rounded-md border border-border bg-background p-4|border-warning-border|<Notice tone="neutral"/)
})

test("transaction cancel dialog: a missing state snapshot is null and shows Nil (spec 2D M32 b; the type the asset page needs, plan 2D-3 R2)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assert.match(source, /export type TransactionCancelDialogProps = \{[\s\S]*?currentState: string \| null\n\s+restoreState: string \| null\n/)
  assert.match(source, /<dd className="break-words text-right font-medium text-foreground">\{orNil\(value\)\}<\/dd>/)
})

test("asset purchase documents: EmptyNote, the number as a tag, Nil for an empty line, no box in a box, and the shared buttons (spec 2D M21, M29, M33)", () => {
  const source = read(`${C}assets/asset-purchase-documents.tsx`)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("purchaseDocuments"\)\}<\/h3>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, / · <span className="tag">\{document\.documentNo\}<\/span>/)
  assert.match(source, /\{orNil\(\n\s+\[document\.supplierName,/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => onDelete\(attachment\.id\)\}\n\s+busy=\{deletingId === attachment\.id\}/)
  assert.doesNotMatch(source, /<button\b|Loader2|disabled:opacity|border-dashed|"-"|text-primary|bg-surface|hover:bg-accent|\bh-8\b/)
})

test("asset photos: a ContentPanel with a plain count, StatusBadge states, the shared buttons and EmptyNote, and no box in a box (spec 2D D9, M21, M22, M29)", () => {
  const source = read(`${C}assets/asset-attachments.tsx`)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("assetPhotos"\)\}\n\s+description=\{t\("photoGalleryPreviewHelp"\)\}\n\s+actions=\{/)
  assert.match(source, /<span className="text-meta text-muted-foreground">\{t\("photoFileCount", \{ count: attachments\.length \}\)\}<\/span>/)
  assert.match(source, /<h3 className="text-sm font-semibold text-foreground">\{t\("photoChecklist"\)\}<\/h3>/)
  assert.match(source, /<StatusBadge label=\{t\("photoChecklistDone"\)\} tone="success" \/>/)
  assert.match(source, /<StatusBadge label=\{t\("photoChecklistPending"\)\} tone="muted" \/>/)
  assert.equal(source.match(/className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/g)?.length, 2)
  assert.match(source, /<Button variant="outline" aria-expanded=\{expanded\} className="mt-3 w-full sm:w-auto" onClick=\{onClick\}>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  // The three photos that open the preview stay raw buttons: an image is the control (plan 2D-3 R5, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 3)
  assert.equal(source.match(/focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/g)?.length, 3)
  assert.doesNotMatch(source, /rounded-full|border-dashed|hover:bg-accent|focus:outline-none|focus:ring|text-primary|text-success|CheckCircle2|\bh-8\b|\bh-9\b|text-xs|rounded-lg|bg-surface/)
})

test("components summary: a ContentPanel, codes as tag, text links, a warning StatusBadge and EmptyNote (spec 2D D7, D9, M33)", () => {
  const summary = read(`${C}assets/asset-components-summary.tsx`)
  assert.match(summary, /<ContentPanel\n\s+title=\{labels\.title\}\n\s+description=\{labels\.help\}\n\s+actions=\{/)
  assert.match(summary, /<Link href=\{manageHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(summary, /<StatusBadge tone="warning" label=\{`\$\{labels\.missingSerial\}: \$\{formatCount\(missingSerialCount\)\}`\} \/>/)
  assert.match(summary, /<EmptyNote>\{labels\.noCurrent\}<\/EmptyNote>/)
  assert.match(summary, /<span className="tag font-medium">\{component\.componentAsset\.assetTag\}<\/span>/)
  assert.match(summary, /<span className="tag font-medium">\{link\.parentAsset\.assetTag\}<\/span>/)
  assert.doesNotMatch(summary, /font-mono|uppercase|rounded-full|border-dashed|bg-primary|text-white|primary-soft|hover:bg-accent|sm:h-10|text-xs|text-primary/)
})

const D = "src/app/[locale]/(dashboard)/"

test("asset page: the sections the later tabs replace keep the panel classes; the overview's panels are ContentPanels in the detail parts (spec 2D §3.3; group 1 asset detail task 8)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"\)\}/g)?.length, 3, "handover, maintenance and the files tab's purchase documents")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 1, "the relationship map")
  assert.match(source, /<Notice tone="warning" className="mb-4">\n\s+\{t\("maintenanceReplacementWarning"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(source, /<Chip>\{t\("latestTransaction"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/g)?.length, 4)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /return labels\.parentAssets\.get\(checkout\.parentAssetId\) \?\? checkout\.parentAssetId\n\s+return null\n\}/)
  assert.match(source, /if \(!snapshot\) return null\n/)
  assert.doesNotMatch(source, /filterLabel: tCommon\("filter"\)/)
  assert.match(source, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/)
  const banned = /\b(?:bg|text|border)-(?:amber|emerald)-\d|border-dashed|uppercase|rounded-full (?:bg|px)-|bg-surface\/\d|primary-soft|info-soft|warning-soft|hover:underline|hover:bg-accent|font-semibold leading-5|focus:outline-none|scale-\[|return "-"|\bh-8\b|md:h-10|text-lg|text-info|\btext-xs\b|toLocaleString/
  for (const file of [source, ...["asset-detail-header", "asset-detail-actions", "asset-detail-fact-strip", "asset-overview"].map((name) => read(`${C}assets/detail/${name}.tsx`))]) assert.doesNotMatch(file, banned)
})

test("asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents ChoiceCards with Nil, and no box in a box (spec 2D D7, D9, M21)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.match(source, /<Notice\n\s+tone="info"\n\s+className="mb-5"\n\s+title=\{t\("cloneBannerTitle", \{ assetTag: cloneSource\.assetTag \}\)\}/)
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2, "the cross-company and cross-branch warnings")
  assert.match(source, /<Notice id="asset-status-protected" tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  assert.match(source, /: null\n\s+const assetStatusHelp = \{/, "the blocked sentence is the Notice title, so the help is not the same sentence again")
  assert.match(source, /<Notice tone="neutral" title=\{t\("custodianNotRequired"\)\}>\n\s+\{t\("custodianNotRequiredHelp"\)\}\n\s+<\/Notice>/)
  assert.match(source, /title=\{<>\{t\("licenseRemainingSeats"\)\}: \{orNil\(getRemainingLicenseSeats\(values\.licenseTotalSeats, values\.licenseUsedSeats\)\)\}<\/>\}/)
  assert.match(source, /description=\{<>\{orNil\(document\.supplierName\)\} · \{t\("linkedAssets", \{ count: document\.assetCount \}\)\}<\/>\}/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 4)
  assert.match(source, /return null\n\s+const remainingSeats = [^\n]+\n\s+return formatCount\(remainingSeats\)/)
  assert.doesNotMatch(source, /"-"|border-dashed|uppercase|bg-accent|bg-warning-soft|bg-info-soft|text-warning|text-lg|rounded-lg border|focus:outline-none|\btext-xs\b|toLocaleString|bg-surface p-3/)
})

test("asset batch form: ContentPanel sections, three DataTables, Notice by meaning, ChoiceCard documents, a KeyValueList review and Nil (spec 2D D7, D9, M21, D19)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "Section, the review and the created batch")
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2)
  // The duplicate box went under the rows as each row's error (v-track plan 2 A2, spec U8).
  assert.doesNotMatch(source, /\{t\("duplicateWarning"\)\}/)
  assert.match(source, /<Notice\n\s+tone=\{duplicateCheckStatus === "clean" \? "success" : duplicateCheckStatus === "duplicate" \? "warning" : "danger"\}\n\s+className="md:col-span-2"/)
  assert.match(source, /<EmptyNote className="mt-3">\{t\("noPurchaseDocuments"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\n\s+key=\{document\.id\}\n\s+type="checkbox"/)
  assert.match(source, /\{ key: "count", label: t\("batchRows"\), value: formatCount\(rows\.length\) \}/)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.equal(source.match(/\{orNil\(/g)?.length, 6, "the six review cells that can be empty")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function SummaryItem\b|"-"|<table\b|<thead\b|<th\b|<td\b|border-dashed|bg-accent|bg-(?:primary|success|warning|danger)-soft|text-lg|text-warning|\btext-xs\b|rounded-lg border/)
})

test("component manager: ContentPanels, a success Notice, EmptyNote, a KeyValueList review, codes as tag and text links (spec 2D D7, D9, M21, M33, D19)", () => {
  const source = read(`${C}assets/asset-component-manager.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3)
  assert.match(source, /<ContentPanel title=\{labels\.scanOrSearch\} description=\{labels\.candidateHelp\}>/)
  assert.match(source, /<Notice\n\s+tone="success"\n\s+action=\{/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 4)
  assert.match(source, /\{ key: "installedAt", label: labels\.installedAt, value: installedAt \? formatDateTime\(installedAt\) : null \}/)
  assert.equal(source.match(/<span className="tag font-medium">/g)?.length, 3, "the candidate, the selected component and the component row")
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /function ReviewItem\b|"-"|font-mono|uppercase|border-dashed|bg-(?:success|primary)-soft p|border-(?:success|primary)-border|hover:bg-accent|hover:underline|\btext-xs\b|rounded-lg border/)
})

test("import panel (M15): ContentPanels, Chip mappings, a StatusBadge batch state, KeyValueList facts, a StatStrip, Notice by meaning, a DataTable and Nil (spec 2D D7, D9, M15)", () => {
  const source = read(`${C}assets/asset-import-preview-panel.tsx`)
  assert.equal(source.match(/<ContentPanel className="mb-4">/g)?.length, 2, "closed and open")
  assert.match(source, /<Chip\n\s+key=\{column\.key\}/)
  assert.match(source, /<StatusBadge label=\{formatBatchStatus\(preview\.batch\.status, labels\)\} tone=\{getAssetImportBatchStatusTone\(preview\.batch\.status\)\} \/>/)
  assert.match(source, /\{ key: "batchId", label: labels\.importBatchId, value: <span className="break-all font-mono">\{preview\.batch\.batchId\}<\/span> \}/)
  assert.match(source, /<StatStrip\n\s+className="mt-4"/)
  assert.match(source, /<Notice tone="warning" title=\{labels\.issueSummaryTitle\} className="mt-4">/)
  assert.match(source, /<Notice tone="success" role="status" className="mt-4">\n\s+\{success\}\n\s+<\/Notice>/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{labels\.importPreview\} className="mt-4 max-h-80 overflow-y-auto">/)
  assert.match(source, /\{orNil\(row\.values\.name\)\}/)
  assert.match(source, /return `\$\{formatCount\(Math\.max\(1, Math\.round\(size \/ 1024\)\)\)\} KB`/)
  assert.doesNotMatch(source, /function (?:SummaryItem|SummaryPill|getBatchStatusClass)\b|"-"|toLocaleString|<table\b|<th\b|uppercase|bg-muted\/|rounded-full|primary-soft|info-soft|success-soft|warning-soft|\btext-xs\b|text-lg font-bold/)
})

test("import-export page: link cards on the panel frame with download for /api, the history a ContentPanel with StatusBadges, EmptyNote and no raw colors (spec 2D D9, M22, M29, M31)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.equal(source.match(/<ActionLink\n\s+download\n/g)?.length, 2, "the template and the export are files")
  assert.match(source, /<a href=\{href\} download className=\{actionCardClasses\}>/)
  assert.match(source, /<Link href=\{href\} className=\{actionCardClasses\}>/)
  assert.match(source, /const actionCardClasses = cn\(getPanelClasses\(\), "block p-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5"\)/)
  assert.match(source, /<ContentPanel title=\{labels\.title\} description=\{labels\.help\}>/)
  assert.match(source, /<EmptyNote>\{labels\.empty\}<\/EmptyNote>/)
  assert.match(source, /<StatusBadge label=\{formatImportBatchStatus\(batch\.status, labels\)\} tone=\{getAssetImportBatchStatusTone\(batch\.status\)\} \/>/)
  assert.match(source, /<StatusBadge\n\s+label=\{batch\.rollbackSummary\.reversible \? labels\.rollbackReady : labels\.rollbackBlocked\}\n\s+tone=\{batch\.rollbackSummary\.reversible \? "success" : "muted"\}/)
  assert.match(source, /<span className="break-all font-mono">\{batch\.batchId\}<\/span>/)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-amber-\d|primary-soft|border-dashed|rounded-full|toLocaleString|text-lg|\btext-xs\b|\{labels\.status\}: \{batch\.status\}/)
})

test("label batch tool: ContentPanels, StatusBadges from status.name (M23), formatCount (M27), a scope Chip, EmptyNote, and list rows without opacity (spec 2D D9, M21, M22)", () => {
  const source = read(`${C}assets/asset-label-batch-tool.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3)
  assert.match(source, /<ContentPanel title=\{labels\.recentQueueTitle\} description=\{labels\.recentQueueHelp\}>/)
  assert.match(source, /<ContentPanel\n\s+title=\{labels\.selectedTitle\}\n\s+description=\{`\$\{formatCount\(selected\.length\)\} \$\{labels\.selectedCount\}`\}\n\s+className="xl:sticky xl:top-20 xl:self-start"/)
  assert.match(source, /<StatusBadge label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/>/)
  assert.match(source, /<StatusBadge label=\{printBadge\} tone=\{printCount > 0 \? "success" : "muted"\} \/>/)
  assert.match(source, /printLabels\.labelPrintedBadge\.replace\("COUNT", formatCount\(printCount\)\)/)
  assert.match(source, /status: \{\n\s+name: asset\.status\?\.name \?\? null,\n\s+label:/, "the queue rows carry status.name too")
  assert.match(source, /<Chip>\{queueScopeSummary\.label\}<\/Chip>/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 3)
  assert.equal(source.match(/disabled:cursor-not-allowed disabled:bg-background/g)?.length, 2, "an added row keeps the shared disabled look, with a check instead of the plus")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.title\}<\/span>/)
  assert.doesNotMatch(source, /disabled:opacity|toLocaleString|status\.colorCode \?|rounded-full|primary-soft|border-dashed|hover:bg-accent|\btext-xs\b|rounded-lg border/)
})

test("label print toolbar: PageBackLink, a tape box that keeps its width at 1440 (M27), and the guidance and results as Notice (spec 2D D7, M27)", () => {
  const source = read(`${C}assets/asset-label-print.tsx`)
  assert.match(source, /<PageBackLink href=\{backHref\} label=\{translations\.back\} className="max-md:self-start" \/>/)
  assert.match(source, /px-3 text-base sm:w-auto sm:shrink-0 md:h-10/, "the tape-size box no longer shrinks under its value (M27)")
  assert.match(source, /<Notice tone="neutral">\{printerTapeGuidance\}<\/Notice>/)
  assert.match(source, /<Notice tone=\{hasLocalQrTarget \? "warning" : "neutral"\} title=\{translations\.qrPrintTarget\}>/)
  assert.match(source, /<span className="break-all font-mono">\{qrPrintTarget\}<\/span>/, "the public QR URL must wrap, so it keeps font-mono (2D-2 R3)")
  assert.match(source, /<Notice tone="danger" role="alert">\{recordError\}<\/Notice>/)
  assert.match(source, /<Notice tone="success" role="status">\{translations\.printRecorded\}<\/Notice>/)
  assert.doesNotMatch(source, /<ArrowLeft\b|sm:min-h-10|primary-soft|warning-soft|danger-soft|success-soft|text-warning|text-primary/)
})

test("scan search tool: ContentPanels, links for the result rows, StatusBadge from status.name (M23), a tag and EmptyNote (spec 2D D9, M21, M23)", () => {
  const source = read(`${C}assets/asset-scan-search-tool.tsx`)
  assert.match(source, /status: \{ name\?: string \| null; label: string; colorCode: string \| null \}/)
  assert.match(source, /<StatusBadge label=\{result\.status\.label\} tone=\{getAssetStateTone\(result\.status\.name\)\} \/>/)
  assert.match(source, /<Link\n\s+href=\{appendReturnTo\(result\.href, scanReturnHref\)\}/)
  assert.match(source, /<EmptyNote className="mt-2">\{labels\.minChars\}<\/EmptyNote>/)
  assert.match(source, /<EmptyNote padded>\{labels\.noResults\}<\/EmptyNote>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{result\.title\}<\/span>/)
  assert.doesNotMatch(source, /<button\b|status\.colorCode \?|rounded-full|primary-soft|border-dashed|hover:bg-accent|\btext-xs\b|rounded-lg border/)
})

test("register filter sheet and toolbar: ChoiceChip toggles, the dialog-footer look on the sheet footer (D19), and a plain filter count (spec 2D D19, M22)", () => {
  const sheet = read(`${C}assets/asset-register-filter-sheet.tsx`)
  assert.match(sheet, /<ChoiceChip\n\s+key=\{option\.value\}\n\s+type="checkbox"\n\s+checked=\{active\}\n\s+onChange=\{\(\) => onChange\(active \? "" : option\.value\)\}\n\s+label=\{option\.label\}\n\s+\/>/)
  assert.match(sheet, /<SheetFooter className="grid grid-cols-2 gap-2 border-t border-border-soft bg-background px-4 py-3">/)
  assert.doesNotMatch(sheet, /<button\b|aria-pressed|rounded-full|hover:bg-accent/)
  const toolbar = read(`${C}assets/asset-register-toolbar.tsx`)
  assert.match(toolbar, /return <span className=\{cn\("num", className\)\}>\{formatCount\(count\)\}<\/span>/)
  assert.doesNotMatch(toolbar, /rounded-full|bg-primary\b|text-primary-foreground/)
})

test("register table and phone list: the ownership type is a name Chip, the frame takes the panel classes, and the scroll hint is the shared hint line (spec 2D D9, M22)", () => {
  const table = read(`${C}assets/asset-register-table.tsx`)
  assert.match(table, /<Chip title=\{asset\.ownershipType\.label\}>\{asset\.ownershipType\.label\}<\/Chip>/)
  assert.match(table, /<div aria-busy=\{isPending\} className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(table, /<MoveHorizontal aria-hidden="true" \/>\n\s+\{labels\.tableScrollHint\}/)
  assert.match(table, /description=\{`\$\{labels\.bulkUpdateDescription\} \(\$\{formatCount\(selectedAssets\.length\)\} \$\{labels\.selectedCount\}\)`\}/)
  assert.doesNotMatch(table, /function ownershipTypeTone\b|bg-muted px-4|StatusTone/)
  const mobile = read(`${C}assets/asset-register-mobile-list.tsx`)
  assert.match(mobile, /<Chip className="shrink-0">\{asset\.ownershipType\.label\}<\/Chip>/)
  assert.doesNotMatch(mobile, /tone="success"/)
})

test("my assets: the phone card facts are a KeyValueList (D19), the card is a quiet grouping, and the sub-line is text-meta (spec 2D D9, D19)", () => {
  const source = read(`${D}my-assets/page.tsx`)
  assert.match(source, /<article className="min-w-0 rounded-md border border-border bg-background p-3">\n\s+<AssetIdentity asset=\{asset\} href=\{href\} \/>\n\s+<KeyValueList\n\s+className="mt-3"/)
  assert.match(source, /\{ key: "serialNumber", label: labels\.serialNumber, value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/)
  assert.match(source, /\{ key: "status", label: labels\.status, value: <StatusBadge label=\{asset\.status\.nameTh\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/> \}/)
  assert.doesNotMatch(source, /function MobileField\b|import type React|\btext-xs\b/)
})

test("components summary: on a phone the serial goes under the component instead of squeezing its name (plan 2D-3 Task 20 fix)", () => {
  const source = read(`${C}assets/asset-components-summary.tsx`)
  assert.match(source, /className="flex min-w-0 flex-col gap-1 px-3 py-3 transition-colors hover:bg-row-hover sm:flex-row sm:items-center sm:justify-between sm:gap-3"/)
  assert.match(source, /<span className="text-meta text-muted-foreground \[overflow-wrap:anywhere\] sm:shrink-0">SN: \{component\.componentAsset\.serialNumber\}<\/span>/)
  assert.doesNotMatch(source, /"shrink-0 text-meta text-muted-foreground">SN:/)
})

test("import-export: the unfiltered export is named export all; the register link names the filter step (critique 2026-10-20 B1)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(source, /href="\/api\/assets\/export"\n\s+icon=\{<FileDown className="h-5 w-5" \/>\}\n\s+title=\{tTools\("exportAll"\)\}\n\s+description=\{tTools\("exportAllDescription", \{ max: formatCount\(ASSET_EXPORT_MAX_ROWS\) \}\)\}/)
  assert.doesNotMatch(source, /t\("exportFiltered"\)/)
  assert.match(read(`${C}assets/asset-register-export-menu.tsx`), /\{t\("exportFiltered"\)\}/)
  const th = JSON.parse(read("messages/th.json")).assetTools, en = JSON.parse(read("messages/en.json")).assetTools
  assert.equal(th.exportAll, "ส่งออกทั้งหมด (Excel)"); assert.equal(en.exportAll, "Export all (Excel)")
  assert.equal(th.exportWithFilters, "เลือกตัวกรองในทะเบียนแล้วส่งออก"); assert.equal(en.exportWithFilters, "Filter in the register, then export")
})

test("import-export: the export-all card says its 5,000-row limit, from the one constant the route caps with (user decision 2026-10-21 Y1)", async () => {
  const { ASSET_EXPORT_MAX_ROWS } = await import("../src/lib/asset-export-limits.ts")
  assert.equal(ASSET_EXPORT_MAX_ROWS, 5000)
  const route = read("src/app/api/assets/export/route.ts")
  assert.match(route, /import \{ ASSET_EXPORT_MAX_ROWS \} from "@\/lib\/asset-export-limits"/)
  assert.match(route, /take: ASSET_EXPORT_MAX_ROWS,/)
  assert.doesNotMatch(route, /take: 5000/)
  assert.match(read(`${D}asset-management/import-export/page.tsx`), /import \{ ASSET_EXPORT_MAX_ROWS \} from "@\/lib\/asset-export-limits"/)
  const th = JSON.parse(read("messages/th.json")).assetTools, en = JSON.parse(read("messages/en.json")).assetTools
  assert.equal(th.exportAllDescription, "ส่งออกทะเบียนทรัพย์สินทั้งหมดตามสิทธิ์การเข้าถึงปัจจุบัน สูงสุด {max} รายการ")
  assert.equal(en.exportAllDescription, "Export all asset records available to your current access permissions, up to {max} rows")
  const max = new Intl.NumberFormat("en-US").format(ASSET_EXPORT_MAX_ROWS)
  assert.match(th.exportAllDescription.replace("{max}", max), /สูงสุด 5,000 รายการ/)
  assert.match(en.exportAllDescription.replace("{max}", max), /up to 5,000 rows/)
})
