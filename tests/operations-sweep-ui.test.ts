import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D18, M20, M21, M22, M25, M29, M32 b, M33): the shared bits and the asset
// transactions on the shared parts. The phone ActionBar is one row on a short screen, the asset page's in-page links
// open the view that shows their section, the operation forms are ContentPanels, messages Notice by meaning, empty
// states EmptyNote or ActionEmptyState, label and value pairs KeyValueList, empty values Nil, codes tag. Each test pins
// one file (or one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may
// contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("ActionBar: a short screen keeps the 44px links, halves the padding and puts the next step beside the links (spec 2D D18)", () => {
  const source = read(`${C}ui/action-bar.tsx`)
  assert.match(source, /className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden \[@media\(max-height:32rem\)\]:pb-\[max\(0\.375rem,env\(safe-area-inset-bottom\)\)\] \[@media\(max-height:32rem\)\]:pt-1\.5"/)
  assert.match(source, /<div className=\{cn\("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "\[@media\(max-height:32rem\)\]:max-w-3xl \[@media\(max-height:32rem\)\]:grid-cols-\[minmax\(0,1fr\)_minmax\(0,2fr\)\]"\)\}>/)
  assert.match(source, /buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\)/, "size sm stays 44px tall below md")
  assert.doesNotMatch(source, /32rem\)\]:(?:min-)?h-|32rem\)\]:hidden/, "nothing shrinks a 44px target or hides an action on a short screen")
})

const D = "src/app/[locale]/(dashboard)/"

