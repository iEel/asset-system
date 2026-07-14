import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("accessible dialog defines modal semantics, escape, focus trap, and restoration", () => {
  const path = "src/components/ui/accessible-dialog.tsx"
  assert.equal(existsSync(path), true)
  const source = readFileSync(path, "utf8")
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /event\.key === "Escape"/)
  assert.match(source, /restoreFocusRef/)
  assert.match(source, /event\.key === "Tab"/)
})
