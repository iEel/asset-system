import assert from "node:assert/strict"
import test from "node:test"
import { collectNavigationHrefs, containsNavigationHref, getActiveNavigationHref } from "../src/lib/navigation-active.ts"
import { filterNavigationSectionsByPermission } from "../src/lib/navigation-permissions.ts"

const hrefs = ["/th/dashboard", "/th/assets", "/th/assets/new", "/th/asset-management/scan", "/th/audit/rounds", "/th/admin/settings"]

test("an exact match selects its row", () => {
  assert.equal(getActiveNavigationHref("/th/assets", hrefs), "/th/assets")
})

test("the longest matching href wins", () => {
  assert.equal(getActiveNavigationHref("/th/assets/new", hrefs), "/th/assets/new")
})

test("a detail page selects the list it belongs to", () => {
  assert.equal(getActiveNavigationHref("/th/assets/123", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/audit/rounds/abc/scan", hrefs), "/th/audit/rounds")
})

test("a prefix only counts when it ends at a slash", () => {
  assert.equal(getActiveNavigationHref("/th/assets-archive", hrefs), null)
  assert.equal(getActiveNavigationHref("/th/asset-management", hrefs), null)
})

test("query strings, hashes and trailing slashes are ignored", () => {
  assert.equal(getActiveNavigationHref("/th/assets?page=2", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/assets#top", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/assets/", hrefs), "/th/assets")
})

test("pages outside the menu select nothing", () => {
  assert.equal(getActiveNavigationHref("/th/profile", hrefs), null)
  assert.equal(getActiveNavigationHref("/th", hrefs), null)
  assert.equal(getActiveNavigationHref("/th/assets", []), null)
})

type Item = { labelKey: string; href?: string; permission?: { module: string; action: string }; children?: Item[] }

const assetGroup: Item = {
  labelKey: "assetManagement",
  children: [
    { labelKey: "assetRegistryGroup", children: [{ labelKey: "assetRegister", href: "/th/assets", permission: { module: "asset", action: "view" } }] },
    { labelKey: "checkout", href: "/th/asset-management/checkout", permission: { module: "asset", action: "edit" } },
  ],
}

test("collectNavigationHrefs walks nested groups", () => {
  assert.deepEqual(collectNavigationHrefs([{ labelKey: "dashboard", href: "/th/dashboard" }, assetGroup]), [
    "/th/dashboard",
    "/th/assets",
    "/th/asset-management/checkout",
  ])
})

test("containsNavigationHref finds the active row at any depth", () => {
  assert.equal(containsNavigationHref(assetGroup, "/th/assets"), true)
  assert.equal(containsNavigationHref(assetGroup, "/th/dashboard"), false)
  assert.equal(containsNavigationHref(assetGroup, null), false)
})

test("sections with no visible row disappear, with their heading", () => {
  const sections: Array<{ labelKey: string; items: Item[] }> = [
    { labelKey: "sectionDaily", items: [{ labelKey: "dashboard", href: "/th/dashboard", permission: { module: "dashboard", action: "view" } }] },
    { labelKey: "sectionAssets", items: [assetGroup] },
  ]
  const viewer = { roles: ["viewer"], permissions: ["dashboard:view"] }
  assert.deepEqual(filterNavigationSectionsByPermission(sections, viewer).map((section) => section.labelKey), ["sectionDaily"])

  const clerk = { roles: ["clerk"], permissions: ["dashboard:view", "asset:view"] }
  const visible = filterNavigationSectionsByPermission(sections, clerk)
  assert.deepEqual(visible.map((section) => section.labelKey), ["sectionDaily", "sectionAssets"])
  assert.deepEqual(collectNavigationHrefs(visible[1].items), ["/th/assets"], "the edit-only row is filtered inside the section")

  const admin = { roles: ["system_admin"], permissions: [] }
  assert.equal(filterNavigationSectionsByPermission(sections, admin).length, 2)
})
