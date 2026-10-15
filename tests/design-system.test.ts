import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import * as designSystem from "../src/lib/design-system.ts"
import { buttonVariants, linkVariants } from "../src/components/ui/button-variants.ts"
import { cn } from "../src/lib/utils.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

import { getFieldControlClasses, getPanelClasses } from "../src/lib/design-system.ts"

const getAssetStateTone = (designSystem as Record<string, unknown>).getAssetStateTone

test("returns shared panel and form control classes", () => {
  assert.match(getPanelClasses(), /border-border/)
  assert.match(getFieldControlClasses(), /focus:border-ring/)
  assert.doesNotMatch(getPanelClasses(), /shadow/)
  assert.match(getFieldControlClasses(), /border-input/)
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

const buttonVariantNames = ["default", "outline", "ghost", "danger", "destructive", "warning"] as const
const buttonSizeNames = ["sm", "md", "lg", "default", "icon-sm", "icon", "icon-lg"] as const
const classList = (value: string) => value.split(/\s+/).filter(Boolean)

test("button variants keep 44px mobile touch targets and AA hover fills", () => {
  const primary = buttonVariants({ variant: "default" })
  assert.match(primary, /bg-primary text-primary-foreground/)
  assert.match(primary, /hover:bg-primary-hover/)
  assert.match(primary, /min-h-11/)
  assert.match(primary, /md:h-9 md:min-h-0/)
  assert.match(buttonVariants({ variant: "destructive" }), /bg-destructive text-destructive-foreground hover:bg-danger-hover/)
  assert.match(buttonVariants({ variant: "warning" }), /bg-warning text-warning-foreground hover:bg-warning-hover/)
  assert.match(buttonVariants({ variant: "outline" }), /border-control-border bg-surface/)
  assert.ok(classList(buttonVariants({ variant: "outline" })).includes("border"), "the base draws a 1px border")
  assert.match(buttonVariants({ size: "sm" }), /min-h-11 px-2\.5 text-meta md:h-8 md:min-h-0/)
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-9 md:min-h-0 md:min-w-0/)
  assert.match(buttonVariants({ size: "icon-lg" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
})

test("every button variant and size keeps 44px below md, a 1px border, no opacity and no sm: breakpoint", () => {
  for (const variant of buttonVariantNames) {
    for (const size of buttonSizeNames) {
      const classes = buttonVariants({ variant, size })
      const label = `${variant}/${size}`
      assert.ok(classList(classes).includes("min-h-11"), `${label}: min-h-11`)
      assert.ok(classList(classes).includes("border"), `${label}: border`)
      assert.doesNotMatch(classes, /opacity|(?<![\w-])sm:(?:h-|min-h|size-)|dark:/, label)
      assert.equal(cn(classes), classes, `${label}: cn() must not drop a class (Button merges through cn)`)
    }
  }
})

test("the disabled look wins over every variant without opacity, and busy shares it through aria-disabled", () => {
  const classes = buttonVariants({ variant: "outline", size: "md" })
  assert.match(classes, /cursor-pointer/)
  assert.match(classes, /gap-1\.5/)
  assert.match(classes, /disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground/)
  assert.match(classes, /aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground/)
  assert.doesNotMatch(classes, /(?<![\w-])disabled:pointer-events-none/, "a disabled button must still show the not-allowed cursor")
})

test("button variants follow the mockup: outlined danger in pages, solid destructive for dialog confirms", () => {
  const danger = buttonVariants({ variant: "danger" })
  assert.match(danger, /border-danger-border bg-surface text-danger/)
  assert.match(danger, /hover:bg-danger-soft/)
  assert.match(danger, /active:border-danger/)
  assert.ok(!classList(danger).some((name) => name === "bg-danger" || name === "bg-destructive"), "danger is outlined, not solid")
  assert.match(buttonVariants({ variant: "default" }), /active:border-brand-navy active:bg-brand-navy/)
  assert.match(buttonVariants({ variant: "outline" }), /hover:border-input hover:bg-background active:border-input active:bg-muted/)
  assert.match(buttonVariants({ variant: "ghost" }), /border-transparent bg-transparent text-muted-foreground hover:bg-background hover:text-foreground active:bg-muted/)
  for (const variant of buttonVariantNames) {
    assert.doesNotMatch(buttonVariants({ variant }), /active:bg-accent/, variant)
  }
  assert.doesNotMatch(buttonVariants({ variant: "secondary" as never }), /bg-secondary/, "secondary was removed")
  assert.doesNotMatch(buttonVariants({ variant: "link" as never }), /underline/, "link moved to linkVariants")
})

test("button sizes from md up: sm 32, md 36, lg 40, default = md (phase 2D), icon 36, icon-lg 40, radius per spec I15", () => {
  assert.match(buttonVariants({ size: "md" }), /min-h-11 px-3\.5 text-sm md:h-9 md:min-h-0/)
  assert.match(buttonVariants({ size: "lg" }), /min-h-11 px-4 text-sm md:h-10 md:min-h-0/)
  assert.equal(buttonVariants({ size: "default" }), buttonVariants({ size: "md" }), "phase 2D: default is md (36px)")
  assert.notEqual(buttonVariants({ size: "icon" }), buttonVariants({ size: "icon-lg" }), "icon is 36px, icon-lg 40px beside 40px fields")
  assert.match(buttonVariants({ size: "icon-sm" }), /min-h-11 min-w-11 md:size-8 md:min-h-0 md:min-w-0/)
  for (const size of ["sm", "icon-sm"] as const) {
    assert.ok(classList(buttonVariants({ size })).includes("rounded-control"), `${size} is a small control (6px)`)
    assert.doesNotMatch(buttonVariants({ size }), /rounded-md/, size)
  }
  for (const size of ["md", "lg", "default", "icon", "icon-lg"] as const) {
    assert.ok(classList(buttonVariants({ size })).includes("rounded-md"), `${size} matches the fields (8px)`)
    assert.doesNotMatch(buttonVariants({ size }), /rounded-control/, size)
  }
})

test("linkVariants draws a text link that underlines on hover and focus, with no button box", () => {
  const link = linkVariants()
  assert.match(link, /text-primary/)
  assert.match(link, /text-meta/)
  assert.match(link, /decoration-transparent/)
  assert.match(link, /hover:decoration-current/)
  assert.match(link, /focus-visible:decoration-current/)
  assert.doesNotMatch(link, /min-h-|rounded|border/)
  assert.doesNotMatch(linkVariants({ size: "inherit" }), /text-meta/)
})

// Plan 2D-1 (spec 2D §4.1, D12, M3–M5): ActionButton, the legacy button maps and the class helpers with no caller are
// gone. The two safe-link callers moved to buttonVariants first (task 2b).
test("the legacy button and class helpers are gone (spec 2D §4.1)", () => {
  const gone = [
    "uiTones",
    "uiButtonVariants",
    "uiButtonSizes",
    "normalizeUiTone",
    "getMetricCardToneClasses",
    "getTableShellClasses",
    "getResponsiveTableScrollClasses",
    "getEmptyStateClasses",
    "getMobileSafeBottomPaddingClasses",
    "getActionButtonClasses",
    "getSafeActionLinkClasses",
    "getResponsiveActionRowClasses",
    "getTouchIconButtonClasses",
  ]
  for (const name of gone) assert.equal(name in designSystem, false, name)
  assert.equal(existsSync("src/components/ui/action-button.tsx"), false)
  const callers = readSourceFiles("src").filter((file) => /\bActionButton\b|\bget(?:SafeActionLink|ResponsiveActionRow|ActionButton|TableShell)Classes\b/.test(file.source))
  assert.deepEqual(callers.map((file) => file.path), [])
})
