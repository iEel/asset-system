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
  assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled\}/)
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
