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

test("register row menus are Radix overlays and delete through the shared action", () => {
  // Plan 2B-3 Task 2 (spec 2B I5): the register's ⋯ menu, phone sheet and delete live in the shared RowActions now.
  const source = read("src/components/ui/row-actions.tsx")
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /ref=\{triggerRef\}/)
  assert.match(source, /variant="destructive"/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
  // A blocked transaction stays reachable by arrow keys and reads its reason (spec 5.4).
  assert.match(source, /<DropdownMenuItem\b[^>]*\bunavailable>/)
  assert.match(source, /<DropdownMenuItemDescription>\{[\w.]*reason\}<\/DropdownMenuItemDescription>/)
  assert.doesNotMatch(source, /disabled className="items-start"|<DropdownMenuLabel className=/)
  const wrapper = read("src/components/assets/asset-register-row-actions.tsx")
  assert.match(wrapper, /kind: "unavailable"[\s\S]*?reason: reasonOf\(transaction\)/)
  assert.doesNotMatch(wrapper, /<DropdownMenu|<Sheet|triggerRef|AssetDeleteButton/, "the wrapper renders no menu of its own")
})

test("topbar language menu is a Radix dropdown", () => {
  const source = read("src/components/layout/topbar.tsx")
  assert.ok((source.match(/<DropdownMenu\b/g)?.length ?? 0) >= 1)
  assert.doesNotMatch(source, /langMenuOpen|userMenuOpen/)
  // The language menu is a radio group; each language is named in its own language, with no flag.
  assert.match(source, /<DropdownMenuRadioGroup value=\{locale\}/)
  assert.match(source, /<span lang="th">ภาษาไทย<\/span>/)
  assert.match(source, /<span lang="en">English<\/span>/)
  // Accessible names come from messages and contain the text shown on the button (WCAG 2.5.3).
  assert.match(source, /aria-label=\{tNav\("languageMenu", \{ code: localeCode \}\)\}/)
  for (const path of ["src/components/layout/topbar.tsx", "src/components/layout/sidebar.tsx", "src/components/layout/mobile-more-sheet.tsx"]) {
    assert.doesNotMatch(read(path), /(?:aria-label|title)="[A-Z]/, path)
  }
  for (const locale of ["th", "en"] as const) {
    const nav = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).nav
    for (const key of ["openMenu", "collapseSidebar", "expandSidebar", "languageMenu", "userMenu"]) {
      assert.equal(typeof nav[key], "string", `${locale} nav.${key}`)
    }
    assert.match(nav.languageMenu, /\{code\}/, locale)
    assert.match(nav.userMenu, /\{name\}/, locale)
  }
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

test("notification bell is a Radix popover", () => {
  const source = read("src/components/layout/notification-bell.tsx")
  assert.match(source, /<Popover open=\{open\} onOpenChange=\{setOpen\}>/)
  assert.match(source, /<PopoverContent[\s\S]*?align="end"/)
})
