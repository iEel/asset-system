import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readDarkTokens, readRootTokens } from "../src/lib/color-contrast.ts"
import { THEME_COLORS, THEME_COOKIE, nextThemeChoice, parseThemeChoice, themeColorFor, themeCookieString } from "../src/lib/theme.ts"

// Dark mode area S (spec docs/superpowers/specs/2026-10-17-dark-mode-design.md §4, §5.2 "Top bars"): the theme cookie,
// the <html> attribute, theme-color, the toggle, the chrome color, the login headings, the 404 page and the offline page.
// One test per commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

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
