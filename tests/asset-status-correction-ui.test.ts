import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// Group 1 asset detail task 8A (spec 2026-10-25 §7.1 "แก้ไขสถานะ" in "อื่น ๆ"; DESIGN.md "Menus never contain dialogs"): the
// status correction is a dialog rendered outside any menu. Its owner opens it through its handle, or its own outline
// trigger shows; the reason is a shared field checked on save (v-track A5), and the submit shows busy.
test("the status correction is a dialog its owner opens, with the reason under its field and a busy submit (group 1 asset detail task 8A)", () => {
  assert.equal(existsSync("src/components/assets/asset-status-correction-button.tsx"), false)
  const source = read("src/components/assets/asset-status-correction-dialog.tsx")
  assert.match(source, /^"use client"/)
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: openDialog \}\)\)/)
  assert.match(source, /\{hideTrigger \? null : \(\s*<Button variant="outline" onClick=\{openDialog\}>\s*<RotateCcw className="text-warning" aria-hidden="true" \/>\s*\{labels\.button\}\s*<\/Button>\s*\)\}/)
  assert.match(source, /<AccessibleDialog\s+open=\{open\}\s+title=\{labels\.title\}\s+description=\{labels\.description\}\s+busy=\{isSubmitting\}\s+initialFocusRef=\{reasonRef\}\s+returnFocusRef=\{returnFocusRef\}\s+onClose=\{closeDialog\}\s*>/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(source, /<Field\s+label=\{labels\.reason\}\s+required\s+error=\{fieldErrors\.errors\.reason \? validationMessage\(fieldErrors\.errors\.reason, \{ min: 5, max: 500 \}\) : undefined\}\s*>\s*<Textarea\s+ref=\{reasonRef\}\s+id="asset-status-correction-reason"/)
  assert.match(source, /<AccessibleDialogFooter>\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\s*<Button type="submit" busy=\{isSubmitting\}>\s*\{labels\.submit\}\s*<\/Button>\s*<\/AccessibleDialogFooter>/)
  // A refusal that names no field keeps this line under the field (spec §4.1.3).
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|aria-expanded|aria-controls|useId|panelId|<Notice\b|labels\.submitting|disabled:opacity|bg-warning-soft/)
})
