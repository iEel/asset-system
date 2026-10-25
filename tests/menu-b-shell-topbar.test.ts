import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readRootTokens } from "../src/lib/color-contrast.ts"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
const L = "src/components/layout/"

test("the top bar is 56px, the same as --shell-topbar, and --shell-top adds the banner region (menu B shell §6.3, §6.7)", () => {
  assert.match(read(`${L}topbar.tsx`), /<header className="flex h-14 max-w-full shrink-0 items-center justify-between gap-1 border-b border-chrome-border bg-chrome px-3 sm:gap-2 sm:px-4">/)
  const css = read("src/app/globals.css")
  assert.match(css, /\n:root \{\n  --shell-topbar: 3\.5rem;\n  --shell-banner: 0px;\n  --shell-top: calc\(var\(--shell-topbar\) \+ var\(--shell-banner\)\);\n\}\n/)
  assert.equal(readRootTokens(css)["shell-top"], undefined, "a layout value outside the token block")
})

test("the top bar's right side reads scan (an icon), bell, language, theme; the user menu leaves the desktop (§6.3)", () => {
  const topbar = read(`${L}topbar.tsx`)
  assert.match(topbar, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "icon" \}\), "hidden lg:inline-flex"\)\}/)
  assert.match(topbar, /<ScanLine aria-hidden="true" className="size-5" \/>\n\s+<\/Link>/)
  assert.doesNotMatch(topbar, /xl:inline/)
  const at = ["asset-management/scan", "<NotificationBell user={user} />", "<DropdownMenuRadioGroup", "<ThemeToggle />", "{/* User Menu */}"].map((m) => topbar.indexOf(m))
  assert.ok(at.every((v, i) => v > 0 && (i === 0 || v > at[i - 1])), `order ${at}`)
  assert.match(topbar, /\{\/\* User Menu \*\/\}\n\s+<div className="relative shrink-0 lg:hidden">/)
})

test("a skip link comes first in the shell and moves focus to <main id=\"main\"> without changing the URL (§6.9)", () => {
  const shell = read(`${L}dashboard-shell.tsx`)
  assert.ok(shell.indexOf('href="#main"') > 0 && shell.indexOf('href="#main"') < shell.indexOf("<Sidebar"))
  assert.match(shell, /<a\s+href="#main"\s+onClick=\{skipToMain\}\s+className="sr-only focus:not-sr-only focus:fixed [^"]*"\s*>\s*\{tNav\("skipToContent"\)\}\s*<\/a>/)
  assert.match(shell, /event\.preventDefault\(\)\s+mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(shell, /<main\s+ref=\{mainRef\}\s+id="main"\s+tabIndex=\{-1\}\s+data-dashboard-main/)
  assert.match(shell, /"min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 outline-none sm:px-6 sm:py-6"/)
  assert.match(shell, /if \(!target \|\| target === main \|\| !main\.contains\(target\)\) return/)
  for (const [locale, text] of [["th", "ข้ามไปเนื้อหาหลัก"], ["en", "Skip to main content"]]) {
    assert.equal(JSON.parse(read(`messages/${locale}.json`)).nav.skipToContent, text, locale)
  }
})

test("main keeps what scrolls into view above the phone bottom bar (§6.9)", () => {
  assert.match(read(`${L}dashboard-shell.tsx`), /mobileFieldNavigationVisible && "scroll-pb-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\] lg:scroll-pb-0"/)
})

test("what is placed against the viewport starts under --shell-top; nothing in src still assumes the 64px bar (§6.3)", () => {
  const toaster = read("src/components/ui/app-toaster.tsx")
  assert.match(toaster, /const toasterTop = "calc\(var\(--shell-top\) \+ 8px\)"/)
  assert.match(toaster, /offset=\{\{ top: toasterTop, right: 16 \}\}/)
  assert.match(toaster, /mobileOffset=\{\{ top: toasterTop \}\}/)
  assert.match(read("src/components/audit/audit-scan-check-panel.tsx"), /"sticky top-4 flex max-h-\[calc\(100dvh_-_var\(--shell-top\)_-_3rem\)\] flex-col self-start"/)
  for (const page of ["src/app/[locale]/(dashboard)/access-denied/page.tsx", "src/app/[locale]/(dashboard)/error.tsx"]) {
    assert.match(read(page), /className="flex min-h-\[calc\(100dvh_-_var\(--shell-top\)_-_4rem\)\] items-center justify-center"/, page)
  }
  assert.deepEqual(findMatches(readSourceFiles("src"), /100dvh-[78]rem|\btop: 72\b|<header className="flex h-16/g), [])
})
