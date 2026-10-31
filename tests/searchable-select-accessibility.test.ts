import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = () => readFileSync("src/components/ui/searchable-select.tsx", "utf8").replace(/\r\n/g, "\n")

test("searchable select is a non-modal Radix popover with a cmdk listbox", () => {
  const source = read()
  assert.match(source, /<Popover modal=\{false\} open=\{open && !disabled\} onOpenChange=\{setOpenState\}>/)
  assert.match(source, /<Command shouldFilter=\{false\} loop/)
  assert.match(source, /filterSearchableOptions\(options, query\)/)
  assert.match(source, /w-\(--radix-popover-trigger-width\)/)
  assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled \|\| current\}/)
  assert.doesNotMatch(source, /document\.addEventListener|searchable-select-navigation/)
})

test("an open searchable select hides nothing from a screen reader, and an empty result is no listbox (e2e decision DX4 (ก): AR3)", () => {
  const source = read()
  // Not modal: Radix neither aria-hides the page nor traps focus, the WAI-ARIA combobox pattern (axe aria-hidden-focus).
  assert.doesNotMatch(source, /<Popover modal[ >]/)
  // cmdk's List is always role="listbox": it is hidden (out of the accessibility tree, its id kept for the input's
  // aria-controls) while no option matches, and the empty line sits outside it (axe aria-required-children).
  const list = source.slice(source.indexOf("<CommandList"), source.indexOf("</CommandList>"))
  assert.match(list, /^<CommandList className="max-h-64" hidden=\{filteredOptions\.length === 0\}>/)
  assert.doesNotMatch(list, /<CommandEmpty/)
  const command = source.slice(source.indexOf("<Command shouldFilter"), source.indexOf("</Command>"))
  assert.match(command, /<CommandEmpty>\{emptyLabel\}<\/CommandEmpty>\n\s*<CommandList/)
  // Keyboard: cmdk keeps the arrows and Enter on the Command; Escape and a choice close the popover through Radix,
  // which returns focus to the trigger (setOpenState(false) on select).
  assert.match(source, /function selectValue\(nextValue: string\) \{\n\s*onChange\(nextValue\)\n\s*setOpenState\(false\)\n\s*\}/)
  assert.doesNotMatch(source, /onCloseAutoFocus|onEscapeKeyDown/)
  // Inside a modal dialog or sheet, the dialog's scroll lock cancels a wheel or touch scroll outside it, and the list is
  // portalled outside it: the list's own scroll stops there and goes no further.
  assert.match(source, /addEventListener\("wheel", stopScrollLock, \{ passive: true \}\)/)
  assert.match(source, /addEventListener\("touchmove", stopScrollLock, \{ passive: true \}\)/)
  assert.match(source, /<PopoverContent ref=\{keepOwnScroll\} /)
})

test("the current value is marked after its label and cannot be picked; the search still reads the label alone (group 3 plan 3, P3-R11, P3-R4)", () => {
  const source = read()
  for (const part of [
    "currentValue?: string",
    "currentMark?: string",
    "const markCurrent = Boolean(currentValue && currentMark)",
    "const current = markCurrent && option.id === currentValue",
    "disabled={option.disabled || current}",
    "data-searchable-current={current || undefined}",
    '{current ? <span className="shrink-0 text-meta text-muted-foreground">{currentMark}</span> : null}',
    "const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query])",
  ]) assert.ok(source.includes(part), part)
  // The word is drawn beside the label, never joined to it: the filter reads the caller's options as given, so typing
  // ตอนนี้ finds nothing and a code or a name still finds the current option.
  assert.doesNotMatch(source, /label: [^\n]*currentMark|\$\{currentMark\}|currentMark \+|\+ currentMark/)
  // cmdk gives a disabled item aria-disabled and calls no onSelect for it, so the current value is never sent as a change.
  assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled \|\| current\}[\s\S]*?onSelect=\{\(\) => selectValue\(option\.id\)\}/)
  // Docs: DESIGN.md's command lists and docs/14's SearchableSelect row name the props.
  assert.ok(readFileSync("DESIGN.md", "utf8").includes("passes `currentValue` and `currentMark`"), "DESIGN.md")
  const row = readFileSync("docs/14_UI_UX_DESIGN_SYSTEM.md", "utf8").split(/\r?\n/).find((line) => line.startsWith("| A searchable picker | `SearchableSelect` |"))
  assert.ok(row?.includes("`currentValue` with `currentMark`"), "docs/14")
})

test("a visually hidden label stays the trigger's name: FieldLabel visuallyHidden, never dropped (group 3 plan 3, P3-R11, P3-R17)", () => {
  const source = read()
  assert.ok(source.includes("labelVisuallyHidden?: boolean"), "the prop")
  assert.match(source, /\{label \? \(\n\s+<FieldLabel id=\{labelId\} htmlFor=\{triggerId\} required=\{required\} visuallyHidden=\{labelVisuallyHidden\}>\n\s+\{label\}\n\s+<\/FieldLabel>\n\s+\) : null\}/)
  // The trigger is still named "<label> <value>", so E2E finds ผู้ถือครองปลายทาง by /^ผู้ถือครองปลายทาง/.
  assert.match(source, /aria-labelledby=\{label \? `\$\{labelId\} \$\{valueId\}` : undefined\}/)
  // sr-only keeps the label in the accessibility tree and off screen; the prop never removes it.
  assert.match(readFileSync("src/components/ui/field.tsx", "utf8"), /visuallyHidden && "sr-only"/)
  assert.doesNotMatch(source, /!labelVisuallyHidden|labelVisuallyHidden \?|labelVisuallyHidden &&/)
  assert.ok(readFileSync("DESIGN.md", "utf8").includes("`labelVisuallyHidden` keeps the label for screen readers only"), "DESIGN.md")
  const row = readFileSync("docs/14_UI_UX_DESIGN_SYSTEM.md", "utf8").split(/\r?\n/).find((line) => line.startsWith("| A searchable picker | `SearchableSelect` |"))
  assert.ok(row?.includes("`labelVisuallyHidden`"), "docs/14")
})
