import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getStatusDotColor, getStatusTone } from "../src/lib/status-tone.ts"
import { statusBadgeVariants, statusDotVariants } from "../src/components/ui/badge-variants.ts"

test("status tones keep the existing workflow mapping", () => {
  assert.equal(getStatusTone("closed"), "success")
  assert.equal(getStatusTone("in_progress"), "warning")
  assert.equal(getStatusTone("cancelled"), "danger")
  assert.equal(getStatusTone("open"), "info")
  assert.equal(getStatusTone("approved"), "primary")
  assert.equal(getStatusTone("unknown_status"), "muted")
  assert.equal(getStatusTone(null), "muted")
})

test("status badge style C: soft background, status border, AA ink", () => {
  assert.match(statusBadgeVariants({ tone: "warning", size: "xs" }), /border-warning-border bg-warning-soft text-warning/)
  assert.match(statusBadgeVariants({ tone: "success" }), /border-success-border bg-success-soft text-success/)
  assert.match(statusBadgeVariants({ tone: "neutral" }), /bg-muted text-foreground/)
  assert.match(statusDotVariants({ tone: "danger" }), /bg-danger/)
})

test("custom DB colors only ever reach the dot, and only when they are safe hex colors", () => {
  assert.equal(getStatusDotColor("#16A34A"), "#16A34A")
  assert.equal(getStatusDotColor("#abc"), "#abc")
  for (const value of [null, undefined, "", "red", "#12", "#1234567", "url(x)", "#16A34A; color: red"]) {
    assert.equal(getStatusDotColor(value), undefined, String(value))
  }
})

test("StatusBadge applies custom color to the dot only", () => {
  const source = readFileSync("src/components/ui/status-badge.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /style=\{dotColor \? \{ backgroundColor: dotColor \} : undefined\}/)
  assert.doesNotMatch(source, /color: dotColor|style=\{\{ color/)
})
