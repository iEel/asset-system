import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D2, D7, D9, D19, M20, M21, M22, M25, M29, M33): the field audit scanner on the shared parts,
// on top of the audit mobile fix of 2026-10-16 (the pinned action bar, compact component rows, "พบครบทุกชิ้น" and the
// room picker stay as they are), plus the carried keyboard bug of the check sheet. Messages are Notice by meaning, panels
// the panel classes, empty states EmptyNote, commands Button or buttonVariants, text links linkVariants, codes tag. Each
// test pins one file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"

test("check sheet: a field focused before the phone keyboard opens scrolls back above the pinned action bar (carried bug)", async () => {
  const { revealFocusInScrollArea } = await import("../src/components/audit/audit-scan-helpers.ts")
  const calls: unknown[] = []
  const field = { scrollIntoView: (options: unknown) => calls.push(options) } as unknown as Element
  const outside = { scrollIntoView: (options: unknown) => calls.push(options) } as unknown as Element
  const body = { contains: (node: unknown) => node === field } as unknown as Element
  revealFocusInScrollArea(body, field)
  revealFocusInScrollArea(body, outside)
  revealFocusInScrollArea(body, body)
  revealFocusInScrollArea(body, null)
  revealFocusInScrollArea(null, field)
  assert.deepEqual(calls, [{ block: "nearest" }], "only a control inside the body scrolls, and only as far as it must")
  const source = read(`${A}audit-scan-check-form.tsx`)
  assert.match(source, /const bodyRef = useRef<HTMLDivElement \| null>\(null\)/)
  // scroll-py-3 keeps the 4px focus halo inside the body when a field is scrolled to its edge.
  assert.match(source, /<div\s+ref=\{bodyRef\}\s+data-audit-check-body\s+className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3"/)
  assert.match(source, /const viewport: EventTarget = window\.visualViewport \?\? window\s+const reveal = \(\) => revealFocusInScrollArea\(bodyRef\.current, document\.activeElement\)\s+viewport\.addEventListener\("resize", reveal\)\s+return \(\) => viewport\.removeEventListener\("resize", reveal\)/)
  // The bar stays outside the scrolling body (audit mobile fix D1), and nothing changes the viewport meta app-wide.
  assert.ok(source.indexOf("data-audit-check-body") < source.indexOf("data-audit-check-actions"))
  assert.doesNotMatch(read("src/app/layout.tsx"), /interactiveWidget/)
})

test("review focus 4: with the phone keyboard open, every field that takes typing is in the scrolling body, never in the pinned bar (plan 2D-4)", () => {
  const source = read(`${A}audit-scan-check-form.tsx`)
  const body = source.indexOf("data-audit-check-body")
  const actions = source.indexOf("data-audit-check-actions")
  // revealFocusInScrollArea scrolls only inside the body: a text field in the bar would stay under the keyboard.
  assert.doesNotMatch(source.slice(actions), /<(?:Textarea|Input|textarea|SearchableSelect|AuditScanCheckField)\b|<input\b(?![^>]*type="checkbox")/)
  for (const marker of ["<AuditScanCheckField", "<Textarea"]) {
    const at = source.indexOf(marker)
    assert.ok(body < at && at < actions, `${marker} sits in the scrolling body`)
  }
})

test("check form: the installed-in note is an info Notice, the note and photo toggle a Button over a quiet grouping, the photo rule a neutral Notice and the correction a ChoiceCard (spec 2D D7, D9, M20, M29)", () => {
  const source = read(`${A}audit-scan-check-form.tsx`)
  assert.match(source, /<Notice tone="info">\s*\{components\.installedIn\.map\(/)
  assert.match(source, /<Button\s+variant="outline"\s+aria-expanded=\{extrasOpen\}\s+aria-controls=\{extrasOpen \? extrasId : undefined\}\s+onClick=\{\(\) => setExtrasOpen\(\(current\) => !current\)\}\s+className="w-full justify-between"\s*>/)
  assert.match(source, /<div id=\{extrasId\} className="space-y-3 rounded-md border border-border bg-background p-3">/)
  assert.match(source, /<Notice tone="neutral">\s*\{mode === "out_of_scope" \? t\("auditPhotoRequiredForMismatch"\) : t\("photoRequiredCondition"\)\}\s*<\/Notice>/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+checked=\{applyCorrections\}\s+onChange=\{\(event\) => setApplyCorrections\(event\.target\.checked\)\}\s+label=\{t\("applyAuditCorrections"\)\}\s+description=\{t\("applyAuditCorrectionsHelp"\)\}\s*\/>/)
  // The photo rule stays in the pinned bar, above save (audit mobile fix D1).
  const rule = source.indexOf('<Notice tone="neutral">')
  assert.ok(source.indexOf("data-audit-check-actions") < rule && rule < source.indexOf("{saveLabel}"))
  assert.doesNotMatch(source, /<button\b|<label\b|\btext-xs\b|\b(?:bg|border|text)-info\b|-info-|\btext-primary\b|\btext-warning\b|checkboxVariants/)
})

test("check field: the system value and the latest register value are meta lines under the field (DESIGN.md Typography: hints are text-meta)", () => {
  const source = read(`${A}audit-scan-check-field.tsx`)
  assert.match(source, /<p className="mt-1 text-meta font-medium text-warning">\{t\("inSystem", \{ value: labelFor\(expectedValue\) \}\)\}<\/p>/)
  assert.match(source, /<p className="mt-0\.5 text-meta text-muted-foreground">\{t\("latestValue", \{ value: labelFor\(latestValue\) \}\)\}<\/p>/)
  // Only a mismatch keeps its warning box (audit mobile fix D1).
  assert.match(source, /className=\{mismatch \? "rounded-md border border-warning-border bg-warning-soft p-2\.5" : undefined\}/)
  assert.doesNotMatch(source, /\btext-xs\b/)
})

test("component panel: the checked count and each row's name · role · slot are meta lines, and the 64px rows stay (DESIGN.md Typography; audit mobile fix D2)", () => {
  const source = read(`${A}audit-scan-panels.tsx`)
  assert.match(source, /<p className="text-meta text-muted-foreground">\{t\("componentsCheckedCount", \{ checked: checkedCount, total: components\.length \}\)\}<\/p>/)
  assert.match(source, /<p className="truncate text-meta text-muted-foreground">\s*\{\[component\.name, component\.componentRole, component\.slotNo\]\.filter\(Boolean\)\.join\(" · "\)\}/)
  assert.match(source, /data-audit-component-row className="flex min-h-16 items-center gap-2 px-3 py-2"/)
  // The scan frame on the camera image keeps its raw dim and white corners, and says why (2D-5 lists it as permanent).
  assert.match(source, /\/\/ The camera's scan frame keeps its own dim and white corners[^\n]*\bpermanent\b[^\n]*\n(?:\/\/[^\n]*\n)*export function AuditQrScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\btext-xs\b/)
})

test("check panel and workspace: the side panel on the panel classes, its empty state an EmptyNote, the serial a tag and the closed round a danger Notice (spec 2D D7, D9, M21, M25, M33)", () => {
  const panel = read(`${A}audit-scan-check-panel.tsx`)
  assert.match(panel, /<aside\s+data-audit-check-panel\s+aria-label=\{title\}\s+className=\{cn\(getPanelClasses\(\), "sticky top-4 flex max-h-\[calc\(100dvh-7rem\)\] flex-col self-start"\)\}\s*>/)
  assert.match(panel, /<aside className=\{cn\(getPanelClasses\(\), "sticky top-4 self-start"\)\}>\s*<EmptyNote padded className="justify-center">\{t\("checkPanelEmpty"\)\}<\/EmptyNote>/)
  assert.match(panel, /description: ReactNode/)
  assert.doesNotMatch(panel, /border-dashed|rounded-lg border border-border bg-surface/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const targetDescription: ReactNode = target\?\.kind === "item"/)
  assert.match(workspace, /\{target\.item\.serialNumber \? <> · Serial <span className="tag">\{target\.item\.serialNumber\}<\/span><\/> : null\}/)
  assert.match(workspace, /<Notice\s+tone="danger"\s+role="alert"\s+action=\{\s*<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\s*\{t\("backToRound"\)\}\s*<\/Link>\s*\}\s*>\s*\{t\("roundClosedError"\)\}\s*<\/Notice>/)
  assert.doesNotMatch(workspace, /bg-danger-soft|hover:underline|`Serial \$\{/)
})

test("scan header: the back link is a ghost icon link from buttonVariants and the counts go through formatCount (spec 2D D2, M29; DESIGN.md Numbers)", () => {
  const source = read(`${A}audit-scan-header.tsx`)
  assert.match(source, /<Link\s+href=\{backHref\}\s+aria-label=\{tCommon\("back"\)\}\s+className=\{buttonVariants\(\{ variant: "ghost", size: "icon" \}\)\}\s*>\s*<ArrowLeft className="size-5" aria-hidden="true" \/>/)
  assert.match(source, /<p className="shrink-0 pr-1 text-meta num text-muted-foreground">/)
  assert.match(source, /t\("progressChecked", \{ checked: formatCount\(progress\.checked\), total: formatCount\(progress\.total\) \}\)/)
  assert.match(source, /t\("progressMismatch", \{ count: formatCount\(progress\.mismatched\) \}\)/)
  // The one-line header of the audit mobile fix (D5) stays: the code on phones, the thin bar.
  assert.match(source, /<span aria-hidden="true" className="md:hidden">\{roundCode\}<\/span>/)
  assert.doesNotMatch(source, /toLocaleString|useLocale|\btext-xs\b|size-11|hover:bg-accent/)
})

test("room list: counts through formatCount, EmptyNote for an empty tab, the list on the panel classes, the tag as tag, meta lines, an outline show-more and a text link to the pending page (spec 2D D9, M21, M25, M29, M33)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /<span className="num">\{formatCount\(counts\[key\]\)\}<\/span>/)
  assert.match(source, /<EmptyNote tone=\{tab === "pending" \? "clear" : "empty"\} className="justify-center px-2 py-6">\{t\(emptyLabelKey\[tab\]\)\}<\/EmptyNote>/)
  assert.match(source, /<ul className=\{cn\(getPanelClasses\(\), "mt-2 divide-y divide-border overflow-hidden"\)\}>/)
  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{item\.assetTag\}<\/span><\/span>/)
  assert.match(source, /<Button variant="outline" onClick=\{onShowMore\} className="mt-2 w-full">\s*\{t\("showMore"\)\}\s*<\/Button>/)
  assert.match(source, /href=\{pendingHref\}\s+className=\{cn\(linkVariants\(\), "mt-3 inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  // The row stays a raw button (the whole row opens the sheet) and says so for 2D-5.
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /\{\/\* A raw button on purpose: [^\n]*\*\/\}\s*<button\s+type="button"\s+data-audit-scan-row/)
  assert.doesNotMatch(source, /\btext-xs\b|font-semibold|tabular-nums|hover:underline|text-primary|rounded-md border border-border bg-surface/)
})

test("room picker: no dashed trigger, meta counts, the clear button in the dialog footer's layout, and the two raw buttons that stay say why (spec 2D D19, §5.4 rule 2)", () => {
  const source = read(`${A}audit-scan-room-picker.tsx`)
  assert.match(source, /selected \? "border-primary-border bg-primary-soft text-primary" : "border-control-border bg-surface text-muted-foreground hover:bg-accent"/)
  assert.match(source, /<span className="block text-meta font-normal num">\s*\{t\("roomPendingOfTotal", \{ pending: selected\.pending, total: selected\.total \}\)\}/)
  assert.match(source, /<span className="shrink-0 text-meta font-semibold underline underline-offset-4">\{t\("roomChange"\)\}<\/span>/)
  assert.match(source, /<span className="shrink-0 text-meta num text-muted-foreground">\s*\{t\("roomPendingOfTotal", \{ pending: option\.pending, total: option\.total \}\)\}/)
  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">\s*<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\}>/)
  assert.equal(source.match(/\{\/\* A raw button on purpose: [^\n]*\(2D-5 lists it\)\. \*\/\}/g)?.length, 2)
  assert.equal(source.match(/<button\b/g)?.length, 2)
  assert.doesNotMatch(source, /border-dashed|\btext-xs\b|tabular-nums|className="w-full"/)
})

test("scan search: the shared SearchField with its clear button and a camera Button, and results on the panel classes with the tag as tag and meta lines (spec 2D D2, D9, M25, M29, M33)", () => {
  const source = read(`${A}audit-scan-search.tsx`)
  assert.match(source, /<SearchField\s+ref=\{inputRef\}\s+type="text"\s+fieldSize="xl"[\s\S]*?onClear=\{onClear\}\s+clearLabel=\{t\("searchClear"\)\}\s+trailing=\{/)
  assert.match(source, /<Button\s+variant=\{cameraOpen \? "default" : "ghost"\}\s+size="icon"\s+aria-label=\{cameraOpen \? t\("stopCamera"\) : t\("openCamera"\)\}\s+aria-pressed=\{cameraOpen\}\s+onClick=\{onToggleCamera\}\s*>/)
  assert.match(source, /<ul className=\{cn\(getPanelClasses\(\), "divide-y divide-border overflow-hidden"\)\}>/)
  assert.match(source, /<span className="tag font-medium">\{match\.field === "assetTag" \? highlight\(match\.item\.assetTag\) : match\.item\.assetTag\}<\/span>/)
  // The sticky bar over main's padding stays (VFG pins its classes); only the result row stays a raw button.
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.equal(source.match(/<input\b/g), null)
  assert.doesNotMatch(source, /getFieldControlClasses|size-11|\btext-xs\b|font-semibold|rounded-md border border-border bg-surface/)
})

test("lookup card: a ContentPanel with Notices by meaning (out of scope warning, offline neutral, error danger alert), EmptyNote for an unknown code, a quiet list and the tag as tag (spec 2D D7, D9, M20, M21, M25, M33)", () => {
  const source = read(`${A}audit-scan-lookup-card.tsx`)
  assert.match(source, /return \(\s*<ContentPanel>/)
  assert.match(source, /<Notice\s+tone="warning"\s+className="mt-2"\s+title=\{t\("lookupOutOfScope", \{ assetTag: state\.asset\.assetTag \}\)\}\s+action=\{\s*<Button type="button" variant="outline" size="md" onClick=\{\(\) => onRecordOutOfScope\(state\.asset\)\}>/)
  assert.match(source, /<ul className="mt-1 divide-y divide-border rounded-md border border-border bg-background">/)
  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{match\.assetTag\}<\/span><\/span>/)
  assert.match(source, /<EmptyNote className="mt-2">\{t\("lookupUnknown"\)\}<\/EmptyNote>/)
  assert.match(source, /<Notice tone="neutral" className="mt-2">\{t\("lookupOffline"\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="danger" role="alert" className="mt-2"><ApiErrorText error=\{state\.message\} \/><\/Notice>/)
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.doesNotMatch(source, /\b(?:bg|border|text)-warning\b|-warning-|text-danger|\btext-xs\b|font-semibold|rounded-md border border-border bg-surface/)
})

test("offline bar: a warning Notice with role status, a busy send Button and outline remove Buttons, no faded disabled look (spec 2D D7, M20, M29, §5.4 rule 4)", () => {
  const source = read(`${A}audit-scan-offline-bar.tsx`)
  assert.match(source, /<Notice\s+tone="warning"\s+role="status"\s+data-audit-scan-offline\s+className="mb-2"\s+title=\{online \? t\("offlineBarPending", \{ count: queue\.length \}\) : t\("offlineBarOffline", \{ count: queue\.length \}\)\}/)
  assert.match(source, /<Button variant="outline" size="md" busy=\{sending\} onClick=\{onSendNow\}>\s*\{t\("sendNow"\)\}/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => onRemove\(entry\.id\)\}>\s*\{t\("removeFromQueue"\)\}/)
  // The failed line keeps its "-" inside a translated sentence (LFG LV2 KEEP 1, R-n).
  assert.match(source, /error: entry\.lastSyncError \?\? "-"/)
  assert.doesNotMatch(source, /<button\b|disabled:opacity|hover:underline|text-primary|\btext-xs\b|bg-warning-soft|disabled=\{sending\}/)
})

test("saved banner: a Notice by result (queued info, mismatch warning, saved success) with role status, outline Buttons for edit and photo retry, and the retry a danger Notice (spec 2D D7, M20, M29)", () => {
  const source = read(`${A}audit-scan-saved-banner.tsx`)
  assert.match(source, /<div data-audit-scan-saved className="mb-2 space-y-2">\s*<Notice\s+tone=\{notice\.queued \? "info" : notice\.diff\.length > 0 \? "warning" : "success"\}\s+role="status"/)
  assert.match(source, /notice\.mode !== "out_of_scope" \? \(\s*<Button variant="outline" size="md" onClick=\{onEdit\}>\s*\{t\("editAgain"\)\}/)
  assert.match(source, /\{photoRetryCount > 0 \? \(\s*<Notice\s+tone="danger"\s+action=\{\s*<Button variant="outline" size="md" onClick=\{onRetryPhotos\}>\s*\{t\("retryPhotos"\)\}/)
  assert.equal(source.match(/role="status"/g)?.length, 1, "one live region: the saved result")
  assert.doesNotMatch(source, /<button\b|hover:underline|text-primary|-soft\b|text-(?:success|warning|danger)\b|\bcn\(/)
})
