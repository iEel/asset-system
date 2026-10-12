import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B plan 1 Task 7 (spec 2B §3.11, I5, §3.21): RowActions ช1 in src/components/ui/row-actions.tsx. The
// dropdown-menu.tsx is CRLF in the working tree (the new component is LF), so every source is read with \r stripped.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/ui/row-actions.tsx")

test("RowActions is a client component with one data-only API: no children, no outside trigger ref, no panel class (I5)", () => {
  const source = rowActions()
  assert.ok(source.startsWith('"use client"\n'), "the first line is the client directive")
  assert.match(source, /export function RowActions\(\{/)
  const props = source.match(/export type RowActionsProps = \{\n([\s\S]*?)\n\}/)?.[1]
  assert.ok(props, "export type RowActionsProps not found")
  assert.deepEqual(
    props.split("\n").map((line) => line.trim().split(":")[0]),
    ["code", "name?", "menuLabel", "next?", "groups", "deleteAction?", "openerRef?", "menu?", "className?"],
  )
  assert.match(props, /next\?: RowNextAction \| null/)
  assert.match(props, /deleteAction\?: \{ endpoint: string; label\?: string \}/)
  assert.match(props, /openerRef\?: RefObject<HTMLElement \| null>/)
  assert.match(props, /menu\?: "auto" \| "dropdown" \| "sheet"/)
  assert.match(source, /\| \{ label: string; href: string; icon\?: ReactNode; onNavigate\?: \(\) => void \}/)
  assert.match(source, /\| \{ label: string; onSelect: \(\) => void; icon\?: ReactNode \}/)
  assert.match(source, /\| \{ kind: "link"; key: string; label: string; href: string; icon\?: ReactNode; onNavigate\?: \(\) => void \}/)
  assert.match(source, /\| \{ kind: "action"; key: string; label: string; onSelect: \(\) => void; icon\?: ReactNode; destructive\?: boolean \}/)
  assert.match(source, /\| \{ kind: "unavailable"; key: string; label: string; reason: string; icon\?: ReactNode \}/)
  assert.match(source, /export type RowActionGroup = \{ key: string; label\?: string; items: readonly RowActionItem\[\] \}/)
  assert.doesNotMatch(source, /children|contentClassName/)
})

test("clicks on the actions, inside the menu and inside the sheet never open the row (R-m)", () => {
  const source = rowActions()
  assert.equal(source.match(/\bdata-no-row-click\b/g)?.length, 3)
  assert.match(source, /<div data-slot="row-actions" data-no-row-click onClick=\{stopPortalClick\} className=\{cn\("flex items-center justify-end gap-1 \[td>&\]:-my-1\.25", className\)\}>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click align="end" onCloseAutoFocus=\{keepDialogFocus\}>/)
  assert.match(source, /<SheetContent side="bottom" data-no-row-click className="max-h-\[85dvh\] gap-0 rounded-t-lg"/)
  // The sheet's scrim is outside the marked parts, so a click that comes up from a portal stops at RowActions.
  assert.match(source, /function stopPortalClick\(event: ReactMouseEvent<HTMLDivElement>\) \{\s*if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)\s*\}/)
})

test("the next button sits in a fixed 120px slot and reads its label with the row code (mockup .next-btn)", () => {
  const source = rowActions()
  assert.equal(
    source.match(/const rowNextClasses =\s*"([^"]+)"/)?.[1],
    "inline-flex min-h-11 w-30 shrink-0 items-center justify-start gap-1.5 rounded-control border border-transparent px-2.5 text-meta font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover hover:duration-0 group-hover/row:bg-primary-soft group-hover/row:text-primary-hover group-focus-within/row:bg-primary-soft group-focus-within/row:text-primary-hover group-has-[[aria-expanded=true]]/row:bg-primary-soft active:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0 [&_svg]:size-4 [&_svg]:shrink-0",
  )
  assert.match(source, /<span className="truncate">\{action\.label\}<\/span>\s*<span className="sr-only"> \{code\}<\/span>/)
  assert.match(source, /<Link href=\{action\.href\} onClick=\{action\.onNavigate\} className=\{rowNextClasses\}>/)
  assert.match(source, /onClick=\{\(event\) => openFromNext\(event\.currentTarget, onSelect\)\}/)
  assert.match(source, /function openFromNext\(button: HTMLElement, select: \(\) => void\) \{\s*if \(openerRef\) openerRef\.current = button\s*select\(\)\s*\}/)
  // undefined = no slot (phone rows) · null = an empty 120px slot, so ⋯ stays in its column.
  assert.match(source, /next === undefined \? null : next === null \? <span aria-hidden="true" className="w-30 shrink-0" \/> : renderNext\(next\)/)
})

