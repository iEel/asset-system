import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { dialogCloseSelector, initialFocusVerdict, type FocusCandidate } from "../src/components/ui/dialog-focus.ts"

// Plan 2D-2 (spec 2D D18): the close X of every dialog and sheet comes first in the Tab order, before the content, and
// focus still starts on the first control of the content. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("dialog and sheet render the X before their content and pass their own focus rule after the caller's (spec 2D D18)", () => {
  for (const [path, part] of [["src/components/ui/dialog.tsx", "DialogPrimitive"], ["src/components/ui/sheet.tsx", "SheetPrimitive"]] as const) {
    const source = read(path)
    const content = source.slice(source.indexOf(`<${part}.Content`), source.indexOf(`</${part}.Content>`))
    const close = content.indexOf(`<${part}.Close`)
    assert.ok(close !== -1 && close < content.indexOf("{children}"), `${path}: the X comes before {children}`)
    assert.match(source, /^import \{ focusFirstContentControl \} from "@\/components\/ui\/dialog-focus"$/m, path)
    assert.match(content, /\{\.\.\.props\}\n[^\n]*\n\s+onOpenAutoFocus=\{\(event\) => \{\n\s+onOpenAutoFocus\?\.\(event\)\n\s+if \(!event\.defaultPrevented\) focusFirstContentControl\(event\)\n\s+\}\}/, path)
  }
})

test("the first focus skips the X, links, disabled and hidden elements, and accepts the first tabbable control (spec 2D D18)", () => {
  const node = (tagName: string, extra: Partial<FocusCandidate> = {}): FocusCandidate => ({ tagName, tabIndex: 0, hidden: false, matches: () => false, ...extra })
  assert.equal(initialFocusVerdict(node("BUTTON", { matches: (selector) => selector === dialogCloseSelector })), "reject")
  assert.equal(initialFocusVerdict(node("A")), "skip")
  assert.equal(initialFocusVerdict(node("BUTTON", { disabled: true })), "skip")
  assert.equal(initialFocusVerdict(node("INPUT", { type: "hidden" })), "skip")
  assert.equal(initialFocusVerdict(node("DIV", { hidden: true })), "skip")
  assert.equal(initialFocusVerdict(node("DIV", { tabIndex: -1 })), "skip")
  assert.equal(initialFocusVerdict(node("INPUT", { type: "text" })), "accept")
  assert.equal(initialFocusVerdict(node("TEXTAREA")), "accept")
  assert.equal(initialFocusVerdict(node("BUTTON", { tabIndex: 0, disabled: false })), "accept")
  assert.equal(dialogCloseSelector, '[data-slot="dialog-close"], [data-slot="sheet-close"]')
})
