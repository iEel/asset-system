import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const dropdown = () => read("src/components/ui/dropdown-menu.tsx")
const command = () => read("src/components/ui/command.tsx")

// The classes of a named class-string constant, such as `const menuItemClasses = "…"`.
function classesOf(source: string, name: string): Set<string> {
  const value = source.match(new RegExp(`const ${name} =\\s*"([^"]+)"`))?.[1]
  assert.ok(value, `${name} not found`)
  return new Set(value.split(" "))
}

function assertHasClasses(classes: Set<string>, expected: string[], label: string) {
  assert.deepEqual(expected.filter((name) => !classes.has(name)), [], `${label} is missing classes`)
}

// The source of one top-level function, up to the line that holds only its closing brace.
function functionSource(source: string, name: string): string {
  const body = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}\\n`))?.[0]
  assert.ok(body, `function ${name} not found`)
  return body
}

test("the tokens the menus use exist, so Tailwind generates their CSS", () => {
  // Without them rounded-control, text-meta, text-faint-foreground and bg-border-soft produce no CSS, silently.
  const css = read("src/app/globals.css")
  assert.match(css, /--radius-control: 6px;/)
  assert.match(css, /--text-meta: 0\.8125rem;/)
  assert.match(css, /--color-faint-foreground: var\(--faint-foreground\);/)
  assert.match(css, /--color-border-soft: var\(--border-soft\);/)
})

test("menu panels have 12px corners, 6px padding, a 240px minimum and fade-and-slide motion", () => {
  const source = dropdown()
  assertHasClasses(
    classesOf(source, "menuPanelClasses"),
    [
      "grid",
      "gap-px",
      "min-w-60",
      "rounded-lg",
      "border",
      "bg-popover",
      "p-1.5",
      "shadow-overlay",
      "outline-none",
      "duration-160",
      "ease-out",
      "data-[state=open]:fade-in-0",
      "data-[side=bottom]:slide-in-from-top-1",
      "data-[side=top]:slide-in-from-bottom-1",
      "data-[state=closed]:fade-out-0",
      "data-[state=closed]:duration-100",
      "motion-reduce:animate-none!",
    ],
    "menuPanelClasses",
  )
  assert.equal(source.match(/className=\{cn\(menuPanelClasses, className\)\}/g)?.length, 2, "DropdownMenuContent and DropdownMenuSubContent share the panel")
})

test("menu items are 36px from md up and 44px below, highlight with primary-soft and draw focus inside the row", () => {
  const source = dropdown()
  const item = classesOf(source, "menuItemClasses")
  assertHasClasses(
    item,
    [
      "min-h-11",
      "md:min-h-9",
      "cursor-pointer",
      "gap-2.5",
      "rounded-control",
      "px-2.5",
      "py-1.5",
      "text-sm",
      "transition-colors",
      "focus:bg-primary-soft",
      "focus:duration-0",
      "focus-visible:-outline-offset-2",
      "active:bg-muted",
      "aria-disabled:cursor-not-allowed",
      "aria-disabled:bg-transparent",
      "aria-disabled:text-faint-foreground",
      "aria-disabled:*:[svg]:text-faint-foreground!",
    ],
    "menuItemClasses",
  )
  assert.equal(item.has("outline-hidden"), false, "the base focus outline must show on keyboard focus")
  assertHasClasses(
    classesOf(source, "menuItemDestructiveClasses"),
    [
      "data-[variant=destructive]:not-aria-disabled:text-danger",
      "data-[variant=destructive]:not-aria-disabled:focus:bg-danger-soft",
      "data-[variant=destructive]:not-aria-disabled:*:[svg]:text-danger!",
    ],
    "menuItemDestructiveClasses",
  )
  assert.match(functionSource(source, "DropdownMenuItem"), /className=\{cn\(menuItemClasses, menuItemDestructiveClasses, className\)\}/)
  for (const name of ["DropdownMenuCheckboxItem", "DropdownMenuRadioItem", "DropdownMenuSubTrigger"]) {
    assert.match(functionSource(source, name), /className=\{cn\(menuItemClasses, /, name)
  }
})

test("an unavailable item stays focusable, says why, and cannot be chosen", () => {
  const source = dropdown()
  assert.match(
    source,
    /const unavailableItemProps = \{\s*"aria-disabled": true,\s*"data-unavailable": "",\s*onSelect: \(event: Event\) => event\.preventDefault\(\),\s*\} as const/,
  )
  assert.match(source, /\| \{ unavailable: true; asChild\?: never; onSelect\?: never \}/, "the type forbids asChild and onSelect")
  const item = functionSource(source, "DropdownMenuItem")
  assert.match(item, /\{\.\.\.props\}\s*\{\.\.\.\(unavailable \? unavailableItemProps : \{\}\)\}/, "the unavailable props come after the caller's props")
  assert.doesNotMatch(item, /data-disabled|\bdisabled[=:]/, "Radix skips disabled items for arrow keys and typeahead")
  assert.match(functionSource(source, "DropdownMenuItemText"), /"grid min-w-0 flex-1"/)
  assert.match(functionSource(source, "DropdownMenuItemDescription"), /"text-meta text-faint-foreground"/)
  const exported = source.slice(source.lastIndexOf("export {"))
  for (const name of ["DropdownMenuItemText", "DropdownMenuItemDescription"]) {
    assert.match(exported, new RegExp(`\\b${name},`), name)
  }
})

test("check boxes sit in front of the text and the chosen radio has a check at the end", () => {
  const source = dropdown()
  const checkbox = functionSource(source, "DropdownMenuCheckboxItem")
  assert.match(checkbox, /"flex size-4 shrink-0 items-center justify-center rounded-sm border-\[1\.5px\]"/)
  assert.match(checkbox, /!on && "border-input bg-surface"/)
  assert.match(checkbox, /on && !disabled && "border-primary bg-primary"/)
  assert.match(checkbox, /on && disabled && "border-border bg-muted"/)
  assert.match(checkbox, /<CheckIcon strokeWidth=\{3\} className=\{cn\("size-3", disabled \? "text-muted-foreground" : "text-primary-foreground"\)\} \/>/)
  const radio = functionSource(source, "DropdownMenuRadioItem")
  assert.match(radio, /\{children\}\s*<DropdownMenuPrimitive\.ItemIndicator className="ml-auto flex">\s*<CheckIcon className="size-4 text-primary" \/>/)
  for (const body of [checkbox, radio]) {
    assert.match(body, /"data-\[state=checked\]:font-medium"/)
    assert.doesNotMatch(body, /absolute|pl-8/)
  }
  assert.doesNotMatch(source, /CircleIcon/)
})

test("labels, separators and trailing text follow the mockup", () => {
  const source = dropdown()
  assert.match(functionSource(source, "DropdownMenuLabel"), /"px-2\.5 pt-1\.5 pb-1 text-xs font-medium text-muted-foreground data-\[inset\]:pl-9"/)
  assert.match(functionSource(source, "DropdownMenuSeparator"), /"mx-1 my-\[5px\] h-px bg-border-soft"/)
  assert.match(functionSource(source, "DropdownMenuShortcut"), /"ml-auto pl-3 whitespace-nowrap text-meta text-faint-foreground"/)
  assert.doesNotMatch(source, /tracking-widest/)
})

test("menu, popover and command primitives use no opacity, zoom, see-through tint or the old sm breakpoint", () => {
  for (const path of ["src/components/ui/dropdown-menu.tsx", "src/components/ui/popover.tsx", "src/components/ui/command.tsx"]) {
    const source = read(path)
    assert.doesNotMatch(source, /opacity-50|zoom-(?:in|out)|sm:min-h-9|(?:bg|text|border)-[a-z-]+\/\d+/, path)
  }
  assert.match(read("src/components/ui/popover.tsx"), /rounded-lg border bg-popover p-4 [^"]*shadow-overlay [^"]*motion-reduce:animate-none!/)
})

test("the command panel matches the menus, and its search box is 16px below md with the shared placeholder color", () => {
  const source = command()
  assert.match(functionSource(source, "Command"), /"flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground"/)
  const input = functionSource(source, "CommandInput")
  assert.match(input, /"mx-1\.5 mt-1\.5 mb-1 flex h-11 items-center gap-2 rounded-control border border-border bg-background px-2\.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus md:h-9"/)
  assert.match(input, /<SearchIcon className="size-4 shrink-0 text-faint-foreground" \/>/)
  assert.match(input, /\btext-base\b[^"]*\bmd:text-sm\b/, "iOS Safari zooms into fields under 16px (I8)")
  assert.doesNotMatch(input, /placeholder:/, "the ::placeholder base rule colors the placeholder (I7)")
  const item = functionSource(source, "CommandItem")
  assert.match(item, /min-h-11 [^"]*md:min-h-9/)
  assert.match(item, /data-\[selected=true\]:bg-primary-soft/)
  assert.match(item, /data-\[disabled=true\]:text-faint-foreground/)
  assert.match(functionSource(source, "CommandEmpty"), /"px-2\.5 py-4 text-center text-meta text-faint-foreground"/)
  assert.doesNotMatch(source, /CommandDialog|Command Palette|components\/ui\/dialog/)
})

test("Kbd works in server components and uses the sans font", () => {
  assert.ok(existsSync("src/components/ui/kbd.tsx"))
  const source = read("src/components/ui/kbd.tsx")
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /export function Kbd\(\{ className, \.\.\.props \}: React\.ComponentProps<"kbd">\)/)
  assert.match(source, /"inline-flex h-5 items-center rounded-sm border border-border bg-surface px-1\.5 font-sans text-xs leading-4 font-medium whitespace-nowrap text-muted-foreground"/)
})

test("searchable select marks the chosen option with weight and a trailing check", () => {
  const source = read("src/components/ui/searchable-select.tsx")
  assert.match(source, /className=\{option\.id === value \? "font-medium" : undefined\}/)
  assert.match(source, /<span className="min-w-0 truncate">\{option\.label\}<\/span>\s*\{option\.id === value \? <Check className="ml-auto size-4 text-primary" aria-hidden="true" \/> : null\}/)
  assert.doesNotMatch(source, /text-transparent/)
})
