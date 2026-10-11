import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readSourceFiles } from "./helpers/source-files.ts"
import { cn } from "../src/lib/utils.ts"

// Phase 2C K16 (spec 2C section 7.4, I20, I21). Call sites join this file in 1a, 1b, 1c, 1e, 1f and batch 4.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const choice = () => read("src/components/ui/choice-card.tsx")

// Spec I20, verbatim. Tailwind emits hover:, has-checked:, has-disabled:, has-[…]: in that order, so a chosen card keeps
// its primary border on hover, and only a disabled choice that is not chosen loses its fill.
const CARD =
  "group flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background"
const CHIP =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-control-border bg-surface px-3 py-1 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input md:min-h-8 has-checked:border-primary-border has-checked:bg-primary-soft has-checked:text-primary-hover has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background"

test("ChoiceCard and ChoiceChip draw on a real, visible input inside a label, styled with has-checked", () => {
  const source = choice()
  assert.match(source, /^"use client"\n/, "the Enter guard is an event handler")
  assert.ok(source.includes(`const choiceCardClasses =\n  "${CARD}"`), "ChoiceCard label classes (I20)")
  assert.ok(source.includes(`const choiceChipClasses =\n  "${CHIP}"`), "ChoiceChip label classes (I20)")
  assert.match(source, /<label data-slot="choice-card" className=\{cn\(choiceCardClasses, className\)\}>/)
  assert.match(source, /<label data-slot="choice-chip" className=\{cn\(choiceChipClasses, className\)\}>/)
  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /className="text-meta text-muted-foreground group-has-disabled:text-faint-foreground"/)
  assert.match(source, /className="text-meta text-faint-foreground"/)
  // accent-color and the base :focus-visible outline already style the input; hiding the input would cut its outline off.
  assert.doesNotMatch(source, /accent-primary|focus-within:ring|sr-only|opacity-|shadow-|leading-tight|rounded-\[/)
  // Literal types: the form-migration guard GF2 counts an <input> whose type is not checkbox, radio, hidden or file.
  assert.match(source, /type === "radio" \? <input type="radio" \{\.\.\.props\} onKeyDown=\{handleKeyDown\} \/> : <input type="checkbox" \{\.\.\.props\} onKeyDown=\{handleKeyDown\} \/>/)
  assert.doesNotMatch(source, /<input\b(?![^>]*\btype="(?:radio|checkbox)")/)
})

test("cn() keeps every class of the two choice recipes", () => {
  for (const recipe of [CARD, CHIP]) assert.equal(cn(recipe), recipe)
})

test("Enter on a choice never submits the form, and the caller's onKeyDown runs first", () => {
  const source = choice()
  assert.match(source, /export function preventEnterSubmit\(event: KeyboardEvent<HTMLInputElement>\) \{\n {2}if \(event\.key === "Enter"\) event\.preventDefault\(\)\n\}/)
  assert.match(source, /function handleKeyDown\(event: KeyboardEvent<HTMLInputElement>\) \{\n\s+onKeyDown\?\.\(event\)\n\s+preventEnterSubmit\(event\)\n\s+\}/)
})

test("a choice is named by its label and described by its description or detail", () => {
  const source = choice()
  assert.match(source, /const describedBy = \[ariaDescribedBy, extraId\]\.filter\(Boolean\)\.join\(" "\) \|\| undefined/)
  // The caller's input props go first, so they cannot replace the type or the ids.
  assert.equal(source.match(/<NativeChoice\n\s+\{\.\.\.inputProps\}\n\s+type=\{type\}\n\s+aria-labelledby=\{labelId\}\n\s+aria-describedby=\{describedBy\}/g)?.length, 2)
  assert.match(source, /<span id=\{labelId\} className="font-medium">/)
  assert.match(source, /<span id=\{labelId\}>\{label\}<\/span>/)
})

test("the repair form asks its two questions with ChoiceCard radios under a field-style legend (R2)", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /function Choice\(|accent-primary|<input\b|ml-1 text-danger/)
  assert.equal(source.match(/<ChoiceCard type="radio" name="done" /g)?.length, 2)
  assert.equal(source.match(/<ChoiceCard type="radio" name="outcome" /g)?.length, 2)
  assert.equal(source.match(/<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>/g)?.length, 2)
  assert.equal(source.match(/<FieldRequiredMark \/>/g)?.length, 2)
})

test("the finish-repair dialog picks the outcome with ChoiceCard radios (R3)", () => {
  const source = readFileSync("src/components/maintenance/repair-record-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /accent-primary|<input\b|ml-1 text-danger/)
  assert.match(source, /<ChoiceCard key=\{outcome\} type="radio" name="outcome" checked=\{complete\.outcome === outcome\}/)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\{t\("outcomeQuestion"\)\}<FieldRequiredMark \/><\/legend>/)
})

