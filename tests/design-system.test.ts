import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import * as designSystem from "../src/lib/design-system.ts"
import { buttonVariants, linkVariants } from "../src/components/ui/button-variants.ts"
import { cn } from "../src/lib/utils.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

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
  assert.match(getMetricCardToneClasses("warning").container, /border-warning-border/)
  assert.equal(getMetricCardToneClasses("muted").container, "border-border bg-background")
})

test("returns shared panel, form control, and action button classes", () => {
  assert.match(getPanelClasses(), /border-border/)
  assert.match(getFieldControlClasses(), /focus:border-ring/)
  assert.doesNotMatch(getPanelClasses(), /shadow/)
  assert.match(getFieldControlClasses(), /border-input/)
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

const buttonVariantNames = ["default", "outline", "ghost", "danger", "destructive", "warning"] as const
const buttonSizeNames = ["sm", "md", "lg", "default", "icon-sm", "icon"] as const
const classList = (value: string) => value.split(/\s+/).filter(Boolean)

test("button variants keep 44px mobile touch targets and AA hover fills", () => {
  const primary = buttonVariants({ variant: "default" })
  assert.match(primary, /bg-primary text-primary-foreground/)
  assert.match(primary, /hover:bg-primary-hover/)
  assert.match(primary, /min-h-11/)
  assert.match(primary, /md:h-10 md:min-h-0/)
  assert.match(buttonVariants({ variant: "destructive" }), /bg-destructive text-destructive-foreground hover:bg-danger-hover/)
  assert.match(buttonVariants({ variant: "warning" }), /bg-warning text-warning-foreground hover:bg-warning-hover/)
  assert.match(buttonVariants({ variant: "outline" }), /border-control-border bg-surface/)
  assert.ok(classList(buttonVariants({ variant: "outline" })).includes("border"), "the base draws a 1px border")
  assert.match(buttonVariants({ size: "sm" }), /min-h-11 px-2\.5 text-meta md:h-8 md:min-h-0/)
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
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

test("button sizes: sm 32, md 36, lg 40 from md up, default stays lg until phase 2D, radius per spec I15", () => {
  assert.match(buttonVariants({ size: "md" }), /min-h-11 px-3\.5 text-sm md:h-9 md:min-h-0/)
  assert.match(buttonVariants({ size: "lg" }), /min-h-11 px-4 text-sm md:h-10 md:min-h-0/)
  assert.equal(buttonVariants({ size: "default" }), buttonVariants({ size: "lg" }), "phase 2D switches default to md")
  assert.match(buttonVariants({ size: "icon-sm" }), /min-h-11 min-w-11 md:size-8 md:min-h-0 md:min-w-0/)
  for (const size of ["sm", "icon-sm"] as const) {
    assert.ok(classList(buttonVariants({ size })).includes("rounded-control"), `${size} is a small control (6px)`)
    assert.doesNotMatch(buttonVariants({ size }), /rounded-md/, size)
  }
  for (const size of ["md", "lg", "default", "icon"] as const) {
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

test("safe action links look like a default Button but let long labels wrap", () => {
  const link = getSafeActionLinkClasses("secondary")
  assert.match(link, /border-control-border/)
  assert.match(link, /whitespace-normal/)
  assert.match(link, /md:min-h-10/)
  assert.ok(classList(link).includes("rounded-md"))
  for (const gone of ["whitespace-nowrap", "leading-snug", "md:h-10", "md:min-h-0"]) {
    assert.ok(!classList(link).includes(gone), `${gone} must be merged away`)
  }
  assert.match(getSafeActionLinkClasses("primary"), /bg-primary text-primary-foreground/)
})

test("the unused touch icon helper is gone (use Button size=\"icon\")", () => {
  assert.equal("getTouchIconButtonClasses" in designSystem, false)
})

test("legacy action button classes map onto shadcn variants", () => {
  assert.equal(getActionButtonClasses("primary", "md"), buttonVariants({ variant: "default", size: "default" }))
  assert.equal(getActionButtonClasses("secondary", "sm"), buttonVariants({ variant: "outline", size: "sm" }))
  assert.equal(getActionButtonClasses("danger"), buttonVariants({ variant: "destructive", size: "default" }))
  assert.equal(getActionButtonClasses("ghost"), buttonVariants({ variant: "ghost", size: "default" }))
})

// Plan 2B-5 Task 16 (spec 2B §10.6 row 2B-5, §5.10 #6, §10.4 table D): the storage tables moved onto DataTable (Task 3)
// and the report filter panel onto Button (Task 9), so nothing in src calls these two helpers. They stay, with their pins
// above, until phase 2D deletes them; their comments say so, and a new caller fails here.
test("getTableShellClasses and getActionButtonClasses have no caller left and say that phase 2D deletes them", () => {
  const callers = readSourceFiles("src").filter((file) => file.path !== "src/lib/design-system.ts" && /\bget(?:TableShell|ActionButton)Classes\b/.test(file.source))
  assert.deepEqual(callers.map((file) => file.path), [])
  const source = readFileSync("src/lib/design-system.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /\/\*\* @deprecated No caller since phase 2B plan 5 [^\n]*\*\/\nexport function getTableShellClasses\(\)/)
  assert.match(source, /\/\*\* @deprecated Use `buttonVariants` [^\n]*No caller since phase 2B plan 5[^\n]*\*\/\nexport function getActionButtonClasses\(/)
})
