import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("shared confirmation dialog is built on the accessible dialog", () => {
  const dialogPath = "src/components/ui/confirm-text-dialog.tsx"
  assert.ok(existsSync(dialogPath), "shared confirmation dialog should exist")
  const source = readFileSync(dialogPath, "utf8")
  assert.match(source, /<AccessibleDialog/)
  assert.match(source, /initialFocusRef=\{inputRef\}/)
  assert.match(source, /busy=\{busy\}/)
  assert.doesNotMatch(source, /onKeyDown=|restoreFocusRef|role="dialog"/)
})

test("batch review and component removal use accessible dialogs instead of browser prompts", () => {
  const batchSource = readFileSync("src/components/audit/audit-findings-batch-actions.tsx", "utf8")
  const componentSource = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(batchSource, /ConfirmTextDialog/)
  assert.match(componentSource, /<AccessibleDialog/)
  assert.match(componentSource, /FileDropzone file=\{removeEvidence\}/)
  assert.doesNotMatch(batchSource, /window\.prompt/)
  assert.doesNotMatch(componentSource, /window\.prompt/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 22, §8.9): the form wraps the dialog parts, the label comes from Field, and the
// confirm button shows busy instead of turning disabled, so focus stays on it while the caller works.
test("the confirmation dialog uses the dialog parts, a shared field and a busy confirm button (2C batch 3)", () => {
  const source = readFileSync("src/components/ui/confirm-text-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody>\n\s+<Field label=\{fieldLabel\}>\n\s+<Textarea\n\s+ref=\{inputRef\}\n\s+id=\{fieldId\}/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{cancelLabel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" variant=\{confirmVariantByTone\[tone\]\} busy=\{busy\}>\{confirmLabel\}<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.doesNotMatch(source, /<textarea|<label|disabled:opacity|grid-cols-2|onClick=\{onClose\}/)
  assert.doesNotMatch(source, /<Button[^>]*\sdisabled=/, "cancel is disabled by the dialog while busy; the confirm button keeps focus")
})
