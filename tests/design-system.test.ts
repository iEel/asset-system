import assert from "node:assert/strict"
import test from "node:test"
import * as designSystem from "../src/lib/design-system.ts"
import { buttonVariants } from "../src/components/ui/button-variants.ts"

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

test("button variants keep 44px mobile touch targets and AA hover fills", () => {
  const primary = buttonVariants({ variant: "default" })
  assert.match(primary, /bg-primary text-primary-foreground/)
  assert.match(primary, /hover:bg-primary-hover/)
  assert.match(primary, /min-h-11/)
  assert.match(primary, /sm:h-10 sm:min-h-0/)
  assert.match(buttonVariants({ variant: "destructive" }), /bg-destructive text-destructive-foreground hover:bg-danger-hover/)
  assert.match(buttonVariants({ variant: "warning" }), /bg-warning text-warning-foreground hover:bg-warning-hover/)
  assert.match(buttonVariants({ variant: "outline" }), /border border-border bg-surface/)
  assert.match(buttonVariants({ size: "sm" }), /min-h-11 px-3 text-xs sm:h-8 sm:min-h-0/)
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
})

test("legacy action button classes map onto shadcn variants", () => {
  assert.equal(getActionButtonClasses("primary", "md"), buttonVariants({ variant: "default", size: "default" }))
  assert.equal(getActionButtonClasses("secondary", "sm"), buttonVariants({ variant: "outline", size: "sm" }))
  assert.equal(getActionButtonClasses("danger"), buttonVariants({ variant: "destructive", size: "default" }))
  assert.equal(getActionButtonClasses("ghost"), buttonVariants({ variant: "ghost", size: "default" }))
})
