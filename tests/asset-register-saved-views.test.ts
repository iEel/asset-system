import assert from "node:assert/strict"
import test from "node:test"

import {
  addSavedView,
  assetRegisterSavedViewQuery,
  assetRegisterSavedViewsKey,
  assetRegisterSavedViewsMax,
  deleteSavedView,
  newSavedViewId,
  normalizeSavedViewQuery,
  readSavedViews,
  renameSavedView,
  type AssetRegisterSavedView,
} from "../src/lib/asset-register-saved-views.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"

// Group 4 plan 1 Task 6 (spec §6.4, call 4): named views kept in the browser, per user and locale, at most 12.
const view = (index: number, query = "statusId=s1"): AssetRegisterSavedView => ({ id: `v${index}`, name: `View ${index}`, query })

test("the storage key names the version, the user and the locale", () => {
  assert.equal(assetRegisterSavedViewsKey("th", "user-1"), "asset-register-saved-views:v1:user-1:th")
  assert.equal(assetRegisterSavedViewsKey("en", "user-1"), "asset-register-saved-views:v1:user-1:en")
  assert.equal(assetRegisterSavedViewsMax, 12)
})

test("a stored value that is missing, not JSON or not an array reads as no views and never throws (Review Focus 4)", () => {
  assert.deepEqual(readSavedViews(null), [])
  assert.deepEqual(readSavedViews(""), [])
  assert.deepEqual(readSavedViews("{not json"), [])
  assert.deepEqual(readSavedViews("{\"id\":\"v1\"}"), [])
  assert.deepEqual(readSavedViews("\"text\""), [])
  assert.deepEqual(readSavedViews("null"), [])
  assert.deepEqual(readSavedViews("42"), [])
})

test("invalid entries are dropped and names are trimmed to 1-40 characters", () => {
  const raw = JSON.stringify([
    null,
    "view",
    42,
    { id: "", name: "No id", query: "" },
    { id: "a", name: "   ", query: "" },
    { id: "b", name: "x".repeat(41), query: "" },
    { id: "c", name: 7, query: "" },
    { id: "d", name: "Query not text", query: 3 },
    { id: "e", name: "  Kept  ", query: "search=notebook" },
    { id: "e", name: "Same id", query: "" },
    { id: "f", name: "kept", query: "" },
    { id: "g", name: "x".repeat(40), query: "" },
  ])

  const views = readSavedViews(raw)
  assert.deepEqual(views.map((item) => item.id), ["e", "g"], "a repeated id or name (case-insensitive) keeps the first")
  assert.equal(views[0].name, "Kept")
})

test("15 stored views read as the first 12 (Review Focus 4)", () => {
  const views = readSavedViews(JSON.stringify(Array.from({ length: 15 }, (_, index) => view(index))))
  assert.equal(views.length, 12)
  assert.deepEqual(views.map((item) => item.id), Array.from({ length: 12 }, (_, index) => `v${index}`))
})

test("a view's query keeps every list parameter, link-only ones included, and drops unknown keys and the page (Review Focus 4)", () => {
  const [stored] = readSavedViews(JSON.stringify([view(1, "locationId=loc-1&statusGroup=other&page=4&evil=1&pageSize=50&sort=name&direction=asc&custodianState=assigned")]))
  const params = new URLSearchParams(stored.query)

  assert.equal(params.get("locationId"), "loc-1")
  assert.equal(params.get("statusGroup"), "other")
  assert.equal(params.get("custodianState"), "assigned")
  assert.equal(params.get("pageSize"), "50")
  assert.equal(params.get("sort"), "name")
  assert.equal(params.get("direction"), "asc")
  assert.equal(params.has("page"), false)
  assert.equal(params.has("evil"), false)
})

test("the page's view query is the same normalisation, so a saved view matches the page it was saved on", () => {
  const filters = parseAssetListParams({ search: "notebook", locationId: "loc-1", page: "3" })
  const pageQuery = assetRegisterSavedViewQuery(filters)

  assert.equal(new URLSearchParams(pageQuery).has("page"), false)
  assert.equal(normalizeSavedViewQuery(`${pageQuery}&page=9&unknown=1`), pageQuery)
  const [stored] = readSavedViews(JSON.stringify([view(1, `page=2&${pageQuery}`)]))
  assert.equal(stored.query, pageQuery)
})

test("adding a view trims its name and refuses an empty name, a taken name and a 13th view", () => {
  const first = addSavedView([], "  Notebooks  ", "search=notebook&page=2")
  assert.equal(first.error, null)
  assert.equal(first.views.length, 1)
  assert.equal(first.views[0].name, "Notebooks")
  assert.equal(new URLSearchParams(first.views[0].query).get("search"), "notebook")
  assert.equal(new URLSearchParams(first.views[0].query).has("page"), false)
  assert.ok(first.views[0].id)

  assert.equal(addSavedView(first.views, "   ", "").error, "nameRequired")
  const taken = addSavedView(first.views, " NOTEBOOKS ", "")
  assert.equal(taken.error, "nameTaken")
  assert.equal(taken.views, first.views, "a refused add leaves the list unchanged")

  const twelve = Array.from({ length: 12 }, (_, index) => view(index))
  assert.equal(addSavedView(twelve, "Thirteenth", "").error, "full")
  assert.equal(addSavedView(twelve, "Thirteenth", "").views.length, 12)
})

test("renaming checks the same rules but may keep its own name; deleting removes by id", () => {
  const views = [view(1), view(2)]

  assert.equal(renameSavedView(views, "v1", " ").error, "nameRequired")
  assert.equal(renameSavedView(views, "v1", "view 2").error, "nameTaken")
  const same = renameSavedView(views, "v1", " VIEW 1 ")
  assert.equal(same.error, null)
  assert.equal(same.views[0].name, "VIEW 1")
  const renamed = renameSavedView(views, "v2", "Second")
  assert.deepEqual(renamed.views.map((item) => item.name), ["View 1", "Second"])
  assert.equal(renamed.views[1].query, views[1].query)

  assert.deepEqual(deleteSavedView(views, "v1").map((item) => item.id), ["v2"])
  assert.deepEqual(deleteSavedView(views, "missing").map((item) => item.id), ["v1", "v2"])
})

// Final review C7: crypto.randomUUID is missing on a plain-http LAN page (not a secure context), so the id falls back.
test("a view id comes from crypto.randomUUID when there is one, else from the time, a counter and a random part", () => {
  assert.match(newSavedViewId(), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto")
  try {
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true, writable: true })
    const first = newSavedViewId()
    const second = newSavedViewId()
    assert.match(first, /^view-[0-9a-z]+-[0-9a-z]+-[0-9a-z]*$/)
    assert.notEqual(first, second)
    assert.equal(addSavedView([], "Plain http", "").views[0].id.startsWith("view-"), true, "adding a view does not throw")
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true, writable: true })
    assert.match(newSavedViewId(), /^view-/)
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original)
  }
})
