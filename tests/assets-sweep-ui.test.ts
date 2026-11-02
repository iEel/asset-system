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

test("asset purchase documents: a ContentPanel, EmptyNote, the number as a tag, Nil for an empty line, the shared buttons, and delete only for an editor (spec 2D M21, M29, M33; group 1 §7.7)", () => {
  const source = read(`${C}assets/asset-purchase-documents.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("purchaseDocuments"\)\}>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, / · <span className="tag">\{document\.documentNo\}<\/span>/)
  assert.match(source, /\{orNil\(\n\s+\[document\.supplierName,/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /onDelete=\{canEdit \? handleDelete : undefined\}/)
  assert.match(source, /\{onDelete \? \(\n\s+<Button\n\s+variant="danger"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => onDelete\(attachment\.id\)\}\n\s+busy=\{deletingId === attachment\.id\}/)
  assert.doesNotMatch(source, /legacyAttachments|<h3\b|<button\b|Loader2|disabled:opacity|border-dashed|"-"|text-primary|bg-surface|hover:bg-accent|\bh-8\b/)
})

test("asset files: one divided panel, a muted badge on a missing checklist photo, the main photo's Chip, the shared buttons and EmptyNote, no box in a box (spec 2D D9, M21, M22, M29; group 1 §7.7)", () => {
  const source = read(`${C}assets/asset-attachments.tsx`)
  assert.match(source, /<ContentPanel divided title=\{t\("filesTab\.title"\)\}>/)
  assert.match(source, /<EmptyNote>\{t\("filesTab\.empty"\)\}<\/EmptyNote>/)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("filesTab\.photos", \{ count: formatCount\(photos\.length\) \}\)\}<\/h3>/)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("filesTab\.documents", \{ count: formatCount\(documents\.length\) \}\)\}<\/h3>/)
  assert.match(source, /<StatusBadge label=\{t\("photoChecklistPending"\)\} tone="muted" \/>/)
  assert.match(source, /<Chip>\{t\("filesTab\.primaryPhoto"\)\}<\/Chip>/)
  assert.match(source, /<Button variant="outline" aria-expanded=\{expanded\} className="mt-3 w-full sm:w-auto" onClick=\{onClick\}>/)
  // The photo that opens its preview stays a raw button: an image is the control (plan 2D-3 R5, the N3 EXEMPT row).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.equal(source.match(/focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/g)?.length, 1)
  assert.doesNotMatch(source, /rounded-full|border-dashed|hover:bg-accent|focus:outline-none|focus:ring|text-primary|text-success|CheckCircle2|\bh-8\b|\bh-9\b|text-xs|rounded-lg|bg-surface/)
})

const D = "src/app/[locale]/(dashboard)/"

test("asset page: the sections the later tabs replace keep the panel classes; the overview's panels are ContentPanels in the detail parts (spec 2D §3.3; group 1 asset detail task 8)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.doesNotMatch(source, /getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"/)
  assert.doesNotMatch(source, /<ContentPanel\b/)
  assert.doesNotMatch(source, /className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)
  assert.match(source, /if \(!snapshot\) return null\n/)
  assert.doesNotMatch(source, /filterLabel: tCommon\("filter"\)/)
  const banned = /\b(?:bg|text|border)-(?:amber|emerald)-\d|border-dashed|uppercase|rounded-full (?:bg|px)-|bg-surface\/\d|primary-soft|info-soft|warning-soft|hover:underline|hover:bg-accent|font-semibold leading-5|focus:outline-none|scale-\[|return "-"|\bh-8\b|md:h-10|text-lg|text-info|\btext-xs\b|toLocaleString/
  for (const file of [source, ...["asset-detail-header", "asset-detail-actions", "asset-detail-fact-strip", "asset-overview"].map((name) => read(`${C}assets/detail/${name}.tsx`))]) assert.doesNotMatch(file, banned)
})

test("asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents by the picker, and no box in a box (spec 2D D7, D9, M21)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  // Group 4 plan 2 Task 5: Section and SelectField moved to asset-form-section.tsx, the optional sections to their files.
  // Task 6a: the documents and the other section got files of their own, and the header and the required card theirs.
  // Task 6b: the ownership block too (parts[9]). Task 8: the changed-field frame and the change list (appended).
  const parts = ["section", "install", "purchase", "documents", "photos", "custom-fields", "other", "header", "required-card", "ownership", "changed-field", "change-list"].map((name) => read(`${C}assets/asset-form-${name}.tsx`))
  const ownershipSource = parts[9]
  const [sectionSource, , , purchaseSource, photosSource, customFieldsSource] = parts
  assert.match(sectionSource, /export function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  // The required card is a ContentPanel; the folded sections are FormDisclosures (a <details> cannot be ContentPanel).
  assert.match(parts[8], /<ContentPanel title=\{title\}>/)
  assert.match(sectionSource, /<FormDisclosure id=\{id\} title=\{title\} \{\.\.\.disclosure\}>/)
  assert.match(source, /<Notice\n\s+tone="info"\n\s+className="mb-5"\n\s+title=\{t\("cloneBannerTitle", \{ assetTag: cloneSource\.assetTag \}\)\}/)
  // The cross-branch warning in the form, the cross-company one with the holder in the ownership block.
  assert.deepEqual([source, ownershipSource].map((file) => file.match(/<Notice tone="warning" className="mt-2">/g)?.length ?? 0), [1, 1], "the cross-company and cross-branch warnings")
  assert.match(source, /<Notice id="asset-status-protected" tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  assert.match(source, /: null\n\s+const assetStatusHelp = \{/, "the blocked sentence is the Notice title, so the help is not the same sentence again")
  // Task 6b: the note stays for ส่วนควบ only; every other type shows the holder picker.
  assert.match(ownershipSource, /<Notice tone="neutral" title=\{t\("custodianNotRequired"\)\}>\n\s+\{t\("custodianNotRequiredHelp"\)\}\n\s+<\/Notice>/)
  assert.match(source, /title=\{<>\{t\("licenseRemainingSeats"\)\}: \{orNil\(getRemainingLicenseSeats\(values\.licenseTotalSeats, values\.licenseUsedSeats\)\)\}<\/>\}/)
  // Group 4 plan 3 Task 5: the 300 ChoiceCards went; the documents are found by PurchaseDocumentPicker, which holds the
  // list's EmptyNote ("ไม่พบ…" or "ยังไม่มีเอกสารจัดซื้อกลาง") and names the supplier by name.
  assert.doesNotMatch(purchaseSource, /<ChoiceCard\b|linkedAssets/)
  assert.match(purchaseSource, /<PurchaseDocumentPicker\n/)
  // The 3 EmptyNotes: the photo checklist, the template fields and the extra rows (purchaseSource is asset-form-documents.tsx).
  assert.deepEqual([source, purchaseSource, photosSource, customFieldsSource].map((file) => file.match(/<EmptyNote\b/g)?.length ?? 0), [0, 0, 1, 2])
  assert.match(source, /return null\n\s+const remainingSeats = [^\n]+\n\s+return formatCount\(remainingSeats\)/)
  for (const file of [source, ...parts]) assert.doesNotMatch(file, /"-"|border-dashed|uppercase|bg-accent|bg-warning-soft|bg-info-soft|text-warning|text-lg|rounded-lg border|focus:outline-none|\btext-xs\b|toLocaleString|bg-surface p-3/)
})

test("asset batch form: ContentPanel sections, three DataTables, Notice by meaning, the purchase-document picker, a KeyValueList review and Nil (spec 2D D7, D9, M21, D19)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "Section, the review and the created batch")
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2)
  // The duplicate box went under the rows as each row's error (v-track plan 2 A2, spec U8).
  assert.doesNotMatch(source, /\{t\("duplicateWarning"\)\}/)
  assert.match(source, /<Notice\n\s+tone=\{duplicateCheckStatus === "clean" \? "success" : duplicateCheckStatus === "duplicate" \? "warning" : "danger"\}\n\s+className="md:col-span-2"/)
  // Group 4 plan 3 Task 6: the checkbox list of documents (ChoiceCards and its EmptyNote) gave way to the shared picker,
  // which holds the empty list's EmptyNote; without asset:edit the section is a neutral Notice.
  assert.doesNotMatch(source, /<ChoiceCard\b|<EmptyNote\b/)
  assert.match(source, /<PurchaseDocumentPicker\n\s+id="asset-batch-purchase-document"/)
  assert.match(source, /<Notice tone="neutral" className="md:col-span-2">\{t\("purchaseDocumentsNeedEdit"\)\}<\/Notice>/)
  assert.match(source, /\{ key: "count", label: t\("batchRows"\), value: formatCount\(rows\.length\) \}/)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.equal(source.match(/\{orNil\(/g)?.length, 6, "the six review cells that can be empty")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function SummaryItem\b|"-"|<table\b|<thead\b|<th\b|<td\b|border-dashed|bg-accent|bg-(?:primary|success|warning|danger)-soft|text-lg|text-warning|\btext-xs\b|rounded-lg border/)
})

test("component manager: ContentPanels, a success Notice, EmptyNote, a KeyValueList review, codes as tag and text links (spec 2D D7, D9, M21, M33, D19)", () => {
  const source = read(`${C}assets/asset-component-manager.tsx`)
  // Group 4 plan 4 Task 3: the install panel and the one links table (the map brings its own panel from the page).
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 2)
  assert.match(source, /<ContentPanel title=\{t\("componentInstallPanelStep", \{ step: installStepOrder\.indexOf\(installStep\) \+ 1, total: installStepOrder\.length \}\)\} description=\{labels\.candidateHelp\}>/)
  assert.match(source, /<Notice\n\s+tone="success"\n\s+action=\{/)
  // No candidates, the search hint, and the empty table (the current and past panels became one).
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 3)
  assert.match(source, /\{ key: "installedAt", label: labels\.installedAt, value: installedAt \? formatDateTime\(installedAt\) : null \}/)
  assert.equal(source.match(/<span className="tag font-medium">/g)?.length, 3, "the candidate, the selected component and the component row")
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /function ReviewItem\b|"-"|font-mono|uppercase|border-dashed|bg-(?:success|primary)-soft p|border-(?:success|primary)-border|hover:bg-accent|hover:underline|\btext-xs\b|rounded-lg border/)
})

// Group 4 plan 5 Task 4 (spec §5, §13, P5-R8): one divided card; the status badge in its head, a DistributionBar beside
// the StatStrip, Segmented for the row filter, the shared table at md and rows on phones, Notice by meaning and Nil.
test("import panel (M15): one divided ContentPanel, a head StatusBadge, a DistributionBar and StatStrip, a Segmented filter, a DataTable with phone rows, Notice by meaning and Nil", () => {
  const source = read(`${C}assets/asset-import-preview-panel.tsx`)
  assert.equal(source.match(/<ContentPanel divided flush /g)?.length, 1)
  assert.match(source, /<StatusBadge label=\{t\(batchStatusKeys\[preview\.batch\.status\]\)\} tone=\{getAssetImportBatchStatusTone\(preview\.batch\.status\)\} \/>/)
  assert.match(source, /\{ key: "ready", count: preview\.summary\.readyRows, tone: "success" \},\s+\{ key: "error", count: preview\.summary\.errorRows, tone: "danger" \},/)
  assert.match(source, /<StatStrip\s+items=\{\[/)
  assert.match(source, /<Segmented\s+aria-label=\{t\("importPage\.filterLabel"\)\}/)
  assert.match(source, /<Notice tone="warning" title=\{t\("importPage\.issueSummaryTitle"\)\}>/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("importPage\.resultTitle"\)\} className="hidden md:block">/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/)
  assert.match(source, /\{orNil\(row\.values\.name\)\}/)
  // Sizes and dates come from the app's helpers (P5-R8): no locale formatting in the panel.
  assert.match(source, /size: formatFileSize\(selectedFile\.size\), count: preview\.summary\.totalRows, date: formatDateTime\(preview\.batch\.createdAt\)/)
  assert.doesNotMatch(source, /function (?:SummaryItem|SummaryPill|getBatchStatusClass|formatFileSize)\b|"-"|toLocaleString|<table\b|<th\b|uppercase|bg-muted\/|rounded-full|primary-soft|info-soft|success-soft|warning-soft|\btext-xs\b|text-lg font-bold|<Chip\b|KeyValueList|max-h-80|\bdark:|#[0-9a-fA-F]{6}\b|rgba?\(/)
})

test("import-export page: the export card and the history are ContentPanels, the history titled by file name with an outcome StatusBadge, EmptyNote and no raw colors (group 4 plan 5 Task 5, P5-R7, P5-R10)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  // The three link cards and their frame went; the template lives in the import card (Task 4).
  assert.doesNotMatch(source, /ActionLink|actionCardClasses|import-template|getPanelClasses/)
  assert.match(source, /<ContentPanel divided flush title=\{tTools\("importExportPage\.exportTitle"\)\}>/)
  assert.match(source, /<a href="\/api\/assets\/export" download className=\{exportRowClasses\}>/)
  // The register's export menu is desktop only, so the way to it is too (recon export.md D6); the arrow is an icon.
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets`\} className=\{cn\(exportRowClasses, "hidden md:flex"\)\}>/)
  assert.match(source, /\{tTools\("importExportPage\.exportFiltered"\)\}\n\s+<ArrowRight aria-hidden="true" className="size-4 shrink-0" \/>/)
  assert.match(source, /title=\{tTools\("importExportPage\.historyTitle"\)\}\n\s+actions=\{<span className="num text-meta text-muted-foreground">\{tTools\("importExportPage\.historyRecent", \{ count: IMPORT_HISTORY_LIMIT \}\)\}<\/span>\}/)
  assert.match(source, /const IMPORT_HISTORY_LIMIT = 10\n/)
  assert.match(source, /take: IMPORT_HISTORY_LIMIT,/)
  assert.match(source, /<EmptyNote padded>\{tTools\("importExportPage\.historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<ContentPanelRows>\n\s+\{importHistory\.map\(/)
  assert.match(source, /<h3 className="min-w-0 break-words font-semibold text-foreground">\{batch\.fileName\}<\/h3>/)
  assert.match(source, /label=\{tTools\(batch\.outcome === "complete" \? "importExportPage\.outcomeComplete" : "importExportPage\.outcomePartial"\)\}\n\s+tone=\{batch\.outcome === "complete" \? "success" : "warning"\}/)
  // The preview's status, the batch id and the file size leave the history row (board; P5-R7). No undo line (call 21).
  assert.doesNotMatch(source, /batch\.status\b|batch\.batchId|batch\.fileSize|formatImportBatchStatus|getAssetImportBatchStatusTone|rollbackSummary|labels\.rollback/)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-amber-\d|primary-soft|border-dashed|rounded-full|toLocaleString|text-lg|\btext-xs\b|\bdark:|#[0-9a-fA-F]{6}\b|rgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+|<button\b/)
})

test("import-export page: the history unfolds the first 3 skipped rows, name first and tag under it, with the preview's issue lines (P5-R4, P5-R7)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(source, /const HISTORY_SKIPPED_ROWS_SHOWN = 3\n/)
  assert.match(source, /const shownRows = batch\.skippedRows\.slice\(0, HISTORY_SKIPPED_ROWS_SHOWN\)/)
  assert.match(source, /const moreRows = Math\.max\(0, batch\.skipped - shownRows\.length\)/)
  assert.match(source, /\{shownRows\.length > 0 \? \(\n\s+<details className="group\/skipped mt-2">/)
  assert.match(source, /\{tTools\("importExportPage\.skippedRowsToggle", \{ count: batch\.skipped \}\)\}/)
  assert.match(source, /<div className="break-words text-foreground">\{orNil\(row\.name\)\}<\/div>\n\s+\{row\.assetTag \? \(\n\s+<div className="tag break-words text-muted-foreground">\{row\.assetTag\}<\/div>/)
  assert.match(source, /\{tTools\("importExportPage\.skippedRowsMore", \{ count: moreRows \}\)\}/)
  // The words come from the preview's pure helper, not a copy of it.
  assert.match(source, /import \{ buildImportIssueParts, type AssetImportTranslate \} from "@\/lib\/asset-import-wizard"/)
  assert.match(source, /const parts = buildImportIssueParts\(issue, t as AssetImportTranslate, \{ fields, locale \}\)/)
  assert.doesNotMatch(source, /importError\.|importIssue\./)
  assert.match(source, /tTools\("importExportPage\.historyMeta", \{ name: batch\.approvedByLabel, date: formatDateTime\(batch\.createdAt\) \}\)/)
  assert.match(source, /tTools\("importExportPage\.historyCounts", \{ imported: batch\.imported, total: batch\.totalRows, skipped: batch\.skipped \}\)/)
})

test("import-export page: two columns from lg for an importer; a viewer gets the export card and the history in one column (P5-R8, P5-R9)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(source, /<div className=\{cn\("grid items-start gap-6", canImport && "lg:grid-cols-\[minmax\(0,1fr\)_350px\]"\)\}>\n\s+\{canImport \? \(\n\s+<AssetImportPreviewPanel \/>\n\s+\) : null\}\n\s+<div className="grid min-w-0 gap-6">/)
  assert.doesNotMatch(source, /tCommon|buttonVariants/)
})

test("label batch tool: ContentPanels, print-state StatusBadges, formatCount (M27), a scope Chip, EmptyNote, and list rows without opacity (spec 2D D9, M21, M22; group 4 plan 6 Task 4)", () => {
  // The shell holds the print list; the search and the queue are one part, the right column another (group 4 plan 6 Task 4).
  const shell = read(`${C}assets/asset-label-batch-tool.tsx`)
  const queue = read(`${C}assets/asset-label-queue.tsx`)
  const list = read(`${C}assets/asset-label-print-list.tsx`)
  assert.equal(shell.match(/<ContentPanel\b/g)?.length ?? 0, 0)
  assert.equal(queue.match(/<ContentPanel\b/g)?.length, 2)
  assert.equal(list.match(/<ContentPanel\b/g)?.length, 1)
  // The queue card: the board's head (title, the mode's help line, ล้างตัวกรอง) over a flush body.
  assert.match(queue, /<ContentPanel\n\s+divided\n\s+flush\n\s+title=\{t\("queueTitle"\)\}\n\s+description=\{t\(`queueHelp\.\$\{queueFilters\.mode\}`\)\}\n\s+actions=\{\(\n\s+<Button variant="ghost" size="sm" onClick=\{resetQueueFilters\}>/)
  assert.match(list, /<ContentPanel\n\s+title=\{labels\.selectedTitle\}\n\s+description=\{`\$\{formatCount\(selected\.length\)\} \$\{labels\.selectedCount\}`\}\n\s+className="xl:sticky xl:top-20 xl:self-start"/)
  // A row shows its print state, never the asset state (a queue row carries none, P6-R11); ป้ายเดิม when the label's tag
  // is not today's (P6-R6); อยู่ในรายการพิมพ์ once listed.
  assert.match(queue, /<StatusBadge label=\{row\.lastPrint \? t\("badgePrinted"\) : t\("badgeUnprinted"\)\} tone=\{row\.lastPrint \? "success" : "muted"\} \/>/)
  assert.match(queue, /<StatusBadge label=\{t\("oldTag", \{ tag: oldTag \}\)\} tone="warning" \/>/)
  assert.match(queue, /<span className="text-meta font-medium text-success">\{t\("badgeListed"\)\}<\/span>/)
  assert.match(queue, /<Chip>\{queueScopeSummary\.label\}<\/Chip>/)
  assert.equal(queue.match(/<EmptyNote\b/g)?.length, 2)
  assert.equal(list.match(/<EmptyNote\b/g)?.length, 1)
  assert.equal(queue.match(/disabled:cursor-not-allowed disabled:bg-background/g)?.length, 1, "an added row keeps the shared disabled look, with a check instead of the plus")
  // Names first (spec §5): the name, then "tag · holder or ส่วนกลาง · room".
  assert.match(queue, /<span className="block break-words text-sm font-medium text-foreground">\{row\.name\}<\/span>\n\s+<span id=\{metaId\} className="block break-words text-meta text-muted-foreground">\n\s+<span className="tag">\{row\.assetTag\}<\/span>\n\s+\{holder \? ` · \$\{holder\}` : null\}\n\s+\{row\.location \? ` · \$\{row\.location\.name\}` : null\}/)
  for (const source of [shell, queue, list]) {
    assert.doesNotMatch(source, /disabled:opacity|toLocaleString|colorCode|rounded-full|primary-soft|border-dashed|hover:bg-accent|\btext-xs\b|rounded-lg border|max-h-\[32rem\]/)
  }
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

test("scan search tool: result cards in ContentPanels, StatusBadge from status.name (M23), the open link with the scan returnTo, a tag and EmptyNote (spec 2D D9, M21, M23; group 4 plan 4)", () => {
  const source = read(`${C}assets/asset-scan-search-tool.tsx`)
  assert.match(source, /<StatusBadge label=\{row\.status\.label\} tone=\{getAssetStateTone\(row\.status\.name\)\} \/>/)
  assert.match(source, /<Link\n\s+href=\{appendReturnTo\(row\.href, scanReturnHref\)\}/)
  assert.match(source, /<EmptyNote className="mt-2">\{labels\.minChars\}<\/EmptyNote>/)
  assert.match(source, /<EmptyNote padded>\{labels\.noResults\}<\/EmptyNote>/)
  assert.match(source, /<span className="tag">\s*<Highlighted value=\{row\.assetTag\} words=\{words\} \/>\s*<\/span>/)
  assert.match(source, /<ScanResultCard\n\s+key=\{row\.id\}/)
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
  // Group 4 plan 1 Task 3 (spec §6.7): the phone card's holder line says ส่วนกลาง, so its ownership Chip went.
  assert.doesNotMatch(mobile, /<Chip\b|ownershipType/)
  assert.doesNotMatch(mobile, /tone="success"/)
})

test("my assets: the phone card facts are a KeyValueList (D19), the card is a quiet grouping, and the sub-line is text-meta (spec 2D D9, D19)", () => {
  const source = read(`${D}my-assets/page.tsx`)
  assert.match(source, /<article className="min-w-0 rounded-md border border-border bg-background p-3">\n\s+<AssetIdentity asset=\{asset\} href=\{href\} \/>\n\s+<KeyValueList\n\s+className="mt-3"/)
  assert.match(source, /\{ key: "serialNumber", label: labels\.serialNumber, value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/)
  assert.match(source, /\{ key: "status", label: labels\.status, value: <StatusBadge label=\{asset\.status\.nameTh\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/> \}/)
  assert.doesNotMatch(source, /function MobileField\b|import type React|\btext-xs\b/)
})

test("import-export: the export-all row counts what the file holds, with no filter, and names the cap above it (P5-R10)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(source, /prisma\.asset\.count\(\{ where: assetExportAllWhere\(\) \}\)/)
  assert.match(source, /\{tTools\(`importExportPage\.\$\{exportAllCountKey\(exportCount\)\}`, \{ count: exportCount, max: ASSET_EXPORT_MAX_ROWS \}\)\}/)
  assert.match(source, /\{tTools\("importExportPage\.exportAll"\)\}/)
  assert.match(source, /\{tTools\("importExportPage\.exportAllDescription"\)\}/)
  assert.match(read(`${C}assets/asset-register-export-menu.tsx`), /: t\("exportFilteredCount", \{ count: exportCount \}\)\}/)
  const th = JSON.parse(read("messages/th.json")).assetTools, en = JSON.parse(read("messages/en.json")).assetTools
  assert.equal(th.importExportPage.exportAll, "ส่งออกทั้งหมด (Excel)"); assert.equal(en.importExportPage.exportAll, "Export all (Excel)")
  assert.equal(th.importExportPage.exportFiltered, "ส่งออกตามตัวกรองในทะเบียน")
  assert.equal(th.importExportPage.exportAllCount, "{count, number} รายการ · ไม่ใช้ตัวกรอง")
  // The old link-card words went with the cards (P5-C2).
  for (const key of ["importExportSubtitle", "downloadTemplateDescription", "exportAll", "exportAllDescription", "exportWithFilters", "exportWithFiltersDescription"]) {
    assert.equal(th[key], undefined, key); assert.equal(en[key], undefined, key)
  }
})

test("import-export: the export cap comes from the one constant the route caps with, and no export word says ตามสิทธิ์ (user decision 2026-10-21 Y1, spec §13)", async () => {
  const { ASSET_EXPORT_MAX_ROWS } = await import("../src/lib/asset-export-limits.ts")
  assert.equal(ASSET_EXPORT_MAX_ROWS, 5000)
  const route = read("src/app/api/assets/export/route.ts")
  assert.match(route, /import \{ ASSET_EXPORT_MAX_ROWS \} from "@\/lib\/asset-export-limits"/)
  assert.match(route, /take: ASSET_EXPORT_MAX_ROWS,/)
  assert.doesNotMatch(route, /take: 5000/)
  assert.match(read(`${D}asset-management/import-export/page.tsx`), /import \{ ASSET_EXPORT_MAX_ROWS, assetExportAllWhere, exportAllCountKey \} from "@\/lib\/asset-export-limits"/)
  const th = JSON.parse(read("messages/th.json")).assetTools.importExportPage, en = JSON.parse(read("messages/en.json")).assetTools.importExportPage
  assert.equal(th.exportAllCapped, "{count, number} รายการ · ไม่ใช้ตัวกรอง · ไฟล์มี {max, number} รายการที่เพิ่มล่าสุด")
  assert.match(en.exportAllCapped, /\{max, number\} most recently added/)
  assert.doesNotMatch(JSON.stringify(th), /ตามสิทธิ์/)
  assert.doesNotMatch(JSON.stringify(en), /access permissions/)
})
