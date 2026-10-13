import assert from "node:assert/strict"
import test from "node:test"

import {
  getMobileFieldDestinations,
  getMobileFieldNavigationActiveItem,
  getMobileShellMode,
  isMobileVirtualKeyboardVisible,
} from "../src/lib/mobile-field-navigation.ts"

const systemAdmin = { roles: ["system_admin"], permissions: [], employeeId: null }

test("mobile shell keeps browsing and pending queues in navigation mode", () => {
  for (const pathname of [
    "/th/dashboard",
    "/en/assets",
    "/th/asset-management/scan",
    "/th/asset-management/labels",
    "/th/audit/rounds",
    "/th/audit/rounds/round-1/pending",
    "/th/maintenance",
    "/th/disposal",
    "/th/maintenance/pm",
    "/th/disposal/batches",
    "/th/disposal/batches/batch-1",
    "/th/admin/users",
    "/th/admin/roles",
    "/th/admin/data-quality",
    "/th/admin/integrations",
    "/th/master-data/brands",
    "/th/master-data/employees/employee-1",
    "/th/master-data/suppliers/supplier-1",
    "/th/my-assets/asset-1",
  ]) {
    assert.equal(getMobileShellMode(pathname), "navigation", pathname)
  }
})

test("mobile shell reserves scanner and contextual action routes for focus mode", () => {
  for (const pathname of [
    "/th/audit/rounds/round-1/scan",
    "/th/assets/new",
    "/th/assets/asset-1",
    "/th/assets/asset-1/edit",
    "/th/assets/asset-1/label",
    "/th/asset-management/checkout",
    "/th/asset-management/checkin",
    "/th/asset-management/transfer",
    "/th/asset-management/bulk-move",
    "/th/audit/rounds/new",
    "/th/audit/rounds/round-1",
    "/th/maintenance/ticket-1",
    "/th/disposal/request-1",
  ]) {
    assert.equal(getMobileShellMode(pathname), "focus", pathname)
  }
})

test("form routes hide the field navigation (K15)", () => {
  // The settings page and every new or [id]/edit form of users, roles, PM plans and master data. A save bar sits at
  // the bottom of these forms, so the bottom navigation would cover it. Their list pages keep the navigation (above).
  for (const pathname of [
    "/th/admin/settings",
    "/en/admin/settings",
    "/th/admin/users/new",
    "/th/admin/users/user-1/edit",
    "/th/admin/roles/new",
    "/th/admin/roles/role-1/edit",
    "/th/maintenance/pm/new",
    "/th/maintenance/pm/plan-1/edit",
    "/th/master-data/branches/new",
    "/th/master-data/branches/branch-1/edit",
    "/th/master-data/brands/new",
    "/th/master-data/brands/brand-1/edit",
    "/th/master-data/brands/models/new",
    "/th/master-data/brands/models/model-1/edit",
    "/th/master-data/categories/new",
    "/th/master-data/categories/category-1/edit",
    "/th/master-data/companies/new",
    "/th/master-data/companies/company-1/edit",
    "/th/master-data/departments/new",
    "/th/master-data/departments/department-1/edit",
    "/th/master-data/employees/new",
    "/th/master-data/employees/employee-1/edit",
    "/th/master-data/locations/new",
    "/th/master-data/locations/location-1/edit",
    "/th/master-data/suppliers/new",
    "/th/master-data/suppliers/supplier-1/edit",
  ]) {
    assert.equal(getMobileShellMode(pathname), "focus", pathname)
  }
})

test("mobile shell normalizes query strings, hashes, and trailing slashes", () => {
  assert.equal(getMobileShellMode("/th/audit/rounds/round-1/pending/?zone=HQ#asset-1"), "navigation")
  assert.equal(getMobileShellMode("/th/audit/rounds/round-1/scan/?camera=back"), "focus")
})

test("mobile field navigation selects one stable active destination", () => {
  assert.equal(getMobileFieldNavigationActiveItem("/th/dashboard"), "home")
  assert.equal(getMobileFieldNavigationActiveItem("/th/assets"), "assets")
  assert.equal(getMobileFieldNavigationActiveItem("/th/my-assets"), "assets")
  assert.equal(getMobileFieldNavigationActiveItem("/th/asset-management/labels"), "assets")
  assert.equal(getMobileFieldNavigationActiveItem("/th/asset-management/scan"), "scan")
  assert.equal(getMobileFieldNavigationActiveItem("/th/audit/rounds"), "audit")
  assert.equal(getMobileFieldNavigationActiveItem("/th/admin/settings"), "more")
})

test("mobile navigation hides only when the visual viewport indicates a keyboard", () => {
  assert.equal(isMobileVirtualKeyboardVisible(844, 844), false)
  assert.equal(isMobileVirtualKeyboardVisible(725, 844), false)
  assert.equal(isMobileVirtualKeyboardVisible(724, 844), true)
  assert.equal(isMobileVirtualKeyboardVisible(undefined, 844), false)
})

test("mobile field destinations follow RBAC and employee fallback", () => {
  assert.deepEqual(getMobileFieldDestinations("th", systemAdmin), [
    { id: "home", href: "/th/dashboard" },
    { id: "assets", href: "/th/assets" },
    { id: "scan", href: "/th/asset-management/scan" },
    { id: "audit", href: "/th/audit/rounds" },
  ])

  assert.deepEqual(
    getMobileFieldDestinations("th", { roles: ["employee"], permissions: [], employeeId: "employee-1" }),
    [{ id: "assets", href: "/th/my-assets" }],
  )

  assert.deepEqual(
    getMobileFieldDestinations("en", {
      roles: ["auditor"],
      permissions: ["dashboard:view", "audit:view"],
      employeeId: null,
    }),
    [
      { id: "home", href: "/en/dashboard" },
      { id: "audit", href: "/en/audit/rounds" },
    ],
  )
})
