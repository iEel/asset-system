import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("asset detail menu owns its dialogs outside the menu and returns focus to the trigger", () => {
  const menu = read("src/components/assets/asset-detail-action-menu.tsx")
  assert.match(menu, /<DropdownMenu modal=\{false\}>/)
  assert.match(menu, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?openingDialogRef\.current/)
  assert.equal(menu.match(/returnFocusRef=\{triggerRef\}/g)?.length, 3)
  assert.match(menu, /<\/DropdownMenu>\s*\{cancelTransaction/)
  assert.doesNotMatch(menu, /fixed inset-0|children/)

  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /<AssetDetailActionMenu\b[\s\S]*?\/>/)
  assert.doesNotMatch(page, /<\/AssetDetailActionMenu>/)
})

test("transaction cancel dialog can be opened by its owner without its own trigger", () => {
  const source = read("src/components/asset-operations/transaction-cancel-dialog.tsx")
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: \(\) => void openPreview\(\) \}\)\)/)
  assert.match(source, /hideTrigger \? null/)
  assert.match(source, /returnFocusRef=\{returnFocusRef\}/)
})

test("register row menus are Radix dropdowns and delete through the shared action", () => {
  const source = read("src/components/assets/asset-register-action-menus.tsx")
  assert.match(source, /<DropdownMenuContent/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`[,)]/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /<button\s+ref=\{triggerRef\}/)
  assert.match(source, /variant="destructive"/)
  assert.equal(source.match(/<DropdownMenuContent data-no-row-click/g)?.length, 2)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
})

test("topbar language and user menus are Radix dropdowns", () => {
  const source = read("src/components/layout/topbar.tsx")
  assert.ok((source.match(/<DropdownMenu\b/g)?.length ?? 0) >= 2)
  assert.doesNotMatch(source, /langMenuOpen|userMenuOpen/)
})

test("delete confirm returns focus to the menu trigger once the menu item is gone", () => {
  const dialog = read("src/components/ui/confirm-dialog.tsx")
  assert.match(dialog, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?\[restoreFocusRef\.current, [\s\S]*?returnFocusRef\?\.current\][\s\S]*?isConnected[\s\S]*?event\.preventDefault\(\)/)

  const queue = read("src/lib/confirm-queue.ts")
  assert.match(queue, /returnFocusRef\?: \{ current: HTMLElement \| null \}/)
  assert.doesNotMatch(queue, /from "react"/)

  const action = read("src/components/master-data/use-delete-action.ts")
  assert.match(action, /options\?: \{ returnFocusRef\?: \{ current: HTMLElement \| null \} \}/)
  assert.match(action, /returnFocusRef: options\?\.returnFocusRef/)
})
