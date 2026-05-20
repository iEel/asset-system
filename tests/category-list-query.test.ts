import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCategoryOrderBy,
  parseCategoryListParams,
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
