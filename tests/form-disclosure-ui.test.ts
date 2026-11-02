import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// FormDisclosure (group 4 plan 2 Task 5, spec §8, P2-R11): a folded optional form section. A <details> cannot be
// ContentPanel, so it takes the panel classes and the summary row of the audit rounds page's coverage fold
// (audit/rounds/page.tsx); it is controlled, because a field error, the #purchase hash and "ไปที่ช่อง" open it from code.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const SOURCE = "src/components/ui/form-disclosure.tsx"

test("FormDisclosure is a controlled native <details> with the panel classes and the rounds page's summary row", () => {
  const source = read(SOURCE)
  assert.match(source, /^"use client"$/m)
  assert.match(source, /export function FormDisclosure\(\{ id, title, summary, badge, open, onOpenChange, tone = "default", children \}: FormDisclosureProps\)/)
  assert.match(source, /<details\n\s+id=\{id\}\n\s+open=\{open\}\n\s+onToggle=\{\(event\) => \{/)
  // A toggle the state already holds (a render from code) is not reported back.
  assert.match(source, /if \(next !== open\) onOpenChange\(next\)/)
  assert.match(source, /getPanelClasses\(\), "group\/disclosure p-4 sm:p-5"/)
  assert.match(source, /<summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 md:min-h-0">/)
  assert.match(source, /<h2 className="text-base font-semibold text-foreground">\{title\}<\/h2>/)
  assert.match(source, /<ChevronDown className="size-4 shrink-0 motion-safe:transition-transform group-open\/disclosure:rotate-180" aria-hidden="true" \/>/)
  assert.match(source, /<div className="mt-4 border-t border-border-soft pt-4">\{children\}<\/div>/)
  // The tones are frame colors from the tokens: a changed section and a section with an error.
  assert.match(source, /changed: "border-primary-border"/)
  assert.match(source, /error: "border-danger"/)
  // No raw button: the summary is the control.
  assert.doesNotMatch(source, /<button\b/)
  assert.doesNotMatch(source, /#[\da-fA-F]{3,8}\b|rgba?\(|\bdark:|\/\d{2}\b/)
})

test("DESIGN.md names FormDisclosure among the shared parts with its rule", () => {
  const design = read("DESIGN.md")
  assert.match(design, /- \*\*`FormDisclosure`\*\* \(`src\/components\/ui\/form-disclosure\.tsx`\): /)
  assert.match(design, /`FormSection`, `FormDisclosure`, `FileQueueList`/)
})