test("asset page: a link to a section another tab shows opens that tab (wiki 43, spec 2D §3.4; group 1 asset detail task 8)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.match(source, /import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"/)
  assert.match(source, /const sectionHref = \(sectionId: AssetDetailSectionId\) => buildAssetDetailSectionHref\(locale, asset\.id, assetDetailView, sectionId, returnToHref\)/)
  assert.match(source, /const photosHref = sectionHref\("photos"\)/)
  assert.match(source, /uploadHref: photosHref,/, "the overview's upload link opens the files tab (R26)")
  assert.match(source, /documentsHref: sectionHref\("purchase-documents"\)/)
  assert.doesNotMatch(source, /["`]#(?:ownership|components|handover|movement|maintenance|audit|photos|purchase-documents)["`]|\bstatusHref\b/)
})

test("transaction cancel dialog: the error is the first thing in the body, the blockers a warning Notice, the count formatCount (spec 2D D7, plan 2D-3 R2)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  const body = source.slice(source.indexOf("<AccessibleDialogBody>"), source.indexOf("</AccessibleDialogBody>"))
  assert.match(body, /\{error \? \(\n\s+<Notice tone="danger" role="alert"[^>]*>\n\s+<ApiErrorText error=\{error\} \/>\n\s+<\/Notice>\n\s+\) : null\}/)
  assert.ok(body.indexOf('<Notice tone="danger"') < body.indexOf("<dl "), "an error from the dialog's action comes before the facts (DESIGN.md Dialogs)")
  assert.match(body, /<Notice tone="warning" role="status" title=\{labels\.blockedTitle\}[^>]*>\n\s+<p>\{labels\.blockedDescription\}<\/p>\n\s+<ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">/)
  assert.match(source, /\[labels\.components, formatCount\(componentCount\)\]/)
  assert.doesNotMatch(source, /AlertTriangle|warning-soft|warning-border|text-danger|String\(componentCount\)|min-h-5/)
})

test("review focus 3: a blocked cancellation keeps its confirm and reason disabled, and the warning Notice says why (plan 2D-4)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assert.match(source, /<Button variant="destructive" busy=\{saving\} disabled=\{loading\} aria-disabled=\{blocked \|\| undefined\} aria-describedby=\{blocked \? "transaction-cancel-blockers" : undefined\} onClick=\{\(\) => void submitCancellation\(\)\}>/)
  assert.match(source, /<Textarea ref=\{reasonRef\}[^\n]*disabled=\{saving \|\| blockers\.length > 0\}/)
  assert.match(source, /\{blockers\.length > 0 \? \(\n\s+<Notice tone="warning" role="status"/)
  assert.match(source, /\{blockers\.map\(\(blocker\) => <li key=\{blocker\}>\{labels\.blockers\[blocker\] \?\? blocker\}<\/li>\)\}/, "every blocker is named in words")
})

const P = "src/app/[locale]/(print)/"

test("print documents: the toolbar has the shared back and print buttons, and a missing snapshot reaches the cancel dialog as null (spec 2D M29, M32 b)", () => {
  const source = read(`${C}asset-operations/operation-document-print.tsx`)
  assert.match(source, /<PageBackLink href=\{backHref\} label=\{backLabel\}[^>]*\/>/)
  assert.match(source, /\{toolbarActions\}\n\s+<Button size="md" onClick=\{\(\) => window\.print\(\)\}>\n\s+<Printer aria-hidden="true" \/>\n\s+\{printLabel\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|<ArrowLeft\b|hover:text-primary|from "next\/link"/)
  // The A4 page is print (spec 2D §5.3, permanent): its raw colors, the paper shadow, its h1 and the "-" of an empty field stay.
  assert.match(source, /\{field\.value \|\| "-"\}/)
  for (const page of ["checkouts", "checkins", "transfers"]) {
    const print = read(`${P}asset-management/${page}/[id]/page.tsx`)
    assert.match(print, /function formatSnapshotState\([^)]*\) \{\n\s+if \(!snapshot\) return null\n/, page)
  }
})

test("review focus 5: the shared back and print buttons sit in the toolbar that print hides, so the A4 paper prints without them (plan 2D-4)", () => {
  const source = read(`${C}asset-operations/operation-document-print.tsx`)
  assert.match(source, /@media print \{[\s\S]*?\.operation-print-toolbar \{\s*display: none !important;\s*\}/)
  const toolbar = source.slice(source.indexOf('<div className="operation-print-toolbar'), source.indexOf("<section"))
  assert.match(toolbar, /<PageBackLink\b/)
  assert.match(toolbar, /<Button size="md" onClick=\{\(\) => window\.print\(\)\}>/)
  assert.match(toolbar, /\{toolbarActions\}/, "the cancel dialog's trigger does not print either")
})

test("check-out, transfer and bulk move forms: the form panel is a ContentPanel, and the empty asset list is an EmptyNote (spec 2D D9, M21, M25)", () => {
  const checkout = read(`${C}asset-operations/checkout-form.tsx`)
  assert.match(checkout, /<PageHeader title=\{title\} className="mb-6" \/>\n\s+<ContentPanel>\{children\}<\/ContentPanel>/)
  const transfer = read(`${C}asset-operations/transfer-form.tsx`)
  assert.match(transfer, /<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\}/)
  assert.match(transfer, /<\/form>\n\s+<OperationReviewDialog[\s\S]*?\/>\n\s+<\/ContentPanel>/, "the review dialog stays inside the panel")
  const bulkMove = read(`${C}asset-operations/bulk-move-form.tsx`)
  assert.match(bulkMove, /className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\}/)
  assert.match(bulkMove, /<EmptyNote padded role="status">\{tCommon\("noData"\)\}<\/EmptyNote>/)
  for (const [name, source] of [["checkout", checkout], ["transfer", transfer], ["bulk move", bulkMove]]) {
    assert.doesNotMatch(source, /<section\b|rounded-lg border|text-center text-sm text-muted-foreground/, name)
  }
})

test("check-in form: a ContentPanel, Notice by meaning, ActionEmptyState, KeyValueList with Nil, a Chip and EmptyNote in the legacy list, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} noValidate /)
  assert.match(source, /<ActionEmptyState\n\s+icon=\{<PackageCheck \/>\}\n\s+title=\{t\("noActiveCheckoutsTitle"\)\}\n\s+description=\{t\("noActiveCheckoutsDescription"\)\}\n\s+actionHref=\{`\/\$\{locale\}\/asset-management\/checkout`\}\n\s+actionLabel=\{t\("goToCheckout"\)\}\n\s+actionVariant="secondary"/)
  assert.match(source, /<Notice tone="warning" title=\{t\("handoverReviewRequired"\)\}[^>]*>\n\s+\{t\("handoverModeMissing"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="warning" title=\{t\("legacyReturnTitle"\)\}[^>]*>\n\s+\{t\("legacyReturnDescription"\)\}\n\s+<\/Notice>/)
  assert.match(source, /shown: formatCount\(filteredLegacyReturnCandidates\.length\),\n\s+total: formatCount\(legacyReturnCandidates\.length\),/)
  assert.match(source, /<EmptyNote padded role="status">\{t\("legacyReturnNoResults"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>\n\s+<Chip>\{t\("legacyReturnBadge"\)\}<\/Chip>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the handover and the asset")
  assert.match(source, /value: selectedCheckout\.documentNo \? <span className="tag">\{selectedCheckout\.documentNo\}<\/span> : null/)
  assert.match(source, /function formatDate\(value\?: string \| null\) \{\n\s+if \(!value\) return null\n/)
  assert.match(source, /<Notice tone="info" title=\{t\("sendToRepairTitle"\)\}[^>]*>\n\s+\{t\("sendToRepairHelp"\)\}\n\s+<\/Notice>/)
  assert.doesNotMatch(source, /function ReadOnly\b|"-"|<section\b|rounded-lg border|border-dashed|rounded-full|warning-soft|primary-soft|text-warning|\btext-xs\b|\buppercase\b|<Wrench\b|from "next\/link"/)
})