test("checkout picks the handover mode with required ChoiceCard radios, and no file in src uses accent-primary (R1)", () => {
  const source = readFileSync("src/components/asset-operations/checkout-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<ChoiceCard\n\s+key=\{mode\}\n\s+type="radio"\n\s+name="handoverModeChoice"\n\s+value=\{mode\}\n\s+checked=\{values\.handoverMode === mode\}\n\s+required\n\s+label=\{label\}\n\s+description=\{help\}/)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\n\s+\{t\("handoverMode"\)\}\n\s+<FieldRequiredMark \/>/)
  assert.doesNotMatch(source, /<input\b|focus-within:ring|min-h-16|ml-1 text-danger/)
  assert.deepEqual(readSourceFiles("src").filter((file) => /\baccent-primary\b/.test(file.source)).map((file) => file.path), [])
})

test("bulk move lists assets as real checkbox rows that Enter cannot submit (P1)", () => {
  const source = readFileSync("src/components/asset-operations/bulk-move-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<FieldLabel id=\{assetsLabelId\} htmlFor=\{assetSearchId\} required className="mb-1\.5 block">/)
  assert.match(source, /<SearchField\n\s+id=\{assetSearchId\}/)
  assert.match(source, /<div role="group" aria-labelledby=\{assetsLabelId\} className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface">/)
  assert.match(source, /<input\n\s+type="checkbox"\n\s+checked=\{checked\}\n\s+onChange=\{\(\) => toggleAsset\(asset\.id\)\}\n\s+onKeyDown=\{preventEnterSubmit\}\n\s+className=\{checkboxVariants\(\)\}/)
  assert.match(source, /className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border-soft px-3 text-sm last:border-b-0 hover:bg-row-hover has-checked:bg-primary-soft"/)
  assert.doesNotMatch(source, /rounded border \$\{checked|<button|import \{ Check|function Field\(|Loader2/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>/)
})

test("the disposal asset picker marks options with the 16px box of the menu check item (spec 7.4.5 P2)", () => {
  const source = readFileSync("src/components/disposal/disposal-asset-picker.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /"mt-0\.5 flex size-4 shrink-0 items-center justify-center rounded-sm border-\[1\.5px\]"/)
  assert.match(source, /active \? "border-primary bg-primary" : option\.eligible \? "border-input bg-surface" : "border-border bg-background"/)
  assert.match(source, /role="option" aria-selected=\{active\}/)
  assert.doesNotMatch(source, /h-5 w-5 shrink-0 items-center justify-center rounded border/)
  assert.match(source, /<FieldLabel htmlFor=\{showSearch \? inputId : undefined\} required>/)
  assert.match(source, /<Input id=\{inputId\}[\s\S]*?role="combobox"/)
})

test("the asset form's photo types are one radio group of chips with a legend and a hint (T5)", () => {
  const source = readFileSync("src/components/assets/asset-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /const photoLabelRadioName = useId\(\)/)
  assert.match(
    source,
    /<fieldset className="min-w-0" aria-describedby=\{photoLabelHintId\}>\n\s*<legend className=\{fieldLabelClasses\}>\{t\("selectPhotoType"\)\}<\/legend>\n\s*<p id=\{photoLabelHintId\} className="mt-1 text-meta text-faint-foreground">/,
  )
  assert.match(
    source,
    /<ChoiceChip\n\s*key=\{item\}\n\s*type="radio"\n\s*name=\{photoLabelRadioName\}\n\s*checked=\{isSelected\}\n\s*onChange=\{\(\) => setPhotoLabel\(item\)\}/,
  )
  assert.doesNotMatch(source, /onClick=\{\(\) => setPhotoLabel\(item\)\}/, "the chips are radio inputs now, not buttons whose state no screen reader hears")
})

test("the batch form's row-column toggles are checkbox chips (T4)", () => {
  const source = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(
    source,
    /<ChoiceChip type="checkbox" checked=\{active\} onChange=\{onClick\} label=\{label\} detail=\{count > 0 \? <span className="num">\{count\}<\/span> : undefined\} \/>/,
  )
  assert.doesNotMatch(source, /aria-pressed=\{active\}|rounded-full bg-background px-2 py-0\.5/)
})

test("a component candidate row says whether it is the selected one (P3)", () => {
  const source = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /onClick=\{\(\) => onSelect\(candidate\)\}\n\s*aria-pressed=\{selectedId === candidate\.id\}/)
})
