import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { contrastRatio, parseHexColor, readDarkTokens, readRootTokens, resolveToken } from "../src/lib/color-contrast.ts"
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
  // The chrome color of each theme is that theme's --chrome (the topbar and the phone bottom bar; the navy menu has its own --sidebar).
  const css = read("src/app/globals.css")
  assert.equal(THEME_COLORS.light, readRootTokens(css).chrome)
  assert.equal(THEME_COLORS.dark, readDarkTokens(css).chrome)
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

test("the topbar and the phone bottom bar take the chrome color, the same white as today in light (menu B §6.1)", () => {
  const topbar = read(`${C}layout/topbar.tsx`)
  assert.match(topbar, /<header className="flex h-16 max-w-full shrink-0 items-center justify-between gap-1 border-b border-chrome-border bg-chrome px-3 sm:gap-2 sm:px-4">/)
  const nav = read(`${C}layout/mobile-field-navigation.tsx`)
  assert.match(nav, /className="fixed inset-x-0 bottom-0 z-20 border-t border-chrome-border bg-chrome px-2 pb-\[max\(0\.5rem,env\(safe-area-inset-bottom\)\)\] pt-1 lg:hidden"/)
  for (const source of [topbar, nav]) assert.doesNotMatch(source, /\bbg-surface\b|\bbg-sidebar\b/)
  // The inks and the focus ring of both bars sit on --chrome, in both token sets.
  const css = read("src/app/globals.css")
  for (const [theme, tokens] of [["light", readRootTokens(css)], ["dark", readDarkTokens(css)]] as const) {
    const chrome = resolveToken(tokens, "chrome")
    assert.equal(chrome, THEME_COLORS[theme], theme)
    for (const [ink, floor] of [["foreground", 4.5], ["muted-foreground", 4.5], ["primary", 4.5], ["ring", 3]] as const) {
      const ratio = contrastRatio(parseHexColor(resolveToken(tokens, ink)), parseHexColor(chrome))
      assert.ok(ratio >= floor, `${theme}: ${ink} on chrome is ${ratio.toFixed(2)}:1`)
    }
  }
})

test("the login headings take the foreground ink, and brand navy is a fill only, never text (dark mode spec §5.2 Brand navy)", () => {
  const login = read("src/app/[locale]/(auth)/login/page.tsx")
  // #0B1D35 instead of #083161 in light, so the page looks the same; in dark the headings stay readable on the panel.
  assert.match(login, /<h1 className="text-balance text-2xl font-bold text-foreground">\{tCommon\("appName"\)\}<\/h1>/)
  assert.match(login, /<h2 id="login-heading" className="mb-6 text-center text-xl font-semibold text-foreground">/)
  assert.deepEqual(findMatches(readSourceFiles("src"), /\btext-brand-navy\b/g), [])
})

