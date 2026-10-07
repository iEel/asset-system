import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("accessible dialog is a Radix dialog that cannot be dismissed while busy", () => {
  const source = read("src/components/ui/accessible-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/dialog"/)
  assert.match(source, /if \(!nextOpen && !busy\) onClose\(\)/)
  assert.match(source, /onEscapeKeyDown=\{\(event\) => \{\s*if \(busy\) event\.preventDefault\(\)/)
  assert.match(source, /onInteractOutside=\{\(event\) => \{\s*if \(busy\) event\.preventDefault\(\)/)
  assert.match(source, /closeDisabled=\{busy\}/)
  assert.doesNotMatch(source, /document\.addEventListener|role="dialog"|fixed inset-0|event\.key === "Tab"/)
})

test("accessible dialog keeps caller focus targets", () => {
  const source = read("src/components/ui/accessible-dialog.tsx")
  assert.match(source, /onOpenAutoFocus=\{\(event\) => \{[\s\S]*initialFocusRef\?\.current[\s\S]*event\.preventDefault\(\)/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*returnFocusRef\?\.current[\s\S]*isConnected[\s\S]*event\.preventDefault\(\)/)
})

test("dialog close button is labelled, disable-able and touch sized", () => {
  const source = read("src/components/ui/dialog.tsx")
  assert.match(source, /closeLabel = "Close"/)
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /disabled=\{closeDisabled\}/)
  assert.match(source, /min-h-11 min-w-11/)
  assert.doesNotMatch(source, /dark:/)
})
