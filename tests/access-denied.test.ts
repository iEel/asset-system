// Page group 12 plan 1 Task 1 (spec docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §9, §15 items 7–8,
// board AD-Denied): the denied page names the blocked page from a display-only `from` path, shows the permission in
// Thai words, the viewer's active roles and a back button; the approvals pages redirect there instead of a 404.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  APPROVAL_PERMISSION,
  buildAccessDeniedHref,
  formatDeniedRoleNames,
  permissionWordKeys,
  sanitizeDeniedFrom,
} from "../src/lib/access-denied.ts"
import { getLoginDestinationKey } from "../src/lib/login-page.ts"

const readLf = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
const D = "src/app/[locale]/(dashboard)/"

test("from is a safe internal path or nothing", () => {
  assert.equal(sanitizeDeniedFrom("th", "/th/admin/settings?tab=x"), "/th/admin/settings")
  assert.equal(sanitizeDeniedFrom("th", "/th/admin/settings#ldap"), "/th/admin/settings")
  assert.equal(sanitizeDeniedFrom("th", "/th/admin/approvals/history"), "/th/admin/approvals/history")
  for (const raw of ["/th//evil.com", "https://evil.com", "/th\\x", "/th/a:b", "//evil.com/th/x", "/th", "", "th/admin"]) {
    assert.equal(sanitizeDeniedFrom("th", raw), null, raw)
  }
  assert.equal(sanitizeDeniedFrom("th", "/en/admin"), null)
  assert.equal(sanitizeDeniedFrom("th", null), null)
  assert.equal(sanitizeDeniedFrom("th", undefined), null)
})

test("the denied href carries from only when safe", () => {
  const href = buildAccessDeniedHref({ locale: "th", module: "setting", action: "view", from: "/th/admin/settings?tab=ldap" })
  assert.ok(href.includes("from=%2Fth%2Fadmin%2Fsettings"), href)
  assert.ok(!href.includes("tab=ldap") && !href.includes("tab%3Dldap"), href)
  assert.equal(href, "/th/access-denied?module=setting&action=view&from=%2Fth%2Fadmin%2Fsettings")
  // module and action stay as they were; an unsafe or missing from is left out.
  assert.equal(buildAccessDeniedHref({ locale: "th", module: "setting", action: "view" }), "/th/access-denied?module=setting&action=view")
  assert.equal(buildAccessDeniedHref({ locale: "th", module: "setting", action: "view", from: "https://evil.com" }), "/th/access-denied?module=setting&action=view")
  assert.equal(buildAccessDeniedHref({ locale: "th", module: "setting", action: "view", from: null }), "/th/access-denied?module=setting&action=view")
  assert.equal(APPROVAL_PERMISSION, "approval")
})

test("admin sub-pages get their own name", () => {
  assert.equal(getLoginDestinationKey("th", "/th/admin/settings"), "nav.systemSetting")
  const routes: Record<string, string> = {
    "admin/users": "nav.userManagement", "admin/users/abc": "nav.userManagement", "admin/roles": "nav.rolePermission",
    "admin/logs": "nav.systemLog", "admin/data-quality": "nav.dataQuality", "admin/integrations": "nav.integrationApi",
    "admin/storage": "nav.fileStorage", "admin/readiness": "nav.productionReadiness", "admin/approvals": "nav.approvalInbox",
    "admin/approvals/history": "approvalHistoryPage.title", "admin": "nav.administration",
    "master-data/companies": "nav.company", "master-data/branches": "nav.branch", "master-data/departments": "nav.department",
    "master-data/employees": "nav.employee", "master-data/locations": "nav.location", "master-data/categories": "nav.category",
    "master-data/brands": "nav.brandModel", "master-data/suppliers": "nav.supplier", "master-data": "nav.masterData",
    "audit": "nav.audit", "audit/rounds": "nav.auditRound", "audit/findings": "nav.auditFinding",
  }
  for (const [route, key] of Object.entries(routes)) assert.equal(getLoginDestinationKey("th", `/th/${route}`), key, route)
  // Final review: the history page names itself, not the inbox (the longer route comes first).
  assert.equal(getLoginDestinationKey("th", "/th/admin/approvals/history/x"), "approvalHistoryPage.title")
  // Every key the table names exists in both languages.
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of Object.values(routes)) {
      const [namespace, name] = key.split(".")
      assert.equal(typeof messages[namespace]?.[name], "string", `${locale} ${key}`)
    }
  }
})

