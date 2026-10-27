import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { statusFillVariants } from "../src/components/ui/badge-variants.ts"
import { barPercent } from "../src/lib/data-bars.ts"

// Group 1 dashboard task 7 (spec 2026-10-25 §6.6, §6.7): The Data Bars Rule and its two shared parts. A status color
// fills an area only in DistributionBar and PaceBar: each segment in its status's badge tone, 2px apart, 3:1 on the
// panel in both themes (tests/design-tokens-contrast.test.ts). The distribution bar is hidden from screen readers beside
// the table that says the same (its segments may link for a pointer); the pace bar is role="img" with the caller's
// sentence. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const TONES = ["success", "info", "primary", "neutral", "muted", "warning", "danger"] as const

// What both parts keep: server-safe, fills only through statusFillVariants, no fade, shadow or pill corners.
function assertDataBarRules(path: string, source: string) {
  for (const pattern of [/"use client"/, /\buse(?:State|Effect|Context)\b/, /opacity-/, /\bshadow-(?:sm|md|lg|xl|2xl)\b/, /rounded-full|rounded-\[/, /\bdark:/]) {
    assert.doesNotMatch(source, pattern, path)
  }
  assert.doesNotMatch(source, /(?<![\w:-])bg-(?:success|warning|danger|info|primary|neutral-ink)\b/, `${path}: fills come only from statusFillVariants`)
}

test("a status tone fills an area with its badge marker's color: info solid, neutral and muted neutral-ink (The Data Bars Rule)", () => {
  const fills = Object.fromEntries(TONES.map((tone) => [tone, statusFillVariants({ tone }).split(" ").filter((name) => name.startsWith("bg-"))]))
  assert.deepEqual(fills, {
    success: ["bg-success"],
    info: ["bg-info"],
    primary: ["bg-primary"],
    neutral: ["bg-neutral-ink"],
    muted: ["bg-neutral-ink"],
    warning: ["bg-warning"],
    danger: ["bg-danger"],
  })
  for (const tone of TONES) {
    const classes = statusFillVariants({ tone }).split(" ")
    assert.ok(classes.includes("forced-color-adjust-none") && classes.includes("forced-colors:bg-[CanvasText]"), `${tone}: the text color in a Windows contrast theme`)
  }
  assert.equal(statusFillVariants(), statusFillVariants({ tone: "muted" }))
})

test("barPercent turns a 0..1 share into a width: clamped, two decimals, 0 for anything that is not a finite number", () => {
  assert.equal(barPercent(0.68), 68)
  assert.equal(barPercent(1 / 3), 33.33)
  assert.equal(barPercent(0), 0)
  assert.equal(barPercent(1), 100)
  assert.equal(barPercent(1.4), 100)
  assert.equal(barPercent(-0.2), 0)
  assert.equal(barPercent(Number.NaN), 0)
  assert.equal(barPercent(Number.POSITIVE_INFINITY), 0)
})

test("DistributionBar: one bar hidden from screen readers, of the parts above zero, sized by count, 2px apart, in their tone; a part with a list is a pointer-only link (spec §2, §6.6; R17)", () => {
  const path = "src/components/ui/distribution-bar.tsx"
  const source = read(path)
  assert.match(source, /export function DistributionBar\(\{ segments \}: \{ segments: \{ key: string; count: number; tone: StatusTone; href\?: string; title\?: string \}\[\] \}\)/)
  assert.match(source, /import type \{ StatusTone \} from "@\/lib\/status-tone"/)
  assert.match(source, /const shown = segments\.filter\(\(segment\) => segment\.count > 0\)/)
  assert.match(source, /if \(shown\.length === 0\) return null/)
  assert.match(source, /<div aria-hidden="true" data-slot="distribution-bar" className="flex h-3 w-full gap-0\.5">/)
  assert.doesNotMatch(source, /\brole=|aria-label|aria-describedby/, "no role and no name: the table beside the bar is its accessible form")
  assert.equal(source.match(/const distributionSegmentClasses = "([^"]+)"/)?.[1], "h-full min-w-1 basis-0 rounded-xs")
  // A segment with a list: a link for a pointer, out of the tab order (aria-hidden-focus), its title the status, count and note.
  assert.match(source, /<a key=\{segment\.key\} href=\{segment\.href\} tabIndex=\{-1\} title=\{segment\.title\} data-status-segment=\{segment\.key\} className=\{cn\(distributionSegmentClasses, statusFillVariants\(\{ tone: segment\.tone \}\)\)\} style=\{\{ flexGrow: segment\.count \}\} \/>/)
  assert.match(source, /<span key=\{segment\.key\} className=\{cn\(distributionSegmentClasses, statusFillVariants\(\{ tone: segment\.tone \}\)\)\} style=\{\{ flexGrow: segment\.count \}\} \/>/)
  assert.equal(source.match(/\btabIndex=/g)?.length, 1, "the one link, never tabbable")
  assert.equal(source.match(/\btitle=/g)?.length, 1, "only a linked segment carries a title")
  assertDataBarRules(path, source)
})

test("PaceBar: a role=img bar from 0 to 1, primary or warning when behind, with an optional pace mark in a 2px panel gap (spec §6.7)", () => {
  const path = "src/components/ui/pace-bar.tsx"
  const source = read(path)
  assert.match(source, /export function PaceBar\(\{ value, pace, label, behind \}: \{ value: number; pace: number \| null; label: string; behind: boolean \}\)/)
  assert.match(source, /<span role="img" aria-label=\{label\} data-slot="pace-bar" className=\{paceTrackClasses\}>/)
  assert.equal(source.match(/const paceTrackClasses = "([^"]+)"/)?.[1], "relative block h-2 w-full rounded-xs bg-muted forced-colors:border forced-colors:border-[CanvasText]")
  assert.match(source, /<span className=\{cn\("block h-full rounded-xs", statusFillVariants\(\{ tone: behind \? "warning" : "primary" \}\)\)\} style=\{\{ width: `\$\{barPercent\(value\)\}%` \}\} \/>/)
  assert.doesNotMatch(source, /<div\b/, "spans only (R18): valid in a StatStrip meter, a dd or a link's text")
  assert.doesNotMatch(source, /\btitle=|<a\b/, "the sentence is its label; the words beside it say the rest")
  assert.match(source, /\{pace === null \? null : <span className=\{paceMarkClasses\} style=\{\{ left: `\$\{barPercent\(pace\)\}%` \}\} \/>\}/)
  assert.equal(source.match(/const paceMarkClasses = "([^"]+)"/)?.[1], "absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground ring-2 ring-surface forced-color-adjust-none forced-colors:bg-[CanvasText]")
  assertDataBarRules(path, source)
})

test("DESIGN.md, docs/14 and design.json state The Data Bars Rule and the two parts (group 1 dashboard task 7)", () => {
  const design = read("DESIGN.md")
  const colorRule = design.indexOf("\n**The Where Color Lives Rule.** ")
  const barsRule = design.indexOf("\n**The Data Bars Rule.** A distribution bar (`DistributionBar`) and a progress bar (`PaceBar`) are the only places outside the list above where a status color fills an area")
  assert.ok(colorRule !== -1 && barsRule > colorRule && barsRule < design.indexOf("\n**The Status With Evidence Rule.** "), "§2: the rule follows The Where Color Lives Rule")
  assert.ok(design.slice(colorRule, barsRule).includes("and as the segments of a data bar (The Data Bars Rule)."), "The Where Color Lives Rule names the data bars")
  const rule = design.slice(barsRule, design.indexOf("\n\n", barsRule + 1))
  for (const phrase of ["`statusFillVariants`", "2px apart", "3:1", "`tests/design-tokens-contrast.test.ts`", "never the only carrier of its meaning", "`aria-hidden=\"true\"`", "always paired with a table", "`role=\"img\"`", "The audit scan header's bar"]) {
    assert.ok(rule.includes(phrase), phrase)
  }
  assert.ok(design.includes("the ring, input, menu and data bar pairs"), "The Token Contrast Rule names the data bar pairs")
  const parts = design.indexOf("\n### Data Bars\n")
  assert.ok(parts > design.indexOf("\n### Status Badges\n") && parts < design.indexOf("\n### Dialogs, Menus and Confirmation\n"), "§5 Data Bars follows Status Badges")
  const section = design.slice(parts, design.indexOf("\n### Dialogs, Menus and Confirmation\n"))
  for (const phrase of ["**`DistributionBar`** (`src/components/ui/distribution-bar.tsx`, server-safe)", "holds no word of its own", "its segments may link to their lists for pointer users", "the table carries the same links for everyone", "**`PaceBar`** (`src/components/ui/pace-bar.tsx`, server-safe)", "\"ควรถึงวันนี้\"", "\"ช้ากว่าที่ควร\"", "in a `StatStrip` cell it is the `meter`"]) {
    assert.ok(section.includes(phrase), phrase)
  }
  assert.ok(design.includes("`rounded-xs` is 2px, only for the data bars and their segments"), "Corner Style")
  assert.match(design, /\n- \*\*Don't\*\* bring back the old slate sidebar [^\n]*no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars\.\n/)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const status = index.indexOf("\n| A status | `StatusBadge` |")
  const distribution = index.indexOf("\n| A share of a whole by status (a stacked bar) | `DistributionBar` |")
  const pace = index.indexOf("\n| Progress toward a total, with the pace it should have | `PaceBar` |")
  assert.ok(status !== -1 && distribution > status && pace > distribution, "docs/14: the two rows follow the status row")
  assert.ok(index.slice(pace, index.indexOf("\n", pace + 1)).includes("a `StatStrip` cell takes it as `meter`"), "docs/14: the PaceBar row names the meter")
  assert.ok(index.slice(distribution, pace).includes("its segments may link to their lists for pointer users"), "docs/14: the DistributionBar row names the pointer-only links")
  assert.ok(index.includes("A status color fills an area only in a data bar (The Data Bars Rule"), "docs/14: the reminders")
  type Design = { narrative: { rules: Array<{ name: string; body: string; section: string }>; donts: string[] } }
  const json = JSON.parse(read(".impeccable/design.json")) as Design
  const names = json.narrative.rules.map((entry) => entry.name)
  assert.equal(names.indexOf("The Data Bars Rule"), names.indexOf("The Where Color Lives Rule") + 1)
  const bars = json.narrative.rules.find((entry) => entry.name === "The Data Bars Rule")
  assert.equal(bars?.section, "colors")
  assert.match(bars?.body ?? "", /^A distribution bar \(DistributionBar\) and a progress bar \(PaceBar\) are the only places /)
  assert.ok((bars?.body ?? "").includes("A distribution bar holds no word of its own and is hidden from assistive technology (aria-hidden), always paired with a table"), "design.json: the distribution bar is decorative to assistive technology")
  const where = json.narrative.rules.find((entry) => entry.name === "The Where Color Lives Rule")?.body ?? ""
  assert.ok(where.includes("and as the segments of a data bar (The Data Bars Rule);"))
  assert.ok(where.includes("(the info status ring, the info Notice icon and a data bar's info segment) no screen uses the info tokens"))
  assert.ok(json.narrative.donts.some((entry) => entry.endsWith("no green, orange or red outside status badges, the bell's count, the menu's work dot and the data bars.")))
})
