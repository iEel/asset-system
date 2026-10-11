import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { cn } from "../src/lib/utils.ts"
import { getStatusTone } from "../src/lib/status-tone.ts"
import { statusBadgeVariants, statusMarkerVariants } from "../src/components/ui/badge-variants.ts"

const calmTones = ["success", "info", "primary", "neutral", "muted"] as const
const actionTones = ["warning", "danger"] as const
const allTones = [...calmTones, ...actionTones]

test("status tones keep the existing workflow mapping", () => {
  assert.equal(getStatusTone("closed"), "success")
  assert.equal(getStatusTone("in_progress"), "warning")
  assert.equal(getStatusTone("cancelled"), "danger")
  assert.equal(getStatusTone("open"), "info")
  assert.equal(getStatusTone("approved"), "primary")
  assert.equal(getStatusTone("unknown_status"), "muted")
  assert.equal(getStatusTone(null), "muted")
})

test("every status badge has one size: 22px tall, 13/20 text and 6px corners", () => {
  for (const tone of allTones) {
    const classes = statusBadgeVariants({ tone })
    assert.match(classes, /\bh-5\.5\b/, `${tone}: fixed 22px height`)
    assert.match(classes, /\btext-meta\b/, `${tone}: 13/20 text`)
    assert.match(classes, /\brounded-control\b/, `${tone}: 6px corners`)
    assert.doesNotMatch(classes, /\bpy-|\btext-(xs|sm)\b|\brounded-md\b/, `${tone}: no vertical padding, second text size or 8px corners`)
  }
  assert.equal(statusBadgeVariants(), statusBadgeVariants({ tone: "muted" }), "muted stays the default tone")
})

test("cn() keeps the badge size, corners and tone ink next to a caller's class", () => {
  for (const tone of allTones) {
    const merged = cn(statusBadgeVariants({ tone }), "shrink-0").split(" ")
    for (const name of ["h-5.5", "text-meta", "rounded-control", "shrink-0"]) {
      assert.ok(merged.includes(name), `${tone}: cn() dropped ${name}`)
    }
  }
  assert.ok(cn(statusBadgeVariants({ tone: "muted" }), "shrink-0").split(" ").includes("text-muted-foreground"), "muted ink kept")
  assert.ok(cn(statusBadgeVariants({ tone: "warning" }), "max-w-40 shrink-0").split(" ").includes("text-warning"), "warning ink kept")
})

test("calm statuses have no fill, an invisible border and no side padding", () => {
  for (const tone of calmTones) {
    const classes = statusBadgeVariants({ tone })
    assert.match(classes, /\bborder-transparent\b/, tone)
    assert.match(classes, /\btext-muted-foreground\b/, tone)
    assert.doesNotMatch(classes, /\bbg-|\bpx-/, `${tone} must not add a fill or side padding`)
  }
})

test("statuses that need action keep the soft fill, tone border, AA ink and 8px side padding", () => {
  assert.match(statusBadgeVariants({ tone: "warning" }), /border-warning-border bg-warning-soft text-warning/)
  assert.match(statusBadgeVariants({ tone: "danger" }), /border-danger-border bg-danger-soft text-danger/)
  for (const tone of actionTones) {
    assert.match(statusBadgeVariants({ tone }), /\bpx-2\b/, tone)
    assert.doesNotMatch(statusBadgeVariants({ tone }), /\bpx-2\.5\b/, tone)
  }
})

test("each meaning has its own marker shape, kept in high-contrast mode", () => {
  type Tone = (typeof calmTones)[number] | (typeof actionTones)[number]
  const marker = (tone: Tone) => statusMarkerVariants({ tone })
  const shapeOf = (tone: Tone) => marker(tone).replace(/\b(bg|border)-(info|success|primary|warning|danger|muted-foreground|neutral-ink)\b/g, "").replace(/forced-colors:\S+/g, "").trim()
  const shapeTones = ["info", "success", "warning", "danger", "neutral"] as const
  assert.match(marker("info"), /rounded-full border-\[1\.5px\] border-info/)
  assert.match(marker("success"), /rounded-full bg-success/)
  assert.match(marker("primary"), /rounded-full bg-primary/)
  assert.match(marker("warning"), /bg-warning \[clip-path:polygon\(50%_0,100%_100%,0_100%\)\]/)
  assert.match(marker("danger"), /rotate-45 rounded-\[1px\] bg-danger/)
  for (const tone of ["neutral", "muted"] as const) {
    assert.match(marker(tone), /h-0\.5 w-\[7px\] rounded-\[1px\] bg-neutral-ink/, `${tone} bar uses the neutral ink`)
    assert.doesNotMatch(marker(tone), /bg-muted-foreground/, tone)
  }
  assert.equal(new Set(shapeTones.map(shapeOf)).size, shapeTones.length, "ring, dot, triangle, diamond and bar must differ without their color")
  for (const tone of allTones) assert.match(marker(tone), /forced-color-adjust-none/)
  assert.match(marker("info"), /forced-colors:border-\[CanvasText\]/)
  for (const tone of ["success", "primary", "neutral", "muted", "warning", "danger"] as const) {
    assert.match(marker(tone), /forced-colors:bg-\[CanvasText\]/)
  }
})

test("StatusBadge takes no database color and gives the variants only its tone", () => {
  const source = readFileSync("src/components/ui/status-badge.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /color\?:|getStatusDotColor|style=/)
  assert.match(source, /className=\{statusMarkerVariants\(\{ tone: resolvedTone \}\)\}/)
  assert.match(source, /className=\{cn\(statusBadgeVariants\(\{ tone: resolvedTone \}\), className\)\}/)
})