test("unknown permission words fall back to the code", () => {
  assert.deepEqual(permissionWordKeys("foo", "bar"), { action: null, module: null })
  assert.deepEqual(permissionWordKeys("setting", "view"), { action: "actions.view", module: "modules.setting" })
  assert.deepEqual(permissionWordKeys("disposal", "nope"), { action: null, module: "modules.disposal" })
  // The system log asks for system:view; "system" reads as the log module's word (ดู · ประวัติระบบ), never the code.
  assert.deepEqual(permissionWordKeys("system", "view"), { action: "actions.view", module: "modules.log" })
  assert.match(readLf(`${D}admin/logs/page.tsx`), /requirePagePermission\(locale, "system", "view"\)/)
  // Every word the helper names exists under adminRolesPage in both languages.
  for (const locale of ["th", "en"]) {
    const page = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).adminRolesPage
    for (const moduleName of Object.keys(page.modules)) assert.equal(permissionWordKeys(moduleName, "view").module, `modules.${moduleName}`)
    for (const action of Object.keys(page.actions)) assert.equal(permissionWordKeys("asset", action).action, `actions.${action}`)
  }
  const source = readLf(`${D}access-denied/page.tsx`)
  assert.match(source, /module === APPROVAL_PERMISSION/)
  assert.match(source, /t\("approvalWords"\)/)
  assert.match(source, /t\("permissionWords", \{/)
  // The page falls back to the raw module:action when a word is unknown.
  assert.match(source, /: permission$/m)
})

test("roles line lists active roles only, by the locale's name", () => {
  const roles = [
    { displayName: "Employee", displayNameTh: "พนักงาน", isActive: true },
    { displayName: "Old role", displayNameTh: "บทบาทเก่า", isActive: false },
    { displayName: "IT Officer", displayNameTh: null, isActive: true },
    { displayName: "Blank Thai", displayNameTh: "  ", isActive: true },
  ]
  assert.equal(formatDeniedRoleNames(roles, "th"), "พนักงาน · IT Officer · Blank Thai")
  // Final review: the English page names the roles in English, as the shell foot does (getUserRoleLabel).
  assert.equal(formatDeniedRoleNames(roles, "en"), "Employee · IT Officer · Blank Thai")
  assert.equal(formatDeniedRoleNames([], "th"), null)
  assert.equal(formatDeniedRoleNames([{ displayName: "Gone", displayNameTh: null, isActive: false }], "en"), null)
  const source = readLf(`${D}access-denied/page.tsx`)
  assert.match(source, /formatDeniedRoleNames\(roleRecord\?\.userRoles\.map\(\(userRole\) => userRole\.role\) \?\? \[\], locale\)/)
  assert.match(source, /t\("yourRoles", \{ roles: roleNames \}\)/)
  assert.match(source, /t\("noRoles"\)/)
  const lib = readLf("src/lib/access-denied.ts")
  assert.match(lib, /\.filter\(\(role\) => role\.isActive\)/)
  assert.match(lib, /\.join\(" · "\)/)
})

test("the denied page names the page, keeps its buttons and adds a back button", () => {
  const source = readLf(`${D}access-denied/page.tsx`)
  assert.match(source, /sanitizeDeniedFrom\(locale, from\)/)
  assert.match(source, /getLoginDestinationKey\(locale, safeFrom\)/)
  // Final review: an unknown page gets its own title ("ไม่มีสิทธิ์เข้าหน้านี้"), not "เปิดหน้า หน้านี้".
  assert.match(source, /title=\{pageName \? t\("titleNamed", \{ page: pageName \}\) : t\("titleUnnamed"\)\}/)
  assert.doesNotMatch(source, /thisPage/)
  assert.match(source, /t\("reassure"\)/)
  assert.match(source, /t\("yourHome", \{ home: homeName \}\)/)
  assert.match(source, /<HistoryBackButton fallbackHref=\{homeHref\}>\{t\("goBack"\)\}<\/HistoryBackButton>/)
  assert.match(source, /homeHref\.endsWith\("\/my-assets"\) \? tNav\("myAssets"\) : tNav\("dashboard"\)/)
  const back = readLf("src/components/ui/history-back-button.tsx")
  assert.match(back, /^"use client"/)
  assert.match(back, /window\.history\.back\(\)/)
  // Final review: with nothing to go back to (a new tab, a bookmark, a link from another site) it goes home instead.
  assert.match(back, /if \(canGoBack\(window\.history\.length, document\.referrer, window\.location\.origin\)\) window\.history\.back\(\)\n\s+else router\.push\(fallbackHref\)/)
  assert.match(back, /<Button type="button" variant="outline" size="md" onClick=\{goBack\}>/)
  for (const locale of ["th", "en"]) {
    const page = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).accessDeniedPage
    assert.equal(page.thisPage, undefined, `${locale} thisPage is gone`)
    for (const key of ["titleNamed", "titleUnnamed", "needs", "permissionWords", "approvalWords", "yourRoles", "noRoles", "reassure", "goBack", "yourHome"]) {
      assert.equal(typeof page[key], "string", `${locale} accessDeniedPage.${key}`)
    }
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).accessDeniedPage
  assert.equal(th.titleNamed, "ไม่มีสิทธิ์เปิดหน้า {page}")
  assert.equal(th.approvalWords, "อนุมัติ · ตัดจำหน่าย หรือ อนุมัติ · ตรวจนับ")
  assert.equal(th.goBack, "กลับหน้าก่อน")
  assert.equal(th.titleUnnamed, "ไม่มีสิทธิ์เข้าหน้านี้")
})

