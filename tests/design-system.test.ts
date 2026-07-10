import assert from "node:assert/strict"
import test from "node:test"
import * as designSystem from "../src/lib/design-system.ts"

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

const getAssetStateTone = (designSystem as Record<string, unknown>).getAssetStateTone

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

test("maps seeded asset status and condition values to explicit semantic tones", () => {
  assert.equal(typeof getAssetStateTone, "function")
  if (typeof getAssetStateTone !== "function") return

  const resolveTone = getAssetStateTone as (value?: string | null) => string
  const cases: Array<[string | undefined, string]> = [
    ["Draft", "neutral"],
    ["Ready", "success"],
    ["In Use", "success"],
    ["Reserved", "info"],
    ["In Transit", "info"],
    ["Under Maintenance", "warning"],
    ["Pending Repair", "warning"],
    ["Under Inspection", "warning"],
    ["Checked Out", "warning"],
    ["Pending Disposal", "warning"],
    ["Lost", "danger"],
    ["Missing", "danger"],
    ["Disposed", "neutral"],
    ["Retired", "neutral"],
    ["New", "success"],
    ["Excellent", "success"],
    ["Good", "success"],
    ["Fair", "warning"],
    ["Poor", "danger"],
    ["Damaged", "danger"],
    ["Non-functional", "danger"],
    ["Salvage", "neutral"],
    ["Active", "success"],
    ["in_use", "success"],
    ["unknown legacy value", "info"],
    [undefined, "muted"],
  ]

  for (const [value, expectedTone] of cases) {
    assert.equal(resolveTone(value), expectedTone, value ?? "undefined")
  }
})
