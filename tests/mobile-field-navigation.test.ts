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
