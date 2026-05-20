import assert from "node:assert/strict"
import test from "node:test"

import { getMetricCardToneClasses, normalizeUiTone } from "../src/lib/design-system.ts"

test("normalizes supported UI tones with neutral fallback", () => {
  assert.equal(normalizeUiTone("success"), "success")
  assert.equal(normalizeUiTone("unknown"), "neutral")
})

test("returns stable metric card classes for each tone", () => {
  assert.equal(getMetricCardToneClasses("neutral").container, "border-border bg-surface")
  assert.match(getMetricCardToneClasses("warning").container, /border-warning/)
  assert.match(getMetricCardToneClasses("danger").value, /text-danger/)
})
