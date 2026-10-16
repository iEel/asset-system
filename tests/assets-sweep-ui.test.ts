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

test("activity drawer: each item's marker is a status shape and its label has no capitals (spec 2D M22)", () => {
  const source = read(`${C}ui/activity-drawer.tsx`)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: item\.tone \?\? "neutral" \}\), "mt-2"\)\} \/>/)
  assert.match(source, /<div className="text-meta font-medium text-muted-foreground">\{item\.label\}<\/div>/)
  assert.doesNotMatch(source, /uppercase|tracking-normal|rounded-full|getToneDotClass|\bbg-info\b|\btext-xs\b/)
})

test("QR code: no frame of its own inside the QR panel, and the asset tag under it is a tag (spec 2D D9, M33)", () => {
  const source = read(`${C}assets/asset-qr-code.tsx`)
  assert.match(source, /<div className="inline-flex flex-col items-center gap-3">/)
  assert.match(source, /<div className="max-w-44 text-center text-sm text-foreground">\n\s+<span className="tag font-medium">\{label\}<\/span>\n\s+<\/div>/)
  assert.doesNotMatch(source, /bg-white|rounded-lg|border|text-xs/)
})

test("status correction: the trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (spec 2D M27, D7)", () => {
  const source = read(`${C}assets/asset-status-correction-button.tsx`)
  assert.match(source, /const panelId = useId\(\)/)
  assert.match(source, /aria-expanded=\{open\}\n\s+aria-controls=\{open \? panelId : undefined\}/, "aria-controls only while the panel exists (axe aria-valid-attr-value)")
  assert.match(source, /<div id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<Notice tone="neutral" className="mt-1">\{labels\.description\}<\/Notice>/)
  assert.doesNotMatch(source, /border-warning-border|<p className="mt-1 text-sm text-muted-foreground">/)
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

test("components summary and context banner: a ContentPanel and an info Notice, codes as tag, text links, a warning StatusBadge and EmptyNote (spec 2D D7, D9, M33)", () => {
  const summary = read(`${C}assets/asset-components-summary.tsx`)
  assert.match(summary, /<ContentPanel\n\s+title=\{labels\.title\}\n\s+description=\{labels\.help\}\n\s+actions=\{/)
  assert.match(summary, /<Link href=\{manageHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(summary, /<StatusBadge tone="warning" label=\{`\$\{labels\.missingSerial\}: \$\{formatCount\(missingSerialCount\)\}`\} \/>/)
  assert.match(summary, /<EmptyNote>\{labels\.noCurrent\}<\/EmptyNote>/)
  assert.match(summary, /<span className="tag font-medium">\{component\.componentAsset\.assetTag\}<\/span>/)
  assert.match(summary, /<span className="tag font-medium">\{link\.parentAsset\.assetTag\}<\/span>/)
  assert.doesNotMatch(summary, /font-mono|uppercase|rounded-full|border-dashed|bg-primary|text-white|primary-soft|hover:bg-accent|sm:h-10|text-xs|text-primary/)
  const banner = read(`${C}assets/asset-component-context-banner.tsx`)
  assert.match(banner, /<section aria-label=\{labels\.title\}>\n\s+<Notice tone="info" title=\{labels\.title\}>/)
  assert.match(banner, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center gap-1\.5 md:min-h-0"\)\}/)
  assert.match(banner, /<span className="tag font-medium">\{link\.parentAsset\.assetTag\}<\/span>/)
  assert.doesNotMatch(banner, /font-mono|primary-soft|primary-border|bg-primary|text-white|translate-x|text-xs/)
})

test("movement timeline: ChoiceChip filters, EmptyNote, StatusBadge and shape markers, KeyValueLists with text links, and the shared date format (spec 2D M21, M22, D19)", () => {
  const source = read(`${C}assets/asset-movement-timeline.tsx`)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className="sr-only">\{labels\.filterLabel\}<\/legend>/)
  assert.match(source, /<ChoiceChip\n\s+key=\{filter\}\n\s+type="radio"\n\s+name=\{filterName\}/)
  assert.match(source, /<EmptyNote>\{labels\.noData\}<\/EmptyNote>/)
  assert.match(source, /<StatusBadge label=\{movement\.title\} tone=\{movement\.tone\} \/>/)
  assert.match(source, /statusMarkerVariants\(\{ tone: movement\.tone \}\)/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2)
  assert.match(source, /<a href=\{detail\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /import \{ cn, formatDateTime \} from "@\/lib\/utils"/)
  assert.doesNotMatch(source, /<button\b|function (?:Info|MovementInfo|formatDateTime|getMovementDotClass|getMovementBadgeClass)\b|"-"|uppercase|border-dashed|rounded-full|text-white|bg-surface\/\d|hover:underline|\btext-xs\b/)
})

test("evidence drawer: a StatStrip for the counts, ChoiceChip filters, the group as a Chip and focus-visible cards (spec 2D M22, M27, D19)", () => {
  const source = read(`${C}assets/asset-evidence-drawer.tsx`)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.match(source, /<fieldset className="mt-4 min-w-0">\n\s+<legend className="sr-only">\{labels\.filterLabel\}<\/legend>/)
  assert.equal(source.match(/<ChoiceChip\b/g)?.length, 2)
  assert.match(source, /<Chip>\{item\.group\}<\/Chip>/)
  assert.match(source, /focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(source, /<button\b|function (?:EvidenceStat|FilterButton)\b|text-white|rounded-full|scale-\[|focus:outline-none|text-xl font-bold|\btext-xs\b/)
})

const D = "src/app/[locale]/(dashboard)/"

test("asset page: panels, notices, chips, text links, the disabled QuickAction (M12) and no typed dash (M32 b) on the shared parts (spec 2D §3.3, D7, D9, M33)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  // The nine sections with an id keep it, so they take the panel classes (2D-2 R4); the other panels are ContentPanel.
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"\)\}/g)?.length, 9)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 5, "quick actions, follow-up, relationship map, QR, sidebar photo")
  assert.match(source, /<Notice tone="info" title=\{lifecycle\.title\} className="mb-3">\n\s+\{lifecycle\.description\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="warning" className="mb-4">\n\s+\{t\("maintenanceReplacementWarning"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(source, /<StatusBadge label=\{t\("dataHealthProgress", \{ done: dataHealthDone, total: dataHealthItems\.length \}\)\} tone=\{dataHealthTone\} \/>/)
  assert.match(source, /\{ key: "warrantyStatus", label: t\("warrantyStatus"\), value: <StatusBadge label=\{getWarrantyStatusLabel\(warrantyState, t\)\} tone=\{warrantyState\.tone\} \/> \}/)
  assert.match(source, /<Chip>\{t\("latestTransaction"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/g)?.length, 4)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /<Button variant="outline" disabled className=\{quickActionClasses\}>/)
  assert.match(source, /return labels\.parentAssets\.get\(checkout\.parentAssetId\) \?\? checkout\.parentAssetId\n\s+return null\n\}/)
  assert.match(source, /if \(!snapshot\) return null\n/)
  assert.equal(source.match(/filterLabel: tCommon\("filter"\),/g)?.length, 2)
  assert.match(source, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/, "a tag that must wrap keeps font-mono at 500 (2D-2 R3)")
  assert.doesNotMatch(source, /toLocaleString/)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-(?:amber|emerald)-\d|border-dashed|uppercase|rounded-full (?:bg|px)-|bg-surface\/\d|primary-soft|info-soft|warning-soft|hover:underline|hover:bg-accent|font-semibold leading-5|focus:outline-none|scale-\[|getHealthBadgeClass|getWarrantyPanelClass|getWarrantyIconClass|getActivityToneClass|getRelationship(?:Summary|Badge|Icon)Class|return "-"|\bh-8\b|md:h-10|text-lg|text-info|\btext-xs\b/)
})

test("asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents ChoiceCards with Nil, and no box in a box (spec 2D D7, D9, M21)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.match(source, /<Notice\n\s+tone="info"\n\s+className="mb-5"\n\s+title=\{t\("cloneBannerTitle", \{ assetTag: cloneSource\.assetTag \}\)\}/)
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2, "the cross-company and cross-branch warnings")
  assert.match(source, /<Notice tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
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
  assert.match(source, /<Notice tone="warning" className="md:col-span-2">\n\s+\{t\("duplicateWarning"\)\}/)
  assert.match(source, /<Notice\n\s+tone=\{duplicateCheckStatus === "clean" \? "success" : duplicateCheckStatus === "duplicate" \? "warning" : "danger"\}\n\s+className="md:col-span-2"/)
  assert.match(source, /<EmptyNote className="mt-3">\{t\("noPurchaseDocuments"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\n\s+key=\{document\.id\}\n\s+type="checkbox"/)
  assert.match(source, /\{ key: "count", label: t\("batchRows"\), value: formatCount\(rows\.length\) \}/)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.equal(source.match(/\{orNil\(/g)?.length, 6, "the six review cells that can be empty")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function SummaryItem\b|"-"|<table\b|<thead\b|<th\b|<td\b|border-dashed|bg-accent|bg-(?:primary|success|warning|danger)-soft|text-lg|text-warning|\btext-xs\b|rounded-lg border/)
})
