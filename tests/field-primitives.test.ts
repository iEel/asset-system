import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkboxVariants, fieldControlVariants, fieldReadOnlyClasses, textareaClasses } from "../src/components/ui/field-variants.ts"
import { getFieldControlClasses } from "../src/lib/design-system.ts"
import { cn } from "../src/lib/utils.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const classList = (value: string) => value.split(/\s+/).filter(Boolean)

test("fields share one look: input border, white fill, 8px corners and 44px below md", () => {
  const field = fieldControlVariants()
  for (const name of ["w-full", "min-w-0", "rounded-md", "border", "border-input", "bg-surface", "px-3", "text-foreground", "outline-none", "h-11", "text-base", "md:h-10", "md:text-sm", "motion-reduce:transition-none"]) {
    assert.ok(classList(field).includes(name), `fieldControlVariants() is missing ${name}`)
  }
  // Corners follow the mockup (spec I15): fields are 8px; rounded-control (6px) is for small controls only.
  assert.doesNotMatch(field, /opacity|hover:|read-only:|placeholder:|rounded-control|\bsm:/)
  assert.equal(fieldControlVariants({ fieldSize: "lg" }), field, "lg (40px) is the default size")
})

test("focus, error and disabled use the single ring color and no opacity", () => {
  const field = fieldControlVariants()
  assert.match(field, /focus:border-ring focus:ring-1 focus:ring-ring focus:shadow-field-focus/)
  assert.match(field, /aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger aria-invalid:shadow-field-error/)
  // aria-* comes after focus in Tailwind's variant order, so a focused invalid field needs this row to get the teal ring back.
  assert.match(field, /aria-invalid:focus:border-ring aria-invalid:focus:ring-ring aria-invalid:focus:shadow-field-focus/)
  assert.doesNotMatch(field, /focus:(?:border|ring)-danger/)
  assert.match(field, /disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground/)
})

test("field sizes switch at md like the buttons, and the scan field keeps 16px text everywhere", () => {
  assert.match(fieldControlVariants({ fieldSize: "md" }), /\bh-11 text-base md:h-9 md:text-sm\b/)
  assert.match(fieldControlVariants({ fieldSize: "lg" }), /\bh-11 text-base md:h-10 md:text-sm\b/)
  const xl = fieldControlVariants({ fieldSize: "xl" })
  assert.match(xl, /\bh-12 text-base\b/)
  assert.doesNotMatch(xl, /md:text-sm|md:h-/, "iOS zooms into a field whose text is under 16px")
})

test("getFieldControlClasses is the field recipe, and callers change height through fieldSize", () => {
  assert.equal(getFieldControlClasses(), fieldControlVariants())
  assert.equal(getFieldControlClasses({ fieldSize: "xl" }), fieldControlVariants({ fieldSize: "xl" }))
  assert.doesNotMatch(getFieldControlClasses(), /select-chevron|read-only:/, "the helper also styles inputs and button triggers")
  // An h-12 override cannot beat md:h-10, which is why the audit scan field passes fieldSize "xl" instead.
  const scan = classList(cn(getFieldControlClasses({ fieldSize: "xl" }), "pl-9 pr-24"))
  for (const name of ["h-12", "text-base", "pl-9", "pr-24"]) assert.ok(scan.includes(name), `scan field is missing ${name}`)
  assert.deepEqual(scan.filter((name) => name.startsWith("md:")), [])
})

test("textarea, read-only and checkbox helpers", () => {
  assert.match(textareaClasses, /\bborder-input\b/)
  assert.match(textareaClasses, /\bbg-surface\b/)
  assert.match(textareaClasses, /\brounded-md\b/)
  assert.match(textareaClasses, /min-h-24 py-2 text-base md:text-sm resize-y$/)
  assert.doesNotMatch(textareaClasses, /\bh-1[0-2]\b|read-only:/)
  assert.equal(fieldReadOnlyClasses, "read-only:border-border read-only:bg-background")
  assert.equal(checkboxVariants(), "shrink-0 cursor-pointer disabled:cursor-not-allowed size-4")
  assert.match(checkboxVariants({ size: "lg" }), /\bsize-5$/)
  assert.doesNotMatch(checkboxVariants({ size: "lg" }), /outline-none|rounded|border/, "native boxes take accent-color and the base focus outline")
})

const primitiveFiles = ["field-variants.ts", "input.tsx", "textarea.tsx", "native-select.tsx", "field.tsx", "search-field.tsx"].map((name) => `src/components/ui/${name}`)

