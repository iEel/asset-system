import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readDarkTokens, readRootTokens } from "../src/lib/color-contrast.ts"
import { THEME_COLORS, THEME_COOKIE, nextThemeChoice, parseThemeChoice, themeColorFor, themeCookieString } from "../src/lib/theme.ts"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

// Dark mode area S (spec docs/superpowers/specs/2026-10-17-dark-mode-design.md §4, §5.2 "Top bars"): the theme cookie,
// the <html> attribute, theme-color, the toggle, the chrome color, the login headings, the 404 page and the offline page.
// One test per commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("the theme cookie holds light or dark for a year, and anything else follows the OS (dark mode spec §4.2, §4.3)", () => {
  assert.equal(THEME_COOKIE, "theme")
  assert.equal(parseThemeChoice("light"), "light")
  assert.equal(parseThemeChoice("dark"), "dark")
  for (const value of [undefined, null, "", "system", "Dark", " dark", "light;"]) assert.equal(parseThemeChoice(value), null, String(value))
  assert.equal(themeCookieString("dark"), "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax")
  assert.equal(themeCookieString("light"), "theme=light; Path=/; Max-Age=31536000; SameSite=Lax")
  // The chrome color of each theme is that theme's --sidebar (the topbar and the phone bottom bar take it too).
  const css = read("src/app/globals.css")
  assert.equal(THEME_COLORS.light, readRootTokens(css).sidebar)
  assert.equal(THEME_COLORS.dark, readDarkTokens(css).sidebar)
  // theme-color: an explicit choice is one color; following the OS is the media pair.
  assert.equal(themeColorFor("light"), THEME_COLORS.light)
  assert.equal(themeColorFor("dark"), THEME_COLORS.dark)
  assert.deepEqual(themeColorFor(null), [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ])
  // A press switches away from the theme on screen: the <html> attribute when it is set, else the OS.
  assert.equal(nextThemeChoice("light", true), "dark")
  assert.equal(nextThemeChoice("dark", false), "light")
  assert.equal(nextThemeChoice(undefined, true), "light")
  assert.equal(nextThemeChoice(undefined, false), "dark")
  assert.equal(nextThemeChoice("system", true), "light")
  // Plain helpers: tests import the module, and the server layout and the client toggle share it. No unquoted dark key
  // either: tests/ui-overlay-guards.test.ts bans the variant prefix in all of src, object keys included.
  assert.doesNotMatch(read("src/lib/theme.ts"), /from "@\/|"use client"|\bdocument\.|\bwindow\.|\bdark:/)
})

test("the root layout renders the cookie's choice on <html>, and no attribute while the page follows the OS (dark mode spec §4.2, §4.3)", () => {
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /^import \{ cookies \} from "next\/headers"$/m)
  assert.match(layout, /^import \{ THEME_COOKIE, parseThemeChoice(?:, themeColorFor)? \} from "@\/lib\/theme"$/m)
  assert.match(layout, /\nasync function readThemeChoice\(\) \{\n  return parseThemeChoice\(\(await cookies\(\)\)\.get\(THEME_COOKIE\)\?\.value\)\n\}\n/)
  assert.match(layout, /const \[locale, themeChoice\] = await Promise\.all\(\[getLocale\(\), readThemeChoice\(\)\]\)/)
  // React leaves out an undefined attribute, so with no cookie <html> has no data-theme and the CSS follows the OS.
  assert.match(layout, /<html lang=\{locale\} data-theme=\{themeChoice \?\? undefined\} suppressHydrationWarning className=\{`\$\{plexSans\.variable\} \$\{thaiSans\.variable\} \$\{plexMono\.variable\}`\}>/)
  // No inline script and no theme package: the server attribute and the CSS media query decide the first paint.
  assert.doesNotMatch(layout, /<script|dangerouslySetInnerHTML|next-themes|ThemeProvider/)
  assert.equal(layout.match(/<html\b/g)?.length, 1)
  // Every page reads the choice (Review Focus 2): a route rendered at build time or from a cache would ship the HTML of no
  // choice, and the browser would follow the OS whatever the cookie says. Nothing in src/app outside the API opts out of
  // rendering per request, and Cache Components stays off.
  const pages = readSourceFiles("src/app").filter((file) => !file.path.startsWith("src/app/api/"))
  assert.deepEqual(findMatches(pages, /export const dynamic = "force-static"|\bgenerateStaticParams\b|export const revalidate\b|"use cache"/g), [])
  assert.doesNotMatch(read("next.config.ts"), /cacheComponents|dynamicIO/)
})

test("theme-color is one chrome color for a choice and the light/dark pair while following the OS; the manifest stays light (dark mode spec §3, §4.3)", async () => {
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /^import \{ THEME_COOKIE, parseThemeChoice, themeColorFor \} from "@\/lib\/theme"$/m)
  assert.doesNotMatch(layout, /export const viewport\b|themeColor: "#/)
  assert.match(layout, /\nexport async function generateViewport\(\): Promise<Viewport> \{\n  return \{\n    width: "device-width",\n    initialScale: 1,\n    viewportFit: "cover",\n    themeColor: themeColorFor\(await readThemeChoice\(\)\),\n  \}\n\}\n/)
  // The web manifest and the iOS status bar are static, so they keep the light chrome (a non-goal of the spec).
  const { default: manifest } = await import("../src/app/manifest.ts")
  assert.equal(manifest().theme_color, THEME_COLORS.light)
  assert.match(layout, /statusBarStyle: "default"/)
})

