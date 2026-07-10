import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

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

  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; view\?: string \| string\[\] \}>/)
  assert.match(source, /normalizeAssetReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(source, /href=\{returnToHref\}/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/edit`, returnToHref\)/)
})

test("asset edit form saves back to the sanitized return target", () => {
  const pageSource = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx", "utf8")
  const formSource = readFileSync("src/components/assets/asset-form.tsx", "utf8")

  assert.match(pageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(pageSource, /normalizeAssetReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(pageSource, /backHref=\{returnToHref\}/)
  assert.match(formSource, /backHref: providedBackHref/)
  assert.match(formSource, /const backHref = providedBackHref \?\? `\/\$\{locale\}\/assets`/)
  assert.match(formSource, /router\.push\(backHref\)/)
})