test("⋯ is a ghost icon-sm button, a menu from md and a bottom sheet below, and leaves its place empty when there is nothing to show", () => {
  const source = rowActions()
  assert.match(source, /<Button ref=\{triggerRef\} variant="ghost" size="icon-sm" aria-label=\{menuLabel\} title=\{menuLabel\}>\s*<MoreHorizontal aria-hidden="true" \/>\s*<\/Button>/)
  assert.equal(source.match(/ref=\{triggerRef\}/g)?.length, 1)
  assert.match(source, /<DropdownMenuTrigger asChild>\{trigger\}<\/DropdownMenuTrigger>/)
  assert.match(source, /<SheetTrigger asChild>\{trigger\}<\/SheetTrigger>/)
  assert.match(source, /<DropdownMenu modal=\{false\}>/)
  assert.match(source, /useMediaQuery\("\(min-width: 48rem\)"\)/)
  assert.match(source, /const asSheet = menu === "sheet" \|\| \(menu === "auto" && !isDesktop\)/)
  assert.match(source, /const hasMenu = filled\.length > 0 \|\| Boolean\(deleteAction\)/)
  assert.match(source, /!hasMenu \? <span aria-hidden="true" className="w-11 shrink-0 md:w-8" \/> : asSheet \? renderSheet\(\) : renderDropdown\(\)/)
})

test("unavailable items say why, delete asks the shared confirm and returns focus to ⋯, dialogs open outside the menu", () => {
  const source = rowActions()
  // The same regexes plan 2B-3 moves from the register tests to this file (spec §7.17).
  assert.match(source, /<DropdownMenuItem\b[^>]*\bunavailable>/)
  assert.match(source, /<DropdownMenuItemDescription>\{[\w.]*reason\}<\/DropdownMenuItemDescription>/)
  assert.match(source, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /useDeleteAction\(deleteAction\?\.endpoint \?\? "", \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /<DropdownMenuItem variant="destructive" disabled=\{deleting\} onSelect=\{\(\) => void runDelete\(\)\}>\s*<Trash2 aria-hidden="true" \/>\s*\{deleteLabel\}/)
  assert.match(source, /const deleteLabel = deleteAction\?\.label \?\? tCommon\("delete"\)/)
  assert.match(source, /variant=\{item\.destructive \? "destructive" : "default"\} onSelect=\{\(\) => openFromMenu\(onSelect\)\}/)
  assert.match(source, /function openFromMenu\(select: \(\) => void\) \{\s*openingRef\.current = true\s*if \(openerRef\) openerRef\.current = triggerRef\.current\s*select\(\)\s*\}/)
  assert.match(source, /function keepDialogFocus\(event: Event\) \{\s*if \(!openingRef\.current\) return\s*openingRef\.current = false\s*event\.preventDefault\(\)\s*\}/)
  assert.equal(source.match(/onCloseAutoFocus=\{keepDialogFocus\}/g)?.length, 2, "the menu and the sheet both leave focus to the dialog")
  assert.doesNotMatch(source, /AccessibleDialog|ConfirmDialog|createPortal|addEventListener/)
})

test("the phone sheet shows the code as its title and uses the menu row look, with the chrome left to the Sheet primitive", () => {
  const source = rowActions()
  assert.match(source, /<SheetTitle>\s*<span className="tag font-medium">\{code\}<\/span>\s*<\/SheetTitle>/)
  assert.match(source, /\{name \? <SheetDescription className="truncate">\{name\}<\/SheetDescription> : null\}/)
  assert.match(source, /\{\.\.\.\(name \? \{\} : \{ "aria-describedby": undefined \}\)\}/)
  assert.match(source, /<div className="overflow-y-auto px-2 pt-1 pb-3">/)
  assert.match(source, /<div key=\{group\.key\} role="group" aria-labelledby=\{group\.label \? labelId : undefined\} className=\{cn\(index > 0 && "mt-1 border-t border-border-soft pt-1"\)\}>/)
  assert.match(source, /<p id=\{labelId\} className="px-2\.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">/)
  assert.match(source, /<ul className="grid gap-px">/)
  assert.match(source, /import \{[^}]*\bmenuItemClasses\b[^}]*\bmenuItemDestructiveClasses\b[^}]*\} from "@\/components\/ui\/dropdown-menu"/)
  assert.match(source, /const sheetItemClasses = cn\(menuItemClasses, menuItemDestructiveClasses, "w-full text-left"\)/)
  assert.match(source, /<div aria-disabled="true" className=\{sheetItemClasses\}>/)
  assert.match(source, /setSheetOpen\(false\)\s*openFromMenu\(onSelect\)/)
  assert.match(source, /data-variant="destructive"\s*aria-disabled=\{deleting \|\| undefined\}\s*onClick=\{\(\) => \{\s*if \(deleting\) return\s*setSheetOpen\(false\)\s*void runDelete\(\)/)
  assert.doesNotMatch(source, /closeLabel=|pr-14|pb-\[env|hover:bg-accent|opacity-|rounded-t-xl|size-8|size-11/)
  // The class rules every 2B primitive follows (spec §3.2).
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
})

test("dropdown-menu exports the two menu row class strings for the RowActions sheet", () => {
  const source = read("src/components/ui/dropdown-menu.tsx")
  assert.match(source, /^export const menuItemClasses =$/m)
  assert.match(source, /^export const menuItemDestructiveClasses =$/m)
  assert.equal(source.match(/^const menuItem(?:Destructive)?Classes =/gm), null)
})

test("the ⋯ name is common.moreActionsFor in both languages, worded like the register's ⋯ (I33)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).common
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).common
  assert.equal(th.moreActionsFor, "การดำเนินการของ {code}")
  assert.equal(en.moreActionsFor, "Actions for {code}")
})