test("the theme toggle sits beside the language button and shows the moon while light, the sun while dark, from the first paint (dark mode spec §4.1)", () => {
  const toggle = read(`${C}layout/theme-toggle.tsx`)
  assert.match(toggle, /^"use client"\n/)
  assert.match(toggle, /^export function ThemeToggle\(\) \{$/m)
  assert.match(toggle, /^import \{ THEME_COLORS, nextThemeChoice, themeCookieString \} from "@\/lib\/theme"$/m)
  // One ghost icon button, the size of the topbar's other icon buttons (44px below md, 36px from md). Both faces render
  // and globals.css hides one, so its name is the shown face's text and nothing is left to set after hydration.
  assert.equal(toggle.match(/<Button variant="ghost" size="icon" onClick=\{switchTheme\}>/g)?.length, 1)
  assert.match(toggle, /<Moon aria-hidden="true" data-when-theme="light" className="size-5" \/>\n\s+<Sun aria-hidden="true" data-when-theme="dark" className="size-5" \/>\n\s+<span data-when-theme="light" className="sr-only">\{t\("switchToDark"\)\}<\/span>\n\s+<span data-when-theme="dark" className="sr-only">\{t\("switchToLight"\)\}<\/span>/)
  assert.doesNotMatch(toggle, /aria-label|title=|useState|useEffect|useSyncExternalStore|router\.refresh|\bdark:/)
  // A press: the other theme from the one on screen goes on <html>, into the cookie and into theme-color, at once.
  assert.match(toggle, /const next = nextThemeChoice\(root\.dataset\.theme, window\.matchMedia\("\(prefers-color-scheme: dark\)"\)\.matches\)/)
  assert.match(toggle, /root\.dataset\.theme = next\n\s+document\.cookie = themeCookieString\(next\)/)
  assert.match(toggle, /document\.querySelectorAll<HTMLMetaElement>\('meta\[name="theme-color"\]'\)\) \{\n\s+meta\.content = THEME_COLORS\[next\]\n\s+meta\.removeAttribute\("media"\)/)
  // globals.css shows one face: the theme set on <html>, else the OS. Unlayered, so it beats the faces' utilities.
  const css = read("src/app/globals.css")
  const faces = '\n:root[data-theme="dark"] [data-when-theme="light"],\n:root[data-theme="light"] [data-when-theme="dark"] {\n  display: none;\n}\n'
  assert.ok(css.includes(faces), "the faces of an explicit choice")
  assert.ok(css.includes('\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) [data-when-theme="light"] {\n    display: none;\n  }\n}\n'), "the OS is dark")
  assert.ok(css.includes('\n@media (prefers-color-scheme: light) {\n  :root:not([data-theme]) [data-when-theme="dark"] {\n    display: none;\n  }\n}\n'), "the OS is light")
  const facesAt = css.indexOf(faces)
  const layerOpen = css.lastIndexOf("@layer", facesAt)
  assert.ok(layerOpen === -1 || css.indexOf("\n}", layerOpen) < facesAt, "the face rules sit outside every @layer")
  // In the topbar, directly after the language menu and before the user menu (the mockup's "TH" then the toggle).
  const topbar = read(`${C}layout/topbar.tsx`)
  assert.match(topbar, /^import \{ ThemeToggle \} from "@\/components\/layout\/theme-toggle"$/m)
  assert.match(topbar, /<span lang="en">English<\/span>[\s\S]*?<\/DropdownMenu>\n {8}<\/div>\n\n {8}<ThemeToggle \/>\n\n {8}\{\/\* User Menu \*\/\}/)
  assert.equal(topbar.match(/<ThemeToggle \/>/g)?.length, 1)
  // The login page has no topbar and no toggle: it follows the cookie or the OS.
  assert.doesNotMatch(read("src/app/[locale]/(auth)/login/page.tsx"), /ThemeToggle/)
  // Components never learn which theme is on (spec G6), and nothing but the toggle writes the cookie, so logging out keeps
  // the choice (spec §4.1, U5; Review Focus 3): only the theme module, the root layout and the toggle read the OS
  // setting, the <html> attribute or the cookie.
  const themeAware = ["src/lib/theme.ts", "src/app/layout.tsx", `${C}layout/theme-toggle.tsx`]
  assert.deepEqual(
    findMatches(readSourceFiles("src"), /prefers-color-scheme|dataset\.theme|\bTHEME_COOKIE\b|\bcookies\(\)|["'`]theme[="'`;]|from "@\/lib\/theme"/g, (path) => themeAware.includes(path)),
    [],
  )
  for (const [locale, toDark, toLight] of [["th", "เปลี่ยนเป็นโหมดมืด", "เปลี่ยนเป็นโหมดสว่าง"], ["en", "Switch to dark mode", "Switch to light mode"]]) {
    const common = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).common
    assert.equal(common.switchToDark, toDark, locale)
    assert.equal(common.switchToLight, toLight, locale)
  }
})
