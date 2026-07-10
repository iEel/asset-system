import assert from "node:assert/strict"
import test from "node:test"

import {
  assetRegisterScrollMemoryKey,
  assetRegisterViewPreferenceKey,
  getPersistedAssetRegisterView,
  hasExplicitAssetRegisterView,
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
