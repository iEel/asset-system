import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("sheet close button is a translated ghost icon button", () => {
  const source = read("src/components/ui/sheet.tsx")
  assert.match(source, /closeLabel: closeLabelProp,/)
  assert.match(source, /const closeLabel = closeLabelProp \?\? tCommon\("close"\)/)
  assert.doesNotMatch(source, /"Close"|>\s*Close\s*</, "the X reads ปิด, and no button says Close")
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /<SheetPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/)
  // The sheet is white now, so the ghost hover fill (background) shows without a sheet-only hover class (I10).
  assert.match(source, /title=\{closeLabel\} className="absolute top-3 right-3">/)
  assert.doesNotMatch(source, /opacity-|sm:size-10|hover:bg-muted|closeDisabled/)
  assert.doesNotMatch(source, /dark:/)
})

test("sheets are white, pad the iOS home bar and share one header", () => {
  const source = read("src/components/ui/sheet.tsx")
  assert.match(source, /"fixed z-50 flex flex-col gap-4 bg-surface shadow-overlay /)
  assert.doesNotMatch(source, /\bbg-background\b/)
  assert.match(source, /side === "bottom" &&\s*"inset-x-0 bottom-0 h-auto border-t pb-\[env\(safe-area-inset-bottom\)\] data-\[state=closed\]:slide-out-to-bottom/)
  // py-4 makes the header 56px, the height of the 44px X at top-3; pr-16 keeps the title clear of it.
  assert.match(source, /data-slot="sheet-header"\s*className=\{cn\("flex shrink-0 flex-col gap-1\.5 border-b border-border px-4 py-4 pr-16", className\)\}/)
  assert.match(source, /data-slot="sheet-title"\s*className=\{cn\("text-base font-semibold text-foreground", className\)\}/)
  // SheetFooter's only caller is 2B's filter sheet; it stays as it is.
  assert.match(source, /data-slot="sheet-footer"\s*className=\{cn\("mt-auto flex flex-col gap-2 p-4", className\)\}/)
})

test("activity and evidence drawers are Radix sheets that can be opened from outside", () => {
  for (const path of ["src/components/ui/activity-drawer.tsx", "src/components/assets/asset-evidence-drawer.tsx"]) {
    const source = read(path)
    assert.match(source, /<SheetContent[\s\S]*?side="right"/, path)
    assert.match(source, /controlledOpen \?\? uncontrolledOpen/, path)
    assert.match(source, /hideTrigger/, path)
    assert.match(source, /returnFocusRef\?\.current/, path)
    assert.doesNotMatch(source, /fixed inset-0|aria-label="Close"/, path)
  }
})

test("evidence drawer keeps its wide panel", () => {
  assert.match(read("src/components/assets/asset-evidence-drawer.tsx"), /sm:max-w-2xl/)
})

test("mobile navigation drawer is a left sheet; desktop sidebar stays static", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(sidebar, /<SheetContent[\s\S]*?side="left"[\s\S]*?id="mobile-primary-navigation-drawer"/)
  assert.match(sidebar, /<SheetTitle className="sr-only">/)
  assert.match(sidebar, /hidden[^"]*lg:flex/)
  assert.doesNotMatch(shell, /fixed inset-0 z-30 bg-black\/50|addEventListener\("keydown"/)
})

test("mobile navigation sheet returns focus to whatever opened it", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /onOpenAutoFocus=\{\(\) => \{\s*mobileRestoreFocusRef\.current = document\.activeElement instanceof HTMLElement \? document\.activeElement : null/)
  assert.match(sidebar, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?isConnected[\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})

// Phase 2C batch 4 (spec 2C §5.8 row asset-evidence-drawer.tsx, O14, §5.11 table B row I): the drawer takes the
// sheet's own header, X name and white fill; its sub-line is the sheet's description, and an empty filter shows the
// shared one-line EmptyNote instead of a dashed box.
test("the evidence drawer uses the sheet header, its description and EmptyNote when a filter is empty (2C batch 4)", () => {
  const source = read("src/components/assets/asset-evidence-drawer.tsx")
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{labels\.title\}<\/SheetTitle>\n\s+<SheetDescription>\{labels\.triggerLabel\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
  assert.match(source, /className="w-full gap-0 p-0 sm:max-w-2xl"/)
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /closeLabel=|aria-describedby=|border-dashed|bg-surface|useTranslations/)
})

// Phase 2C batch 4 (spec 2C §5.8 row ui/activity-drawer.tsx, O14, §5.11 table B row I): the same sheet chrome. The
// drawer has no description, so it keeps aria-describedby={undefined}; an empty list is the shared EmptyNote.
test("the activity drawer uses the sheet header and X, and EmptyNote for an empty list (2C batch 4)", () => {
  const source = read("src/components/ui/activity-drawer.tsx")
  assert.match(source, /side="right"\n\s+aria-describedby=\{undefined\}\n\s+onCloseAutoFocus=/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<\/SheetHeader>/)
  assert.match(source, /className="w-full gap-0 p-0 sm:max-w-md"/)
  assert.match(source, /\{items\.length === 0 \? \(\n\s+<EmptyNote>\{emptyLabel\}<\/EmptyNote>\n\s+\) : \(/)
  assert.doesNotMatch(source, /closeLabel=|border-dashed|bg-surface|useTranslations/)
})
