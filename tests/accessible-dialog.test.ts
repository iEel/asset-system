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
  assert.match(source, /restoreFocusRef\.current = document\.activeElement instanceof HTMLElement/)
  assert.match(source, /\[returnFocusRef\?\.current, restoreFocusRef\.current, fallbackFocusRef\?\.current\]\.find\(\(candidate\) => candidate\?\.isConnected\)/)
  assert.match(source, /fallbackFocusRef\?: RefObject<HTMLElement \| null>/)
})

test("dialog close button is a translated ghost icon button that can be disabled", () => {
  const source = read("src/components/ui/dialog.tsx")
  assert.match(source, /closeLabel: closeLabelProp,/)
  assert.match(source, /const closeLabel = closeLabelProp \?\? tCommon\("close"\)/)
  assert.doesNotMatch(source, /"Close"|>\s*Close\s*</, "the X reads ปิด, and no button says Close")
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /disabled=\{closeDisabled\}/)
  // Button size icon is 44px below md and 36px from md (plan 2D-1), so the X needs no size classes of its own.
  assert.match(source, /<DialogPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/)
  // A ghost X has no box, so it gets none while the dialog is busy either; only its ink goes faint.
  assert.match(source, /className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">/)
  assert.doesNotMatch(source, /opacity-|sm:size-10/)
  assert.doesNotMatch(source, /dark:/)
})

test("dialog parts own padding, the footer bar and a busy-aware cancel", () => {
  const source = read("src/components/ui/accessible-dialog.tsx")
  assert.match(source, /export const accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"/)
  assert.match(source, /export function AccessibleDialogBody\(/)
  assert.match(source, /export function AccessibleDialogFooter\(/)
  assert.match(source, /export function AccessibleDialogCancel\(/)
  // The whole box rises above the iPhone home bar; the footer adds no padding of its own (I11).
  assert.match(source, /"top-auto bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] flex max-h-\[92dvh\] /)
  assert.doesNotMatch(source, /\bbottom-3\b/)
  // sm:px-5 would beat pr-16 and slide a long title under the X, so only the left padding grows.
  assert.match(source, /<DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-16 text-left sm:pl-5">/)
  // A flex column that still scrolls: children that skip the parts keep their height and scroll as before.
  assert.match(source, /<div data-slot="accessible-dialog-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto">/)
  assert.match(source, /<AccessibleDialogContext\.Provider value=\{\{ busy, onClose \}\}>\{children\}<\/AccessibleDialogContext\.Provider>/)
  assert.match(source, /data-slot="accessible-dialog-body" className=\{cn\("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5", className\)\}/)
  assert.match(source, /data-slot="accessible-dialog-footer"/)
  assert.match(source, /"flex shrink-0 flex-col gap-2 border-t border-border-soft bg-background px-4 py-3 first:border-t-0 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5"/)
  assert.doesNotMatch(source, /flex-col-reverse/)
  assert.match(source, /description\?: ReactNode/)
  assert.doesNotMatch(source, /closeLabel \?\? tCommon/, "the close label default lives in DialogContent")
  const cancel = source.match(/export function AccessibleDialogCancel\([\s\S]*?\n\}\n/)?.[0]
  assert.ok(cancel, "AccessibleDialogCancel not found")
  assert.match(cancel, /\}: Omit<ComponentProps<"button">, "type" \| "children"> & \{ children\?: ReactNode \}\) \{/)
  assert.match(cancel, /type="button" variant="outline" disabled=\{dialog\.busy \|\| disabled\} onClick=\{onClick \?\? dialog\.onClose\}/)
  assert.match(cancel, /\{children \?\? tCommon\("cancel"\)\}/)
  assert.match(cancel, /throw new Error\("AccessibleDialogCancel must be used inside <AccessibleDialog>"\)/)
  assert.doesNotMatch(cancel, /\bsize\b|\bbusy=/, "footer buttons keep the default size (K7), and cancel never spins")
})

test("dialog wrappers take a rich description and an optional close label", () => {
  const confirmText = read("src/components/ui/confirm-text-dialog.tsx")
  assert.match(confirmText, /\n  description\?: ReactNode\n/)
  assert.match(confirmText, /\n  closeLabel\?: string\n/)
  const review = read("src/components/ui/operation-review-dialog.tsx")
  assert.match(review, /\n  description: ReactNode\n/)
  assert.match(review, /\n  closeLabel\?: string\n/)
})

test("dialog primitives keep the primary action last on phones (K8)", () => {
  const dialog = read("src/components/ui/dialog.tsx")
  const footer = dialog.match(/function DialogFooter\([\s\S]*?\n\}\n/)?.[0]
  assert.ok(footer, "DialogFooter not found")
  assert.match(footer, /"flex flex-col gap-2 sm:flex-row sm:justify-end"/)
  assert.doesNotMatch(footer, /showCloseButton|DialogPrimitive\.Close/, "DialogFooter adds no button of its own")
  const alert = read("src/components/ui/alert-dialog.tsx")
  assert.match(alert, /"flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5"/)
  for (const path of ["src/components/ui/dialog.tsx", "src/components/ui/alert-dialog.tsx", "src/components/ui/accessible-dialog.tsx"]) {
    assert.doesNotMatch(read(path), /flex-col-reverse/, path)
  }
})

test("the settings prefix dialog renders inside the settings form, so it has no form or submit button of its own (P13, 1f)", () => {
  const source = read("src/components/admin/system-settings-form.tsx")
  const start = source.indexOf("<AccessibleDialog\n")
  const end = source.indexOf("</AccessibleDialog>", start)
  assert.ok(start !== -1 && end > start, "the prefix dialog")
  assert.ok(source.lastIndexOf("<form onSubmit={handleSubmit}", start) !== -1, "the dialog is written inside the settings <form>")
  const dialog = source.slice(start, end)
  // React sends a submit from the portal up the component tree: a <form> or a submit button here would save every setting.
  assert.doesNotMatch(dialog, /<form(?=[\s>])|type="submit"|\sform=/)
  assert.doesNotMatch(dialog, /closeLabel=/, "the X reads ปิด from tCommon(\"close\"), not ยกเลิก")
  assert.match(dialog, /<AccessibleDialogBody className="space-y-4">/)
  assert.match(dialog, /<AccessibleDialogFooter>\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\s*<Button onClick=\{applyPrefixEditor\}>/)
})