test("the back button goes back only to an earlier page of this app", async () => {
  const { canGoBack } = await import("../src/lib/history-back.ts")
  const origin = "https://asset.company.com"
  assert.equal(canGoBack(1, "", origin), false, "a new tab")
  assert.equal(canGoBack(1, `${origin}/th/dashboard`, origin), false, "nothing before this entry")
  assert.equal(canGoBack(3, "", origin), false, "typed or bookmarked URL in a used tab")
  assert.equal(canGoBack(3, "https://mail.example.com/x", origin), false, "a link from another site")
  assert.equal(canGoBack(3, "https://asset.company.com.evil.com/x", origin), false, "a look-alike origin")
  assert.equal(canGoBack(2, `${origin}/th/dashboard`, origin), true)
  assert.equal(canGoBack(2, origin, origin), true)
})

test("every permission redirect passes the request path as from", () => {
  const source = readLf("src/lib/page-auth.ts")
  assert.match(source, /buildAccessDeniedHref\(\{ locale, module, action, from: headerList\.get\(requestPathHeader\) \}\)/)
})

test("approvals pages redirect to the denied page", () => {
  for (const path of [`${D}admin/approvals/page.tsx`, `${D}admin/approvals/history/page.tsx`]) {
    const source = readLf(path)
    assert.match(source, /buildAccessDeniedHref\(\{ locale, module: APPROVAL_PERMISSION, action: "approve", from: \(await headers\(\)\)\.get\(requestPathHeader\) \}\)/, path)
    assert.doesNotMatch(source, /canAnyApproval\)? notFound\(\)/, path)
  }
})

// Task 4: the E2E spec's words are the app's own, and the spec writes nothing.
test("the denied and readiness E2E words match the messages, and the spec writes nothing", async () => {
  const { DENIED_WORDS: D, READINESS_WORDS: R } = await import("../e2e/admin/denied-readiness-words.ts")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const denied = th.accessDeniedPage
  assert.equal(D.titleNamed, denied.titleNamed)
  assert.equal(D.needs, denied.needs)
  assert.equal(D.permissionWords, denied.permissionWords)
  assert.equal(D.approvalWords, denied.approvalWords)
  assert.equal(D.yourRoles, denied.yourRoles)
  assert.equal(D.goBack, denied.goBack)
  assert.equal(D.backHome, denied.backHome)
  assert.equal(D.readinessPage, th.nav.productionReadiness)
  assert.equal(getLoginDestinationKey("th", "/th/admin/readiness"), "nav.productionReadiness")
  // The readiness page asks for the same setting:view as the settings page, whose path the suite never names.
  assert.match(readFileSync("src/app/[locale]/(dashboard)/admin/readiness/page.tsx", "utf8"), /requirePagePermission\(locale, "setting", "view"\)/)
  assert.equal(D.actionView, th.adminRolesPage.actions.view)
  assert.equal(D.moduleSetting, th.adminRolesPage.modules.setting)
  const readiness = th.productionReadinessPage
  assert.equal(R.title, readiness.title)
  assert.deepEqual([...R.groups], ["access", "backupJobs", "workflowData", "filesApp"].map((key) => readiness[`group_${key}`]))
  assert.equal(R.filterLabel, readiness.filterLabel)
  assert.equal(R.filterAll, readiness.filter_all)
  assert.equal(R.filterFail, readiness.filter_fail)
  assert.equal(R.filterWarning, readiness.filter_warning)
  assert.equal(R.filterPass, readiness.filter_pass)
  assert.equal(R.statusFail, readiness.status_fail)
  assert.equal(R.filterEmpty, readiness.filterEmpty)
  assert.equal(readiness.sumLine, "{fail, number} + {warning, number} + {pass, number} = {total, number}")

  const spec = readFileSync("e2e/admin/denied-readiness.spec.ts", "utf8")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/^import \{[^}]*\} from "@playwright\/test"/m.test(spec), "only a type import from @playwright/test")
  assert.ok(!/\.(post|put|patch|delete)\(/.test(spec), "no write request")
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })") && spec.includes(`asUser("viewer")`))
  const roles = readFileSync("e2e/cross-cutting/support/roles-ui.ts", "utf8")
  assert.ok(roles.includes("export async function expectApprovalInboxDenied(") && !roles.includes("expectNotFound"))
  assert.ok(!readFileSync("e2e/cross-cutting/roles.spec.ts", "utf8").includes("expectApprovalInboxNotFound"))
})
