import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBrandModelQueryString,
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
