import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { getOperationCancelHref, normalizeAssetComponentManagerReturnTo, normalizeAssetReturnTo } from "../src/lib/asset-return-navigation.ts"

function readSource(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : ""
}

test("asset return navigation helper only accepts approved internal asset routes", () => {
  const source = readSource("src/lib/asset-return-navigation.ts")

  assert.match(source, /normalizeAssetReturnTo/)
  assert.match(source, /new URL\(raw, "http:\/\/asset\.local"\)/)
  assert.match(source, /url\.origin !== "http:\/\/asset\.local"/)
  assert.match(source, /safeTargets\.has\(url\.pathname\)/)
  assert.match(source, /appendReturnTo/)
})

test("asset return navigation accepts a same-locale component detail target only", () => {
  assert.equal(
    normalizeAssetReturnTo("th", "/th/assets/component%20asset?view=custody#components"),
    "/th/assets/component%20asset?view=custody#components",
  )
  assert.equal(normalizeAssetReturnTo("th", "/th/assets/component%20asset/edit"), "/th/assets")
})

test("asset register detail and edit links carry the current list URL as returnTo", () => {
  const source = readFileSync("src/components/assets/asset-register-table.tsx", "utf8")

  assert.match(source, /const registerReturnHref = buildHref\(\{\}\)/)
  assert.match(source, /function buildAssetDetailHref\(assetId: string\)/)
  assert.match(source, /function buildAssetEditHref\(assetId: string\)/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(assetId\)\}`, registerReturnHref\)/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(assetId\)\}\/edit`, registerReturnHref\)/)
  assert.doesNotMatch(source, /href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\}/)
  assert.doesNotMatch(source, /href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/edit`\}/)
})

test("asset detail page exposes a back button and forwards returnTo to edit", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  const header = readFileSync("src/components/assets/detail/asset-detail-header.tsx", "utf8")

  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; view\?: string \| string\[\]; type\?: string \| string\[\] \}>/)
  assert.match(source, /normalizeAssetReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(source, /parseRegisterReturnTo\(rawSearchParams\.returnTo, locale\)/, "the raw returnTo tells 'opened directly' from 'the plain register' (§7.2)")
  assert.match(header, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/edit`, returnToHref\)/)
})

test("asset edit form saves back to the sanitized return target", () => {
  const pageSource = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx", "utf8")
  const formSource = readFileSync("src/components/assets/asset-form.tsx", "utf8")

  // Group 4 plan 3 Task 5: the edit page also reads ?documents=failed, the save's failure landing (P3-R6).
  // The final review's attempt: a new one on every failure landing remounts the form.
  assert.match(pageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; documents\?: string \| string\[\]; attempt\?: string \| string\[\] \}>/)
  assert.match(pageSource, /normalizeAssetReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(pageSource, /backHref=\{returnToHref\}/)
  assert.match(formSource, /backHref: providedBackHref/)
  assert.match(formSource, /const backHref = providedBackHref \?\? `\/\$\{locale\}\/assets`/)
  assert.match(formSource, /router\.push\(backHref\)/)
})

test("component manager returns to the asset detail that opened it, never to another asset or site", () => {
  assert.equal(
    normalizeAssetComponentManagerReturnTo("th", "asset id/1", "/th/assets/asset%20id%2F1?view=components"),
    "/th/assets/asset%20id%2F1?view=components",
  )
  assert.equal(
    normalizeAssetComponentManagerReturnTo("th", "asset id/1", "/th/assets/other?view=custody"),
    "/th/assets/asset%20id%2F1?view=components",
  )
  assert.equal(
    normalizeAssetComponentManagerReturnTo("th", "asset id/1", "https://example.com"),
    "/th/assets/asset%20id%2F1?view=components",
  )
})

test("the component manager also returns to the register that opened it, with its query (group 1 spec §7.1)", () => {
  // Compared with the fallback itself, so the fallback's view name is not this test's concern.
  const fallback = normalizeAssetComponentManagerReturnTo("th", "a-1", undefined)
  assert.match(fallback, /^\/th\/assets\/a-1\?view=/)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/th/assets?search=nb&page=2&pageSize=25"), "/th/assets?search=nb&page=2&pageSize=25")
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/th/assets/other-id"), fallback)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/en/assets?search=nb"), fallback)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "https://evil.example/th/assets?search=nb"), fallback)
})

test("ยกเลิก on the transaction pages goes to the normalized returnTo, else the register (group 3 spec §5)", () => {
  assert.equal(getOperationCancelHref("th", undefined), "/th/assets")
  assert.equal(getOperationCancelHref("th", ""), "/th/assets")
  assert.equal(getOperationCancelHref("th", "/th/assets/a-1?view=custody"), "/th/assets/a-1?view=custody")
  assert.equal(getOperationCancelHref("th", "/th/assets?search=nb&page=2"), "/th/assets?search=nb&page=2")
  assert.equal(getOperationCancelHref("th", "/th/asset-management/scan"), "/th/asset-management/scan")
  assert.equal(getOperationCancelHref("th", "/th/assets/a-1/edit"), "/th/assets")
  assert.equal(getOperationCancelHref("en", "https://evil.example/en/assets/a-1"), "/en/assets")
})
