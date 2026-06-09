import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBrandDrilldownHrefs,
  buildBrandModelQueryString,
  buildBrandNavigatorItems,
  buildModelDrilldownHrefs,
  buildDuplicateNameGroups,
  parseBrandModelListParams,
} from "../src/lib/brand-model-query.ts"

test("parses brand and model list params independently", () => {
  const state = parseBrandModelListParams({
    search: " Dell ",
    brandPage: "3",
    brandPageSize: "50",
    modelPage: "-2",
    modelPageSize: "500",
    modelBrandId: "brand-1",
    modelCategoryId: "category-1",
    modelPhoto: "with",
    modelUsage: "used",
  })

  assert.equal(state.search, "Dell")
  assert.equal(state.brandPage, 3)
  assert.equal(state.brandPageSize, 50)
  assert.equal(state.modelPage, 1)
  assert.equal(state.modelPageSize, 100)
  assert.equal(state.modelBrandId, "brand-1")
  assert.equal(state.modelCategoryId, "category-1")
  assert.equal(state.modelPhoto, "with")
  assert.equal(state.modelUsage, "used")
})

test("builds query strings while resetting only requested table pagination", () => {
  const current = parseBrandModelListParams({
    search: "HP",
    brandPage: "2",
    modelPage: "4",
    modelBrandId: "brand-1",
  })

  assert.equal(
    buildBrandModelQueryString(current, { modelBrandId: "brand-2", modelPage: 1 }),
    "search=HP&brandPage=2&brandPageSize=25&modelPage=1&modelPageSize=25&modelBrandId=brand-2&modelPhoto=all&modelUsage=all"
  )
})

test("groups likely duplicate names after normalizing spaces and punctuation", () => {
  const groups = buildDuplicateNameGroups([
    { id: "1", name: "HP" },
    { id: "2", name: "H P" },
    { id: "3", name: "H-P" },
    { id: "4", name: "Dell" },
  ])

  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.normalizedName, "hp")
  assert.deepEqual(
    groups[0]?.items.map((item) => item.id),
    ["1", "2", "3"]
  )
})

test("builds brand navigator counts from active model and asset groups", () => {
  const items = buildBrandNavigatorItems(
    [
      { id: "brand-apc", name: "APC", _count: { models: 2, assets: 7 } },
      { id: "brand-dell", name: "Dell", _count: { models: 1, assets: 0 } },
    ],
    [
      { brandId: "brand-apc", count: 1 },
      { brandId: "brand-dell", count: 0 },
      { brandId: null, count: 3 },
    ],
    [
      { brandId: "brand-apc", count: 6 },
      { brandId: "brand-dell", count: 0 },
    ]
  )

  assert.deepEqual(
    items.map((item) => ({ id: item.id, models: item._count.models, assets: item._count.assets })),
    [
      { id: "brand-apc", models: 1, assets: 6 },
      { id: "brand-dell", models: 0, assets: 0 },
    ]
  )
})

test("builds brand and model drilldown links for related records", () => {
  assert.deepEqual(buildBrandDrilldownHrefs({ locale: "th", brandId: "brand-1" }), {
    assets: "/th/assets?brandId=brand-1&page=1",
    models: "/th/master-data/brands?modelBrandId=brand-1&modelPage=1",
  })

  assert.deepEqual(buildModelDrilldownHrefs({ locale: "th", modelId: "model-1" }), {
    assets: "/th/assets?modelId=model-1&page=1",
  })
})
