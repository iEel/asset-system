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
