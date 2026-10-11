import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// node --test cannot load .tsx, so these tests read the source of src/components/ui/button.tsx.
const button = () => readFileSync("src/components/ui/button.tsx", "utf8").replace(/\r\n/g, "\n")

test("Button still renders in server components: no client directive and no hooks", () => {
  const source = button()
  assert.doesNotMatch(source, /^\s*["']use client["']/m)
  assert.doesNotMatch(source, /\buse(State|Effect|LayoutEffect|Ref|Reducer|Context|Transition|Id)\b/)
})

test("busy cannot be combined with asChild", () => {
  assert.match(button(), /\(\{ asChild\?: false; busy\?: boolean \} \| \{ asChild: true; busy\?: never \}\)/)
  assert.match(button(), /const isBusy = busy && !asChild/)
})

test("a busy Button keeps focus: aria-disabled and a click guard, never the disabled attribute", () => {
  const source = button()
  assert.match(source, /aria-busy=\{isBusy \|\| ariaBusy\}/)
  assert.match(source, /aria-disabled=\{isBusy \|\| ariaDisabled\}/)
  assert.match(source, /data-busy=\{isBusy \? "" : undefined\}/)
  assert.match(source, /function preventBusyClick\(event: React\.MouseEvent<HTMLButtonElement>\) \{\n  event\.preventDefault\(\)\n\}/)
  assert.match(source, /onClick=\{isBusy \? preventBusyClick : onClick\}/)
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{/, "busy must not set the disabled attribute; a disabled button drops focus to <body>")
  const attributes = source.slice(source.indexOf("<Comp"), source.indexOf("</Comp>"))
  assert.ok(attributes.indexOf("{...props}") < attributes.indexOf("aria-disabled="), "the busy attributes must come after the caller's props")
  assert.ok(attributes.indexOf("{...props}") < attributes.indexOf("onClick="), "the click guard must come after the caller's props")
})

test("the busy spinner is decorative, stops under reduced motion, and takes the place of a leading icon", () => {
  const source = button()
  assert.match(source, /import \{ Loader2 \} from "lucide-react"/)
  assert.match(source, /<Loader2 key="button-spinner" data-slot="button-spinner" aria-hidden="true" className="animate-spin motion-reduce:animate-none" \/>/)
  assert.match(source, /first\.type !== React\.Fragment && \(typeof first\.type !== "string" \|\| first\.type === "svg"\)/)
  assert.match(source, /return leadsWithIcon \? \[spinner, \.\.\.rest\] : \[spinner, \.\.\.items\]/)
  assert.match(source, /\{isBusy \? withBusySpinner\(children\) : children\}/)
})

test("Button keeps its default type and data attributes", () => {
  const source = button()
  assert.match(source, /data-slot="button"/)
  assert.match(source, /data-variant=\{variant\}/)
  assert.match(source, /data-size=\{size\}/)
  assert.match(source, /type=\{asChild \? type : \(type \?\? "button"\)\}/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant, size \}\), className\)\}/)
})
