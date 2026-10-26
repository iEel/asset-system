import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 5 (spec 2026-10-25 §7.4, §5 "Shared parts first"): FactStrip, up to four facts of one
// record side by side under its tabs. Server-safe; one dl in the StatStrip frame inside a section the label names; a
// cell is a faint label, the value in ink at 500 and an optional faint sub-line, lined up across the cells (subgrid).
// Values are words, never Metric numbers; a state is a StatusBadge the caller passes, never colored text (The Where
// Color Lives Rule). Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const STRIP = "src/components/ui/fact-strip.tsx"

test("FactStrip: up to four facts in one framed dl inside a section named by its label, server-safe (spec §7.4)", () => {
  const source = read(STRIP)
  assert.match(source, /^import type React from "react"$/m)
  assert.match(source, /^import \{ orNil \} from "@\/components\/ui\/nil"$/m)
  assert.match(source, /export type FactStripItem = \{ key: string; label: string; value: React\.ReactNode; sub\?: React\.ReactNode \}/)
  assert.match(source, /export function FactStrip\(\{ label, items, className \}: \{ label: string; items: readonly FactStripItem\[\]; className\?: string \}\)/)
  assert.match(source, /<section aria-label=\{label\} className=\{className\}>\n\s+<dl data-slot="fact-strip" className=\{factStripClasses\}>/)
  assert.equal(
    source.match(/const factStripClasses = "([^"]+)"/)?.[1],
    "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-md:[&>:last-child:nth-child(odd)]:col-span-2 md:auto-cols-fr md:grid-flow-col md:grid-cols-none md:grid-rows-[repeat(3,auto)]",
  )
  assert.equal(source.match(/const factClasses = "([^"]+)"/)?.[1], "row-span-3 grid min-w-0 grid-rows-subgrid content-start gap-y-0.5 bg-surface px-4 py-3")
  assert.match(source, /\{items\.slice\(0, 4\)\.map\(\(item\) => \(\n\s+<div key=\{item\.key\} data-slot="fact" className=\{factClasses\}>/)
  assert.match(source, /<dt className="text-meta text-faint-foreground">\{item\.label\}<\/dt>/)
  assert.match(source, /<dd className="min-w-0 break-words text-sm font-medium text-foreground">\{orNil\(item\.value\)\}<\/dd>/)
  assert.match(source, /\{item\.sub \? <dd className="min-w-0 break-words text-meta text-faint-foreground">\{item\.sub\}<\/dd> : null\}/)
  assert.doesNotMatch(
    source,
    /"use client"|\buse[A-Z]\w*\(|text-metric|text-count|\btext-(?:success|warning|danger|info)\b|\bbg-(?:success|warning|danger|info)|\btone\??:|aria-current|\bshadow-|\b(?:bg|text|border)-[\w-]+\/\d+|\bdark:|<h[1-6]\b|aria-labelledby/,
    "server-safe; words, not Metric; no tone prop, status ink or fill (a state is the caller's StatusBadge); no tint, shadow or heading of its own",
  )
})

test("DESIGN.md, docs/14 and design.json describe FactStrip (group 1 asset detail task 5)", () => {
  const design = read("DESIGN.md")
  const kv = design.indexOf("\n- **`KeyValueList`**")
  const facts = design.indexOf("\n- **`FactStrip`** (`src/components/ui/fact-strip.tsx`, server-safe;")
  const stats = design.indexOf("\n- **`StatStrip`**")
  assert.ok(kv !== -1 && facts > kv && stats > facts, "§5 Cards / Containers: FactStrip between KeyValueList and StatStrip")
  const bullet = design.slice(facts, stats)
  for (const phrase of [
    "up to four facts of one record side by side, under a detail page's tabs",
    "two columns below `md`, one row from `md`",
    "The value is words, never a number tile",
    "`linkVariants({ size: \"inherit\" })`",
    "A value that is a state is a `StatusBadge`",
    "never colored text (The Where Color Lives Rule); the part has no tone of its own",
    "a `section` named by its `label` around the `dl`",
    "Guards LS1, LK1 and LN2",
  ]) assert.ok(bullet.includes(phrase), phrase)
  assert.ok(design.includes("`DataTable` frames, `StatStrip`, `FactStrip`, metric cards"), "Corner Style")
  const detail = design.slice(design.indexOf("\n- **Detail pages**"), design.indexOf("\n### Inputs / Fields"))
  assert.ok(detail.includes("A record's few headline facts sit in one `FactStrip` under its tabs"), "Detail pages")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const kvRow = index.indexOf("\n| Label and value pairs | `KeyValueList` |")
  const factRow = index.indexOf("\n| Up to four facts of a record side by side, under its tabs | `FactStrip` |")
  assert.ok(kvRow !== -1 && factRow > kvRow && factRow < index.indexOf("\n| A panel with a head row |"), "docs/14: the FactStrip row follows KeyValueList")
  assert.ok(index.slice(factRow, index.indexOf("\n", factRow + 1)).includes("a state is a `StatusBadge`, never colored text"))
  type Component = { name: string; kind: string; refersTo: string; description: string; html: string; css: string }
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Component[] }
  const names = json.components.map((entry) => entry.name)
  assert.equal(names.indexOf("Fact Strip"), names.indexOf("Key Value List") + 1)
  const fact = json.components.find((entry) => entry.name === "Fact Strip")
  assert.equal(fact?.kind, "card")
  assert.equal(fact?.refersTo, "fact-strip")
  assert.match(fact?.description ?? "", /^FactStrip: up to four facts of one record side by side under a detail page's tabs/)
  assert.match(fact?.description ?? "", /a state is a status badge, never colored text/)
  assert.match(fact?.html ?? "", /^<section class="ds-facts" aria-label="[^"]+"><dl>/)
  assert.match(fact?.css ?? "", /"IBM Plex Sans", "Noto Sans Thai Looped", system-ui, sans-serif/)
})
