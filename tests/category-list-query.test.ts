import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCategoryOrderBy,
  buildCategoryQueryString,
  buildCategoryWhere,
  buildCategoryHealthSummary,
  buildCategoryDrilldownHrefs,
  parseCategoryListParams,
  parseCategoryPrefixMap,
} from "../src/lib/category-list-query.ts"

test("parses category pagination and sorting with safe defaults", () => {
  const state = parseCategoryListParams({
    search: " comp ",
    page: "-2",
    pageSize: "500",
    sort: "assets",
    direction: "asc",
  })

  assert.equal(state.search, "comp")
  assert.equal(state.page, 1)
  assert.equal(state.pageSize, 100)
  assert.equal(state.sort, "assets")
  assert.equal(state.direction, "asc")
})

test("falls back to code sorting for unsupported sort fields", () => {
  const state = parseCategoryListParams({
    sort: "updatedAt",
    direction: "sideways",
  })

  assert.equal(state.sort, "code")
  assert.equal(state.direction, "asc")
})

test("builds relation-count order by for model and asset columns", () => {
  assert.deepEqual(buildCategoryOrderBy({ sort: "models", direction: "desc" }), { models: { _count: "desc" } })
  assert.deepEqual(buildCategoryOrderBy({ sort: "assets", direction: "asc" }), { assets: { _count: "asc" } })
  assert.deepEqual(buildCategoryOrderBy({ sort: "code", direction: "asc" }), { code: "asc" })
})

test("parses category health filters safely", () => {
  const state = parseCategoryListParams({
    assetUsage: "withoutAssets",
    modelStatus: "withoutModels",
    customFieldStatus: "withCustomFields",
    checklistStatus: "withoutChecklist",
    prefixStatus: "withPrefix",
  })

  assert.equal(state.assetUsage, "withoutAssets")
  assert.equal(state.modelStatus, "withoutModels")
  assert.equal(state.customFieldStatus, "withCustomFields")
  assert.equal(state.checklistStatus, "withoutChecklist")
  assert.equal(state.prefixStatus, "withPrefix")
})

test("builds category where clauses from health filters and setting-backed ids", () => {
  const state = parseCategoryListParams({
    search: "computer",
    assetUsage: "withAssets",
    modelStatus: "withoutModels",
    customFieldStatus: "withoutCustomFields",
    checklistStatus: "withChecklist",
    prefixStatus: "withoutPrefix",
  })

  assert.deepEqual(
    buildCategoryWhere(state, {
      categoryIdsWithChecklist: ["cat-a"],
      categoryIdsWithPrefix: ["cat-b"],
    }),
    {
      isActive: true,
      OR: [
        { code: { contains: "computer" } },
        { name: { contains: "computer" } },
        { description: { contains: "computer" } },
      ],
      assets: { some: { isActive: true } },
      models: { none: { isActive: true } },
      customFieldDefs: { none: { isActive: true } },
      id: { in: ["cat-a"], notIn: ["cat-b"] },
    }
  )
})

test("parses category prefix settings into clean category ids", () => {
  assert.deepEqual(parseCategoryPrefixMap('{"cat-a":" com ","cat-b":"","cat-c":12}'), { "cat-a": "COM" })
})

test("builds category query strings while preserving active filters", () => {
  const current = parseCategoryListParams({
    search: "computer",
    page: "2",
    pageSize: "50",
    sort: "assets",
    direction: "desc",
    assetUsage: "withAssets",
    checklistStatus: "withoutChecklist",
  })

  assert.equal(
    buildCategoryQueryString(current, { sort: "code", direction: "asc", page: 1 }),
    "search=computer&page=1&pageSize=50&sort=code&direction=asc&assetUsage=withAssets&modelStatus=all&customFieldStatus=all&checklistStatus=withoutChecklist&prefixStatus=all"
  )
})

test("summarizes category health gaps for review cards", () => {
  const summary = buildCategoryHealthSummary(
    [
      { id: "cat-a", _count: { assets: 4, models: 2, customFieldDefs: 1 } },
      { id: "cat-b", _count: { assets: 0, models: 0, customFieldDefs: 0 } },
    ],
    {
      categoryIdsWithChecklist: ["cat-a"],
      categoryIdsWithPrefix: ["cat-a"],
    }
  )

  assert.deepEqual(summary, {
    total: 2,
    used: 1,
    missingModels: 1,
    missingCustomFields: 1,
    missingChecklist: 1,
    missingPrefix: 1,
  })
})

test("builds category drilldown links for related operational views", () => {
  assert.deepEqual(buildCategoryDrilldownHrefs({ locale: "th", categoryId: "cat-1" }), {
    assets: "/th/assets?categoryId=cat-1",
    models: "/th/master-data/brands?modelCategoryId=cat-1&modelPage=1",
    edit: "/th/master-data/categories/cat-1/edit",
  })
})
