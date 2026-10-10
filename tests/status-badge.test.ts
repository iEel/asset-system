import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getStatusTone } from "../src/lib/status-tone.ts"
import { statusBadgeVariants, statusMarkerVariants } from "../src/components/ui/badge-variants.ts"

const calmTones = ["success", "info", "primary", "neutral", "muted"] as const
const actionTones = ["warning", "danger"] as const

test("status tones keep the existing workflow mapping", () => {
  assert.equal(getStatusTone("closed"), "success")
  assert.equal(getStatusTone("in_progress"), "warning")
  assert.equal(getStatusTone("cancelled"), "danger")
  assert.equal(getStatusTone("open"), "info")
  assert.equal(getStatusTone("approved"), "primary")
  assert.equal(getStatusTone("unknown_status"), "muted")
  assert.equal(getStatusTone(null), "muted")
})

test("calm statuses have no fill, an invisible border and no side padding", () => {
  for (const tone of calmTones) {
    for (const size of ["xs", "sm"] as const) {
      const classes = statusBadgeVariants({ tone, size })
      assert.match(classes, /\bborder-transparent\b/, `${tone}/${size}`)
      assert.match(classes, /\btext-muted-foreground\b/, `${tone}/${size}`)
      assert.doesNotMatch(classes, /\bbg-|\bpx-/, `${tone}/${size} must not add a fill or side padding`)
    }
  }
})

test("statuses that need action keep the soft fill, tone border and AA ink", () => {
  assert.match(statusBadgeVariants({ tone: "warning", size: "xs" }), /border-warning-border bg-warning-soft text-warning/)
  assert.match(statusBadgeVariants({ tone: "danger" }), /border-danger-border bg-danger-soft text-danger/)
  for (const tone of actionTones) {
    assert.match(statusBadgeVariants({ tone, size: "xs" }), /\bpx-2\b/)
    assert.match(statusBadgeVariants({ tone, size: "sm" }), /\bpx-2\.5\b/)
  }
})

test("each meaning has its own marker shape, kept in high-contrast mode", () => {
  type Tone = (typeof calmTones)[number] | (typeof actionTones)[number]
  const marker = (tone: Tone) => statusMarkerVariants({ tone })
  const shapeOf = (tone: Tone) => marker(tone).replace(/\b(bg|border)-(info|success|primary|warning|danger|muted-foreground)\b/g, "").trim()
  const shapeTones = ["info", "success", "warning", "danger", "neutral"] as const
  assert.match(marker("info"), /rounded-full border-\[1\.5px\] border-info/)
  assert.match(marker("success"), /rounded-full bg-success/)
  assert.match(marker("primary"), /rounded-full bg-primary/)
  assert.match(marker("warning"), /bg-warning \[clip-path:polygon\(50%_0,100%_100%,0_100%\)\]/)
  assert.match(marker("danger"), /rotate-45 rounded-\[1px\] bg-danger/)
  assert.match(marker("neutral"), /h-0\.5 w-\[7px\]/)
  assert.match(marker("muted"), /h-0\.5 w-\[7px\]/)
  assert.equal(new Set(shapeTones.map(shapeOf)).size, shapeTones.length, "ring, dot, triangle, diamond and bar must differ without their color")
  for (const tone of [...calmTones, ...actionTones]) assert.match(marker(tone), /forced-color-adjust-none/)
})

test("StatusBadge takes no database color", () => {
  const source = readFileSync("src/components/ui/status-badge.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /color\?:|getStatusDotColor|style=/)
  assert.match(source, /className=\{statusMarkerVariants\(\{ tone: resolvedTone \}\)\}/)
})
