import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const pagePath = "src/app/[locale]/(auth)/login/page.tsx"

test("login page is a server wrapper for normalized query state", () => {
  const source = readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /^"use client"/)
  assert.match(source, /params: Promise<\{ locale: string \}>/)
  assert.match(source, /searchParams: Promise<LoginSearchParams>/)
  assert.match(source, /normalizeLoginCallbackUrl/)
  assert.match(source, /isSessionExpiredLogin/)
  assert.match(source, /process\.env\.AUTH_URL/)
  assert.match(source, /<LoginForm callbackUrl=\{callbackUrl\} \/>/)
  assert.match(source, /<Notice tone="info" role="status" aria-live="polite">\n\s+\{tAuth\("sessionExpired"\)\}\n\s+<\/Notice>/)
})

test("login page: the navy frame comes from token classes, the card from the surface tokens, and the one h1 is the card title (spec §8)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /login-backdrop/)
  assert.match(source, /login-glow/)
  assert.match(source, /login-pattern/)
  assert.match(source, /bg-surface/)
  assert.match(source, /border-border/)
  assert.doesNotMatch(source, /gradient|backdrop-blur|#[0-9a-f]{3,8}\b|rgba?\(|shadow-|dark:|ThemeToggle|@\/lib\/theme/i)
  assert.equal(source.match(/<h1\b/g)?.length, 1)
  assert.match(source, /<h1 className="[^"]*text-foreground[^"]*">\{tAuth\("login"\)\}<\/h1>/)
  assert.doesNotMatch(source, /<h2\b|Asset Management System|getFullYear|IT Helpdesk/)
})

test("login page: what it shows before sign-in comes only from the helpers and the one setting (spec §8)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /getLoginCompanyName\(\)/)
  assert.match(source, /isTestSystem\(\)/)
  assert.match(source, /getLoginDestinationKey\(locale, callbackUrl\)/)
  assert.match(source, /buildLoginLocaleHref\(locale, language\.locale, callbackUrl, sessionExpired\)/)
  assert.match(source, /formatLoginYear\(locale\)/)
  assert.doesNotMatch(source, /prisma|systemSetting|process\.env\.DATABASE_URL|NEXT_PUBLIC_/)
})

test("login page: a signed-in visitor goes on to the callback, except after a session expiry (Review Focus 4)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /if \(user && !sessionExpired\) redirect\(callbackUrl\)/)
})