test("the app's own 404 page follows the theme: tokens and the shared empty state inside the root layout (dark mode spec §4.5)", () => {
  const page = read("src/app/not-found.tsx")
  assert.doesNotMatch(page, /"use client"/)
  assert.match(page, /^export default async function NotFound\(\) \{$/m)
  assert.match(page, /const \[locale, t\] = await Promise\.all\(\[getLocale\(\), getTranslations\("common"\)\]\)/)
  assert.match(page, /<main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">/)
  assert.match(page, /<ActionEmptyState\n\s+icon=\{<SearchX \/>\}\n\s+title=\{t\("pageNotFoundTitle"\)\}\n\s+description=\{t\("pageNotFoundDescription"\)\}\n\s+actionHref=\{`\/\$\{locale\}`\}\n\s+actionLabel=\{t\("backToHome"\)\}\n\s+\/>/)
  assert.doesNotMatch(page, /<html|<body|style=|#[0-9A-Fa-f]{3,6}\b|\b(?:bg|text|border)-(?:white|black)\b/)
  // One 404 for the whole app, at the root: it catches unmatched URLs and every notFound(). No global-not-found (it
  // skips the root layout and its data-theme) and no global-error (it replaces the root layout, so it cannot read the choice).
  const special = readSourceFiles("src").map((file) => file.path).filter((path) => /\/(?:not-found|global-not-found|global-error)\.(?:tsx|ts|jsx|js)$/.test(path))
  assert.deepEqual(special, ["src/app/not-found.tsx"])
  assert.doesNotMatch(read("next.config.ts"), /globalNotFound/)
  // The root 404 renders outside src/app/[locale]/layout.tsx, so without next-intl's client provider: nothing it renders
  // may call a next-intl client hook (no test renders the page; Review Focus 5).
  assert.deepEqual(page.match(/^import .+$/gm), [
    'import { SearchX } from "lucide-react"',
    'import { getLocale, getTranslations } from "next-intl/server"',
    'import { ActionEmptyState } from "@/components/ui/action-empty-state"',
  ])
  for (const path of ["src/components/ui/action-empty-state.tsx", "src/components/ui/tone-icons.ts", "src/components/ui/button-variants.ts"]) {
    assert.doesNotMatch(read(path), /\buse(?:Translations|Locale|Messages|Formatter|Now|TimeZone)\(/, path)
  }
  const words = {
    th: ["ไม่พบหน้าที่ต้องการ", "ลิงก์อาจไม่ถูกต้อง หรือข้อมูลในหน้านี้ถูกลบหรือย้ายไปแล้ว", "กลับหน้าหลัก"],
    en: ["Page not found", "The link may be wrong, or what this page showed was removed or moved.", "Back to home"],
  }
  for (const [locale, [title, description, action]] of Object.entries(words)) {
    const common = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).common
    assert.deepEqual([common.pageNotFoundTitle, common.pageNotFoundDescription, common.backToHome], [title, description, action], locale)
  }
})

test("the offline page follows the OS with the app's light and dark colors, and the service worker caches the new copy (dark mode spec §4.5)", () => {
  const offline = read("public/offline.html")
  // It cannot read the theme cookie without a script, so it follows the OS: color-scheme and theme-color for both.
  assert.match(offline, /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#FFFFFF" \/>\n\s+<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="(#[0-9A-F]{6})" \/>/)
  assert.equal(offline.match(/<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="(#[0-9A-F]{6})"/)?.[1], THEME_COLORS.dark)
  assert.match(offline, /:root \{\n\s+color-scheme: light dark;/)
  assert.doesNotMatch(offline, /only light|<script/)
  const darkAt = offline.indexOf("@media (prefers-color-scheme: dark) {")
  assert.ok(darkAt > offline.indexOf("<style>") && darkAt < offline.indexOf("</style>"), "one dark block inside the page's style")
  const css = read("src/app/globals.css")
  const color = (block: string, selector: string, property: string) =>
    block.match(new RegExp(`(?:^|\\n)\\s*${selector} \\{[^}]*?(?:^|[\\s;{])${property}:[^;]*?(#[0-9a-f]{6});`))?.[1]?.toUpperCase()
  const schemes = [
    { theme: "light", block: offline.slice(0, darkAt), tokens: readRootTokens(css), border: "border", hint: "brand-navy" },
    { theme: "dark", block: offline.slice(darkAt), tokens: readDarkTokens(css), border: "border-color", hint: "foreground" },
  ] as const
  for (const { theme, block, tokens, border, hint } of schemes) {
    const expected: Array<[string, string, string]> = [
      [":root", "background", "canvas"],
      [":root", "color", "foreground"],
      ["main", border, "border"],
      ["main", "background", "card"],
      ["p", "color", "muted-foreground"],
      ["\\.hint", "background", "primary-soft"],
      ["\\.hint", "color", hint],
    ]
    for (const [selector, property, token] of expected) {
      assert.equal(color(block, selector, property), resolveToken(tokens, token), `${theme}: ${selector} ${property} is --${token}`)
    }
    const ratio = (ink: string, surface: string) => contrastRatio(parseHexColor(resolveToken(tokens, ink)), parseHexColor(resolveToken(tokens, surface)))
    for (const [ink, surface] of [["foreground", "canvas"], ["muted-foreground", "card"], [hint, "primary-soft"]]) {
      assert.ok(ratio(ink, surface) >= 4.5, `${theme}: ${ink} on ${surface}`)
    }
  }
  // A new cache name, so installed apps drop the light-only copy they precached.
  assert.match(read("public/sw.js"), /^const ASSET_SYSTEM_PWA_CACHE = "asset-system-pwa-v3"$/m)
})
