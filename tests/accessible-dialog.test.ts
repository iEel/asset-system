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

test("accessible dialog keeps focus stable while open props change", () => {
  const source = readFileSync("src/components/ui/accessible-dialog.tsx", "utf8")

  assert.match(source, /useEffectEvent/)
  assert.match(source, /const closeOnEscape = useEffectEvent\(\(\) => \{\s+if \(busy\) return false\s+onClose\(\)\s+return true\s+\}\)/)
  assert.match(source, /const resolveInitialFocus = useEffectEvent\(\(\) =>\s+initialFocusRef\?\.current \?\? panelRef\.current\?\.querySelector/)
  assert.match(source, /event\.key === "Escape" && closeOnEscape\(\)/)
  assert.match(source, /const target = resolveInitialFocus\(\)/)
  assert.match(source, /\}, \[open\]\)/)
  assert.doesNotMatch(source, /\[busy, initialFocusRef, onClose, open\]/)
})
