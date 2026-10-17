import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  contrastRatio,
  parseHexColor,
  readBlockDeclarations,
  readDarkTokens,
  readRootTokens,
  relativeLuminance,
  resolveToken,
} from "../src/lib/color-contrast.ts"

// Dark mode, area T: the token sets and the theme rules of src/app/globals.css (spec 2026-10-17 §4.3, §4.4, §5, §6.1).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const globals = () => read("src/app/globals.css")
// Not colors: the dark blocks re-declare these effects next to the color tokens; their light values live in @theme.
const EFFECTS = ["color-scrim", "elevation-overlay", "halo-field-focus", "halo-field-error", "select-chevron-image"]
const MEDIA_DARK = '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {'
// The light :root block of 87e4756 (FIXED INTERFACE 6): this plan adds light tokens and changes none.
const LIGHT_AT_BASE: Record<string, string> = {
  "brand-navy": "#083161", "brand-accent": "#18A0A8", "canvas": "#EEF1F6", "background": "#F6F8FB", "foreground": "#0B1D35",
  "card": "#FFFFFF", "card-foreground": "#0B1D35", "surface": "var(--card)", "popover": "#FFFFFF", "popover-foreground": "#0B1D35",
  "primary": "#1E4F94", "primary-foreground": "#FFFFFF", "primary-soft": "#E9EFF8", "primary-hover": "#173E76", "primary-border": "#BACBE4",
  "secondary": "#E9EEF5", "secondary-foreground": "#0B1D35", "muted": "#E9EEF5", "muted-foreground": "#3C4F6B", "faint-foreground": "#56677F",
  "neutral-ink": "#2A4468", "accent": "#EBF0F7", "accent-foreground": "#0B1D35", "row-hover": "#F3F6FB", "border": "#D7DEE8",
  "border-soft": "#E7EBF1", "control-border": "#C3CDDA", "input": "#7C8BA0", "ring": "#10858D",
  "success": "#1D7A35", "success-foreground": "#FFFFFF", "success-soft": "#ECF7EF", "success-border": "#B3DCBF", "success-hover": "#17652C",
  "warning": "#A14A05", "warning-foreground": "#FFFFFF", "warning-soft": "#FDF4E4", "warning-border": "#EDCB93", "warning-hover": "#843C04",
  "danger": "#B3261E", "danger-foreground": "#FFFFFF", "danger-soft": "#FCEFEE", "danger-border": "#F1BEB9", "danger-hover": "#931F18",
  "destructive": "var(--danger)", "destructive-foreground": "var(--danger-foreground)",
  "info": "#0A6E75", "info-foreground": "#FFFFFF", "info-soft": "#E5F4F5", "info-border": "#A3D8DB", "info-hover": "#085A60",
  "sidebar": "#FFFFFF", "sidebar-foreground": "#1F3657", "sidebar-muted": "#586A84", "sidebar-hover": "#EBF0F7", "sidebar-active": "#083161",
  "sidebar-active-foreground": "#FFFFFF", "sidebar-active-icon": "#18A0A8", "sidebar-border": "#D7DEE8", "radius": "0.5rem",
}

test("the dark set has every light token as #RRGGBB, in two identical copies, with the elevation of direction A (dark mode task T1)", () => {
  const css = globals()
  const light = readRootTokens(css)
  const dark = readDarkTokens(css)
  const names = Object.keys(light).filter((name) => name !== "radius")
  assert.deepEqual(Object.keys(dark).filter((name) => !EFFECTS.includes(name)).sort(), [...names].sort(), "the same token names in both sets")
  for (const name of names) {
    if (light[name].startsWith("var(")) assert.equal(dark[name], light[name], `--${name} stays the same alias`)
    else assert.match(dark[name], /^#[0-9A-F]{6}$/, `--${name} is #RRGGBB`)
  }
  assert.ok(css.indexOf(":root {") < css.indexOf(':root[data-theme="dark"] {'), "the light token block stays first")
  assert.ok(css.includes(MEDIA_DARK), "the copy for a dark OS, on a root that is not forced light")
  assert.deepEqual(readBlockDeclarations(css, ':root:not([data-theme="light"])'), readBlockDeclarations(css, ':root[data-theme="dark"]'), "the two dark copies are identical")
  // The light theme looks as it did (Review Focus 1): every light value of 87e4756 stays while the dark set is tuned; the
  // plan only adds --image-stage (here) and --app-icon-frame (Task 5, P1).
  const added = ["image-stage", "app-icon-frame"]
  assert.deepEqual(Object.fromEntries(Object.entries(light).filter(([name]) => !added.includes(name))), LIGHT_AT_BASE, "the light values of 87e4756")
  // Elevation (spec §5.2): the canvas is darkest, the wells (background) sit darker than the panels, menus a step lighter,
  // and the chrome (sidebar, topbar, bottom bar) sits between the canvas and the panels.
  const luminance = (name: string) => relativeLuminance(parseHexColor(resolveToken(dark, name)))
  const steps = ["canvas", "background", "card", "popover"]
  for (let index = 1; index < steps.length; index++) {
    assert.ok(luminance(steps[index - 1]) < luminance(steps[index]), `dark --${steps[index - 1]} must be darker than --${steps[index]}`)
  }
  assert.ok(luminance("canvas") < luminance("sidebar") && luminance("sidebar") < luminance("card"), "dark chrome sits between the canvas and the panels")
  // Roles (the light ones: tests/modern-enterprise-theme.test.ts). The selected menu row stays navy with the brand teal
  // icon; the pressed primary fill (active:bg-brand-navy) is darker than the action blue, whose hover is lighter.
  assert.equal(dark["sidebar-active-icon"], dark["brand-accent"], "the selected menu icon carries the brand teal")
  assert.notEqual(dark["sidebar-active"], dark.sidebar, "the selected menu row stands out from the sidebar")
  assert.ok(luminance("brand-navy") < luminance("primary") && luminance("primary") < luminance("primary-hover"), "pressed, rest and hover keep their order")
  for (const [set, tokens] of [["light", light], ["dark", dark]] as const) {
    const ratio = (a: string, b: string) => contrastRatio(parseHexColor(resolveToken(tokens, a)), parseHexColor(resolveToken(tokens, b)))
    assert.ok(ratio("muted", "card") >= 1.15, `${set}: skeleton blocks (muted) show on a panel`)
    assert.ok(ratio("foreground", "primary-border") >= 4.5, `${set}: selected text (::selection) is AA`)
    assert.ok(relativeLuminance(parseHexColor(resolveToken(tokens, "image-stage"))) > 0.5, `${set}: photos and logos sit on a light stage`)
  }
})
