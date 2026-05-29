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
  const dashboardPage = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8")

  assert.match(localePage, /getDefaultHomeHref\(locale, user\)/)
  assert.match(loginPage, /router\.replace\(`\/\$\{locale\}`\)/)
  assert.match(dashboardPage, /shouldUseEmployeeHome\(user\)/)
  assert.match(dashboardPage, /redirect\(`\/\$\{locale\}\/my-assets`\)/)
})
