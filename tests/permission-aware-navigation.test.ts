import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildAccessDeniedHref } from "../src/lib/access-denied.ts"
import { getDefaultHomeHref, shouldUseEmployeeHome } from "../src/lib/default-home.ts"
import { filterNavigationItemsByPermission } from "../src/lib/navigation-permissions.ts"
import { getUserDisplayLabel, getUserInitial, getUserSecondaryLabel } from "../src/lib/user-display.ts"

const user = {
  id: "user-1",
  name: "Veerapon Laoharotkul",
  email: "veerapon.l@sonic.co.th",
  roles: ["employee"],
  permissions: ["asset:view", "dashboard:view"],
}

test("filters navigation items by the current user's permissions", () => {
  const filtered = filterNavigationItemsByPermission(
    [
      {
        labelKey: "assetManagement",
        children: [
          { labelKey: "assetRegister", href: "/th/assets", permission: { module: "asset", action: "view" } },
          { labelKey: "addAsset", href: "/th/assets/new", permission: { module: "asset", action: "create" } },
        ],
      },
      { labelKey: "systemSetting", href: "/th/admin/settings", permission: { module: "setting", action: "view" } },
    ],
    user
  )

  assert.deepEqual(filtered, [
    {
      labelKey: "assetManagement",
      children: [
        { labelKey: "assetRegister", href: "/th/assets", permission: { module: "asset", action: "view" } },
      ],
    },
  ])
})

test("system admin still sees all permissioned navigation items", () => {
  const filtered = filterNavigationItemsByPermission(
    [
      { labelKey: "systemSetting", href: "/th/admin/settings", permission: { module: "setting", action: "view" } },
      { labelKey: "rolePermission", href: "/th/admin/roles", permission: { module: "role", action: "view" } },
    ],
    { ...user, roles: ["system_admin"], permissions: [] }
  )

  assert.equal(filtered.length, 2)
})

test("builds a localized access denied fallback URL for direct route hits", () => {
  assert.equal(
    buildAccessDeniedHref({ locale: "th", module: "setting", action: "view" }),
    "/th/access-denied?module=setting&action=view"
  )
})

test("formats topbar user identity from the active session user", () => {
  assert.equal(getUserInitial(user), "V")
  assert.equal(getUserDisplayLabel(user), "Veerapon Laoharotkul")
  assert.equal(getUserSecondaryLabel(user), "veerapon.l@sonic.co.th")
})

test("uses My Assets as the default home for linked employee self-service users", () => {
  const selfServiceUser = {
    id: "user-2",
    name: "Employee",
    roles: ["employee"],
    permissions: ["dashboard:view"],
    employeeId: "emp-1",
  }

  assert.equal(shouldUseEmployeeHome(selfServiceUser), true)
  assert.equal(getDefaultHomeHref("th", selfServiceUser), "/th/my-assets")
  assert.equal(
    getDefaultHomeHref("th", { ...selfServiceUser, permissions: ["dashboard:view", "asset:view"] }),
    "/th/dashboard"
  )
  assert.equal(
    getDefaultHomeHref("th", { ...selfServiceUser, roles: ["system_admin"], permissions: [] }),
    "/th/dashboard"
  )
})

test("login and dashboard entry points use the role-aware default home", () => {
  const localePage = readFileSync("src/app/[locale]/page.tsx", "utf8")
  const loginPage = readFileSync("src/app/[locale]/(auth)/login/page.tsx", "utf8")
  const loginForm = readFileSync("src/components/auth/login-form.tsx", "utf8")
  const dashboardPage = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8")

  assert.match(localePage, /getDefaultHomeHref\(locale, user\)/)
  assert.match(loginPage, /normalizeLoginCallbackUrl\(locale, query\.callbackUrl, allowedOrigins\)/)
  assert.match(loginForm, /router\.replace\(callbackUrl\)/)
  assert.match(dashboardPage, /shouldUseEmployeeHome\(user\)/)
  assert.match(dashboardPage, /redirect\(`\/\$\{locale\}\/my-assets`\)/)
})

// Critique 2026-10-20 C2: the work center needs dashboard:view (work-center/page.tsx requirePagePermission). Every link
// to it shows only to a person who has that permission, and access denied's main button goes to the person's home page.
test("every work-center link needs dashboard:view, and access denied goes home (critique 2026-10-20 C2)", () => {
  const readLf = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
  const D = "src/app/[locale]/(dashboard)/"
  const sources = {
    myAssets: readLf(`${D}my-assets/page.tsx`),
    accessDenied: readLf(`${D}access-denied/page.tsx`),
    dashboard: readLf(`${D}dashboard/page.tsx`),
    notifications: readLf(`${D}notifications/page.tsx`),
    bell: readLf("src/components/layout/notification-bell.tsx"),
  }
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(source.match(/\/work-center/g)?.length, 1, `${name} has one work-center link`)
    assert.match(source, /\{?canOpenWorkCenter \? \(\n\s+<Link(?:\n\s+| )href=\{`\/\$\{locale\}\/work-center[`?]/, `${name} guards its work-center link`)
  }
  assert.match(sources.myAssets, /const canOpenWorkCenter = hasPermission\(user, "dashboard", "view"\)/)
  assert.match(sources.myAssets, /actions=\{canOpenWorkCenter \? \(\n\s+<Link href=\{`\/\$\{locale\}\/work-center\?view=mine`\}/)
  assert.match(sources.notifications, /const canOpenWorkCenter = hasPermission\(user, "dashboard", "view"\)/)
  assert.match(sources.dashboard, /const canOpenWorkCenter = user \? hasPermission\(user, "dashboard", "view"\) : false/)
  assert.match(sources.bell, /const canOpenWorkCenter = hasNavigationPermission\(user, \{ module: "dashboard", action: "view" \}\)/)
  assert.match(sources.bell, /import \{ hasNavigationPermission \} from "@\/lib\/navigation-permissions"/)

  assert.match(sources.accessDenied, /const canOpenWorkCenter = user \? hasPermission\(user, "dashboard", "view"\) : false/)
  assert.match(sources.accessDenied, /getDefaultHomeHref\(locale, user\)/)
  assert.match(sources.accessDenied, /<Link href=\{homeHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+\{t\("backHome"\)\}/)
  assert.doesNotMatch(sources.accessDenied, /backDashboard/)

  for (const locale of ["th", "en"]) {
    const page = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).accessDeniedPage
    assert.equal(typeof page.backHome, "string")
    assert.equal(page.backDashboard, undefined)
  }
  assert.equal(JSON.parse(readFileSync("messages/th.json", "utf8")).accessDeniedPage.backHome, "กลับหน้าแรก")
  assert.equal(JSON.parse(readFileSync("messages/en.json", "utf8")).accessDeniedPage.backHome, "Back to Home")
  assert.equal(getDefaultHomeHref("th", { roles: ["employee"], permissions: [], employeeId: "emp-1" }), "/th/my-assets")
})
