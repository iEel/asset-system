import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCategoryOrderBy,
  buildCategoryQueryString,
  buildCategoryWhere,
  buildCategoryHealthSummary,
  buildCategoryDrilldownHrefs,
  buildCategoryPrefixCells,
  buildCategoryPrefixSettingsHref,
  categoryFooterTotalWheres,
  isCategoryCountSort,
  orderCategoryIdsByCount,
  readCategoryPageIdsByActiveCount,
  parseCategoryListParams,
  parseCategoryPrefixMap,
  sharedPrefixCategoryIds,
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

// Board MD-Categories (group 8 plan 2 Task 1, spec §3): name A→Z by default; every other sort stays reachable.
test("falls back to name A→Z for unsupported or missing sort fields", () => {
  const state = parseCategoryListParams({
    sort: "updatedAt",
    direction: "sideways",
  })

  assert.equal(state.sort, "name")
  assert.equal(state.direction, "asc")
  assert.deepEqual([parseCategoryListParams({}).sort, parseCategoryListParams({}).direction], ["name", "asc"])
  assert.deepEqual([parseCategoryListParams({ sort: "code", direction: "asc" }).sort, parseCategoryListParams({ sort: "code", direction: "asc" }).direction], ["code", "asc"])
  for (const sort of ["code", "name", "models", "assets", "customFields", "createdAt"]) {
    assert.equal(parseCategoryListParams({ sort }).sort, sort)
  }
})

test("orders the name, code and date sorts in the query with the id as tie-breaker", () => {
  assert.deepEqual(buildCategoryOrderBy({ sort: "code", direction: "asc" }), [{ code: "asc" }, { id: "asc" }])
  assert.deepEqual(buildCategoryOrderBy({ sort: "name", direction: "desc" }), [{ name: "desc" }, { id: "asc" }])
  assert.deepEqual(buildCategoryOrderBy({ sort: "createdAt", direction: "desc" }), [{ createdAt: "desc" }, { id: "asc" }])
  assert.deepEqual(["models", "assets", "customFields"].map((sort) => isCategoryCountSort(sort as never)), [true, true, true])
  assert.deepEqual(["code", "name", "createdAt"].map((sort) => isCategoryCountSort(sort as never)), [false, false, false])
})

test("the count sorts order by the active counts the columns show, id as tie-breaker (final review fix 1)", () => {
  // A has 2 active assets (40 inactive ones do not count), B 10, C none, D 2.
  const counts = new Map([["a", 2], ["b", 10], ["d", 2]])
  assert.deepEqual(orderCategoryIdsByCount(["d", "c", "b", "a"], counts, "desc"), ["b", "a", "d", "c"])
  assert.deepEqual(orderCategoryIdsByCount(["d", "c", "b", "a"], counts, "asc"), ["c", "a", "d", "b"])
})

test("a count sort reads the active counts 2,000 ids at a time, then pages the ordered ids", async () => {
  const ids = Array.from({ length: 4500 }, (_, index) => `id-${String(index).padStart(4, "0")}`)
  const chunks: number[] = []
  const readCounts = async (chunk: string[]) => {
    chunks.push(chunk.length)
    return chunk.map((categoryId) => ({ categoryId, count: Number(categoryId.slice(3)) % 7 }))
  }
  const first = await readCategoryPageIdsByActiveCount({ ids, direction: "desc", page: 1, pageSize: 3, readCounts })
  assert.deepEqual(chunks, [2000, 2000, 500])
  assert.deepEqual(first, ["id-0006", "id-0013", "id-0020"])
  const second = await readCategoryPageIdsByActiveCount({ ids, direction: "desc", page: 2, pageSize: 3, readCounts })
  assert.deepEqual(second, ["id-0027", "id-0034", "id-0041"])
  assert.deepEqual(await readCategoryPageIdsByActiveCount({ ids: [], direction: "asc", page: 1, pageSize: 25, readCounts }), [])
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
    modelTotal: 2,
    assetTotal: 4,
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

test("the category list filters by record status, ใช้งาน by default (critique 2026-10-20 E1)", () => {
  assert.equal(parseCategoryListParams({}).status, "active")
  assert.equal(buildCategoryWhere(parseCategoryListParams({})).isActive, true)
  assert.equal(buildCategoryWhere(parseCategoryListParams({ status: "inactive" })).isActive, false)
  assert.equal("isActive" in buildCategoryWhere(parseCategoryListParams({ status: "all" })), false)
  assert.match(buildCategoryQueryString(parseCategoryListParams({ status: "inactive" }), {}), /(^|&)status=inactive(&|$)/)
  assert.doesNotMatch(buildCategoryQueryString(parseCategoryListParams({}), {}), /status=/)
})

// Board MD-Categories (group 8 plan 2 Task 1): the คำนำหน้ารหัส column reads the settings' prefix groups.
test("the prefix cell: the prefix, or none (the tag uses the code), and the active categories sharing it", () => {
  const value = JSON.stringify({ pc: " com ", nb: "COM", cam: "CAM", gone: "COM", ups: "" })
  assert.deepEqual(sharedPrefixCategoryIds(value).sort(), ["gone", "nb", "pc"])
  assert.deepEqual(sharedPrefixCategoryIds("not json"), [])
  const names = new Map([
    ["pc", "คอมพิวเตอร์ตั้งโต๊ะ"],
    ["nb", "โน้ตบุ๊ก"],
    ["cam", "กล้อง CCTV"],
  ])
  const cells = buildCategoryPrefixCells(value, ["pc", "nb", "cam", "ups"], names)
  assert.deepEqual(cells.get("pc"), { prefix: "COM", sharedWith: ["โน้ตบุ๊ก"] })
  assert.deepEqual(cells.get("nb"), { prefix: "COM", sharedWith: ["คอมพิวเตอร์ตั้งโต๊ะ"] })
  assert.deepEqual(cells.get("cam"), { prefix: "CAM", sharedWith: [] })
  assert.deepEqual(cells.get("ups"), { prefix: null, sharedWith: [] })
  assert.deepEqual(buildCategoryPrefixCells(null, ["pc"], names).get("pc"), { prefix: null, sharedWith: [] })
})

test("the prefix settings link opens the asset-numbering tab at the prefix groups", () => {
  assert.equal(buildCategoryPrefixSettingsHref("th"), "/th/admin/settings?tab=asset-numbering#category-prefix-groups")
})

test("the footer totals count active models and assets of the filtered categories", () => {
  const where = { isActive: true, name: { contains: "x" } }
  assert.deepEqual(categoryFooterTotalWheres(where), {
    models: { isActive: true, category: { is: where } },
    assets: { isActive: true, category: { is: where } },
  })
})
