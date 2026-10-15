import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, jsxAttrValue } from "./helpers/source-files.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("confirm provider renders an alert dialog and settles by request id", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/alert-dialog"/)
  assert.match(source, /settleConfirm\(queueRef\.current, id\)/)
  assert.match(source, /<AlertDialogCancel[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, false\)/)
  assert.match(source, /<AlertDialogAction[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, true\)/)
  assert.match(source, /variant=\{current\.tone === "destructive" \? "destructive" : "default"\}/)
  assert.match(source, /onOpenAutoFocus=\{\(\) => \{\s*restoreFocusRef\.current = document\.activeElement instanceof HTMLElement/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?restoreFocusRef\.current[\s\S]*?event\.preventDefault\(\)/)
  assert.match(source, /throw new Error\("useConfirm must be used inside <ConfirmProvider>"\)/)
})

test("dashboard shell mounts one confirm provider", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /<ConfirmProvider>/)
})

test("deletes report a delete, not a save", () => {
  for (const path of [
    "src/components/master-data/use-delete-action.ts",
    "src/components/assets/asset-attachments.tsx",
    "src/components/assets/asset-purchase-documents.tsx",
    "src/components/disposal/disposal-attachments.tsx",
    "src/components/master-data/asset-model-form.tsx",
    "src/components/maintenance/maintenance-attachments.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /tCommon\("deletedSuccess"\)/, path)
    assert.match(source, /tone: "destructive"/, path)
  }
  assert.match(read("src/components/master-data/master-data-delete-button.tsx"), /useDeleteAction\(endpoint\)/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.common.deletedSuccess, "ลบแล้ว")
  assert.equal(en.common.deletedSuccess, "Deleted")
})

// Phase 2C batch 5 (spec 2C §5.9, §5.11 F, K12, K8): a confirm looks like the other dialogs: white, above the iPhone
// home bar on phones and centered from sm, a 16px left-aligned title over the header line, and a grey footer band with
// cancel first and the action last. The size variants and AlertDialogMedia (no caller) are gone.
test("confirm dialogs look like the other dialogs (K12)", () => {
  const source = read("src/components/ui/alert-dialog.tsx")
  assert.match(source, /"fixed left-\[50%\] z-50 flex max-h-\[92dvh\] w-\[calc\(100%-1\.5rem\)\] translate-x-\[-50%\] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-overlay [^"]*sm:max-w-lg motion-reduce:animate-none!",\n\s+"bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] sm:top-\[50%\] sm:bottom-auto sm:translate-y-\[-50%\]",/)
  assert.match(source, /"flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5"/)
  assert.match(source, /"flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5"/)
  assert.match(source, /"text-base font-semibold text-foreground"/)
  assert.match(source, /cn\("text-sm text-muted-foreground", className\)/)
  assert.doesNotMatch(source, /flex-col-reverse|data-\[size=|data-size|AlertDialogMedia|group\/alert-dialog-content|place-items-center|\bp-6\b|size\?: "default" \| "sm"/)
})

// Phase 2C batch 5 (spec 2C §5.9, K8, K12): the confirm provider itself does not change. Cancel comes before the
// action in the DOM (phones stack cancel on top and the action last), its parts take no class or size of their own
// (the AlertDialog look applies), and the action reads the caller's verb, "ยืนยัน" only when a caller gives none.
test("the confirm provider puts cancel first and the caller's verb last, on the plain AlertDialog parts (K8, K12)", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.ok(source.indexOf("<AlertDialogCancel") < source.indexOf("<AlertDialogAction"), "cancel first, the action last (K8)")
  assert.match(source, /\{current\.cancelLabel \?\? tCommon\("cancel"\)\}/)
  assert.match(source, /\{current\.confirmLabel \?\? tCommon\("confirm"\)\}/)
  const parts = findJsxTags(source, ["AlertDialog\\w*"])
  assert.equal(parts.length, 8, "AlertDialog, Content, Header, Title, Description, Footer, Cancel, Action")
  assert.deepEqual(
    parts.filter((tag) => jsxAttrValue(tag.text, "className") !== null || jsxAttrValue(tag.text, "size") !== null).map((tag) => tag.name),
    [],
    "the parts carry the look (K12)",
  )
})
