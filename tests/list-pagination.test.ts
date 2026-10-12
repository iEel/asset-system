import assert from "node:assert/strict"
import test from "node:test"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "../src/lib/list-pagination.ts"

// Phase 2B B4 (spec 2B §5.9.1, §5.14): the page helpers every server list shares. Plan 2B-2 adds planStatePageSlices here.

test("lists offer 25, 50 and 100 rows per page (R-k)", () => {
  assert.deepEqual([...LIST_PAGE_SIZES], [25, 50, 100])
})

test("parseListPage keeps a page size of 25, 50 or 100 and turns any other value into 25", () => {
  for (const size of LIST_PAGE_SIZES) {
    assert.equal(parseListPage({ pageSize: String(size) }).pageSize, size)
    assert.equal(parseListPage({ pageSize: size }).pageSize, size)
  }
  for (const pageSize of ["10", "0", "abc", "", "50.5", "-25", "1e2", ["50", "100"], 10, null, undefined]) {
    assert.equal(parseListPage({ pageSize }).pageSize, 25, JSON.stringify(pageSize))
  }
})

test("parseListPage reads a whole page number of at least 1 and turns any other value into 1", () => {
  assert.deepEqual(parseListPage({}), { page: 1, pageSize: 25 })
  assert.equal(parseListPage({ page: "2" }).page, 2)
  assert.equal(parseListPage({ page: 3 }).page, 3)
  for (const page of ["0", "-1", "x", "", "1.5", "1e3", ["2", "3"], 0, -2, 2.5, null, undefined]) {
    assert.equal(parseListPage({ page }).page, 1, JSON.stringify(page))
  }
})

test("listPageWindow turns a page into the skip and take of findMany", () => {
  assert.deepEqual(listPageWindow({ page: 1, pageSize: 25 }), { skip: 0, take: 25 })
  assert.deepEqual(listPageWindow({ page: 3, pageSize: 50 }), { skip: 100, take: 50 })
  assert.deepEqual(listPageWindow(parseListPage({ page: "2", pageSize: "100" })), { skip: 100, take: 100 })
})

test("lastListPage is at least 1, so an empty list and a page past the end both land on a real page", () => {
  assert.equal(lastListPage(0, 25), 1)
  assert.equal(lastListPage(1, 25), 1)
  assert.equal(lastListPage(25, 25), 1)
  assert.equal(lastListPage(26, 25), 2)
  assert.equal(lastListPage(120, 50), 3)
})

test("appendListPage writes only the values that differ from the defaults, so default links stay as they are", () => {
  assert.equal(appendListPage(new URLSearchParams("view=open"), { page: 1, pageSize: 25 }).toString(), "view=open")
  assert.equal(appendListPage(new URLSearchParams("search=a"), { page: 2, pageSize: 50 }).toString(), "search=a&page=2&pageSize=50")
  assert.equal(
    appendListPage(new URLSearchParams("page=4&pageSize=100&search=a"), { pageSize: 100 }).toString(),
    "search=a&pageSize=100",
    "a filter link goes back to page 1 and keeps the page size",
  )
  assert.equal(appendListPage(new URLSearchParams("page=4&pageSize=50"), {}).toString(), "")
  const params = new URLSearchParams("search=a")
  assert.equal(appendListPage(params, { page: 3 }), params, "returns the same params, for chaining")
  assert.equal(params.toString(), "search=a&page=3")
})
