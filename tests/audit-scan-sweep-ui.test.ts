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
