import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readBlockTokens, readDarkTokens, readRootTokens } from "../src/lib/color-contrast.ts"

// Dark mode, area D (spec docs/superpowers/specs/2026-10-17-dark-mode-design.md §6.3): the design docs state the
// two-theme rule and record the dark set as src/app/globals.css declares it. "Light Only" stays out of the three
// canonical docs (DESIGN.md, docs/14, .impeccable/design.json); DEVELOPER_HANDOFF.md and docs/99_CHANGELOG.md are dated
// history. One test per docs commit; each fails before its commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const lightOnlyLines = (path: string) =>
  read(path)
    .split("\n")
    .flatMap((line, index) => (/\blight[ -]only\b/i.test(line) ? [`${path}:${index + 1}`] : []))
const globals = () => read("src/app/globals.css")
const isHex = (value: string) => /^#[0-9A-F]{6}$/.test(value)

test("DESIGN.md: the two-theme rule replaces Light Only, surfaces are named by role, and the dark set is as globals.css declares it (dark mode task 20, D1)", () => {
  assert.deepEqual(lightOnlyLines("DESIGN.md"), [])
  const design = read("DESIGN.md")
  assert.match(design, /\n\*\*The Two-Theme Rule\.\*\* The app has a light and a dark theme from one set of token names/)
  for (const fact of [
    /writes the `theme` cookie \(`light` or `dark`, one year, `Path=\/`, `SameSite=Lax`, per browser; logging out keeps it\)/,
    /renders the choice as `data-theme` on `<html>` \(no attribute: follow the OS\)/,
    /there is no `\.dark` block, no `@custom-variant dark` and no `dark:` class/,
    /one forced-light scope `\[data-theme="light"\]`/,
    /one `@media print` reset that makes every page light/,
    /`color-scheme` is `light dark` on a root with no choice, `dark` for a dark choice and `only light` in the forced-light scope and in print/,
    /carry `data-theme="light"` \(exactly these four, `tests\/dark-mode-p\.test\.ts`\)/,
    /`tests\/design-tokens-contrast\.test\.ts` runs every contrast rule on both sets/,
  ]) assert.match(design, fact)
  assert.match(design, /\n- \*\*Don't\*\* bring back a dark navy sidebar in the light theme /, "the navy sidebar Don't is scoped to the light theme")
  assert.match(design, /\n- \*\*Don't\*\* write a `dark:` class, a color for one theme or a component that reads the theme/)
  assert.match(design, /The theme toggle \(`ThemeToggle`, `src\/components\/layout\/theme-toggle\.tsx`/, "§5 Navigation: the toggle")
  // Surfaces are named by their role or their theme, not as white. White stays only where it is white in both themes
  // (the signature sheet, the selected row's text) or names the light theme.
  assert.doesNotMatch(design, /\bwhite (?:sidebar|topbar|panels?|card|frame|fill|header|box|body)\b|\bon white\b|Surface White|White-text|\*\*(?:Topbar|Sheets):\*\* white|\(white, |bodies are white|headers are white|`border`, white\b|\), white, /i)
  // §2 Dark Theme records every #RRGGBB token of the dark block once, with the value globals.css declares.
  const start = design.indexOf("\n### Dark Theme\n")
  assert.ok(start > design.indexOf("\n## 2. Colors\n") && start < design.indexOf("\n### Non-color values\n"), "Dark Theme sits in §2, before the non-color values")
  const section = design.slice(start, design.indexOf("\n### ", start + 1))
  const recorded: Record<string, string> = {}
  for (const [, name, value] of section.matchAll(/`--([a-z-]+)` (#[0-9A-F]{6})\b/g)) recorded[name] = value
  const css = globals()
  const dark = readDarkTokens(css)
  assert.deepEqual(recorded, Object.fromEntries(Object.entries(dark).filter(([, value]) => isHex(value))))
  // The two new tokens join the frontmatter with their light values, after the sidebar.
  const light = readRootTokens(css)
  assert.ok(design.includes(`\n  sidebar-border: "${light["sidebar-border"]}"\n  image-stage: "${light["image-stage"]}"\n  app-icon-frame: "${light["app-icon-frame"]}"\n`), "frontmatter: image-stage and app-icon-frame")
  // The effect values the text quotes are the ones of @theme (light) and of the dark block.
  const theme = readBlockTokens(css, "@theme")
  for (const name of ["color-scrim", "elevation-overlay", "halo-field-focus", "halo-field-error"]) {
    assert.ok(design.includes(`\`${theme[name]}\``), `the light --${name}`)
    assert.ok(design.includes(`\`${dark[name]}\``), `the dark --${name}`)
  }
  const stroke = (value: string) => `#${value.match(/stroke='%23([0-9A-Fa-f]{6})'/)?.[1]}`
  assert.ok(design.includes(`stroke ${stroke(theme["select-chevron-image"])} in \`@theme\` and ${stroke(dark["select-chevron-image"])} in the dark blocks`), "the chevron strokes")
})

test("docs/14 and .impeccable/design.json follow the two themes, with the dark values globals.css declares (dark mode task 21, D2)", () => {
  assert.deepEqual([...lightOnlyLines("docs/14_UI_UX_DESIGN_SYSTEM.md"), ...lightOnlyLines(".impeccable/design.json")], [])
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.ok(!index.includes("White sidebar with sections and a light topbar"), "Adaptive Presentation: the chrome in both themes")
  assert.match(index, /Both themes come from the same tokens \(The Two-Theme Rule in \[`DESIGN\.md` §2\]\(\.\.\/DESIGN\.md#2-colors\)\)/)
  assert.match(index, /\n\| An uploaded photo, logo or attachment image \| `bg-image-stage` on the image element \|/)
  assert.match(index, /\n\| Paper that must stay light in the dark theme \| `data-theme="light"` on the paper element \|/)
  assert.match(index, /\n\| Themes \(light and dark\) \| \[`2026-10-17-dark-mode-design\.md`\]\(superpowers\/specs\/2026-10-17-dark-mode-design\.md\) .+ \| \[`2026-10-17-dark-mode\.md`\]\(superpowers\/plans\/2026-10-17-dark-mode\.md\) /, "Current-Surface Registry: the Dark Mode row")
  assert.match(index, /\n- Check light and dark, and with no choice the OS emulated both ways; print preview stays light/)

  type Design = {
    extensions: {
      colorMeta: Record<string, { canonical: string; dark?: string }>
      shadows: Array<{ name: string; value: string; darkValue?: string }>
    }
    components: Array<{ name: string; description: string }>
    narrative: { rules: Array<{ name: string; body: string }>; dos: string[]; donts: string[] }
  }
  const design = JSON.parse(read(".impeccable/design.json")) as Design
  const css = globals()
  const light = readRootTokens(css)
  const dark = readDarkTokens(css)
  const theme = readBlockTokens(css, "@theme")
  // Each color records its light value as canonical and its dark value beside it, as the token blocks declare them.
  const TOKEN: Record<string, string> = { "soft-system-background": "background", "primary-slate-ink": "foreground" }
  for (const [key, entry] of Object.entries(design.extensions.colorMeta)) {
    const token = TOKEN[key] ?? key
    assert.deepEqual([key, entry.canonical, entry.dark], [key, light[token], dark[token]])
  }
  // Each shadow: its light value in @theme, its dark value in the dark block.
  const EFFECT: Record<string, string> = { "overlay": "elevation-overlay", "field-focus": "halo-field-focus", "field-error": "halo-field-error" }
  assert.deepEqual(design.extensions.shadows.map((shadow) => shadow.name).sort(), Object.keys(EFFECT).sort())
  for (const shadow of design.extensions.shadows) {
    const name = EFFECT[shadow.name]
    assert.deepEqual([shadow.name, shadow.value, shadow.darkValue], [shadow.name, theme[name], dark[name]])
  }
  const names = design.narrative.rules.map((rule) => rule.name)
  assert.equal(names.indexOf("The Two-Theme Rule"), names.indexOf("The Token Contrast Rule") + 1, "after The Token Contrast Rule, as in DESIGN.md §2")
  const rule = design.narrative.rules.find((entry) => entry.name === "The Two-Theme Rule")?.body ?? ""
  assert.match(rule, /Components use tokens only: no dark: class and no @custom-variant dark\./)
  assert.match(rule, /one forced-light \[data-theme="light"\] scope and one print reset/)
  assert.ok(rule.includes(`--image-stage ${light["image-stage"]} in both themes`) && light["image-stage"] === dark["image-stage"], "the image stage")
  assert.ok(rule.includes(`--app-icon-frame hairline, ${light["app-icon-frame"]} in light and ${dark["app-icon-frame"]} in dark`), "the app icon frame")
  assert.ok(rule.includes(`the dark ink ${dark["primary-foreground"]}`), "the dark ink of the solid fills")
  assert.ok(design.narrative.dos.some((entry) => entry.startsWith("Do keep navy #083161 for the logo and the selected menu row in the light theme,")))
  assert.ok(design.narrative.donts.some((entry) => entry.startsWith("Don't bring back a dark navy sidebar in the light theme ")))
  assert.ok(design.narrative.donts.some((entry) => entry.startsWith("Don't write a dark: class, a color for one theme or a component that reads the theme")))
  // Surfaces are named by role in the prose (the css examples keep the light values).
  const prose = [...design.components.map((entry) => entry.description), ...design.narrative.rules.map((entry) => entry.body)].join("\n")
  assert.doesNotMatch(prose, /\bwhite (?:sidebar|frame|header|body)\b|\bon white\b|White fill/)
})
