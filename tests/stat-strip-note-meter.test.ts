import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 dashboard task 6 (spec 2026-10-25 §6.5): a StatStrip cell can name the filter its number uses. The note is a
// small panel in the tooltip look under the cell, shown by CSS alone while the cell is hovered or its own link has
// keyboard focus, and the link names it with aria-describedby. The strip's frame clips its cells (overflow-hidden for
// the rounded corners), so the panel is position: fixed and placed under its cell with CSS anchor positioning.
// A cell can also carry a meter (R18): a bar full width under its value, inside the value dd, for the audit KPI's
// PaceBar. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const STRIP = "src/components/ui/stat-strip.tsx"

test("StatStrip: an optional filter note under the cell, on hover and on focus-visible of the cell's link, tied by aria-describedby (spec §6.5)", () => {
  const source = read(STRIP)
  assert.match(source, /\n  filterNote\?: string\n/)
  assert.match(source, /^import \* as React from "react"$/m)
  assert.match(source, /const noteIdBase = React\.useId\(\)/)
  assert.match(source, /const noteId = item\.href && item\.filterNote \? `\$\{noteIdBase\}-note-\$\{index\}` : undefined/)
  assert.equal(
    source.match(/const statNoteClasses = "([^"]+)"/)?.[1],
    "pointer-events-none invisible fixed top-[anchor(bottom)] left-[anchor(left)] z-50 mt-1 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 text-meta text-popover-foreground shadow-overlay group-hover:visible group-has-[dt_a:focus-visible]:visible",
  )
  assert.match(source, /style=\{noteId \? \{ anchorName: `--\$\{noteId\}` \} : undefined\}/, "the cell is the note's anchor")
  assert.match(
    source,
    /<Link href=\{item\.href\} scroll=\{item\.scroll\} aria-describedby=\{noteId\} aria-current=\{item\.current \? "page" : undefined\} className="after:absolute after:inset-0 focus-visible:outline-none">/,
  )
  assert.match(
    source,
    /\{noteId \? \(\n\s+<dd id=\{noteId\} className=\{statNoteClasses\} style=\{\{ positionAnchor: `--\$\{noteId\}` \}\}>\n\s+\{item\.filterNote\}\n\s+<\/dd>\n\s+\) : null\}/,
  )
  assert.ok(source.indexOf("<dd id={noteId}") > source.indexOf("title={item.footTitle}"), "the note is the cell's last child, after the foot: out of flow, so the three subgrid rows stay")
  assert.doesNotMatch(source, /title=\{item\.filterNote\}|"use client"|\buseState\b|\buseEffect\b|opacity-|\bshadow-(?:sm|md|lg|xl|2xl)\b/)
})

test("StatStrip: an optional meter, full width under the value inside the value dd, which the cell's link still covers (R18)", () => {
  const source = read(STRIP)
  assert.match(source, /\n  meter\?: React\.ReactNode\n/)
  assert.match(source, /<dd className="flex min-w-0 flex-wrap items-baseline gap-1">/, "the value row wraps, so the meter takes a line of its own")
  assert.match(
    source,
    /\{item\.unit \? <span className="text-base font-medium text-faint-foreground">\{item\.unit\}<\/span> : null\}\n\s+\{item\.meter \? <span className="pointer-events-none basis-full pt-1">\{item\.meter\}<\/span> : null\}\n\s+<\/dd>/,
    "after the unit, the last child of the value dd; a click on the bar opens the cell's link",
  )
})

test("DESIGN.md, docs/14 and design.json describe the filter note and the meter (group 1 dashboard task 6)", () => {
  const design = read("DESIGN.md")
  const strip = design.slice(design.indexOf("\n- **`StatStrip`**"), design.indexOf("\n- **Detail pages**"))
  assert.ok(strip.includes("an optional faint foot of at most two lines"), "the plan 2D-5 wording stays")
  for (const phrase of [
    "A cell with `href` may carry `filterNote`, one short sentence that names the filter its number uses",
    "while the cell is hovered or its link has keyboard focus (`:focus-visible`)",
    "the link names it with `aria-describedby`, never through `title` alone",
    "`useId` is the strip's only hook",
    "A cell may carry `meter`, a bar drawn full width under its value inside the value `dd`",
  ]) assert.ok(strip.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.match(index, /\n\| Counts above a list, a report or a work queue \| `StatStrip` [^\n]*a foot wraps to two lines at most[^\n]*; `filterNote` names the filter a number uses [^\n]*; `meter` draws a bar full width under the value /)
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Array<{ name: string; description: string }> }
  const description = json.components.find((entry) => entry.name === "Stat Strip")?.description ?? ""
  assert.match(description, /foot of at most two lines/)
  assert.match(description, /A linked cell may carry a filter note: one short sentence naming the filter its number uses/)
  assert.match(description, /A cell may carry a meter, a bar full width under its value/)
})
