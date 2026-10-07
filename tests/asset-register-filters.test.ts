import assert from "node:assert/strict"
import test from "node:test"

import { buildAssetStatusCountWhere, buildAssetWhere, parseAssetListParams } from "../src/lib/asset-list-query.ts"
import {
  assetRegisterSearchDebounceMs,
  buildAssetRegisterFilterHref,
  buildSheetClearOverrides,
  getActiveSheetFilterKeys,
  getCompanyChangeOverrides,
  mergeAssetRegisterFilters,
  shouldAutoSearch,
} from "../src/lib/asset-register-filters.ts"

const filters = (query = "") => parseAssetListParams(new URLSearchParams(query))

test("auto search waits for two characters and skips the term already applied", () => {
  assert.equal(assetRegisterSearchDebounceMs, 400)
  assert.equal(shouldAutoSearch("", "dell"), true)
  assert.equal(shouldAutoSearch("", ""), false)
  assert.equal(shouldAutoSearch("   ", ""), false)
  assert.equal(shouldAutoSearch("d", ""), false)
  assert.equal(shouldAutoSearch("de", ""), true)
  assert.equal(shouldAutoSearch("  dell ", "dell"), false)
  assert.equal(shouldAutoSearch("โน", ""), true)
  assert.equal(shouldAutoSearch("0271", "027"), true)
})

test("status counts use every filter except the status itself", () => {
  const current = filters("statusId=s-ready&branchId=b-1&dataQuality=serial&search=dell")
  const countWhere = buildAssetStatusCountWhere(current)

  assert.equal("statusId" in countWhere, false)
  assert.deepEqual(countWhere, buildAssetWhere({ ...current, statusId: "" }))
  assert.equal(countWhere.branchId, "b-1")
  assert.ok(countWhere.OR, "search must still narrow the counts")
  assert.ok(Array.isArray(countWhere.AND) && countWhere.AND.length === 1, "data quality must still narrow the counts")
})

test("merging filters always returns to page 1 and keeps every other parameter", () => {
  const current = filters("page=4&pageSize=50&brandId=br-1&custodianId=e-1&supplierId=s-1&activity=idle_180d&sort=name&direction=asc&search=dell")
  const merged = mergeAssetRegisterFilters(current, { conditionId: "cond-2" })

  assert.equal(merged.page, 1)
  assert.equal(merged.conditionId, "cond-2")
  assert.equal(current.page, 4, "the base object must not be mutated")

  const href = buildAssetRegisterFilterHref("/th/assets", current, { conditionId: "cond-2" })
  assert.ok(href.startsWith("/th/assets?"))
  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1))
  assert.equal(params.get("page"), "1")
  assert.equal(params.get("conditionId"), "cond-2")
  for (const [key, value] of [
    ["pageSize", "50"],
    ["brandId", "br-1"],
    ["custodianId", "e-1"],
    ["supplierId", "s-1"],
    ["activity", "idle_180d"],
    ["sort", "name"],
    ["direction", "asc"],
    ["search", "dell"],
  ] as const) {
    assert.equal(params.get(key), value, key)
  }
})

test("changing company keeps the branch only when it belongs to the new company", () => {
  const branches = [
    { id: "b-1", companyId: "c-1" },
    { id: "b-2", companyId: "c-2" },
  ]

  assert.deepEqual(getCompanyChangeOverrides("c-1", "b-1", branches), { companyId: "c-1", branchId: "b-1" })
  assert.deepEqual(getCompanyChangeOverrides("c-2", "b-1", branches), { companyId: "c-2", branchId: "" })
  assert.deepEqual(getCompanyChangeOverrides("", "b-1", branches), { companyId: "", branchId: "b-1" })
  assert.deepEqual(getCompanyChangeOverrides("c-1", "", branches), { companyId: "c-1", branchId: "" })
  assert.deepEqual(getCompanyChangeOverrides("c-1", "b-gone", branches), { companyId: "c-1", branchId: "" })
})

test("sheet filter counts include only what lives in the sheet", () => {
  const desktop = { includeScope: false, tabStatusIds: ["s-ready"] }
  const mobile = { includeScope: true, tabStatusIds: ["s-ready"] }
  const current = filters("companyId=c-1&statusId=s-ready&conditionId=cond-2&pageSize=50&search=dell")

  assert.deepEqual(getActiveSheetFilterKeys(current, desktop), ["conditionId", "pageSize"])
  assert.deepEqual(getActiveSheetFilterKeys(current, mobile), ["companyId", "conditionId", "pageSize"])
  assert.deepEqual(getActiveSheetFilterKeys(filters("statusId=s-lost"), desktop), ["statusId"])
  assert.deepEqual(getActiveSheetFilterKeys(filters("dataQuality=department&crossScope=all"), desktop), ["dataQuality", "crossScope"])
  assert.deepEqual(getActiveSheetFilterKeys(filters(""), mobile), [])
})

test("clearing the sheet removes only sheet filters", () => {
  const current = filters("companyId=c-1&branchId=b-1&statusId=s-ready&conditionId=cond-2&dataQuality=serial&crossScope=all&pageSize=50&search=dell")

  assert.deepEqual(buildSheetClearOverrides(current, { includeScope: false, tabStatusIds: ["s-ready"] }), {
    conditionId: "",
    dataQuality: "",
    crossScope: "",
    pageSize: 25,
  })
  assert.deepEqual(buildSheetClearOverrides(current, { includeScope: true, tabStatusIds: ["s-ready"] }), {
    companyId: "",
    branchId: "",
    conditionId: "",
    dataQuality: "",
    crossScope: "",
    pageSize: 25,
  })
  assert.deepEqual(buildSheetClearOverrides(filters("statusId=s-lost"), { includeScope: false, tabStatusIds: ["s-ready"] }), {
    statusId: "",
  })
})
