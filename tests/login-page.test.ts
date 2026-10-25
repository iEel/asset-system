import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  buildLoginLocaleHref,
  formatLoginYear,
  getLoginDestinationKey,
  isTestSystem,
  LOGIN_LANGUAGES,
  normalizeLoginCompanyName,
} from "../src/lib/login-page.ts"

test("the destination names the page kind from the callback's path, never its text (spec §8)", () => {
  assert.equal(getLoginDestinationKey("th", "/th"), null)
  assert.equal(getLoginDestinationKey("th", "/th/dashboard"), "nav.dashboard")
  assert.equal(getLoginDestinationKey("th", "/th/assets?search=E2E"), "nav.assetRegister")
  assert.equal(getLoginDestinationKey("th", "/th/assets/new"), "nav.addAsset")
  assert.equal(getLoginDestinationKey("th", "/th/assets/0b6c2f7e-1111-4222-8333-944445555666"), "asset.detailTitle")
  assert.equal(getLoginDestinationKey("th", "/th/assets/0b6c2f7e-1111-4222-8333-944445555666/edit"), "asset.detailTitle")
  assert.equal(getLoginDestinationKey("th", "/th/asset-management/scan"), "nav.scanSearchAsset")
  assert.equal(getLoginDestinationKey("th", "/th/audit/rounds/abc"), "nav.auditRound")
  assert.equal(getLoginDestinationKey("th", "/th/admin/approvals"), "nav.approvalInbox")
  assert.equal(getLoginDestinationKey("th", "/th/admin/settings"), "nav.administration")
  assert.equal(getLoginDestinationKey("en", "/en/maintenance?status=in_progress"), "nav.maintenance")
  assert.equal(getLoginDestinationKey("th", "/th/assetsx"), "auth.destinationFallback")
  assert.equal(getLoginDestinationKey("th", "/th/something-new"), "auth.destinationFallback")
})

test("the language link keeps the callback in the new locale and the expiry reason (Review Focus 1)", () => {
  assert.equal(buildLoginLocaleHref("th", "en", "/th", false), "/en/login")
  assert.equal(
    buildLoginLocaleHref("th", "en", "/th/assets?search=E2E", true),
    "/en/login?reason=session-expired&callbackUrl=%2Fen%2Fassets%3Fsearch%3DE2E",
  )
  assert.equal(
    buildLoginLocaleHref("en", "th", "/en/assets/x?returnTo=%2Fen%2Fassets", false),
    "/th/login?callbackUrl=%2Fth%2Fassets%2Fx%3FreturnTo%3D%252Fen%252Fassets",
  )
  // A home callback with a query switches its locale too; only the path part goes through switchLocalePath.
  assert.equal(buildLoginLocaleHref("th", "en", "/th?x=1", false), "/en/login?callbackUrl=%2Fen%3Fx%3D1")
  assert.deepEqual(LOGIN_LANGUAGES.map((language) => language.label), ["ภาษาไทย", "English"])
})

test("the test-system pill shows for every database but asset_management (Review Focus 2)", () => {
  assert.equal(isTestSystem("sqlserver://db:1433;database=asset_management_dev;user=x"), true)
  assert.equal(isTestSystem("sqlserver://db:1433;database=asset_management;user=x"), false)
  assert.equal(isTestSystem("sqlserver://db:1433;Database=ASSET_MANAGEMENT;user=x"), false)
  assert.equal(isTestSystem('"sqlserver://db:1433;database=asset_management"'), false)
  assert.equal(isTestSystem(""), false)
  // No argument reads DATABASE_URL; unset it here so the shell running the test cannot decide the answer.
  const saved = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  try {
    assert.equal(isTestSystem(), false)
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved
  }
})

test("the company name hides when empty or still the seed default (Review Focus 3)", () => {
  assert.equal(normalizeLoginCompanyName("  บริษัท ทดสอบ หนึ่ง จำกัด  "), "บริษัท ทดสอบ หนึ่ง จำกัด")
  assert.equal(normalizeLoginCompanyName("   "), null)
  assert.equal(normalizeLoginCompanyName(null), null)
  assert.equal(normalizeLoginCompanyName(" บริษัท ตัวอย่าง จำกัด "), null)
})

test("the footer year is the Buddhist year in Thai and follows Bangkok's new year (Review Focus 5)", () => {
  assert.equal(formatLoginYear("th", new Date("2026-10-25T03:00:00Z")), "2569")
  assert.equal(formatLoginYear("en", new Date("2026-10-25T03:00:00Z")), "2026")
  assert.equal(formatLoginYear("th", new Date("2026-12-31T17:30:00Z")), "2570")
  assert.equal(formatLoginYear("en", new Date("2026-12-31T17:30:00Z")), "2027")
})

test("the login reads company_name alone and never the settings table (spec §8, Global Constraints)", () => {
  const source = readFileSync("src/lib/login-company-name.ts", "utf8")
  assert.match(source, /systemSetting\.findUnique\(\{\s*where: \{ key: "company_name" \},\s*select: \{ value: true \},?\s*\}\)/)
  assert.doesNotMatch(source, /findMany|findFirst|NEXT_PUBLIC_|ldap/i)
  assert.match(source, /\bcatch\b/)
  assert.match(source, /normalizeLoginCompanyName\(/)
  assert.match(readFileSync("src/lib/system-setting-defaults.ts", "utf8"), /key: "company_name", value: seedCompanyName/)
})
