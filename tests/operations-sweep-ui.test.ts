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

test("asset page: a link to a section that the current view hides opens the view that shows it (wiki 43, spec 2D §3.4)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.match(source, /import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, parseAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"/)
  assert.match(source, /const sectionHref = \(sectionId: AssetDetailSectionId\) => buildAssetDetailSectionHref\(locale, asset\.id, assetDetailView, sectionId, returnToHref\)/)
  assert.equal(source.match(/createHealthItem\(hasAssetResponsibility\(asset\), responsibilityHealthLabel, sectionHref\("ownership"\), /g)?.length, 2)
  assert.match(source, /href: sectionHref\("maintenance"\),\n\s+actionLabel: t\("quickMaintenance"\),/)
  assert.match(source, /href: sectionHref\("audit"\),\n\s+actionLabel: t\("detailSections\.audit"\),/)
  assert.match(source, /purchaseHref: sectionHref\("purchase"\),\n\s+auditHref: sectionHref\("audit"\),\n\s+componentsHref: sectionHref\("components"\),/)
  assert.match(source, /const renewAction = \{ href: purchaseHref, /, "the phone ActionBar shows it in every view")
  assert.match(source, /const auditAction = \{ href: auditHref, /)
  assert.match(source, /const componentAction = \{ href: componentsHref, /, "the phone ActionBar shows it in every view")
  assert.equal(source.match(/\{ href: auditHref, icon: <ScanLine className="h-4 w-4" \/>, label: t\("quickAudit"\) \}/g)?.length, 4)
  // Only sections of the overview view stay plain "#id" links: they render in the overview view only.
  assert.doesNotMatch(source, /["`]#(?:ownership|components|handover|movement|maintenance|audit)["`]|\bstatusHref\b/)
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
  assert.match(source, /<Button variant="destructive" busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick=\{\(\) => void submitCancellation\(\)\}>/)
  assert.match(source, /<Textarea ref=\{reasonRef\}[^\n]*disabled=\{saving \|\| blockers\.length > 0\}/)
  assert.match(source, /\{blockers\.length > 0 \? \(\n\s+<Notice tone="warning" role="status"/)
  assert.match(source, /\{blockers\.map\(\(blocker\) => <li key=\{blocker\}>\{labels\.blockers\[blocker\] \?\? blocker\}<\/li>\)\}/, "every blocker is named in words")
})
