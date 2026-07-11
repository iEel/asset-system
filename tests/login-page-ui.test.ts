import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const pagePath = "src/app/[locale]/(auth)/login/page.tsx"

test("login page is a server wrapper for normalized query state", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.doesNotMatch(source, /^"use client"/)
  assert.match(source, /params: Promise<\{ locale: string \}>/)
  assert.match(source, /searchParams: Promise<LoginSearchParams>/)
  assert.match(source, /normalizeLoginCallbackUrl/)
  assert.match(source, /isSessionExpiredLogin/)
  assert.match(source, /process\.env\.AUTH_URL/)
  assert.match(source, /<LoginForm callbackUrl=\{callbackUrl\} sessionExpired=\{sessionExpired\} \/>/)
})

test("login page uses the real app icon and committed enterprise tokens", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /src="\/icon\.png"/)
  assert.match(source, /bg-background/)
  assert.match(source, /bg-surface/)
  assert.match(source, /text-brand-navy/)
  assert.match(source, /border-border/)
  assert.doesNotMatch(source, /gradient|backdrop-blur|rounded-\[3[2-9]px\]/)
})
