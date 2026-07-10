import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("shared confirmation dialog manages focus and exposes dialog semantics", () => {
  const dialogPath = "src/components/ui/confirm-text-dialog.tsx"
  assert.ok(existsSync(dialogPath), "shared confirmation dialog should exist")
  const source = readFileSync(dialogPath, "utf8")

  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby/)
  assert.match(source, /restoreFocusRef/)
  assert.match(source, /onKeyDown=\{handleKeyDown\}/)
})

test("batch review and component removal use accessible dialogs instead of browser prompts", () => {
  const batchSource = readFileSync("src/components/audit/audit-findings-batch-actions.tsx", "utf8")
  const componentSource = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(batchSource, /ConfirmTextDialog/)
  assert.match(componentSource, /role="dialog"/)
  assert.match(componentSource, /aria-modal="true"/)
  assert.match(componentSource, /FileDropzone file=\{removeEvidence\}/)
  assert.doesNotMatch(batchSource, /window\.prompt/)
  assert.doesNotMatch(componentSource, /window\.prompt/)
})
