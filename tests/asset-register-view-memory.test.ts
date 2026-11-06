import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  assetRegisterScrollMemoryKey,
  assetRegisterViewPreferenceKey,
  buildExactAssetRegisterHref,
  getPersistedAssetRegisterView,
  hasExplicitAssetRegisterView,
  isExactAssetRegisterLink,
} from "../src/lib/asset-register-view-memory.ts"

test("asset register view memory keeps filters, sort, and page size but never pagination", () => {
  const view = getPersistedAssetRegisterView(
    new URLSearchParams("search=notebook&statusId=ready&page=4&pageSize=50&sort=name&direction=asc&unknown=value")
  )

  assert.equal(view.toString(), "search=notebook&statusId=ready&pageSize=50&sort=name&direction=asc")
})

test("asset register view memory distinguishes explicit routes from a bare register route", () => {
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams()), false)
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("page=3")), false)
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("pageSize=50")), true)
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("search=monitor")), true)
})

test("asset register memory keys are stable and locale-safe", () => {
  assert.equal(assetRegisterViewPreferenceKey("th"), "asset-register-view:v1:th")
  assert.equal(
    assetRegisterScrollMemoryKey("/th/assets?search=monitor&page=2"),
    "asset-register-scroll:v1:/th/assets?search=monitor&page=2"
  )
})

test("an exact link is recognised and built with the flag", () => {
  assert.equal(isExactAssetRegisterLink(new URLSearchParams("exact=1&statusId=x")), true)
  assert.equal(isExactAssetRegisterLink(new URLSearchParams("statusId=x")), false)
  assert.equal(buildExactAssetRegisterHref("th"), "/th/assets?exact=1")
  assert.equal(buildExactAssetRegisterHref("th", { dataQuality: "warranty" }), "/th/assets?dataQuality=warranty&exact=1")
  assert.equal(getPersistedAssetRegisterView(new URLSearchParams("exact=1&search=a")).toString(), "search=a")
})

test("locationId arrives only on an exact link and is never saved as the view (group 1 spec §7.4)", () => {
  const href = buildExactAssetRegisterHref("th", { locationId: "loc-1" })
  assert.equal(href, "/th/assets?locationId=loc-1&exact=1")
  assert.equal(isExactAssetRegisterLink(new URL(href, "http://asset.local").searchParams), true)
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("locationId=loc-1")), false)
  assert.equal(getPersistedAssetRegisterView(new URLSearchParams("locationId=loc-1&search=a")).toString(), "search=a")
})

test("departmentId (the departments list's ทรัพย์สิน count) is never saved as the view (group 8 plan 1 Task 4)", () => {
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("departmentId=d-1")), false)
  assert.equal(getPersistedAssetRegisterView(new URLSearchParams("departmentId=d-1&search=a")).toString(), "search=a")
  const memory = readFileSync("src/components/assets/asset-register-view-memory.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(memory, /if \(current\.get\("custodianState"\) \|\| current\.get\("locationId"\) \|\| current\.get\("departmentId"\)\) return/)
})

test("the สถานะอื่น tab is remembered with the view (group 4 plan 1)", () => {
  assert.equal(getPersistedAssetRegisterView(new URLSearchParams("statusGroup=other&page=2")).toString(), "statusGroup=other")
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("statusGroup=other")), true)
})
