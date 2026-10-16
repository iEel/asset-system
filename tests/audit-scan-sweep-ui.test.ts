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
