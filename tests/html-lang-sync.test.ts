import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

// A language switch made in the app is a soft navigation, so the root layout that renders <html lang> never re-renders.
// HtmlLangSync keeps the attribute on the page's locale, so a screen reader reads English with the English voice
// (WCAG 3.1.1; menu B shell task 13B loop 1).
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("<html lang> follows a language switch made in the app (WCAG 3.1.1)", () => {
  const sync = read("src/components/layout/html-lang-sync.tsx")
  assert.match(sync, /^"use client"\n/)
  assert.match(sync, /^export function HtmlLangSync\(\{ locale \}: \{ locale: string \}\) \{$/m)
  assert.match(sync, /useEffect\(\(\) => \{\s*if \(document\.documentElement\.lang !== locale\) document\.documentElement\.lang = locale\s*\}, \[locale\]\)/)
  assert.match(sync, /return null/)
  assert.doesNotMatch(sync, /addEventListener/)

  const layout = read("src/app/[locale]/layout.tsx")
  assert.match(layout, /^import \{ HtmlLangSync \} from "@\/components\/layout\/html-lang-sync"$/m)
  assert.match(layout, /const \{ locale \} = await params/)
  assert.match(layout, /<NextIntlClientProvider[^>]*>[\s\S]*?<HtmlLangSync locale=\{locale\} \/>[\s\S]*?<\/NextIntlClientProvider>/)

  assert.match(read("src/app/layout.tsx"), /<html lang=\{locale\}/)
})
