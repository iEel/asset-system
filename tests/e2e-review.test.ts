import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"

// The E2E workflow suite's final-review tasks (plan docs/superpowers/plans/2026-10-20-e2e-suite.md, Tasks 27A and 27B):
// the hazards of spec §5 and §11 stopped in code, not only in prose (HZ1), and the software licence of spec §7 (LC1).
// Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    return statSync(full).isDirectory() ? filesUnder(full) : [full.replaceAll("\\", "/")]
  })
}

test("the hazards are stopped in code: the browser aborts a hazard's request, the app's webhook is blank, no file of the suite names one, one helper signs in, and the secret scan is in the repo (e2e review task HZ1)", async () => {
  const { HAZARDS, hazardOf, isHazardPath } = await import("../e2e/support/hazards.ts")
  const at = (pathname: string) => `http://localhost:3100${pathname}`
  // Spec §4, §5, §11: LDAP, the settings save, Excel import, a sender, the integration API, stored files, a sign-in from
  // a test, and any DELETE.
  const refused: [string, string, string][] = [
    ["POST", "/api/admin/settings/ldap-sync", "ldap"],
    ["GET", "/api/admin/settings/ldap-test", "ldap"],
    ["PUT", "/api/admin/settings", "settings-save"],
    ["POST", "/api/admin/settings", "settings-save"],
    ["POST", "/api/assets/import-preview", "excel-import"],
    ["POST", "/api/assets/import-confirm", "excel-import"],
    ["POST", "/api/notifications/digest", "notification-digest"],
    ["GET", "/api/integrations/v1/assets", "integrations"],
    ["POST", "/api/admin/integration-clients", "integrations"],
    ["POST", "/api/admin/storage/archive-orphan", "stored-files"],
    ["POST", "/api/auth/callback/credentials", "sign-in"],
    ["DELETE", "/api/assets/00000000-0000-0000-0000-000000000000", "delete"],
    ["delete", "/api/attachments/00000000-0000-0000-0000-000000000000", "delete"],
  ]
  for (const [method, pathname, id] of refused) assert.equal(hazardOf(method, at(pathname))?.id, id, `${method} ${pathname}`)
  for (const [method, pathname] of [
    ["GET", "/api/admin/settings"],
    ["GET", "/api/assets/import-template"],
    ["GET", "/api/auth/session"],
    ["POST", "/api/assets"],
    ["PUT", "/api/assets/00000000-0000-0000-0000-000000000000"],
    ["PATCH", "/api/audit-rounds/00000000-0000-0000-0000-000000000000"],
    ["POST", "/api/admin/users"],
  ]) {
    assert.equal(hazardOf(method, at(pathname)), undefined, `${method} ${pathname}`)
  }
  // The browser routes only the hazards' own paths (a GET of the settings goes on); a DELETE is caught as it is sent.
  assert.equal(isHazardPath(at("/api/admin/settings")), true)
  assert.equal(isHazardPath(at("/api/admin/settings/ldap-sync")), true)
  assert.equal(isHazardPath(at("/api/assets/00000000-0000-0000-0000-000000000000")), false)
  assert.equal(isHazardPath(at("/th/assets")), false)
  // Every route a hazard names is a route of the app, so a renamed route cannot slip past the list.
  for (const route of [
    "src/app/api/admin/settings/route.ts",
    "src/app/api/admin/settings/ldap-sync/route.ts",
    "src/app/api/admin/settings/ldap-test/route.ts",
    "src/app/api/assets/import-preview/route.ts",
    "src/app/api/assets/import-confirm/route.ts",
    "src/app/api/notifications/digest/route.ts",
    "src/app/api/admin/integration-clients/route.ts",
    "src/app/api/admin/storage/archive-orphan/route.ts",
  ]) {
    assert.ok(existsSync(route), route)
  }
  assert.deepEqual(HAZARDS.map((hazard) => hazard.id), ["ldap", "settings-save", "excel-import", "notification-digest", "integrations", "stored-files", "sign-in", "delete"])
  for (const hazard of HAZARDS) assert.ok(hazard.reason.length > 20, hazard.id)

  // The browser side: every test's context aborts a hazard before it leaves and fails the test after it.
  const fixtures = read("e2e/support/fixtures.ts")
  assert.match(fixtures, /await context\.route\(\(url\) => isHazardPath\(url\.href\), async \(route\) => \{/)
  assert.match(fixtures, /return route\.abort\("blockedbyclient"\)/)
  assert.match(fixtures, /if \(request\.method\(\)\.toUpperCase\(\) === "DELETE" && !isHazardPath\(request\.url\(\)\)\)/)
  assert.match(fixtures, /if \(hazards\.length > 0\) throw new Error\(`E2E hazard stopped/)
  // The app under test: the only sender the code has (src/lib/notification-delivery.ts, the digest webhook) is blank.
  assert.match(read("playwright.config.ts"), /env: \{ AUTH_URL: baseURL, NEXTAUTH_URL: baseURL, NOTIFICATION_DIGEST_WEBHOOK_URL: "", SESSION_IDLE_SECONDS: "10800" \}/)
  assert.match(read("src/lib/notification-delivery.ts"), /if \(!webhookUrl\) \{\n\s*return \{ enabled: false, webhookUrl: null \}/)

  // The source: no file of the suite names a hazard (the API calls of page.request and request.newContext are not
  // routed, so this is their guard).
  const sources = filesUnder("e2e").filter((file) => /\.(?:ts|mjs|js)$/.test(file) && file !== "e2e/support/hazards.ts")
  assert.ok(sources.length > 20, "the suite's files")
  const banned: [string, RegExp][] = [
    ["LDAP sync or test", /ldap-(?:sync|test)|scripts\/ldap-sync/i],
    ["the settings page", /\/th\/admin\/settings/],
    ["Excel import", /import-(?:preview|confirm)/],
    ["the digest sender", /notifications\/digest|send-notification-digest/],
    ["the integration API", /\/api\/integrations|integration-clients/],
    ["stored files", /\/api\/admin\/storage/],
    ["a sign-in request", /callback\/credentials/],
    ["a DELETE", /method:\s*["'`]DELETE["'`]|\.delete\(\s*["'`]\/|["'`]DELETE["'`]/i],
    ["the Production database", /["'`]asset_management["'`]/],
    ["the Production login file", /\.env\.prod-admin/],
  ]
  // The two guards name what they stop: the env guard stops on Production by name, the fixtures catch a DELETE.
  const guards: Record<string, string> = { "e2e/support/env-guard.ts": "the Production database", "e2e/support/fixtures.ts": "a DELETE" }
  for (const file of sources) {
    const source = read(file)
    for (const [what, pattern] of banned) {
      if (guards[file] === what) continue
      assert.doesNotMatch(source, pattern, `${file}: ${what}`)
    }
    // The settings are read with a GET only (the global setup's approval check).
    const settings = source.match(/(?<![\w/])\/api\/admin\/settings(?![\w/-])/g) ?? []
    const reads = source.match(/(?:\.get\(["'`]|GET )\/api\/admin\/settings(?![\w/-])/g) ?? []
    assert.equal(settings.length, reads.length, `${file}: /api/admin/settings only with a GET`)
  }
  // One helper signs in, and only the global setup (the seed admin) and the setup project (each E2E user once) call it.
  assert.deepEqual(sources.filter((file) => read(file).includes("signInOnce(")).sort(), ["e2e/global-setup.ts", "e2e/setup/run-data.setup.ts", "e2e/support/sign-in.ts"])
  assert.deepEqual(sources.filter((file) => /#login-password/.test(read(file))).sort(), ["e2e/smoke/login-page.spec.ts", "e2e/support/sign-in.ts"])
  assert.doesNotMatch(read("e2e/smoke/login-page.spec.ts"), /\.(?:fill|type|pressSequentially|click|press)\(/)
  // The guard stops on Production by name (EF2), and the config runs it before anything starts.
  assert.match(read("e2e/support/env-guard.ts"), /export const PRODUCTION_DATABASE = "asset_management"/)

  // The secret scan is the repo's own: it prints counts and file paths, never a value, and fails on a hit.
  const scan = read("scripts/e2e-scan-secrets.mjs")
  assert.match(scan, /console\.log\(`scanned \$\{files\} files for \$\{secrets\.length\} passwords: \$\{hits\.length\} hits`\)/)
  assert.match(scan, /process\.exit\(hits\.length === 0 \? 0 : 1\)/)
  for (const line of scan.split("\n").filter((text) => /console\.(?:log|error)/.test(text))) assert.doesNotMatch(line, /\$\{secret\b|\(secret\b|secrets\[|password\}/, line)
})

test("IT staff register a software licence on the asset form, a wrong entry first, in all four projects (spec §7 'Assets', §6.7; e2e review task LC1)", () => {
  const spec = read("e2e/assets/licence.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's test")
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`), "as IT staff")
  assert.ok(!spec.includes("runPhoneOnWebKit()"), "the phone on Chromium (spec §8: WebKit for the audit walk and the desk delivery)")
  assert.match(spec, /#asset-ownership-type"\)\.selectOption\("software_license"\)/)
  assert.match(spec, /fill\("5"\)[\s\S]*fill\("7"\)[\s\S]*expectFieldError\(page, "asset-license-used-seats", "จำนวนสิทธิ์ที่ใช้ต้องไม่เกินจำนวนสิทธิ์ทั้งหมด"\)[\s\S]*toBeFocused\(\)[\s\S]*expect\(posted, "the wrong entry posts nothing"\)\.toBe\(0\)/)
  assert.match(spec, /toEqual\(\["software_license", 5, 2, data\.departmentId, null\]\)/)
  assert.match(spec, /await expect\(page\.locator\("#overview"\)\)\.toContainText\("ใช้แล้ว 2\/5 คงเหลือ 3"\)/)
  // Measured through the transactions area's helpers (TX-R5, TX-R6): the known findings and the settle before axe.
  assert.match(spec, /import \{ expectFieldError, readAssetMasters, record, visit, visitAssetPage \} from "\.\.\/transactions\/tx-support\.ts"/)
  // The sentences the test reads are the app's own.
  const th = read("messages/th.json")
  for (const line of [
    `"ownershipType_software_license": "ซอฟต์แวร์/License"`,
    `"licenseSeatSummary": "ใช้แล้ว {used}/{total} คงเหลือ {remaining}"`,
    `"licenseSeatsExceeded": "จำนวนสิทธิ์ที่ใช้ต้องไม่เกินจำนวนสิทธิ์ทั้งหมด"`,
  ]) {
    assert.ok(th.includes(line), line)
  }
  assert.match(read("src/components/assets/asset-form.tsx"), /Number\(values\.licenseUsedSeats\) > Number\(values\.licenseTotalSeats\) \? "licenseSeatsExceeded" : null/)
})
