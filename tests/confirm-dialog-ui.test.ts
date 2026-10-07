import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

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
