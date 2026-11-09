import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readSourceFiles } from "./helpers/source-files.ts"

// Group 2 plan 4 Task 5 (spec §10, P4-R15): DesktopSelectionBar, the bar of a desktop list whose rows take ticks.
// Server-safe (no directive, no hook): its client caller passes the handlers. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/ui/desktop-selection-bar.tsx"

test("DesktopSelectionBar: one flat sticky bar from md, never fixed and never lifted (P4-R15)", () => {
  const source = read(PART)
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.match(source, /role="group"\n\s+aria-label=\{label\}\n\s+data-slot="desktop-selection-bar"\n\s+className=\{cn\("sticky bottom-\[calc\(3\.75rem\+env\(safe-area-inset-bottom\)\)\] z-30 hidden min-w-0 flex-col gap-2 border-t border-border bg-canvas py-3 md:flex lg:-bottom-6", className\)\}/)
  assert.doesNotMatch(source, /\bfixed\b|\bshadow-|backdrop-blur|bg-canvas\/|bg-surface\/|\bdark:|<button\b/)
})

test("DesktopSelectionBar: the count, ล้าง, then the actions with the primary last; a status line that is always there", () => {
  const source = read(PART)
  assert.match(source, /\{countLabel \? \(\n\s+<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">\n\s+<span className="text-sm font-medium text-foreground">\{countLabel\}<\/span>\n\s+<Button variant="ghost" size="md" onClick=\{onClear\} disabled=\{clearDisabled\}>\n\s+\{clearLabel\}\n\s+<\/Button>\n\s+\{actions \? <div className="ml-auto flex flex-wrap items-center justify-end gap-2">\{actions\}<\/div> : null\}/)
  // A live region added together with its text is not read: the line is always rendered, hidden while it is empty.
  assert.match(source, /<p role="status" className=\{cn\("text-meta text-muted-foreground", !status && "sr-only"\)\}>\{status\}<\/p>\n\s+\{children\}/)
  assert.match(source, /^export type DesktopSelectionBarProps = \{\n  label: string\n  countLabel: string \| null\n  clearLabel: string\n  onClear: \(\) => void\n  clearDisabled\?: boolean\n  actions\?: React\.ReactNode\n  status\?: React\.ReactNode\n  className\?: string\n  children\?: React\.ReactNode\n\}$/m)
})

// Group 4 plan 6 Task 5 (P6-R10): the labels page is the fourth caller, its bar the page's last child while the print
// list holds a label; no fixed phone bar comes with it.
test("DesktopSelectionBar's callers: three lists with ticks and the labels page's print bar (P6-R10)", () => {
  const callers = readSourceFiles("src").filter((file) => file.source.includes("<DesktopSelectionBar")).map((file) => file.path).sort()
  // Group 6 plan 2 Task 3: the approvals page's selection (spec §7.4) is the fifth caller.
  assert.deepEqual(callers, [
    "src/components/approvals/approval-inbox-selection.tsx",
    "src/components/asset-operations/bulk-move-form.tsx",
    "src/components/assets/asset-label-batch-tool.tsx",
    "src/components/assets/asset-register-table.tsx",
    "src/components/audit/audit-findings-batch-actions.tsx",
    // Inspection-confirm plan 3 Task 3: the ยืนยันผลตรวจ page's ready tab, with its own md:hidden phone bar.
    "src/components/audit/inspection-confirm/inspection-confirm-workspace.tsx",
    // Group 6 plan 4 Task 3: the disposal queue's approved tab (spec §10.2) is the sixth caller.
    "src/components/disposal/disposal-round-selection.tsx",
  ])
  const shell = read("src/components/assets/asset-label-batch-tool.tsx")
  assert.equal(shell.match(/<DesktopSelectionBar\n/g)?.length, 1)
  assert.match(shell, /\{ordered\.length > 0 \? \(\n\s+<DesktopSelectionBar\n/)
  assert.ok(shell.trimEnd().endsWith(") : null}\n    </div>\n  )\n}"), "the bar closes the page wrapper")
  const design = read("DESIGN.md")
  const block = design.slice(design.indexOf("**`DesktopSelectionBar`**"), design.indexOf("**Asset register pattern (2026-10-07).**"))
  for (const phrase of ["**The labels page**", "the page wrapper's last child", "\"ล้างรายการพิมพ์\"", "there is no phone bar", "`overflow-x-clip`"]) assert.ok(block.includes(phrase), phrase)
})

test("DESIGN.md and docs/14 describe DesktopSelectionBar, and the guards know it as a shared part (P4-R15)", () => {
  const design = read("DESIGN.md")
  const block = design.slice(design.indexOf("**`DesktopSelectionBar`**"), design.indexOf("**Asset register pattern (2026-10-07).**"))
  assert.ok(block.length > 0 && design.indexOf("**`DesktopSelectionBar`**") > design.indexOf("- **`RowActions`**"), "a Data Tables block after RowActions")
  for (const phrase of [
    "`src/components/ui/desktop-selection-bar.tsx`",
    "`lg:-bottom-6`",
    "above the Mobile Field Navigation",
    "never `fixed`",
    "`hidden md:flex`",
    "a `border-t` on `bg-canvas`, no shadow",
    "`role=\"status\"`",
    "`checkboxVariants()`",
    "`data-no-row-click`",
    "takes `selectionKey` as its `key`",
  ]) assert.ok(block.includes(phrase), phrase)
  assert.ok(design.includes("(the disposal providers take `selectionKey`, the findings selection provider takes it as its `key`)."), "DESIGN.md:622")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.slice(index.indexOf("\n| The ticked rows of a desktop list and what to do with them | `DesktopSelectionBar` |"), index.indexOf("\n| A phone action bar on a detail page |"))
  assert.ok(row.length > 0 && index.indexOf("`DesktopSelectionBar`") > index.indexOf("| A save bar for a long form |"), "docs/14: the row follows StickyFormFooter")
  for (const phrase of ["from `md` only", "never `fixed`", "the primary last", "`status`"]) assert.ok(row.includes(phrase), phrase)
  const guards = read("tests/list-frame-guards.test.ts")
  assert.match(guards, /const UI_NAME = \/\\bfunction \(\?:[^/]*\|DesktopSelectionBar\)\\b\/g/)
  assert.match(guards, /"desktop-selection-bar", "empty-note"/)
  assert.match(read("tests/visual-foundation-guards.test.ts"), /for \(const path of \["src\/components\/ui\/action-bar\.tsx", "src\/components\/ui\/desktop-selection-bar\.tsx"\]\)/)
})
