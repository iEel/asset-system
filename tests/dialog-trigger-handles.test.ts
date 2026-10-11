import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// P0.3 (spec 2C section 3.4, I5): the owner of a row or ⋯ menu can open these three dialogs without their own trigger,
// the way TransactionCancelDialog works (tests/dropdown-menus-ui.test.ts). The owner renders the component outside the
// menu with hideTrigger, calls ref.current?.open(), and passes its ⋯ button as returnFocusRef.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const decision = "src/components/disposal/disposal-decision-button.tsx"
const execution = "src/components/disposal/disposal-execution-button.tsx"
const notFound = "src/components/audit/audit-mark-not-found-button.tsx"

for (const [path, handle] of [
  [decision, "DisposalDecisionButtonHandle"],
  [execution, "DisposalExecutionButtonHandle"],
  [notFound, "AuditMarkNotFoundButtonHandle"],
] as const) {
  test(`${handle}: the owner can open the dialog and hide the trigger`, () => {
    const source = read(path)
    assert.match(source, new RegExp(`export type ${handle} = \\{ open: \\(\\) => void \\}`))
    assert.match(source, /import \{[^}]*\buseImperativeHandle\b[^}]*\btype Ref\b[^}]*\btype RefObject\b[^}]*\} from "react"/)
    assert.match(source, new RegExp(`ref\\?: Ref<${handle}>`))
    assert.match(source, /hideTrigger\?: boolean/)
    assert.match(source, /hideTrigger = false/)
    assert.match(source, /returnFocusRef\?: RefObject<HTMLElement \| null>/)
    assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open:/)
    assert.match(source, /hideTrigger \? null/)
  })
}

test("the disposal dialogs give focus back to the owner's button when there is one", () => {
  for (const path of [decision, execution]) {
    const source = read(path)
    assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: \(\) => setOpen\(true\) \}\)\)/, path)
    assert.match(source, /\{hideTrigger \? null : \(/, path)
    assert.match(source, /triggerRef=\{returnFocusRef \?\? triggerRef\}/, path)
    // The inner dialog keeps returnFocusRef={triggerRef} (tests/disposal-detail-workspace.test.ts), so its prop
    // takes any element: the dialog's own trigger button or the owner's ⋯ button.
    assert.match(source, /triggerRef: React\.RefObject<HTMLElement \| null>/, path)
    assert.doesNotMatch(source, /triggerRef: React\.RefObject<HTMLButtonElement \| null>/, path)
  }
})

test("the not-found dialog opens through openDialog and gives focus back to the owner's button", () => {
  const source = read(notFound)
  // openDialog already refuses to open while a save is running.
  assert.match(source, /function openDialog\(\) \{\s*if \(!saving\) setDialogOpen\(true\)\s*\}/)
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: openDialog \}\)\)/)
  assert.match(source, /\{hideTrigger \? null : trigger\}/)
  assert.match(source, /<AccessibleDialog[\s\S]*?returnFocusRef=\{returnFocusRef\}[\s\S]*?onClose=\{closeDialog\}/)
})
