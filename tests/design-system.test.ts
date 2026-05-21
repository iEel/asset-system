import assert from "node:assert/strict"
import test from "node:test"

import {
  getActionButtonClasses,
  getResponsiveActionRowClasses,
  getSafeActionLinkClasses,
  getEmptyStateClasses,
  getFieldControlClasses,
  getMetricCardToneClasses,
  getPanelClasses,
  getTableShellClasses,
  normalizeUiTone,
} from "../src/lib/design-system.ts"

test("normalizes supported UI tones with neutral fallback", () => {
  assert.equal(normalizeUiTone("success"), "success")
  assert.equal(normalizeUiTone("unknown"), "neutral")
})

test("returns stable metric card classes for each tone", () => {
  assert.equal(getMetricCardToneClasses("neutral").container, "border-border bg-surface")
  assert.match(getMetricCardToneClasses("warning").container, /border-warning/)
  assert.match(getMetricCardToneClasses("danger").value, /text-danger/)
})

test("returns shared panel, form control, and action button classes", () => {
  assert.match(getPanelClasses(), /border-border/)
  assert.match(getFieldControlClasses(), /focus:border-primary/)
  assert.match(getActionButtonClasses("primary"), /bg-primary/)
  assert.match(getActionButtonClasses("secondary", "sm"), /h-8/)
  assert.match(getSafeActionLinkClasses("primary"), /min-h-11/)
  assert.match(getSafeActionLinkClasses("secondary"), /focus-visible:ring-2/)
  assert.match(getResponsiveActionRowClasses(), /flex-col/)
  assert.match(getTableShellClasses(), /overflow-hidden/)
  assert.match(getEmptyStateClasses(), /text-center/)
})
