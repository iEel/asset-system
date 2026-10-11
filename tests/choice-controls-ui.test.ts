import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
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