test("field primitives work in server components", () => {
  for (const path of primitiveFiles) {
    assert.doesNotMatch(read(path), /"use client"|\buse(?:State|Effect|LayoutEffect|Context)\b|\bcreateContext\b/, path)
  }
  assert.doesNotMatch(read("src/components/ui/field-variants.ts"), /from "@\//, "tests and design-system.ts import this file without the @/ alias")
})

test("Input and NativeSelect take fieldSize, never the HTML size attribute", () => {
  const input = read("src/components/ui/input.tsx")
  assert.match(input, /Omit<React\.ComponentProps<"input">, "size" \| "type"> & \{ fieldSize\?: FieldSize; type\?: InputType \}/)
  assert.match(input, /cn\(fieldControlVariants\(\{ fieldSize \}\), fieldReadOnlyClasses, /)
  assert.match(input, /\["number", "date", "datetime-local", "time"\]/)
  const select = read("src/components/ui/native-select.tsx")
  assert.match(select, /Omit<React\.ComponentProps<"select">, "size" \| "multiple"> & \{ fieldSize\?: FieldSize \}/)
  assert.match(select, /"select-chevron cursor-pointer pr-9"/)
  assert.doesNotMatch(select, /fieldReadOnlyClasses/, ":read-only always matches a <select>")
  assert.match(read("src/components/ui/textarea.tsx"), /cn\(textareaClasses, fieldReadOnlyClasses, className\)/)
})

test("Field wires label, hint and error to its control without starting browser validation", () => {
  const field = read("src/components/ui/field.tsx")
  assert.match(field, /htmlFor=\{controlId\}/)
  assert.match(field, /<span aria-hidden="true" className="ml-1 text-warning">\*<\/span>/)
  assert.match(field, /"aria-required": true/)
  assert.match(field, /"aria-invalid": true/)
  assert.match(field, /role="alert"/)
  assert.match(field, /\[element\?\.props\["aria-describedby"\], errorId, hintId\]/, "the error is read before the hint")
  assert.match(field, /React\.cloneElement\(element, control\)/)
  assert.match(field, /visuallyHidden && "sr-only"/)
  assert.doesNotMatch(field, /\brequired(?::|=)\s*(?:true|\{true\})/, "a real required attribute would start the browser's own validation")
})

test("SearchField hides the WebKit clear button and keeps its spinner still for reduced motion", () => {
  const source = read("src/components/ui/search-field.tsx")
  assert.match(source, /type = "search"/)
  assert.match(source, /"pl-9 \[&::-webkit-search-cancel-button\]:appearance-none"/)
  assert.match(source, /<Loader2 className="size-4 animate-spin motion-reduce:animate-none" \/>/)
  assert.match(source, /<button type="button" aria-label=\{clearLabel\} onClick=\{onClear\}/)
  assert.match(source, /trailingCount === 1 && "pr-12", trailingCount === 2 && "pr-24"/)
})

test("SearchableSelect uses the field look, a real label, and announces the chosen value", () => {
  const source = read("src/components/ui/searchable-select.tsx")
  assert.match(source, /<FieldLabel id=\{labelId\} htmlFor=\{triggerId\} required=\{required\}>/)
  const trigger = source.match(/fieldControlVariants\(\{ fieldSize \}\),\n\s*"([^"]+)"/)?.[1]
  assert.ok(trigger, "trigger class string not found")
  assert.match(trigger, /aria-expanded:border-ring aria-expanded:ring-1 aria-expanded:ring-ring aria-expanded:shadow-field-focus/)
  assert.doesNotMatch(trigger, /hover:/, "fields have no hover state")
  assert.match(source, /showClear \? "pr-24 md:pr-20" : "pr-9"/)
  assert.match(source, /aria-labelledby=\{label \? `\$\{labelId\} \$\{valueId\}` : undefined\}/)
  assert.match(source, /aria-describedby=\{describedBy\}/)
  // A button does not support aria-invalid (jsx-a11y/role-supports-aria-props), so the trigger gets the error look
  // from classes and screen readers get the message through aria-describedby and the alert role.
  assert.match(source, /error \? "border-danger ring-1 ring-danger shadow-field-error" : undefined/)
  assert.doesNotMatch(source, /aria-invalid/)
  assert.match(source, /<ChevronDown className="pointer-events-none absolute right-2\.5 top-1\/2 size-4 -translate-y-1\/2 text-faint-foreground" aria-hidden="true" \/>/)
  assert.match(source, /<FieldHint id=\{hintId\}>/)
  assert.match(source, /<FieldError id=\{errorId\}>/)
  assert.doesNotMatch(source, /ChevronsUpDown|disabled:bg-muted|sm:min-h-0|sm:pr-20|sm:w-10/)
})

test("FileDropzone shows keyboard focus and a disabled look without opacity", () => {
  const source = read("src/components/ui/file-dropzone.tsx")
  assert.match(source, /has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring/)
  assert.match(source, /"border-input bg-surface hover:bg-background"/)
  assert.match(source, /"pointer-events-none border-border bg-background"/)
  assert.doesNotMatch(source, /opacity-/)
  assert.doesNotMatch(source, /rounded-md bg-primary-soft text-primary/, "no tinted icon tile")
  assert.equal(source.match(/"mt-1 block text-meta text-faint-foreground"/g)?.length, 2)
})
